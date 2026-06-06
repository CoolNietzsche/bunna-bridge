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
