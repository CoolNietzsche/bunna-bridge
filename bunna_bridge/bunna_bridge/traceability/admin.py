from django.contrib.gis import admin

from .models import DdsReference
from .models import EvidencePackage
from .models import ForestBaseline2020
from .models import LotRisk
from .models import LotSource
from .models import MitigationAction
from .models import Plot
from .models import Producer
from .models import ProducerConsent
from .models import RiskSignOff


class PlotInline(admin.TabularInline):
    model = Plot
    extra = 0
    fields = [
        "name",
        "ectms_farm_id",
        "area_ha",
        "declared_area_ha",
        "deforestation_status",
        "archived_at",
    ]
    readonly_fields = ["area_ha", "deforestation_status"]


class ConsentInline(admin.TabularInline):
    model = ProducerConsent
    extra = 0
    readonly_fields = ["captured_at", "captured_by"]


@admin.register(Producer)
class ProducerAdmin(admin.ModelAdmin):
    list_display = ["name", "external_ref", "owner", "kebele", "woreda", "archived_at"]
    list_filter = ["region", "archived_at"]
    search_fields = ["name", "external_ref", "ectms_farmer_id", "owner__email"]
    inlines = [PlotInline, ConsentInline]


@admin.register(Plot)
class PlotAdmin(admin.GISModelAdmin):
    list_display = [
        "__str__",
        "area_ha",
        "deforestation_status",
        "deforestation_checked_at",
        "archived_at",
    ]
    list_filter = ["deforestation_status", "land_tenure"]
    search_fields = ["name", "producer__name", "ectms_farm_id"]
    readonly_fields = [
        "area_ha",
        "deforestation_status",
        "deforestation_overlap_count",
        "deforestation_checked_at",
        "deforestation_datasets",
        "forest_2020_overlap_pct",
    ]


@admin.register(LotSource)
class LotSourceAdmin(admin.ModelAdmin):
    list_display = ["lot", "plot", "quantity_kg", "delivered_on"]
    search_fields = ["lot__lot_id", "plot__producer__name"]


class MitigationInline(admin.TabularInline):
    model = MitigationAction
    extra = 0


@admin.register(LotRisk)
class LotRiskAdmin(admin.ModelAdmin):
    list_display = ["lot", "code", "severity", "status", "automatic", "updated_at"]
    list_filter = ["severity", "status", "automatic"]
    search_fields = ["lot__lot_id", "code", "title"]
    inlines = [MitigationInline]


@admin.register(RiskSignOff)
class RiskSignOffAdmin(admin.ModelAdmin):
    list_display = ["lot", "signed_by", "signed_at"]
    readonly_fields = ["register_fingerprint"]


@admin.register(EvidencePackage)
class EvidencePackageAdmin(admin.ModelAdmin):
    list_display = ["lot", "plots_count", "producers_count", "total_kg", "generated_at"]
    readonly_fields = ["sha256", "fingerprint"]


@admin.register(DdsReference)
class DdsReferenceAdmin(admin.ModelAdmin):
    list_display = [
        "lot",
        "reference_number",
        "recorded_by",
        "submitted_on",
        "recorded_at",
    ]
    search_fields = ["lot__lot_id", "reference_number"]


@admin.register(ForestBaseline2020)
class ForestBaselineAdmin(admin.ModelAdmin):
    list_display = ["id", "source", "tile"]
    list_filter = ["source"]
