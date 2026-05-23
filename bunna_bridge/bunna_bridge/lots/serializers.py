from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import CoffeeLot, CuppingScore, SampleRequest


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
            "harvest_date", "created_at", "boundary",
        ]


class CoffeeLotDetailSerializer(GeoFeatureModelSerializer):
    green_passport_ready = serializers.ReadOnlyField()
    export_ready         = serializers.ReadOnlyField()
    cupping_scores       = CuppingScoreSerializer(many=True, read_only=True)

    class Meta:
        model     = CoffeeLot
        geo_field = "farm_location"
        fields    = "__all__"


class SampleRequestSerializer(serializers.ModelSerializer):
    buyer_name    = serializers.CharField(source="buyer.get_full_name", read_only=True)
    buyer_email   = serializers.CharField(source="buyer.email",         read_only=True)
    buyer_company = serializers.CharField(source="buyer.company_name",  read_only=True)
    lot_name      = serializers.CharField(source="lot.name",            read_only=True)
    lot_ref       = serializers.CharField(source="lot.lot_id",          read_only=True)
    lot_region    = serializers.CharField(source="lot.region",          read_only=True)

    class Meta:
        model  = SampleRequest
        fields = [
            "id", "lot", "lot_name", "lot_ref", "lot_region",
            "buyer", "buyer_name", "buyer_email", "buyer_company",
            "status", "quantity_g", "message", "response",
            "shipping_address", "tracking_number",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "buyer", "created_at", "updated_at"]


class LotStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["draft", "listed", "contracted", "exported"])
    note   = serializers.CharField(required=False, allow_blank=True)
