import uuid

from django.conf import settings
from django.db import models


class RoastEquipment(models.Model):
    class MachineType(models.TextChoices):
        DRUM      = "drum",      "Drum Roaster"
        FLUID_BED = "fluid_bed", "Fluid Bed Roaster"
        HYBRID    = "hybrid",    "Hybrid"
        OTHER     = "other",     "Other"

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roaster = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roast_equipment",
        limit_choices_to={"role": "roaster"},
    )
    name  = models.CharField(max_length=200)
    machine_type = models.CharField(max_length=20, choices=MachineType.choices, default=MachineType.DRUM)
    brand = models.CharField(max_length=200, blank=True)
    batch_capacity_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    installed_date    = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["name"]
        verbose_name = "Roast Equipment"
        verbose_name_plural = "Roast Equipment"

    def __str__(self):
        return self.name


class RoastBatch(models.Model):
    class Status(models.TextChoices):
        QUEUED   = "queued",   "Queued"
        ROASTING = "roasting", "Roasting"
        RESTING  = "resting",  "Resting"
        QC       = "qc",       "Quality Check"
        PACKAGED = "packaged", "Packaged"
        SHIPPED  = "shipped",  "Shipped"

    class RoastLevel(models.TextChoices):
        LIGHT       = "light",       "Light"
        MEDIUM      = "medium",      "Medium"
        MEDIUM_DARK = "medium_dark", "Medium-Dark"
        DARK        = "dark",        "Dark"

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_code = models.CharField(max_length=50)
    roaster    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roast_batches",
        limit_choices_to={"role": "roaster"},
    )
    equipment = models.ForeignKey(
        RoastEquipment,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="batches",
    )
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    roast_date = models.DateField(null=True, blank=True)

    # ── Roast curve (key points, not a continuous time-series log) ─────────
    roast_level          = models.CharField(max_length=20, choices=RoastLevel.choices, blank=True)
    charge_temp_c        = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    drop_temp_c          = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    first_crack_time_s   = models.PositiveIntegerField(null=True, blank=True)
    development_time_s   = models.PositiveIntegerField(null=True, blank=True)

    # ── Yield ────────────────────────────────────────────────────────────
    output_weight_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # ── QC ───────────────────────────────────────────────────────────────
    qc_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    qc_notes = models.TextField(blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [["roaster", "batch_code"]]

    def __str__(self):
        return f"{self.batch_code} ({self.roaster})"

    @property
    def input_weight_kg(self):
        return self.lot_inputs.aggregate(total=models.Sum("quantity_kg"))["total"] or 0

    @property
    def weight_loss_pct(self):
        total_in = self.input_weight_kg
        if not total_in or self.output_weight_kg is None:
            return None
        return round(float((total_in - self.output_weight_kg) / total_in) * 100, 2)


class RoastBatchLot(models.Model):
    """
    One line of a (possibly blended) roast batch: a green CoffeeLot and how
    much of it went into this batch. A batch with more than one line is a
    blend of multiple origins/lots.
    """

    id    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(RoastBatch, on_delete=models.CASCADE, related_name="lot_inputs")
    lot   = models.ForeignKey(
        "lots.CoffeeLot",
        on_delete=models.PROTECT,
        related_name="roast_batch_uses",
    )
    quantity_kg = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ["lot__lot_id"]

    def __str__(self):
        return f"{self.lot.lot_id} — {self.quantity_kg}kg → {self.batch.batch_code}"
