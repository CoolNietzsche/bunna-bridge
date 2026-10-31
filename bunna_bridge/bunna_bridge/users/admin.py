from django.contrib import messages
from django.contrib.gis import admin
from django.utils import timezone
from django.contrib.auth.admin import UserAdmin
from .models import User, Certification


@admin.register(User)
class CustomUserAdmin(admin.GISModelAdmin, UserAdmin):
    list_display  = ["email", "username", "role", "company_name",
                     "farm_id", "is_verified", "is_active", "date_joined"]
    list_filter   = ["role", "is_verified", "is_active", "is_staff"]
    search_fields = ["email", "username", "company_name", "farm_id"]
    ordering      = ["role", "email"]
    readonly_fields = [*UserAdmin.readonly_fields, "farm_id"]
    actions = ["verify_ecta_license"]

    @admin.action(description="Mark ECTA license as verified")
    def verify_ecta_license(self, request, queryset):
        done = 0
        for user in queryset.exclude(ecta_license_file="").exclude(ecta_license_file__isnull=True):
            user.ecta_license_verified_at = timezone.now()
            user.is_verified = True
            user.save()
            done += 1
        self.message_user(request, f"Verified {done} license(s).", messages.SUCCESS)

    fieldsets = UserAdmin.fieldsets + (
        ("Beersheba Profile", {"fields": [
            "role", "company_name", "phone", "country", "bio", "is_verified",
            "gps_lat", "gps_lng", "boundary",
        ]}),
        ("ECTA Export License", {"fields": [
            "ecta_license_number", "ecta_license_file", "ecta_license_expiry", "ecta_license_verified_at",
        ]}),
        ("Farm Profile", {"fields": [
            "farm_id", "farm_name", "farm_region", "farm_kebele",
            "farm_altitude_m", "farm_size_ha", "cooperative",
        ]}),
        ("Roastery Profile", {"fields": [
            "roastery_type", "roastery_monthly_capacity_kg",
            "roastery_roast_styles", "roastery_preferred_origins",
            "roastery_established_year", "roastery_website",
        ]}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Beersheba Profile", {"fields": [
            "role", "company_name", "phone", "country",
        ]}),
    )


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display  = ["holder", "cert_type", "issuing_body", "expiry_date", "is_expired"]
    list_filter   = ["cert_type"]
    search_fields = ["holder__email", "holder__company_name", "cert_number", "issuing_body"]
    ordering      = ["-created_at"]
