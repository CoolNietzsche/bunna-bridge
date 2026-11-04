"""
Quality data (roadmap Phase 4).

CvaAssessment      SCA Coffee Value Assessment (descriptive + affective), Q-1
PhysicalAnalysis   green-coffee lab analysis, Q-2
CuppingSession     blind cupping table with several graders, Q-3
  SessionSample    one coded cup on the table (lot and/or contract sample)
  SessionGrader    an invited grader

Assessments and analyses can also point at a contract sample (pre-shipment
or arrival), which feeds the PSS-versus-arrival comparison, Q-4.
"""

import random
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from .scoring import cva_score
from .scoring import green_classification


class CuppingSession(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open for scoring"
        CLOSED = "closed", "Closed"
        REVEALED = "revealed", "Results revealed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cupping_sessions")
    name = models.CharField(max_length=120)
    held_on = models.DateField()
    location = models.CharField(max_length=120, blank=True)
    blind = models.BooleanField(default=True, help_text="Graders see sample codes only until results are revealed.")
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-held_on", "-created_at"]

    def __str__(self):
        return self.name

    def new_code(self):
        used = set(self.samples.values_list("code", flat=True))
        rng = random.SystemRandom()
        while True:
            code = str(rng.randint(100, 999))
            if code not in used:
                return code


class SessionSample(models.Model):
    session = models.ForeignKey(CuppingSession, on_delete=models.CASCADE, related_name="samples")
    code = models.CharField(max_length=6)
    position = models.PositiveSmallIntegerField(default=0)
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.PROTECT, null=True, blank=True,
                            related_name="session_samples")
    contract_sample = models.ForeignKey("trade.ContractSample", on_delete=models.PROTECT, null=True, blank=True,
                                        related_name="session_samples")
    label = models.CharField(max_length=120, blank=True, help_text="Private label, e.g. an offer sample not yet a lot.")
    published_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=["session", "code"], name="unique_code_per_session")]

    @property
    def display_name(self):
        if self.lot_id:
            return f"{self.lot.lot_id} — {self.lot.name}"
        if self.contract_sample_id:
            cs = self.contract_sample
            return f"{cs.contract.number} {cs.get_kind_display()}"
        return self.label or f"Sample {self.code}"


class SessionGrader(models.Model):
    session = models.ForeignKey(CuppingSession, on_delete=models.CASCADE, related_name="graders")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="session_seats")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["session", "user"], name="unique_grader_per_session")]


class CvaAssessment(models.Model):
    """One grader's CVA of one sample (descriptive + affective)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        CONFIRMED = "confirmed", "Confirmed (sets the lot score)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cva_assessments")
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.PROTECT, null=True, blank=True,
                            related_name="cva_assessments")
    session_sample = models.ForeignKey(SessionSample, on_delete=models.CASCADE, null=True, blank=True,
                                       related_name="assessments")
    contract_sample = models.ForeignKey("trade.ContractSample", on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name="cva_assessments")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUBMITTED)
    assessed_on = models.DateField()
    roast_level = models.CharField(max_length=20, blank=True, help_text="Agtron or descriptive roast level.")

    # Descriptive assessment — intensities 0–15 and check-all-that-apply categories.
    intensities = models.JSONField(default=dict, blank=True)
    flavor_categories = models.JSONField(default=list, blank=True)
    main_acid = models.CharField(max_length=20, blank=True)
    mouthfeel_type = models.CharField(max_length=30, blank=True)
    descriptors = models.CharField(max_length=300, blank=True, help_text="Free-text tasting notes.")

    # Affective assessment — hedonic 1–9 per attribute.
    fragrance = models.PositiveSmallIntegerField()
    aroma = models.PositiveSmallIntegerField()
    flavor = models.PositiveSmallIntegerField()
    aftertaste = models.PositiveSmallIntegerField()
    acidity = models.PositiveSmallIntegerField()
    sweetness = models.PositiveSmallIntegerField()
    mouthfeel = models.PositiveSmallIntegerField()
    overall = models.PositiveSmallIntegerField()
    non_uniform_cups = models.PositiveSmallIntegerField(default=0)
    defective_cups = models.PositiveSmallIntegerField(default=0)

    score = models.DecimalField(max_digits=5, decimal_places=2, editable=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-assessed_on", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["session_sample", "grader"], condition=models.Q(session_sample__isnull=False),
                                    name="one_assessment_per_grader_per_cup"),
        ]

    def hedonic(self):
        return {a: getattr(self, a) for a in ("fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness",
                                              "mouthfeel", "overall")}

    def save(self, *args, **kwargs):
        self.score = cva_score(self.hedonic(), self.non_uniform_cups, self.defective_cups)
        super().save(*args, **kwargs)


class PhysicalAnalysis(models.Model):
    """Green-coffee lab analysis of one sample (Q-2)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.PROTECT, related_name="physical_analyses")
    contract_sample = models.ForeignKey("trade.ContractSample", on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name="physical_analyses")
    analysed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                    related_name="physical_analyses")
    analysed_on = models.DateField()
    lab = models.CharField(max_length=120, blank=True)
    sample_weight_g = models.PositiveIntegerField(default=350)
    moisture_pct = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    water_activity = models.DecimalField(max_digits=4, decimal_places=3, null=True, blank=True)
    density_g_l = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True,
                                      help_text="Free-settled density.")
    screens = models.JSONField(default=dict, blank=True, help_text="Percent retained per screen size.")
    defects = models.JSONField(default=dict, blank=True, help_text="Raw counts per SCA defect type.")
    quakers = models.PositiveSmallIntegerField(default=0, help_text="Quakers in a 100 g roasted sample.")
    odour = models.CharField(max_length=60, blank=True, default="Clean")
    color = models.CharField(max_length=60, blank=True, help_text="e.g. bluish-green, green, faded.")
    ecta_grade = models.CharField(max_length=4, blank=True, help_text="Grade given by ECTA's liquoring centre.")
    ecta_certificate = models.CharField(max_length=60, blank=True)
    primary_full_defects = models.PositiveIntegerField(default=0, editable=False)
    secondary_full_defects = models.PositiveIntegerField(default=0, editable=False)
    sca_green_grade = models.CharField(max_length=20, blank=True, editable=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-analysed_on", "-created_at"]

    def save(self, *args, **kwargs):
        result = green_classification(self.defects, self.quakers)
        self.primary_full_defects = result["primary_full_defects"]
        self.secondary_full_defects = result["secondary_full_defects"]
        self.sca_green_grade = result["grade"]
        super().save(*args, **kwargs)

    @property
    def screen_18_plus(self):
        return sum(Decimal(str(self.screens.get(s) or 0)) for s in ("20", "19", "18"))
