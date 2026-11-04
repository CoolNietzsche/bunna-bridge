import json

from django.contrib.gis.geos import GEOSException
from rest_framework import serializers

from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids

from .access import plot_available_to
from .geo import geometry_from_geojson
from .geo import plot_geolocation_problem
from .geo import validate_plot_geometry
from .models import DdsReference
from .models import EvidencePackage
from .models import LotRisk
from .models import LotSource
from .models import MitigationAction
from .models import Plot
from .models import Producer
from .models import ProducerConsent
from .models import RiskSignOff


class GeoJSONGeometryField(serializers.Field):
    """Reads/writes a GEOS geometry as a GeoJSON geometry object."""

    def __init__(self, geom_type, **kwargs):
        self.geom_type = geom_type
        kwargs.setdefault("required", False)
        kwargs.setdefault("allow_null", True)
        super().__init__(**kwargs)

    def to_representation(self, value):
        return json.loads(value.geojson) if value is not None else None

    def to_internal_value(self, data):
        try:
            geom = geometry_from_geojson(data)
        except (GEOSException, ValueError, TypeError) as exc:
            raise serializers.ValidationError("Not a valid GeoJSON geometry.") from exc
        if geom is not None and geom.geom_type != self.geom_type:
            raise serializers.ValidationError(f"Expected a GeoJSON {self.geom_type}.")
        return geom


class ConsentSerializer(serializers.ModelSerializer):
    captured_by_email = serializers.CharField(
        source="captured_by.email", read_only=True, default=None,
    )
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    purpose_label = serializers.CharField(source="get_purpose_display", read_only=True)

    class Meta:
        model = ProducerConsent
        fields = [
            "id",
            "purpose",
            "purpose_label",
            "granted",
            "method",
            "method_label",
            "evidence",
            "captured_by_email",
            "captured_at",
            "revoked_at",
        ]
        read_only_fields = ["id", "captured_at", "revoked_at"]

    def validate(self, attrs):
        # Multipart forms drop unchecked booleans; an omitted `granted` means consent given.
        if "granted" not in getattr(self, "initial_data", {}):
            attrs["granted"] = True
        if attrs.get("method") == ProducerConsent.Method.PAPER and not attrs.get(
            "evidence",
        ):
            raise serializers.ValidationError(
                {"evidence": "Attach a photo or scan of the signed form."},
            )
        return attrs


class ProducerSerializer(serializers.ModelSerializer):
    plots_count = serializers.SerializerMethodField()
    eudr_consent = serializers.SerializerMethodField()
    story_consent = serializers.SerializerMethodField()
    owner_email = serializers.CharField(source="owner.email", read_only=True)

    class Meta:
        model = Producer
        fields = [
            "id",
            "external_ref",
            "name",
            "phone",
            "region",
            "zone",
            "woreda",
            "kebele",
            "cooperative",
            "ectms_farmer_id",
            "plots_count",
            "eudr_consent",
            "story_consent",
            "owner_email",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "archived_at"]

    def get_plots_count(self, obj):
        annotated = getattr(obj, "active_plots", None)
        return (
            annotated
            if annotated is not None
            else obj.plots.filter(archived_at__isnull=True).count()
        )

    def get_eudr_consent(self, obj):
        return obj.current_consent(ProducerConsent.Purpose.EUDR_SHARING)

    def get_story_consent(self, obj):
        return obj.current_consent(ProducerConsent.Purpose.STORY)

    def validate_external_ref(self, value):
        value = value.strip()
        if not value:
            return value
        owner = self.context["request"].user
        if self.instance is not None:
            owner = self.instance.owner
        qs = Producer.objects.filter(owner_id__in=team_ids(owner), external_ref=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "You already have a producer with this reference.",
            )
        return value


class PlotSerializer(serializers.ModelSerializer):
    location = GeoJSONGeometryField("Point")
    boundary = GeoJSONGeometryField("Polygon")
    producer_name = serializers.CharField(source="producer.name", read_only=True)
    geometry_type = serializers.CharField(read_only=True)
    geolocation_problem = serializers.SerializerMethodField()
    deforestation_status_label = serializers.CharField(
        source="get_deforestation_status_display", read_only=True,
    )
    lots = serializers.SerializerMethodField()

    class Meta:
        model = Plot
        fields = [
            "id",
            "producer",
            "producer_name",
            "name",
            "ectms_farm_id",
            "location",
            "boundary",
            "geometry_type",
            "area_ha",
            "declared_area_ha",
            "land_tenure",
            "notes",
            "geolocation_problem",
            "deforestation_status",
            "deforestation_status_label",
            "deforestation_overlap_count",
            "deforestation_checked_at",
            "deforestation_datasets",
            "forest_2020_overlap_pct",
            "lots",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = [
            "id",
            "area_ha",
            "deforestation_status",
            "deforestation_overlap_count",
            "deforestation_checked_at",
            "deforestation_datasets",
            "forest_2020_overlap_pct",
            "created_at",
            "updated_at",
            "archived_at",
        ]

    def get_geolocation_problem(self, obj):
        return plot_geolocation_problem(obj)

    def get_lots(self, obj):
        return [
            {
                "id": str(s.lot_id),
                "lot_id": s.lot.lot_id,
                "quantity_kg": str(s.quantity_kg),
            }
            for s in obj.lot_sources.select_related("lot")
        ]

    def validate_producer(self, producer):
        user = self.context["request"].user
        if producer.archived_at is not None:
            raise serializers.ValidationError("This producer is archived.")
        if not (
            user.is_staff
            or getattr(user, "role", None) == "admin"
            or same_team(user, producer.owner_id)
        ):
            raise serializers.ValidationError("Producer not found.")
        return producer

    def validate(self, attrs):
        def current(name):
            if name in attrs:
                return attrs[name]
            return (
                getattr(self.instance, name, None)
                if self.instance is not None
                else None
            )

        errors = validate_plot_geometry(
            location=current("location"),
            boundary=current("boundary"),
            declared_area_ha=current("declared_area_ha"),
        )
        if errors:
            raise serializers.ValidationError({"geometry": errors})
        return attrs


class LotSourceSerializer(serializers.ModelSerializer):
    plot_detail = serializers.SerializerMethodField()

    class Meta:
        model = LotSource
        fields = [
            "id",
            "lot",
            "plot",
            "plot_detail",
            "quantity_kg",
            "delivery_reference",
            "delivered_on",
            "created_at",
        ]
        read_only_fields = ["id", "lot", "created_at"]

    def get_plot_detail(self, obj):
        p = obj.plot
        geom = p.boundary or p.location
        return {
            "id": str(p.id),
            "name": p.name,
            "producer_id": str(p.producer_id),
            "producer_name": p.producer.name,
            "geometry_type": p.geometry_type,
            "geometry": json.loads(geom.geojson) if geom is not None else None,
            "area_ha": str(p.area_ha) if p.area_ha is not None else None,
            "deforestation_status": p.deforestation_status,
            "geolocation_problem": plot_geolocation_problem(p),
            "eudr_consent": p.producer.current_consent(
                ProducerConsent.Purpose.EUDR_SHARING,
            ),
        }

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_plot(self, plot):
        lot = self.context["lot"]
        if plot.archived_at is not None:
            raise serializers.ValidationError("This plot is archived.")
        if not plot_available_to(plot, lot.exporter):
            raise serializers.ValidationError(
                "Plot not found among your registered producers.",
            )
        qs = LotSource.objects.filter(lot=lot, plot=plot)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This plot is already a source of this lot.",
            )
        return plot


class MitigationSerializer(serializers.ModelSerializer):
    location = GeoJSONGeometryField("Point")
    performed_by_email = serializers.CharField(
        source="performed_by.email", read_only=True, default=None,
    )
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = MitigationAction
        fields = [
            "id",
            "kind",
            "kind_label",
            "notes",
            "evidence",
            "location",
            "performed_by_email",
            "performed_at",
        ]
        read_only_fields = ["id", "performed_at"]


class LotRiskSerializer(serializers.ModelSerializer):
    mitigations = MitigationSerializer(many=True, read_only=True)

    class Meta:
        model = LotRisk
        fields = [
            "id",
            "code",
            "automatic",
            "severity",
            "title",
            "detail",
            "status",
            "justification",
            "affected",
            "mitigations",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "code",
            "automatic",
            "affected",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        risk = self.instance
        status = attrs.get("status", risk.status if risk else LotRisk.Status.OPEN)
        severity = attrs.get("severity", risk.severity if risk else None)
        justification = attrs.get("justification", risk.justification if risk else "")
        if risk is not None and risk.automatic:
            # Automatic risks: only status + justification are editable.
            for field in ("severity", "title", "detail"):
                if field in attrs and attrs[field] != getattr(risk, field):
                    raise serializers.ValidationError(
                        {field: "Set automatically; cannot be changed."},
                    )
        if status == LotRisk.Status.RESOLVED and risk is not None and risk.automatic:
            raise serializers.ValidationError(
                {
                    "status": "Automatic risks resolve themselves once the underlying data is fixed.",
                },
            )
        if status == LotRisk.Status.ACCEPTED:
            if severity == LotRisk.Severity.HIGH:
                raise serializers.ValidationError(
                    {
                        "status": "A high risk cannot be accepted — mitigate it until the risk is negligible.",
                    },
                )
            if len((justification or "").strip()) < 20:
                raise serializers.ValidationError(
                    {
                        "justification": "Explain in at least 20 characters why this risk is negligible.",
                    },
                )
        if status == LotRisk.Status.MITIGATED and (
            risk is None or not risk.mitigations.exists()
        ):
            raise serializers.ValidationError(
                {
                    "status": "Record at least one mitigation action (with evidence) first.",
                },
            )
        return attrs


class SignOffSerializer(serializers.ModelSerializer):
    signed_by_email = serializers.CharField(
        source="signed_by.email", read_only=True, default=None,
    )

    class Meta:
        model = RiskSignOff
        fields = [
            "id",
            "conclusion",
            "register_fingerprint",
            "signed_by_email",
            "signed_at",
        ]
        read_only_fields = ["id", "register_fingerprint", "signed_at"]


class EvidencePackageSerializer(serializers.ModelSerializer):
    generated_by_email = serializers.CharField(
        source="generated_by.email", read_only=True, default=None,
    )
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = EvidencePackage
        fields = [
            "id",
            "sha256",
            "fingerprint",
            "plots_count",
            "producers_count",
            "total_kg",
            "geojson_files",
            "generated_by_email",
            "generated_at",
            "is_current",
        ]

    def get_is_current(self, obj):
        current = self.context.get("current_package_id")
        return current is not None and str(obj.pk) == str(current)


class DdsReferenceSerializer(serializers.ModelSerializer):
    recorded_by_email = serializers.CharField(
        source="recorded_by.email", read_only=True,
    )
    recorded_by_company = serializers.CharField(
        source="recorded_by.company_name", read_only=True,
    )

    class Meta:
        model = DdsReference
        fields = [
            "id",
            "lot",
            "offer",
            "reference_number",
            "verification_number",
            "submitted_on",
            "package",
            "recorded_by_email",
            "recorded_by_company",
            "recorded_at",
        ]
        read_only_fields = ["id", "lot", "offer", "package", "recorded_at"]

    def validate_reference_number(self, value):
        value = value.strip()
        if len(value) < 6:
            raise serializers.ValidationError(
                "Enter the full DDS reference number from the EU Information System.",
            )
        lot = self.context["lot"]
        if DdsReference.objects.filter(lot=lot, reference_number=value).exists():
            raise serializers.ValidationError(
                "This reference is already recorded for this lot.",
            )
        return value
