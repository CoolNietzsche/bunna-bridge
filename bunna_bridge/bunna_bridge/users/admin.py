from django.contrib.gis import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(admin.GISModelAdmin, UserAdmin):
    list_display  = ["email", "username", "role", "company_name",
                     "farm_id", "is_verified", "is_active", "date_joined"]
    list_filter   = ["role", "is_verified", "is_active", "is_staff"]
    search_fields = ["email", "username", "company_name", "farm_id"]
    ordering      = ["role", "email"]
    readonly_fields = [*UserAdmin.readonly_fields, "farm_id"]

    fieldsets = UserAdmin.fieldsets + (
        ("Bunna Bridge Profile", {"fields": [
            "role", "company_name", "phone", "country", "bio", "is_verified",
            "gps_lat", "gps_lng", "boundary",
        ]}),
        ("Farm Profile", {"fields": [
            "farm_id", "farm_name", "farm_region", "farm_kebele",
            "farm_altitude_m", "farm_size_ha", "cooperative",
        ]}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Bunna Bridge Profile", {"fields": [
            "role", "company_name", "phone", "country",
        ]}),
    )
