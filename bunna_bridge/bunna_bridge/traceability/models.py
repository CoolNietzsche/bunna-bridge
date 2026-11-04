"""
EUDR traceability backbone (roadmap Phase 1).

Producer → Plot → LotSource → CoffeeLot. A lot can now draw from many
plots (real Ethiopian lots blend dozens of smallholders), each with the kg
it contributed. Around that sit the due-diligence records the EU importer
needs: producer consent, a risk register with mitigation evidence, the
exporter's sign-off, the evidence packages handed to the importer, and the
DDS reference numbers the importer records after filing in the EU
Information System.

Retention: EUDR requires supplier/customer records for 5 years, so these
records are archived, never hard-deleted (see `archived_at`).
"""

import uuid

from django.conf import settings
from django.contrib.gis.db import models

from bunna_bridge.lots.validators import document_extension_validator
from bunna_bridge.lots.validators import validate_document_size


class ArchiveQuerySet(models.QuerySet):
    def active(self):
        return self.filter(archived_at__isnull=True)


class Producer(models.Model):
    """
    A coffee producer (smallholder, estate or farmer group). Most Ethiopian
    producers will never log in: they are registered and managed by an
    exporter, cooperative or field agent (`owner`). `user` links a producer
    who does have a farmer account.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="managed_producers",
        help_text="Account that registered and manages this producer's records.",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="producer_profile",
        help_text="The producer's own farmer login, if any.",
    )
    external_ref = models.CharField(
        max_length=80,
        blank=True,
        help_text="The owner's own reference (supplier code, member number). Unique per owner; used to match imports.",
    )
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, blank=True)
    language = models.CharField(
        max_length=2, choices=[("am", "Amharic"), ("om", "Afaan Oromo"), ("en", "English")], default="am",
        help_text="Language for SMS and printed receipts.",
    )
    region = models.CharField(max_length=100, blank=True)
    zone = models.CharField(max_length=100, blank=True)
    woreda = models.CharField(max_length=100, blank=True)
    kebele = models.CharField(max_length=100, blank=True)
    cooperative = models.CharField(max_length=200, blank=True)
    ectms_farmer_id = models.CharField(
        max_length=60,
        blank=True,
        db_index=True,
        help_text="Farmer ID in Ethiopia's national Coffee Traceability and Management System (ECTMS).",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = ArchiveQuerySet.as_manager()

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "external_ref"],
                condition=~models.Q(external_ref=""),
                name="unique_producer_ref_per_owner",
            ),
        ]

    def __str__(self):
        return self.name

    def current_consent(self, purpose):
        record = (
            self.consents.filter(purpose=purpose)
            .order_by("-captured_at", "-id")
            .first()
        )
        return bool(record and record.granted and record.revoked_at is None)


class Plot(models.Model):
    """
    One production plot. EUDR (via the EU Information System) accepts a
    single point for plots of 4 ha or less; larger plots need a polygon.
    Validation lives in traceability/geo.py and runs on every save.
    """

    class DeforestationStatus(models.TextChoices):
        CLEAR = "clear", "No forest loss after 2020"
        OVERLAP = "overlap", "Overlaps forest loss after 2020"
        PENDING = "pending", "Not checked yet"
        NO_DATA = "no_data", "No reference data loaded"

    class Tenure(models.TextChoices):
        OWNED = "owned", "Owned / holding certificate"
        RENTED = "rented", "Rented / sharecropped"
        COMMUNAL = "communal", "Communal / customary"
        OTHER = "other", "Other / unknown"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(
        Producer, on_delete=models.PROTECT, related_name="plots",
    )
    name = models.CharField(max_length=120, blank=True)
    ectms_farm_id = models.CharField(
        max_length=60,
        blank=True,
        db_index=True,
        help_text="Farm ID / QR code issued by ECTMS.",
    )
    location = models.PointField(
        srid=4326, null=True, blank=True, help_text="Single point (plots ≤ 4 ha).",
    )
    boundary = models.PolygonField(
        srid=4326, null=True, blank=True, help_text="Plot perimeter (required > 4 ha).",
    )
    area_ha = models.DecimalField(
        max_digits=9,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Geodesic area for polygons; declared area for points.",
    )
    declared_area_ha = models.DecimalField(
        max_digits=9,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Area stated by the producer or field agent (used to decide if a polygon is required).",
    )
    land_tenure = models.CharField(
        max_length=20, choices=Tenure.choices, default=Tenure.OTHER,
    )
    notes = models.TextField(blank=True)
    photo = models.FileField(
        upload_to="traceability/plots/",
        null=True,
        blank=True,
        validators=[document_extension_validator, validate_document_size],
        help_text="Field photo of the plot (taken by the field agent).",
    )

    deforestation_status = models.CharField(
        max_length=10,
        choices=DeforestationStatus.choices,
        default=DeforestationStatus.PENDING,
    )
    deforestation_overlap_count = models.PositiveIntegerField(default=0)
    deforestation_checked_at = models.DateTimeField(null=True, blank=True)
    deforestation_datasets = models.CharField(max_length=300, blank=True)
    forest_2020_overlap_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Share of the plot inside 2020 forest cover (JRC GFC2020), when that layer is loaded.",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = ArchiveQuerySet.as_manager()

    class Meta:
        ordering = ["producer__name", "name"]

    def __str__(self):
        return f"{self.producer.name} — {self.name or self.ectms_farm_id or str(self.id)[:8]}"

    @property
    def geometry(self):
        return self.boundary or self.location

    @property
    def geometry_type(self):
        if self.boundary:
            return "Polygon"
        if self.location:
            return "Point"
        return None

    def save(self, *args, **kwargs):
        from .geo import refresh_plot_derived_fields

        previous = None
        if self.pk and not self._state.adding:
            previous = Plot.objects.filter(pk=self.pk).first()
        refresh_plot_derived_fields(self, previous)
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {
                "area_ha",
                "deforestation_status",
                "deforestation_overlap_count",
                "deforestation_checked_at",
                "deforestation_datasets",
                "forest_2020_overlap_pct",
            }
        super().save(*args, **kwargs)


class LotSource(models.Model):
    """One plot's contribution to a lot (kg of green-coffee equivalent)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey(
        "lots.CoffeeLot", on_delete=models.CASCADE, related_name="sources",
    )
    plot = models.ForeignKey(Plot, on_delete=models.PROTECT, related_name="lot_sources")
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_reference = models.CharField(
        max_length=80,
        blank=True,
        help_text="Cherry delivery receipt / washing-station intake number.",
    )
    delivered_on = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["lot", "plot"], name="unique_plot_per_lot"),
        ]

    def __str__(self):
        return f"{self.lot.lot_id} ← {self.plot} ({self.quantity_kg} kg)"


class ProducerConsent(models.Model):
    """Opt-in, purpose-specific consent (Ethiopia Proclamation 1321/2024). Latest record per purpose wins."""

    class Purpose(models.TextChoices):
        EUDR_SHARING = (
            "eudr_sharing",
            "Share plot location and name with EU buyers for EUDR due diligence",
        )
        STORY = "story", "Show farm story and photos on public lot pages"

    class Method(models.TextChoices):
        IN_APP = "in_app", "In the app by the producer"
        PAPER = "paper", "Signed paper form (photo attached)"
        SMS = "sms", "SMS confirmation"
        WITNESSED = "witnessed", "Verbal, witnessed by field agent"

    producer = models.ForeignKey(
        Producer, on_delete=models.CASCADE, related_name="consents",
    )
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    granted = models.BooleanField(default=True)
    method = models.CharField(max_length=20, choices=Method.choices)
    evidence = models.FileField(
        upload_to="traceability/consent/",
        null=True,
        blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    captured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    captured_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-captured_at"]


class LotRisk(models.Model):
    """One entry in a lot's EUDR risk register (Art. 10 risk assessment)."""

    class Severity(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        MITIGATED = "mitigated", "Mitigated"
        ACCEPTED = "accepted", "Accepted with justification"
        RESOLVED = "resolved", "No longer applies"

    id = models.BigAutoField(primary_key=True)
    lot = models.ForeignKey(
        "lots.CoffeeLot", on_delete=models.CASCADE, related_name="risks",
    )
    code = models.CharField(max_length=40)
    automatic = models.BooleanField(default=True)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    title = models.CharField(max_length=200)
    detail = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.OPEN,
    )
    justification = models.TextField(blank=True)
    affected = models.JSONField(
        default=list,
        blank=True,
        help_text="IDs of the plots/producers this risk was raised for. New items re-open a mitigated risk.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["lot", "code"], name="unique_risk_code_per_lot",
            ),
        ]

    def __str__(self):
        return f"{self.lot.lot_id} {self.code} [{self.status}]"


class MitigationAction(models.Model):
    class Kind(models.TextChoices):
        FIELD_VISIT = "field_visit", "Field visit"
        SATELLITE_RECHECK = "satellite_recheck", "Satellite re-check"
        THIRD_PARTY = "third_party", "Third-party verification"
        DOCUMENT = "document", "Document obtained"
        EXCLUDED = "excluded", "Supplier or plot excluded from the lot"
        OTHER = "other", "Other"

    risk = models.ForeignKey(
        LotRisk, on_delete=models.CASCADE, related_name="mitigations",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    notes = models.TextField()
    evidence = models.FileField(
        upload_to="traceability/mitigation/",
        null=True,
        blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    location = models.PointField(srid=4326, null=True, blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["performed_at"]


class RiskSignOff(models.Model):
    """The exporter's conclusion on a lot's risk assessment. Stale once the register changes."""

    lot = models.ForeignKey(
        "lots.CoffeeLot", on_delete=models.CASCADE, related_name="risk_signoffs",
    )
    conclusion = models.CharField(max_length=300)
    register_fingerprint = models.CharField(max_length=64)
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    signed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-signed_at", "-id"]


class EvidencePackage(models.Model):
    """
    The due-diligence evidence handed to the EU importer (who files the DDS).
    Immutable once generated; a newer package supersedes it. `fingerprint`
    covers the sources and their geometry, so any change makes it stale.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey(
        "lots.CoffeeLot", on_delete=models.CASCADE, related_name="evidence_packages",
    )
    file = models.FileField(upload_to="traceability/packages/")
    sha256 = models.CharField(max_length=64)
    fingerprint = models.CharField(max_length=64)
    plots_count = models.PositiveIntegerField()
    producers_count = models.PositiveIntegerField()
    total_kg = models.DecimalField(max_digits=12, decimal_places=2)
    geojson_files = models.PositiveIntegerField(default=1)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]


class DdsReference(models.Model):
    """
    Reference + verification number of the Due Diligence Statement the EU
    importer filed in the EU Information System. Recorded by the importer;
    downstream buyers keep it (EUDR as amended by Reg. (EU) 2025/2650).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey(
        "lots.CoffeeLot", on_delete=models.PROTECT, related_name="dds_references",
    )
    offer = models.ForeignKey(
        "lots.Offer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="dds_references",
    )
    reference_number = models.CharField(max_length=80)
    verification_number = models.CharField(max_length=80, blank=True)
    submitted_on = models.DateField(null=True, blank=True)
    package = models.ForeignKey(
        EvidencePackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+",
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["lot", "reference_number"], name="unique_dds_reference_per_lot",
            ),
        ]


class ForestBaseline2020(models.Model):
    """Forest cover on 31 Dec 2020 (e.g. JRC Global Forest Cover 2020), clipped to areas we need."""

    geometry = models.MultiPolygonField(srid=4326)
    source = models.CharField(max_length=120, default="JRC GFC2020 v2")
    tile = models.CharField(max_length=60, blank=True)

    class Meta:
        indexes = [models.Index(fields=["source"])]


class CherryDelivery(models.Model):
    """
    One delivery of cherry (or parchment) by a producer to a washing station
    or cooperative (roadmap O-3). Recording what each farmer delivered and was
    paid links plots to lots and makes payments transparent to the farmer.
    """

    class Form(models.TextChoices):
        CHERRY = "cherry", "Red cherry"
        PARCHMENT = "parchment", "Parchment"
        DRY_CHERRY = "dry_cherry", "Dried cherry"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cherry_deliveries_received",
        help_text="The exporter, station or cooperative account that received the coffee.",
    )
    station = models.ForeignKey(
        "lots.WashingStation", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries",
    )
    producer = models.ForeignKey(Producer, on_delete=models.PROTECT, related_name="deliveries")
    plot = models.ForeignKey(Plot, on_delete=models.PROTECT, null=True, blank=True, related_name="deliveries")
    form = models.CharField(max_length=12, choices=Form.choices, default=Form.CHERRY)
    receipt_number = models.CharField(max_length=60)
    delivered_on = models.DateField()
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg_etb = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_paid_etb = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    paid_on = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=80, blank=True, help_text="Mobile-money or bank reference.")
    lot = models.ForeignKey(
        "lots.CoffeeLot", on_delete=models.SET_NULL, null=True, blank=True, related_name="cherry_deliveries",
        help_text="Lot this delivery was processed into.",
    )
    green_equivalent_kg = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Green-coffee weight credited to the lot when allocated.",
    )
    notes = models.CharField(max_length=300, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-delivered_on", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "receipt_number"], name="unique_receipt_per_owner"),
        ]

    def __str__(self):
        return f"{self.receipt_number} {self.producer} {self.weight_kg} kg"

    @property
    def amount_due_etb(self):
        if self.price_per_kg_etb is None:
            return None
        return (self.weight_kg * self.price_per_kg_etb).quantize(self.weight_kg)


class SupplyTransfer(models.Model):
    """
    A cooperative or union sells coffee to an exporter (roadmap O-2). The
    deliveries in the transfer carry their producers and plots with them, so
    once the exporter accepts, those plots can be used as lot sources.
    """

    class Status(models.TextChoices):
        OFFERED = "offered", "Offered"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="supply_sold")
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="supply_bought")
    reference = models.CharField(max_length=60)
    deliveries = models.ManyToManyField(CherryDelivery, related_name="transfers")
    form = models.CharField(max_length=12, choices=CherryDelivery.Form.choices, default=CherryDelivery.Form.PARCHMENT)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    price_per_kg_etb = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OFFERED)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference}: {self.seller} → {self.buyer} ({self.status})"


class FieldSyncRecord(models.Model):
    """
    Idempotency record for the offline field app (roadmap O-4). Each queued
    item carries a UUID generated on the phone; re-sending it after a dropped
    connection returns the record created the first time.
    """

    client_id = models.UUIDField(unique=True)
    kind = models.CharField(max_length=20)
    object_id = models.CharField(max_length=64)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
