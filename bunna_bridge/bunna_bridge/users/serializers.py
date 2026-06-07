from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate, get_user_model
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "company_name", "phone", "country", "bio",
            "is_verified", "date_joined",
            "farm_name", "farm_region", "farm_kebele",
            "farm_altitude_m", "farm_size_ha", "cooperative",
            "gps_lat", "gps_lng", "boundary",
            "ecta_license_number", "ecta_license_file", "ecta_license_expiry",
        ]
        read_only_fields = ["id", "date_joined", "is_verified"]


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = [
            "email", "username", "password", "password2",
            "first_name", "last_name", "role",
            "company_name", "phone", "country",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError("Passwords do not match.")
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field] = serializers.EmailField()
        self.fields.pop("username", None)

    def validate(self, attrs):
        email    = attrs.get("email")
        password = attrs.get("password")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email.")
        user = authenticate(
            request=self.context.get("request"),
            username=user.username,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access":  str(refresh.access_token),
            "user": {
                "id":           str(user.id),
                "email":        user.email,
                "username":     user.username,
                "role":         user.role,
                "company_name": user.company_name,
                "is_verified":  user.is_verified,
            },
        }

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
            "ecta_license_number", "ecta_license_expiry",
            "lots_count", "exported_count", "avg_sca_score",
        ]

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
        result = CoffeeLot.objects.filter(exporter=obj, sca_score__isnull=False).aggregate(avg=Avg("sca_score"))
        avg = result.get("avg")
        return round(float(avg), 2) if avg else None
