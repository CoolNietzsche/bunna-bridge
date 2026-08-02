import re
import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models
from django.utils import timezone

from bunna_bridge.lots.validators import document_extension_validator
from bunna_bridge.lots.validators import validate_document_size


def _region_code(text):
    letters = re.sub(r"[^A-Za-z]", "", text or "").upper()
    return (letters[:3] or "GEN").ljust(3, "X")


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN    = "admin",    "Admin"
        EXPORTER = "exporter", "Exporter"
        BUYER    = "buyer",    "Buyer"
        FARMER   = "farmer",   "Farmer"
        QGRADER  = "qgrader",  "Q-Grader"
        ROASTER  = "roaster",  "Roaster"

    class RoasteryType(models.TextChoices):
        MICRO      = "micro",      "Micro-roastery (under 500kg/month)"
        COMMERCIAL = "commercial", "Commercial roastery"
        CAFE       = "cafe",       "Café with in-house roasting"
        OTHER      = "other",      "Other"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EXPORTER,
    )
    company_name  = models.CharField(max_length=200, blank=True)
    phone         = models.CharField(max_length=30,  blank=True)
    country       = models.CharField(max_length=100, blank=True)
    bio           = models.TextField(blank=True)
    is_verified   = models.BooleanField(default=False)

    # Farmer-specific fields
    farm_id = models.CharField(
        max_length=30, unique=True, null=True, blank=True, db_index=True,
        help_text="Permanent Beersheba Farm ID, auto-generated for farmer accounts.",
    )
    farm_name       = models.CharField(max_length=200, blank=True)
    farm_region     = models.CharField(max_length=100, blank=True)
    farm_kebele     = models.CharField(max_length=200, blank=True)
    farm_altitude_m = models.IntegerField(null=True, blank=True)
    farm_size_ha    = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    cooperative     = models.CharField(max_length=200, blank=True)
    gps_lat         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_lng         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    boundary        = models.PolygonField(
        geography=True, srid=4326,
        null=True, blank=True,
        help_text='Farm boundary polygon (GPS, WGS84)'
    )

    # ECTA Export License (exporter profile)
    ecta_license_number = models.CharField(max_length=100, blank=True, default="")
    ecta_license_file   = models.FileField(
        upload_to="users/ecta/", null=True, blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    ecta_license_expiry = models.DateField(null=True, blank=True)

    # Roaster-specific fields
    roastery_type = models.CharField(max_length=20, choices=RoasteryType.choices, blank=True)
    roastery_monthly_capacity_kg = models.PositiveIntegerField(null=True, blank=True)
    roastery_roast_styles = models.CharField(
        max_length=200, blank=True,
        help_text="Comma-separated, e.g. 'light, medium, dark'.",
    )
    roastery_preferred_origins = models.CharField(
        max_length=300, blank=True,
        help_text="Comma-separated regions of sourcing interest, e.g. 'Yirgacheffe, Guji'.",
    )
    roastery_established_year = models.PositiveIntegerField(null=True, blank=True)
    roastery_website = models.URLField(blank=True)

    def save(self, *args, **kwargs):
        if self.role == self.Role.FARMER and not self.farm_id:
            self.farm_id = self._generate_farm_id()
        super().save(*args, **kwargs)

    def _generate_farm_id(self):
        region_code = _region_code(self.farm_region)
        seq = User.objects.filter(role=self.Role.FARMER).exclude(pk=self.pk).count() + 1
        candidate = f"BSB-ETH-{region_code}-{seq:06d}"
        while User.objects.filter(farm_id=candidate).exists():
            seq += 1
            candidate = f"BSB-ETH-{region_code}-{seq:06d}"
        return candidate

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_exporter(self):
        return self.role == self.Role.EXPORTER

    @property
    def is_buyer(self):
        return self.role == self.Role.BUYER

    @property
    def is_farmer(self):
        return self.role == self.Role.FARMER

    @property
    def is_qgrader(self):
        return self.role == self.Role.QGRADER

    @property
    def is_roaster(self):
        return self.role == self.Role.ROASTER


class Certification(models.Model):
    """
    A cert record (organic, fair trade, ISO, etc.) held by an exporter,
    roaster, or washing station. Replaces the free-standing is_organic /
    is_fair_trade / is_rainforest_alliance booleans on CoffeeLot — those are
    now derived from these records (see users/signals.py) rather than set
    per-lot, since a certification belongs to the holder, not one lot.
    """

    class CertType(models.TextChoices):
        ORGANIC              = "organic",              "Organic"
        FAIR_TRADE           = "fair_trade",            "Fair Trade"
        RAINFOREST_ALLIANCE  = "rainforest_alliance",   "Rainforest Alliance"
        UTZ                  = "utz",                   "UTZ"
        Q_ARABICA            = "q_arabica",              "Q Arabica"
        ISO                  = "iso",                    "ISO"
        HACCP                = "haccp",                  "HACCP"
        OTHER                = "other",                  "Other"

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    holder  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certifications",
    )
    cert_type     = models.CharField(max_length=30, choices=CertType.choices)
    issuing_body  = models.CharField(max_length=200, blank=True)
    cert_number   = models.CharField(max_length=100, blank=True)
    issue_date    = models.DateField(null=True, blank=True)
    expiry_date   = models.DateField(null=True, blank=True)
    file = models.FileField(
        upload_to="certifications/", null=True, blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Certification"

    def __str__(self):
        return f"{self.get_cert_type_display()} — {self.holder}"

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.localdate())
