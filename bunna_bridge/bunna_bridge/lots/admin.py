from django.contrib.gis import admin
from .models import CoffeeLot


@admin.register(CoffeeLot)
class CoffeeLotAdmin(admin.GISModelAdmin):
    list_display  = [
        "lot_id", "name", "region", "grade",
        "sca_score", "volume_kg", "status", "created_at",
    ]
    list_filter   = ["region", "grade", "processing", "status",
                     "deforestation_free", "eudr_dds_ready"]
    search_fields = ["lot_id", "name", "washing_station"]
    readonly_fields = ["id", "created_at", "updated_at"]
