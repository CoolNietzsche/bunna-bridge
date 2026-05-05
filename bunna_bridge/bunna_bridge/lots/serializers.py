from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import CoffeeLot


class CoffeeLotListSerializer(serializers.ModelSerializer):
    green_passport_ready = serializers.ReadOnlyField()
    export_ready         = serializers.ReadOnlyField()

    class Meta:
        model  = CoffeeLot
        fields = [
            "id", "lot_id", "name", "status", "region",
            "altitude_m", "processing", "grade", "sca_score",
            "flavor_notes", "volume_kg", "price_per_kg",
            "deforestation_free", "eudr_dds_ready",
            "green_passport_ready", "export_ready",
            "harvest_date", "created_at",
        ]


class CoffeeLotDetailSerializer(GeoFeatureModelSerializer):
    green_passport_ready = serializers.ReadOnlyField()
    export_ready         = serializers.ReadOnlyField()

    class Meta:
        model     = CoffeeLot
        geo_field = "farm_location"
        fields    = "__all__"
