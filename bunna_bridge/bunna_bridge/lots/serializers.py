from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import CoffeeLot, CuppingScore


class CuppingScoreSerializer(serializers.ModelSerializer):
    total_score  = serializers.ReadOnlyField()
    grader_name  = serializers.CharField(source="grader.get_full_name", read_only=True)
    grader_email = serializers.CharField(source="grader.email", read_only=True)

    class Meta:
        model  = CuppingScore
        fields = [
            "id", "lot", "grader", "grader_name", "grader_email",
            "status", "total_score",
            "fragrance_aroma", "flavor", "aftertaste", "acidity",
            "body", "balance", "uniformity", "clean_cup",
            "sweetness", "overall", "defects",
            "flavor_notes", "notes", "cupping_date", "cupping_location",
            "created_at",
        ]
        read_only_fields = ["id", "grader", "created_at", "total_score"]

    def validate(self, attrs):
        for field in ["fragrance_aroma","flavor","aftertaste","acidity",
                      "body","balance","uniformity","clean_cup","sweetness","overall"]:
            val = attrs.get(field)
            if val is not None and not (6 <= float(val) <= 10):
                raise serializers.ValidationError(
                    {field: "SCA scores must be between 6.00 and 10.00"}
                )
        return attrs


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
    cupping_scores       = CuppingScoreSerializer(many=True, read_only=True)

    class Meta:
        model     = CoffeeLot
        geo_field = "farm_location"
        fields    = "__all__"
