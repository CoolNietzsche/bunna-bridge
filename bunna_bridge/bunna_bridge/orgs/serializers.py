from rest_framework import serializers

from .models import ComplianceDocument
from .models import Invitation
from .models import Membership
from .models import Organization


class MemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user_id", "email", "name", "role", "role_label", "joined_at"]
        read_only_fields = ["id", "joined_at"]

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class InvitationSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.CharField(source="invited_by.email", read_only=True, default=None)
    is_open = serializers.BooleanField(read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Invitation
        fields = ["id", "email", "role", "role_label", "token", "invited_by_email", "created_at", "expires_at",
                  "accepted_at", "revoked_at", "is_open"]
        read_only_fields = ["id", "token", "created_at", "expires_at", "accepted_at", "revoked_at"]

    def validate_role(self, value):
        if value == Membership.Role.OWNER:
            raise serializers.ValidationError("Invite as administrator; ownership is not transferable by invitation.")
        return value


class OrganizationSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "kind", "kind_label", "country", "tin", "created_at"]
        read_only_fields = ["id", "kind", "created_at"]


class ComplianceDocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    uploaded_by_email = serializers.CharField(source="uploaded_by.email", read_only=True, default=None)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ComplianceDocument
        fields = [
            "id", "kind", "kind_label", "number", "holder_name", "amount_birr", "issued_on", "expires_on", "file",
            "organization_name", "uploaded_by_email", "uploaded_at", "verified_at", "rejection_reason", "is_expired",
        ]
        read_only_fields = ["id", "uploaded_at", "verified_at", "rejection_reason"]

    def validate(self, attrs):
        kind = attrs.get("kind")
        if kind == ComplianceDocument.Kind.TASTER_CERTIFICATE and not attrs.get("holder_name"):
            raise serializers.ValidationError({"holder_name": "Name the certified taster."})
        if kind == ComplianceDocument.Kind.CAPITAL_ATTESTATION and attrs.get("amount_birr") is None:
            raise serializers.ValidationError({"amount_birr": "Enter the attested capital in Birr."})
        return attrs
