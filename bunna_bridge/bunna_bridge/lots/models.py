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
    farm_polygon  = models.PolygonField(srid=4326, null=True, blank=True)

    # Quality
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
