from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN    = "admin",    "Admin"
        EXPORTER = "exporter", "Exporter"
        BUYER    = "buyer",    "Buyer"
        FARMER   = "farmer",   "Farmer"
        QGRADER  = "qgrader",  "Q-Grader"

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
    farm_name       = models.CharField(max_length=200, blank=True)
    farm_region     = models.CharField(max_length=100, blank=True)
    farm_kebele     = models.CharField(max_length=200, blank=True)
    farm_altitude_m = models.IntegerField(null=True, blank=True)
    farm_size_ha    = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    cooperative     = models.CharField(max_length=200, blank=True)
    gps_lat         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_lng         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

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
