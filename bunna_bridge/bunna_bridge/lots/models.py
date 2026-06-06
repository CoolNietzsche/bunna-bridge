from django.contrib.gis.db import models
from django.conf import settings
import uuid


class CoffeeLot(models.Model):
    PROCESSING_CHOICES = [
        ("washed", "Washed"),
        ("natural", "Natural"),
        ("honey", "Honey"),
        ("anaerobic", "Anaerobic"),
        ("other", "Other"),
    ]
    GRADE_CHOICES = [
        ("G1", "Grade 1"),
        ("G2", "Grade 2"),
        ("G3", "Grade 3"),
    ]
    REGION_CHOICES = [
        ("yirgacheffe", "Yirgacheffe"),
        ("sidama", "Sidama"),
        ("guji", "Guji"),
        ("jimma", "Jimma"),
        ("harrar", "Harrar"),
        ("limu", "Limu"),
        ("nekemte", "Nekemte"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("listed", "Listed"),
        ("contracted", "Contracted"),
        ("exported", "Exported"),
    ]
    LOT_TYPE_CHOICES = [
        ("spot", "Spot"),
        ("forward", "Forward Contract"),
        ("reserve", "Reserve"),
    ]

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot_id   = models.CharField(max_length=30, unique=True, db_index=True)
    name     = models.CharField(max_length=200)
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    exporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lots",
    )

    # ── Origin ──────────────────────────────────────────────────────────────
    region          = models.CharField(max_length=50, choices=REGION_CHOICES)
    kebele          = models.CharField(max_length=200, blank=True)
    washing_station = models.CharField(max_length=200, blank=True)
    altitude_m      = models.IntegerField()
    processing      = models.CharField(max_length=20, choices=PROCESSING_CHOICES)
    grade           = models.CharField(max_length=5, choices=GRADE_CHOICES)
    varietal        = models.CharField(max_length=200, default="Ethiopian Heirloom")
    harvest_date    = models.DateField()

    # ── Geospatial ───────────────────────────────────────────────────────────
    farm_location = models.PointField(srid=4326, null=True, blank=True)
    boundary = models.PolygonField(
        geography=True, srid=4326,
        null=True, blank=True,
        help_text="Lot boundary polygon"
    )

    # ── Quality ──────────────────────────────────────────────────────────────
    sca_score        = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    flavor_notes     = models.CharField(max_length=500, blank=True)
    cupping_date     = models.DateField(null=True, blank=True)
    q_grader_name    = models.CharField(max_length=200, blank=True)
    q_grader_cert_id = models.CharField(max_length=100, blank=True)

    # ── Compliance flags ─────────────────────────────────────────────────────
    deforestation_free      = models.BooleanField(default=False)
    gps_verified            = models.BooleanField(default=False)
    phyto_cert_uploaded     = models.BooleanField(default=False)
    ecta_license_active     = models.BooleanField(default=False)
    nbe_fx_declared         = models.BooleanField(default=False)
    nbe_fx_declaration_file = models.FileField(upload_to="lots/nbe/", null=True, blank=True)
    customs_declaration_file= models.FileField(upload_to="lots/customs/", null=True, blank=True)
    cta_floor_met           = models.BooleanField(default=False)
    eudr_dds_ready          = models.BooleanField(default=False)

    # ── Documents ────────────────────────────────────────────────────────────
    phyto_cert_file    = models.FileField(upload_to="lots/phyto/", null=True, blank=True)
    phyto_cert_expiry  = models.DateField(null=True, blank=True)
    ecex_permit_file   = models.FileField(upload_to="lots/ecex/", null=True, blank=True)
    ecex_permit_number = models.CharField(max_length=100, blank=True, default="")
    ecex_permit_expiry = models.DateField(null=True, blank=True)
    customs_declaration_id = models.CharField(max_length=100, blank=True, default="")
    eudr_dds_file      = models.FileField(upload_to="lots/dds/", null=True, blank=True)

    # ── Commercial ───────────────────────────────────────────────────────────
    volume_kg    = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # ── Marketplace fields (new) ─────────────────────────────────────────────
    flavor_tags          = models.JSONField(default=list, blank=True)
    farm_photos          = models.JSONField(default=list, blank=True)
    available_qty_kg     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fob_price_usd        = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    min_order_kg         = models.DecimalField(max_digits=10, decimal_places=2, default=60)
    delivery_window      = models.CharField(max_length=50, blank=True, default="")
    lot_type             = models.CharField(max_length=20, choices=LOT_TYPE_CHOICES, default="spot")
    is_organic           = models.BooleanField(default=False)
    is_fair_trade        = models.BooleanField(default=False)
    is_rainforest_alliance = models.BooleanField(default=False)
    tasting_notes        = models.TextField(blank=True, default="")
    farm_story           = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Coffee Lot"
        verbose_name_plural = "Coffee Lots"

    def save(self, *args, **kwargs):
        self.phyto_cert_uploaded = bool(self.phyto_cert_file)
        self.nbe_fx_declared = bool(self.nbe_fx_declaration_file)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lot_id} — {self.name}"

    @property
    def green_passport_ready(self):
        return all([self.deforestation_free, self.gps_verified, self.eudr_dds_ready])

    @property
    def export_ready(self):
        return all([
            self.green_passport_ready,
            self.phyto_cert_uploaded,
            self.ecta_license_active,
            self.nbe_fx_declared,
            self.cta_floor_met,
        ])

    def compliance_score(self):
        gates = [
            self.deforestation_free, self.gps_verified, self.phyto_cert_uploaded,
            self.ecta_license_active, self.nbe_fx_declared,
            self.cta_floor_met, self.eudr_dds_ready,
        ]
        return sum(gates)

    def is_eudr_ready(self):
        return self.compliance_score() == 7


class CuppingScore(models.Model):
    STATUS_CHOICES = [
        ("pending",   "Pending Review"),
        ("confirmed", "Confirmed"),
        ("disputed",  "Disputed"),
    ]
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot     = models.ForeignKey(CoffeeLot, on_delete=models.PROTECT, related_name="cupping_scores")
    grader  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cupping_scores",
    )
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    fragrance_aroma = models.DecimalField(max_digits=4, decimal_places=2)
    flavor          = models.DecimalField(max_digits=4, decimal_places=2)
    aftertaste      = models.DecimalField(max_digits=4, decimal_places=2)
    acidity         = models.DecimalField(max_digits=4, decimal_places=2)
    body            = models.DecimalField(max_digits=4, decimal_places=2)
    balance         = models.DecimalField(max_digits=4, decimal_places=2)
    uniformity      = models.DecimalField(max_digits=4, decimal_places=2)
    clean_cup       = models.DecimalField(max_digits=4, decimal_places=2)
    sweetness       = models.DecimalField(max_digits=4, decimal_places=2)
    overall         = models.DecimalField(max_digits=4, decimal_places=2)
    defects         = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    flavor_notes    = models.CharField(max_length=500, blank=True)
    notes           = models.TextField(blank=True)
    cupping_date    = models.DateField()
    cupping_location= models.CharField(max_length=200, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cupping_date", "-created_at"]

    def __str__(self):
        return f"{self.lot.lot_id} — {self.total_score} pts"

    @property
    def total_score(self):
        components = [
            self.fragrance_aroma, self.flavor, self.aftertaste,
            self.acidity, self.body, self.balance,
            self.uniformity, self.clean_cup, self.sweetness, self.overall,
        ]
        return round(float(sum(c for c in components if c is not None)) - float(self.defects or 0), 2)

    def save(self, *args, **kwargs):
        if self.pk:
            original = CuppingScore.objects.filter(pk=self.pk).first()
            if original and original.status == "confirmed":
                raise ValueError("Confirmed cupping scores cannot be edited.")
        super().save(*args, **kwargs)
        if self.status == "confirmed":
            self.lot.sca_score        = self.total_score
            self.lot.flavor_notes     = self.flavor_notes
            self.lot.cupping_date     = self.cupping_date
            self.lot.q_grader_name    = self.grader.get_full_name()
            self.lot.q_grader_cert_id = getattr(self.grader, "q_grader_cert_id", "")
            self.lot.save()


class SampleRequest(models.Model):
    STATUS_CHOICES = [
        ("pending",  "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("shipped",  "Shipped"),
        ("received", "Received"),
    ]
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot        = models.ForeignKey(CoffeeLot, on_delete=models.PROTECT, related_name="sample_requests")
    buyer      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="sample_requests"
    )
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    quantity_g      = models.IntegerField(default=200)
    message         = models.TextField(blank=True)
    response        = models.TextField(blank=True)
    shipping_address= models.TextField(blank=True)
    tracking_number = models.CharField(max_length=200, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Sample: {self.lot.lot_id} → {self.buyer.email} ({self.status})"


class Notification(models.Model):
    TYPES = [
        ('lot_status',     'Lot Status Change'),
        ('sample_request', 'Sample Request'),
        ('eudr_alert',     'EUDR Alert'),
        ('offer',          'Offer'),
    ]
    recipient         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    notification_type = models.CharField(max_length=30, choices=TYPES)
    title             = models.CharField(max_length=200)
    message           = models.TextField()
    link              = models.CharField(max_length=200, blank=True)
    is_read           = models.BooleanField(default=False)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.email}"


class Offer(models.Model):
    OFFER_STATUS_CHOICES = [
        ("pending",   "Pending"),
        ("countered", "Countered"),
        ("accepted",  "Accepted"),
        ("rejected",  "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot              = models.ForeignKey(CoffeeLot, on_delete=models.CASCADE, related_name="offers")
    buyer            = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="offers_made"
    )
    quantity_kg      = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg_usd = models.DecimalField(max_digits=10, decimal_places=4)
    delivery_window  = models.CharField(max_length=50, blank=True, default="")
    notes            = models.TextField(blank=True, default="")
    status           = models.CharField(max_length=20, choices=OFFER_STATUS_CHOICES, default="pending")
    counter_price    = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    counter_qty      = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    exporter_notes   = models.TextField(blank=True, default="")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Offer by {self.buyer} on {self.lot.lot_id} [{self.status}]"
