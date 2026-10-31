from django.urls import path
from bunna_bridge.lots.admin_views import FarmBoundaryMapView
from django.contrib.gis import admin
from .models import CoffeeLot, CuppingScore, SampleRequest, WashingStation
from .models import ComplianceEvent, FloorPrice, Offer, Notification
from .models import GATE_FIELDS


class CuppingScoreInline(admin.TabularInline):
    model  = CuppingScore
    extra  = 0
    readonly_fields = ["id", "total_score", "grader", "status", "created_at"]
    fields = ["grader", "total_score", "status", "cupping_date", "flavor_notes", "created_at"]


@admin.register(CoffeeLot)
class CoffeeLotAdmin(admin.GISModelAdmin):
    list_display    = ["lot_id", "name", "region", "grade", "sca_score",
                       "volume_kg", "status", "farmer", "created_at"]
    list_filter     = ["region", "grade", "processing", "status",
                       "deforestation_free", "eudr_dds_ready"]
    search_fields   = ["lot_id", "name", "washing_station", "farmer__farm_id", "farmer__email"]
    # Gates are derived from evidence in CoffeeLot.save(); never hand-set.
    readonly_fields = ["id", "created_at", "updated_at", *GATE_FIELDS, "eudr_dds_generated_at"]
    inlines         = [CuppingScoreInline]

    def save_model(self, request, obj, form, change):
        obj.save(actor=request.user)
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path("map/", self.admin_site.admin_view(FarmBoundaryMapView.as_view()), name="lots-map"),
        ]
        return custom + urls

    fieldsets = (
        ("Identity",          {"fields": ["id", "lot_id", "name", "status", "exporter", "farmer"]}),
        ("Origin",            {"fields": ["region", "kebele", "washing_station", "washing_station_facility",
                                          "altitude_m", "processing", "grade",
                                          "varietal", "harvest_date"]}),
        ("Geospatial / EUDR", {"fields": ["farm_location", "boundary", "gps_verified"]}),
        ("Quality",           {"fields": ["sca_score", "flavor_notes", "cupping_date",
                                          "q_grader_name", "q_grader_cert_id"]}),
        ("Compliance Gates",  {"fields": ["deforestation_free", "phyto_cert_uploaded",
                                          "ecta_license_active", "nbe_fx_declared",
                                          "cta_floor_met", "eudr_dds_ready"]}),
        ("Documents",         {"fields": ["phyto_cert_file", "phyto_cert_expiry",
                                          "ecex_permit_file", "ecex_permit_number", "ecex_permit_expiry",
                                          "nbe_fx_declaration_file",
                                          "customs_declaration_file", "customs_declaration_id",
                                          "eudr_dds_file", "eudr_dds_generated_at", "eudr_dds_reference"]}),
        ("Commercial",        {"fields": ["volume_kg", "available_qty_kg", "price_per_kg", "fob_price_usd",
                                          "min_order_kg", "delivery_window", "lot_type"]}),
        ("Timestamps",        {"fields": ["created_at", "updated_at"]}),
    )


@admin.register(CuppingScore)
class CuppingScoreAdmin(admin.ModelAdmin):
    list_display  = ["lot", "grader", "total_score", "status", "cupping_date", "created_at"]
    list_filter   = ["status", "cupping_date"]
    search_fields = ["lot__lot_id", "grader__email"]
    readonly_fields = ["id", "total_score", "created_at"]


@admin.register(SampleRequest)
class SampleRequestAdmin(admin.ModelAdmin):
    list_display  = ["lot", "buyer", "status", "quantity_g", "created_at"]
    list_filter   = ["status"]
    search_fields = ["lot__lot_id", "buyer__email"]
    readonly_fields = ["id", "created_at", "updated_at"]

@admin.register(WashingStation)
class WashingStationAdmin(admin.ModelAdmin):
    list_display  = ["name", "owner", "region", "capacity_kg_per_day", "created_at"]
    list_filter   = ["region"]
    search_fields = ["name", "owner__email", "owner__company_name"]
    readonly_fields = ["id", "created_at", "updated_at"]


from bunna_bridge.lots.deforestation import DeforestationZone

@admin.register(DeforestationZone)
class DeforestationZoneAdmin(admin.GISModelAdmin):
    list_display = ["id", "year", "region", "area_ha", "source"]
    list_filter  = ["year", "region"]



@admin.register(FloorPrice)
class FloorPriceAdmin(admin.ModelAdmin):
    list_display = ["grade", "processing", "min_price_usd_per_kg", "valid_from", "valid_to", "source"]
    list_filter  = ["grade", "processing"]


@admin.register(ComplianceEvent)
class ComplianceEventAdmin(admin.ModelAdmin):
    list_display  = ["lot", "gate", "old_value", "new_value", "actor", "created_at"]
    list_filter   = ["gate", "new_value"]
    search_fields = ["lot__lot_id"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display  = ["lot", "buyer", "quantity_kg", "price_per_kg_usd", "status", "created_at"]
    list_filter   = ["status"]
    search_fields = ["lot__lot_id", "buyer__email"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ["recipient", "notification_type", "title", "is_read", "created_at"]
    list_filter   = ["notification_type", "is_read"]
