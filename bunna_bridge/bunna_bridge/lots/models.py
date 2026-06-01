from django.contrib.gis.db import models
from django.conf import settings
import uuid


class CoffeeLot(models.Model):
    PROCESSING_CHOICES = [
        ("washed", "Washed"),
        ("natural", "Natural"),
        ("honey", "Honey"),
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

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot_id   = models.CharField(max_length=30, unique=True, db_index=True)
    name     = models.CharField(max_length=200)
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    exporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lots",
    )

    # Origin
    region          = models.CharField(max_length=50, choices=REGION_CHOICES)
    kebele          = models.CharField(max_length=200, blank=True)
    washing_station = models.CharField(max_length=200, blank=True)
    altitude_m      = models.IntegerField()
    processing      = models.CharField(max_length=20, choices=PROCESSING_CHOICES)
    grade           = models.CharField(max_length=5, choices=GRADE_CHOICES)
    varietal        = models.CharField(max_length=200, default="Ethiopian Heirloom")
    harvest_date    = models.DateField()

    # Geospatial
    farm_location = models.PointField(srid=4326, null=True, blank=True)
    boundary = models.PolygonField(
        geography=True, srid=4326,
        null=True, blank=True,
        help_text="Lot boundary polygon — overrides farm polygon if set"
    )

    # Quality — set from latest confirmed CuppingScore
    sca_score        = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    flavor_notes     = models.CharField(max_length=500, blank=True)
    cupping_date     = models.DateField(null=True, blank=True)
    q_grader_name    = models.CharField(max_length=200, blank=True)
    q_grader_cert_id = models.CharField(max_length=100, blank=True)

    # Compliance flags
    deforestation_free  = models.BooleanField(default=False)
    gps_verified        = models.BooleanField(default=False)
    phyto_cert_uploaded = models.BooleanField(default=False)
    ecta_license_active = models.BooleanField(default=False)
    nbe_fx_declared     = models.BooleanField(default=False)
    cta_floor_met       = models.BooleanField(default=False)
    eudr_dds_ready      = models.BooleanField(default=False)

    # Documents
    phyto_cert_file = models.FileField(upload_to="lots/phyto/", null=True, blank=True)
    eudr_dds_file   = models.FileField(upload_to="lots/dds/",   null=True, blank=True)

    # Commercial
    volume_kg    = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=8,  decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Coffee Lot"
        verbose_name_plural = "Coffee Lots"

    def save(self, *args, **kwargs):
        # Auto-update phyto_cert_uploaded based on file presence
        self.phyto_cert_uploaded = bool(self.phyto_cert_file)
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


class CuppingScore(models.Model):
    """
    Write-once cupping score record.
    Once submitted and confirmed, score cannot be edited — only appended.
    """
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
    status  = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # SCA protocol scores
    fragrance_aroma = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    flavor          = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    aftertaste      = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    acidity         = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    body            = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    balance         = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    uniformity      = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    clean_cup       = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    sweetness       = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    overall         = models.DecimalField(max_digits=4, decimal_places=2, help_text="6–10")
    defects         = models.DecimalField(max_digits=4, decimal_places=2, default=0, help_text="Penalty points")

    flavor_notes    = models.CharField(max_length=500, blank=True)
    notes           = models.TextField(blank=True, help_text="Private Q-Grader notes")
    cupping_date    = models.DateField()
    cupping_location= models.CharField(max_length=200, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cupping_date", "-created_at"]
        verbose_name = "Cupping Score"
        verbose_name_plural = "Cupping Scores"

    def __str__(self):
        return f"{self.lot.lot_id} — {self.total_score} pts ({self.grader.get_full_name()})"

    @property
    def total_score(self):
        components = [
            self.fragrance_aroma, self.flavor, self.aftertaste,
            self.acidity, self.body, self.balance,
            self.uniformity, self.clean_cup, self.sweetness, self.overall,
        ]
        return round(float(sum(c for c in components if c is not None)) - float(self.defects or 0), 2)

    def save(self, *args, **kwargs):
        # Write-once — prevent editing confirmed scores
        if self.pk:
            original = CuppingScore.objects.filter(pk=self.pk).first()
            if original and original.status == "confirmed":
                raise ValueError("Confirmed cupping scores cannot be edited.")
        super().save(*args, **kwargs)
        # If confirmed, update the lot's quality fields
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
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    quantity_g = models.IntegerField(default=200, help_text="Sample size in grams")
    message    = models.TextField(blank=True, help_text="Message from buyer")
    response   = models.TextField(blank=True, help_text="Response from exporter")
    shipping_address = models.TextField(blank=True)
    tracking_number  = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Sample: {self.lot.lot_id} → {self.buyer.email} ({self.status})"



class Notification(models.Model):
    TYPES = [
        ('lot_status', 'Lot Status Change'),
        ('sample_request', 'Sample Request'),
        ('eudr_alert', 'EUDR Alert'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=30, choices=TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=200, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.email}"
