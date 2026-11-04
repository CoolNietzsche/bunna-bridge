from rest_framework import serializers

from bunna_bridge.users.models import User

from .models import Claim
from .models import Contract
from .models import ContractSample
from .models import Conversation
from .models import Message
from .models import Payment
from .models import Shipment
from .models import ShipmentDocument
from .models import ShipmentEvent


def _name(user):
    if user is None:
        return None
    return user.company_name or user.get_full_name() or user.email


class ContractListSerializer(serializers.ModelSerializer):
    lot_code = serializers.CharField(source="lot.lot_id", read_only=True)
    lot_name = serializers.CharField(source="lot.name", read_only=True)
    seller_name = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    value_usd = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    bags = serializers.IntegerField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            "id", "number", "lot", "lot_code", "lot_name", "seller", "seller_name", "buyer", "buyer_name",
            "quantity_kg", "bags", "price_usd_per_kg", "value_usd", "incoterm", "named_place", "shipment_from",
            "shipment_to", "status", "status_label", "created_at",
        ]

    def get_seller_name(self, obj):
        return _name(obj.seller)

    def get_buyer_name(self, obj):
        return _name(obj.buyer)


class ContractSerializer(ContractListSerializer):
    payment_terms_label = serializers.CharField(source="get_payment_terms_display", read_only=True)
    terms_basis_label = serializers.CharField(source="get_terms_basis_display", read_only=True)
    incoterm_label = serializers.CharField(source="get_incoterm_display", read_only=True)
    seller_signed_by_name = serializers.SerializerMethodField()
    buyer_signed_by_name = serializers.SerializerMethodField()

    class Meta(ContractListSerializer.Meta):
        fields = [
            *ContractListSerializer.Meta.fields, "offer", "incoterm_label", "payment_terms", "payment_terms_label",
            "advance_percent", "terms_basis", "terms_basis_label", "quality_spec", "pss_required", "destination",
            "notes", "terms_hash", "seller_signed_at", "seller_signed_by_name", "buyer_signed_at",
            "buyer_signed_by_name", "ecta_registration_number", "ecta_registered_on", "ecta_floor_price_usd",
            "ecta_floor_source", "cancelled_reason", "updated_at",
        ]
        read_only_fields = [
            "id", "number", "offer", "lot", "seller", "buyer", "status", "terms_hash", "seller_signed_at",
            "buyer_signed_at", "ecta_registration_number", "ecta_registered_on", "ecta_floor_price_usd",
            "ecta_floor_source", "cancelled_reason", "created_at", "updated_at",
        ]

    def get_seller_signed_by_name(self, obj):
        return _name(obj.seller_signed_by)

    def get_buyer_signed_by_name(self, obj):
        return _name(obj.buyer_signed_by)

    def validate_quantity_kg(self, value):
        lot = self.instance.lot if self.instance else None
        if value <= 0:
            raise serializers.ValidationError("Must be greater than zero.")
        if lot is not None and self.instance is not None:
            room = (lot.available_qty_kg or 0) + self.instance.quantity_kg
            if value > room:
                raise serializers.ValidationError(f"Only {room} kg of this lot is available.")
        return value


class SampleSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ContractSample
        fields = ["id", "kind", "kind_label", "status", "status_label", "sent_on", "courier", "tracking_number",
                  "weight_g", "cup_score", "moisture_pct", "buyer_notes", "created_at", "decided_at"]
        read_only_fields = ["id", "status", "cup_score", "moisture_pct", "buyer_notes", "created_at", "decided_at"]


class ClaimSerializer(serializers.ModelSerializer):
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    raised_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Claim
        fields = ["id", "reason", "reason_label", "description", "amount_usd", "evidence", "status", "status_label",
                  "resolution", "raised_by_name", "raised_at", "resolved_at"]
        read_only_fields = ["id", "status", "resolution", "raised_at", "resolved_at"]

    def get_raised_by_name(self, obj):
        return _name(obj.raised_by)


class EventSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ShipmentEvent
        fields = ["id", "kind", "kind_label", "happened_at", "location", "note", "recorded_by_name"]

    def get_recorded_by_name(self, obj):
        return _name(obj.recorded_by)


class DocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    responsible_label = serializers.CharField(source="get_responsible_display", read_only=True)
    has_file = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ShipmentDocument
        fields = ["id", "kind", "kind_label", "responsible", "responsible_label", "status", "status_label", "number",
                  "issued_on", "expires_on", "is_expired", "has_file", "comment", "uploaded_at"]
        read_only_fields = ["id", "kind", "status", "comment", "uploaded_at"]

    def get_has_file(self, obj):
        return bool(obj.file)


class ShipmentSerializer(serializers.ModelSerializer):
    forwarder_name = serializers.SerializerMethodField()
    forwarder_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    events = EventSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = ["id", "forwarder", "forwarder_name", "forwarder_email", "booking_number", "container_number",
                  "seal_number", "shipping_line", "vessel", "voyage", "bl_number", "port_of_loading",
                  "port_of_discharge", "bags", "net_weight_kg", "etd", "eta", "events", "documents", "created_at"]
        read_only_fields = ["id", "forwarder", "created_at"]

    def get_forwarder_name(self, obj):
        return _name(obj.forwarder)

    def validate_forwarder_email(self, value):
        if not value:
            return None
        user = User.objects.filter(email__iexact=value, role="forwarder").first()
        if user is None:
            raise serializers.ValidationError("No freight-forwarder account with this email. Ask them to sign up first.")
        return user


class PaymentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    converted_etb = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "kind", "kind_label", "amount_usd", "received_on", "bank", "reference", "converted_usd",
                  "rate_etb_per_usd", "converted_on", "converted_etb", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        amount = attrs.get("amount_usd", getattr(self.instance, "amount_usd", None))
        converted = attrs.get("converted_usd", getattr(self.instance, "converted_usd", None))
        rate = attrs.get("rate_etb_per_usd", getattr(self.instance, "rate_etb_per_usd", None))
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({"amount_usd": "Must be greater than zero."})
        if converted is not None:
            if converted < 0 or (amount is not None and converted > amount):
                raise serializers.ValidationError({"converted_usd": "Must be between 0 and the amount received."})
            if not rate or rate <= 0:
                raise serializers.ValidationError({"rate_etb_per_usd": "Enter the bank's rate for the conversion."})
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_side = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender_name", "sender_side", "body", "has_attachment", "created_at"]

    def get_sender_name(self, obj):
        return _name(obj.sender)

    def get_sender_side(self, obj):
        from bunna_bridge.orgs.access import same_team

        if obj.sender_id is None:
            return None
        return "buyer" if same_team(obj.sender, obj.conversation.buyer_id) else "seller"

    def get_has_attachment(self, obj):
        return bool(obj.attachment)


class ConversationSerializer(serializers.ModelSerializer):
    lot_code = serializers.CharField(source="lot.lot_id", read_only=True)
    lot_name = serializers.CharField(source="lot.name", read_only=True)
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    contract_number = serializers.CharField(source="contract.number", read_only=True, default=None)
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    my_side = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "lot", "lot_code", "lot_name", "buyer_name", "seller_name", "contract", "contract_number",
                  "last_message", "last_message_at", "unread", "my_side"]

    def get_buyer_name(self, obj):
        return _name(obj.buyer)

    def get_seller_name(self, obj):
        return _name(obj.lot.exporter)

    def get_my_side(self, obj):
        from bunna_bridge.orgs.access import same_team

        return "buyer" if same_team(self.context["request"].user, obj.buyer_id) else "seller"

    def get_last_message(self, obj):
        m = obj.messages.order_by("-created_at").first()
        return m.body[:140] if m else ""

    def get_unread(self, obj):
        user = self.context["request"].user
        marker = obj.reads.filter(user=user).first()
        qs = obj.messages.exclude(sender=user)
        if marker:
            qs = qs.filter(created_at__gt=marker.last_read_at)
        return qs.count()
