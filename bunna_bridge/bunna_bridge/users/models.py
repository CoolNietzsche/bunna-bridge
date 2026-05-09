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
