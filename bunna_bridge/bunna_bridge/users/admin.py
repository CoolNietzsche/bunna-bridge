from django.contrib.gis import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(admin.GISModelAdmin, UserAdmin):
    list_display  = ["email", "username", "role", "company_name",
                     "is_verified", "is_active", "date_joined"]
    list_filter   = ["role", "is_verified", "is_active", "is_staff"]
    search_fields = ["email", "username", "company_name"]
    ordering      = ["role", "email"]

    fieldsets = UserAdmin.fieldsets + (
        ("Bunna Bridge Profile", {"fields": [
            "role", "company_name", "phone", "country", "bio", "is_verified",
            "gps_lat", "gps_lng", "boundary",
        ]}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Bunna Bridge Profile", {"fields": [
            "role", "company_name", "phone", "country",
        ]}),
    )
