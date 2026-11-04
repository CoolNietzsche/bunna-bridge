"""
Organisations and team accounts (roadmap O-1) and the exporter compliance
profile required by ECTA Directive 1106/2025 (O-7).

Every business account belongs to one Organisation. Lots, producers,
offers and washing stations stay linked to the user who created them, but
access is shared across the organisation according to each member's team
role (see orgs/access.py).
"""

import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from bunna_bridge.lots.validators import document_extension_validator
from bunna_bridge.lots.validators import validate_document_size


class Organization(models.Model):
    class Kind(models.TextChoices):
        EXPORTER = "exporter", "Exporter"
        IMPORTER = "importer", "EU importer"
        BUYER = "buyer", "Buyer"
        ROASTER = "roaster", "Roaster"
        COOPERATIVE = "cooperative", "Cooperative / union"
        FORWARDER = "forwarder", "Freight forwarder"
        PLATFORM = "platform", "Platform"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    country = models.CharField(max_length=100, blank=True, default="Ethiopia")
    tin = models.CharField(max_length=40, blank=True, help_text="Tax identification number.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def owner(self):
        m = self.memberships.filter(role=Membership.Role.OWNER).select_related("user").first()
        return m.user if m else None


class Membership(models.Model):
    """A user's place in their organisation. One organisation per user."""

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Administrator"
        SALES = "sales", "Sales"
        QUALITY = "quality", "Quality control"
        LOGISTICS = "logistics", "Logistics and documents"
        FIELD_AGENT = "field_agent", "Field agent"
        VIEWER = "viewer", "Viewer"

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="membership")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user} @ {self.organization} ({self.role})"


def _token():
    return secrets.token_urlsafe(32)


def _expiry():
    return timezone.now() + timedelta(days=14)


class Invitation(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=Membership.Role.choices)
    token = models.CharField(max_length=64, unique=True, default=_token)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_expiry)
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def is_open(self):
        return self.accepted_at is None and self.revoked_at is None and self.expires_at > timezone.now()


class ComplianceDocument(models.Model):
    """
    Evidence an exporter keeps for ECTA Directive 1106/2025 (O-7): a certified
    coffee-quality laboratory, a certified taster employed by the exporter,
    and proof of paid-up capital. Verified by the platform team.
    """

    class Kind(models.TextChoices):
        LAB_CERTIFICATE = "lab_certificate", "Certified quality laboratory"
        TASTER_CERTIFICATE = "taster_certificate", "Certified coffee taster"
        CAPITAL_ATTESTATION = "capital_attestation", "Paid-up capital attestation"
        TRADE_LICENSE = "trade_license", "Business / trade licence"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="compliance_documents")
    kind = models.CharField(max_length=30, choices=Kind.choices)
    number = models.CharField(max_length=100, blank=True)
    holder_name = models.CharField(max_length=200, blank=True, help_text="Taster's name, lab name, or auditor.")
    amount_birr = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, help_text="Capital amount (capital attestation only).",
    )
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    file = models.FileField(
        upload_to="orgs/compliance/", validators=[document_extension_validator, validate_document_size],
    )
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    rejection_reason = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["kind", "-uploaded_at"]

    @property
    def is_expired(self):
        return bool(self.expires_on and self.expires_on < timezone.localdate())
