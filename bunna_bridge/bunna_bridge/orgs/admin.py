from django.contrib import admin

from .models import ComplianceDocument
from .models import Invitation
from .models import Membership
from .models import Organization


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "kind", "country", "created_at"]
    list_filter = ["kind"]
    search_fields = ["name", "memberships__user__email"]
    inlines = [MembershipInline]


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "organization", "role", "created_at", "accepted_at", "revoked_at"]
    readonly_fields = ["token"]


@admin.register(ComplianceDocument)
class ComplianceDocumentAdmin(admin.ModelAdmin):
    list_display = ["organization", "kind", "number", "expires_on", "verified_at"]
    list_filter = ["kind", "verified_at"]
