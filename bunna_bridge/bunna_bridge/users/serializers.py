from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Certification
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "company_name", "phone", "country", "bio",
            "is_verified", "date_joined",
            "farm_id", "farm_name", "farm_region", "farm_kebele",
            "farm_altitude_m", "farm_size_ha", "cooperative",
            "gps_lat", "gps_lng", "boundary",
            "ecta_license_number", "ecta_license_file", "ecta_license_expiry",
            "ecta_license_verified_at",
            "roastery_type", "roastery_monthly_capacity_kg",
            "roastery_roast_styles", "roastery_preferred_origins",
            "roastery_established_year", "roastery_website",
            "organization",
        ]
        # role is fixed at registration (qgrader/admin are assigned by staff);
        # verification fields are set by staff only.
        read_only_fields = ["id", "date_joined", "is_verified", "farm_id", "role", "ecta_license_verified_at"]

    def get_organization(self, obj):
        from bunna_bridge.orgs.access import CAPABILITIES
        from bunna_bridge.orgs.access import membership_of

        m = membership_of(obj)
        if m is None:
            return None
        return {
            "id": str(m.organization_id),
            "name": m.organization.name,
            "kind": m.organization.kind,
            "team_role": m.role,
            "capabilities": sorted(c for c, roles in CAPABILITIES.items() if m.role in roles),
        }


SELF_SERVICE_ROLES = ["exporter", "buyer", "importer", "farmer", "roaster", "cooperative", "forwarder"]


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    role      = serializers.ChoiceField(choices=SELF_SERVICE_ROLES, default="exporter")
    invite_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = [
            "email", "username", "password", "password2",
            "first_name", "last_name", "role",
            "company_name", "phone", "country", "invite_token",
        ]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        candidate = User(
            username=attrs.get("username", ""), email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""), last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        token = attrs.pop("invite_token", "") or ""
        if token:
            from bunna_bridge.orgs.models import Invitation

            invitation = Invitation.objects.filter(token=token).select_related("organization").first()
            if invitation is None or not invitation.is_open:
                raise serializers.ValidationError({"invite_token": "This invitation is no longer valid."})
            if invitation.email.lower() != attrs.get("email", "").lower():
                raise serializers.ValidationError({"email": "Use the email address the invitation was sent to."})
            attrs["role"] = invitation.organization.kind
            attrs["company_name"] = invitation.organization.name
            self._invitation = invitation
        return attrs

    def create(self, validated_data):
        from django.db import transaction

        invitation = getattr(self, "_invitation", None)
        password = validated_data.pop("password")
        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            if invitation is not None:
                user._skip_org_creation = True  # noqa: SLF001 - joins the inviting organisation
            user.save()
            if invitation is not None:
                from bunna_bridge.orgs.services import accept_invitation

                accept_invitation(invitation, user)
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field] = serializers.EmailField()
        self.fields.pop("username", None)

    def validate(self, attrs):
        email    = attrs.get("email")
        password = attrs.get("password")
        invalid = serializers.ValidationError("Invalid email or password.")
        account = User.objects.filter(email__iexact=email).first()
        if account is None:
            raise invalid
        user = authenticate(
            request=self.context.get("request"),
            username=account.username,
            password=password,
        )
        if not user or not user.is_active:
            raise invalid
        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access":  str(refresh.access_token),
            "user": {
                "id":           str(user.id),
                "email":        user.email,
                "username":     user.username,
                "role":         user.role,
                "first_name":   user.first_name,
                "last_name":    user.last_name,
                "company_name": user.company_name,
                "is_verified":  user.is_verified,
                "organization": UserSerializer().get_organization(user),
            },
        }

class FarmerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "full_name", "farm_id", "farm_name",
            "farm_region", "farm_kebele", "cooperative",
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class ExporterPublicSerializer(serializers.ModelSerializer):
    full_name    = serializers.SerializerMethodField()
    lots_count   = serializers.SerializerMethodField()
    exported_count = serializers.SerializerMethodField()
    avg_sca_score  = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "full_name", "company_name", "country", "bio",
            "is_verified", "date_joined",
            "ecta_license_number", "ecta_license_expiry", "license_verified",
            "lots_count", "exported_count", "avg_sca_score",
        ]

    license_verified = serializers.SerializerMethodField()

    def get_license_verified(self, obj):
        return bool(obj.ecta_license_verified_at)

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_lots_count(self, obj):
        from bunna_bridge.lots.models import CoffeeLot
        return CoffeeLot.objects.filter(exporter=obj, status__in=["listed","contracted","exported"]).count()

    def get_exported_count(self, obj):
        from bunna_bridge.lots.models import CoffeeLot
        return CoffeeLot.objects.filter(exporter=obj, status="exported").count()

    def get_avg_sca_score(self, obj):
        from django.db.models import Avg
        from bunna_bridge.lots.models import CoffeeLot
        result = CoffeeLot.objects.filter(
            exporter=obj, sca_score__isnull=False, status__in=["listed", "contracted", "exported"],
        ).aggregate(avg=Avg("sca_score"))
        avg = result.get("avg")
        return round(float(avg), 2) if avg else None


class CertificationSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model  = Certification
        fields = [
            "id", "cert_type", "issuing_body", "cert_number",
            "issue_date", "expiry_date", "file", "is_expired",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LicenseReviewSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    lots_count = serializers.IntegerField(source="lots.count", read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "company_name", "role",
            "ecta_license_number", "ecta_license_expiry", "ecta_license_verified_at",
            "lots_count", "date_joined",
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email
