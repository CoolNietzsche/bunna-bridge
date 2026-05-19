from django.contrib.gis import admin
from .models import CoffeeLot, CuppingScore, SampleRequest


class CuppingScoreInline(admin.TabularInline):
    model  = CuppingScore
    extra  = 0
    readonly_fields = ["id", "total_score", "grader", "status", "created_at"]
    fields = ["grader", "total_score", "status", "cupping_date", "flavor_notes", "created_at"]


@admin.register(CoffeeLot)
class CoffeeLotAdmin(admin.GISModelAdmin):
    list_display    = ["lot_id", "name", "region", "grade", "sca_score",
                       "volume_kg", "status", "created_at"]
    list_filter     = ["region", "grade", "processing", "status",
                       "deforestation_free", "eudr_dds_ready"]
    search_fields   = ["lot_id", "name", "washing_station"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines         = [CuppingScoreInline]
    fieldsets = (
        ("Identity",          {"fields": ["id", "lot_id", "name", "status", "exporter"]}),
        ("Origin",            {"fields": ["region", "kebele", "washing_station",
                                          "altitude_m", "processing", "grade",
                                          "varietal", "harvest_date"]}),
        ("Geospatial / EUDR", {"fields": ["farm_location", "farm_polygon", "gps_verified"]}),
        ("Quality",           {"fields": ["sca_score", "flavor_notes", "cupping_date",
                                          "q_grader_name", "q_grader_cert_id"]}),
        ("Compliance Gates",  {"fields": ["deforestation_free", "phyto_cert_uploaded",
                                          "ecta_license_active", "nbe_fx_declared",
                                          "cta_floor_met", "eudr_dds_ready"]}),
        ("Documents",         {"fields": ["phyto_cert_file", "eudr_dds_file"]}),
        ("Commercial",        {"fields": ["volume_kg", "price_per_kg"]}),
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
