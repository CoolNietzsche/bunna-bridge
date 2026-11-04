from decimal import Decimal

from rest_framework import serializers

from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids
from bunna_bridge.users.models import User

from .models import CherryDelivery
from .models import SupplyTransfer


class CherryDeliverySerializer(serializers.ModelSerializer):
    producer_name = serializers.CharField(source="producer.name", read_only=True)
    producer_ref = serializers.CharField(source="producer.external_ref", read_only=True)
    plot_name = serializers.CharField(source="plot.name", read_only=True, default=None)
    station_name = serializers.CharField(source="station.name", read_only=True, default=None)
    lot_code = serializers.CharField(source="lot.lot_id", read_only=True, default=None)
    amount_due_etb = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    form_label = serializers.CharField(source="get_form_display", read_only=True)
    transferred_to = serializers.SerializerMethodField()

    class Meta:
        model = CherryDelivery
        fields = [
            "id", "station", "station_name", "producer", "producer_name", "producer_ref", "plot", "plot_name",
            "form", "form_label", "receipt_number", "delivered_on", "weight_kg", "price_per_kg_etb",
            "amount_due_etb", "amount_paid_etb", "paid_on", "payment_reference", "lot", "lot_code",
            "green_equivalent_kg", "notes", "transferred_to", "created_at",
        ]
        read_only_fields = ["id", "lot", "green_equivalent_kg", "created_at"]

    def get_transferred_to(self, obj):
        t = next((t for t in obj.transfers.all() if t.status in ("offered", "accepted")), None)
        if t is None:
            return None
        return {"id": str(t.id), "status": t.status, "buyer": t.buyer.company_name or t.buyer.email}

    def _user(self):
        return self.context["request"].user

    def validate_producer(self, producer):
        if not same_team(self._user(), producer.owner_id) or producer.archived_at:
            raise serializers.ValidationError("Producer not found.")
        return producer

    def validate_station(self, station):
        if station is not None and not same_team(self._user(), station.owner_id):
            raise serializers.ValidationError("Washing station not found.")
        return station

    def validate_weight_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Weight must be greater than zero.")
        return value

    def validate(self, attrs):
        producer = attrs.get("producer") or getattr(self.instance, "producer", None)
        plot = attrs.get("plot", getattr(self.instance, "plot", None))
        if plot is not None and producer is not None and plot.producer_id != producer.pk:
            raise serializers.ValidationError({"plot": "This plot belongs to a different producer."})
        if plot is None and producer is not None and self.instance is None:
            plots = list(producer.plots.filter(archived_at__isnull=True)[:2])
            if len(plots) == 1:
                attrs["plot"] = plots[0]
        receipt = attrs.get("receipt_number")
        if receipt:
            qs = CherryDelivery.objects.filter(owner_id__in=team_ids(self._user()), receipt_number=receipt)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"receipt_number": "This receipt number is already recorded."})
        paid = attrs.get("amount_paid_etb")
        if paid is not None and paid < 0:
            raise serializers.ValidationError({"amount_paid_etb": "Cannot be negative."})
        if self.instance is not None and self.instance.lot_id and any(
            k in attrs for k in ("weight_kg", "producer", "plot", "form")
        ):
            raise serializers.ValidationError("This delivery is already allocated to a lot; its weight and origin are locked.")
        return attrs


class SupplyTransferSerializer(serializers.ModelSerializer):
    seller_name = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    delivery_ids = serializers.PrimaryKeyRelatedField(
        source="deliveries", queryset=CherryDelivery.objects.all(), many=True, write_only=True,
    )
    deliveries = CherryDeliverySerializer(many=True, read_only=True)
    buyer = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role__in=["exporter", "roaster"]))
    producers_count = serializers.SerializerMethodField()
    plots_count = serializers.SerializerMethodField()
    delivered_kg = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SupplyTransfer
        fields = [
            "id", "seller", "seller_name", "buyer", "buyer_name", "reference", "form", "quantity_kg",
            "price_per_kg_etb", "notes", "status", "status_label", "delivery_ids", "deliveries", "producers_count",
            "plots_count", "delivered_kg", "created_at", "responded_at",
        ]
        read_only_fields = ["id", "seller", "status", "created_at", "responded_at"]

    @staticmethod
    def _name(user):
        return user.company_name or user.get_full_name() or user.email

    def get_seller_name(self, obj):
        return self._name(obj.seller)

    def get_buyer_name(self, obj):
        return self._name(obj.buyer)

    def get_producers_count(self, obj):
        return len({d.producer_id for d in obj.deliveries.all()})

    def get_plots_count(self, obj):
        return len({d.plot_id for d in obj.deliveries.all() if d.plot_id})

    def get_delivered_kg(self, obj):
        return str(sum((d.weight_kg for d in obj.deliveries.all()), Decimal("0")))

    def validate_buyer(self, buyer):
        if same_team(self.context["request"].user, buyer.pk):
            raise serializers.ValidationError("Choose an exporter outside your own organisation.")
        return buyer

    def validate_delivery_ids(self, deliveries):
        user = self.context["request"].user
        if not deliveries:
            raise serializers.ValidationError("Select the deliveries this sale is made of.")
        problems = []
        for d in deliveries:
            if not same_team(user, d.owner_id):
                raise serializers.ValidationError("Delivery not found.")
            if d.lot_id:
                problems.append(f"{d.receipt_number} is already processed into lot {d.lot.lot_id}")
            if d.transfers.filter(status__in=["offered", "accepted"]).exists():
                problems.append(f"{d.receipt_number} is already in another sale")
            if d.plot_id is None:
                problems.append(f"{d.receipt_number} has no plot — add the producer's plot first")
        no_consent = sorted({d.producer.name for d in deliveries if not d.producer.current_consent("eudr_sharing")})
        if no_consent:
            problems.append("no EUDR data-sharing consent from: " + ", ".join(no_consent))
        if problems:
            raise serializers.ValidationError(problems)
        return deliveries

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value


class ExporterChoiceSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "email", "country"]

    def get_name(self, obj):
        return obj.company_name or obj.get_full_name() or obj.email


def default_green_ratio(form):
    """Typical green-coffee yield: ~5:1 for cherry, ~2:1 dried cherry, ~1.25:1 parchment."""
    return {"cherry": Decimal("0.20"), "dry_cherry": Decimal("0.50"), "parchment": Decimal("0.80")}.get(
        form, Decimal("0.20"),
    )

