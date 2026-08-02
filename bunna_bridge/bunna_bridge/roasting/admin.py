from django.contrib import admin

from .models import RoastBatch, RoastBatchLot, RoastEquipment


class RoastBatchLotInline(admin.TabularInline):
    model = RoastBatchLot
    extra = 0


@admin.register(RoastEquipment)
class RoastEquipmentAdmin(admin.ModelAdmin):
    list_display  = ["name", "roaster", "machine_type", "batch_capacity_kg", "installed_date"]
    list_filter   = ["machine_type"]
    search_fields = ["name", "roaster__email", "roaster__company_name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(RoastBatch)
class RoastBatchAdmin(admin.ModelAdmin):
    list_display  = ["batch_code", "roaster", "status", "roast_level", "roast_date", "output_weight_kg"]
    list_filter   = ["status", "roast_level"]
    search_fields = ["batch_code", "roaster__email", "roaster__company_name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [RoastBatchLotInline]
