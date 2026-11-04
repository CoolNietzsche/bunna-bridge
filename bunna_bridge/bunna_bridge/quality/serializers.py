from rest_framework import serializers

from .models import CuppingSession
from .models import CvaAssessment
from .models import PhysicalAnalysis
from .scoring import CVA_AFFECTIVE
from .scoring import CVA_DESCRIPTIVE
from .scoring import CVA_FLAVOR_CATEGORIES
from .scoring import CVA_MAX_CATEGORIES
from .scoring import DEFECTS
from .scoring import SCREEN_SIZES
from .scoring import cva_band
from .scoring import physical_warnings


class CvaSerializer(serializers.ModelSerializer):
    grader_name = serializers.SerializerMethodField()
    band = serializers.SerializerMethodField()
    lot_code = serializers.CharField(source="lot.lot_id", read_only=True, default=None)

    class Meta:
        model = CvaAssessment
        fields = [
            "id", "lot", "lot_code", "contract_sample", "grader_name", "status", "assessed_on", "roast_level",
            "intensities", "flavor_categories", "main_acid", "mouthfeel_type", "descriptors",
            *CVA_AFFECTIVE, "non_uniform_cups", "defective_cups", "score", "band", "notes", "created_at",
        ]
        read_only_fields = ["id", "lot", "contract_sample", "status", "score", "created_at"]
        extra_kwargs = {"assessed_on": {"required": False}}

    def get_grader_name(self, obj):
        return obj.grader.get_full_name() or obj.grader.email

    def get_band(self, obj):
        return cva_band(obj.score) if obj.score is not None else None

    def validate(self, attrs):
        for attr in CVA_AFFECTIVE:
            v = attrs.get(attr, getattr(self.instance, attr, None))
            if v is None or not (1 <= int(v) <= 9):  # noqa: PLR2004
                raise serializers.ValidationError({attr: "Score each attribute from 1 to 9."})
        for key in ("non_uniform_cups", "defective_cups"):
            v = attrs.get(key, 0)
            if not (0 <= int(v) <= 5):  # noqa: PLR2004
                raise serializers.ValidationError({key: "Between 0 and 5 cups."})
        intens = attrs.get("intensities") or {}
        if not isinstance(intens, dict) or any(k not in CVA_DESCRIPTIVE for k in intens):
            raise serializers.ValidationError({"intensities": f"Use the attributes {', '.join(CVA_DESCRIPTIVE)}."})
        for k, v in intens.items():
            if v is not None and not (0 <= float(v) <= 15):  # noqa: PLR2004
                raise serializers.ValidationError({"intensities": f"{k} intensity must be 0–15."})
        cats = attrs.get("flavor_categories") or []
        if len(cats) > CVA_MAX_CATEGORIES or any(c not in CVA_FLAVOR_CATEGORIES for c in cats):
            raise serializers.ValidationError({"flavor_categories": f"Pick up to {CVA_MAX_CATEGORIES} categories."})
        return attrs


class PhysicalSerializer(serializers.ModelSerializer):
    analysed_by_name = serializers.SerializerMethodField()
    warnings = serializers.SerializerMethodField()
    screen_18_plus = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    total_full_defects = serializers.SerializerMethodField()

    class Meta:
        model = PhysicalAnalysis
        fields = [
            "id", "lot", "contract_sample", "analysed_by_name", "analysed_on", "lab", "sample_weight_g",
            "moisture_pct", "water_activity", "density_g_l", "screens", "screen_18_plus", "defects", "quakers",
            "odour", "color", "ecta_grade", "ecta_certificate", "primary_full_defects", "secondary_full_defects",
            "total_full_defects", "sca_green_grade", "warnings", "notes", "created_at",
        ]
        extra_kwargs = {"analysed_on": {"required": False}}
        read_only_fields = ["id", "lot", "contract_sample", "primary_full_defects", "secondary_full_defects",
                            "sca_green_grade", "created_at"]

    def get_analysed_by_name(self, obj):
        u = obj.analysed_by
        return (u.get_full_name() or u.email) if u else None

    def get_total_full_defects(self, obj):
        return obj.primary_full_defects + obj.secondary_full_defects

    def get_warnings(self, obj):
        return physical_warnings(obj.moisture_pct, obj.water_activity, obj.density_g_l, obj.screens)

    def validate_screens(self, value):
        if not isinstance(value, dict) or any(k not in SCREEN_SIZES for k in value):
            raise serializers.ValidationError(f"Use screen sizes {', '.join(SCREEN_SIZES)}.")
        for v in value.values():
            if v not in (None, "") and not (0 <= float(v) <= 100):  # noqa: PLR2004
                raise serializers.ValidationError("Each screen percentage must be 0–100.")
        return {k: float(v) for k, v in value.items() if v not in (None, "")}

    def validate_defects(self, value):
        if not isinstance(value, dict) or any(k not in DEFECTS for k in value):
            raise serializers.ValidationError("Unknown defect type.")
        out = {}
        for k, v in value.items():
            if v in (None, ""):
                continue
            if int(v) < 0:
                raise serializers.ValidationError("Defect counts cannot be negative.")
            out[k] = int(v)
        return out

    def validate_moisture_pct(self, v):
        if v is not None and not (0 < v < 30):  # noqa: PLR2004
            raise serializers.ValidationError("Enter moisture as a percentage, e.g. 10.8.")
        return v

    def validate_water_activity(self, v):
        if v is not None and not (0 < v < 1):
            raise serializers.ValidationError("Water activity is between 0 and 1, e.g. 0.56.")
        return v


class SessionSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    samples_count = serializers.SerializerMethodField()
    graders_count = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CuppingSession
        fields = ["id", "name", "held_on", "location", "blind", "notes", "status", "status_label", "owner_name",
                  "samples_count", "graders_count", "created_at"]
        read_only_fields = ["id", "status", "created_at"]

    def get_owner_name(self, obj):
        return obj.owner.company_name or obj.owner.get_full_name() or obj.owner.email

    def get_samples_count(self, obj):
        return obj.samples.count()

    def get_graders_count(self, obj):
        return obj.graders.count()
