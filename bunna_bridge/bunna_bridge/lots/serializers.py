from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import CoffeeLot, CuppingScore, SampleRequest, Offer


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
        for field in ["fragrance_aroma", "flavor", "aftertaste", "acidity",
                      "body", "balance", "uniformity", "clean_cup", "sweetness", "overall"]:
            val = attrs.get(field)
            if val is not None and not (6 <= float(val) <= 10):
                raise serializers.ValidationError(
                    {field: "SCA scores must be between 6.00 and 10.00"}
                )
        return attrs


class CoffeeLotListSerializer(serializers.ModelSerializer):
    green_passport_ready = serializers.ReadOnlyField()
    export_ready         = serializers.ReadOnlyField()
    compliance_score     = serializers.SerializerMethodField()
    is_eudr_ready        = serializers.SerializerMethodField()
    latest_sca_score     = serializers.SerializerMethodField()
    exporter_name        = serializers.CharField(source="exporter.get_full_name", read_only=True)
    exporter_company     = serializers.CharField(source="exporter.company_name", read_only=True)

    class Meta:
        model  = CoffeeLot
        fields = [
            "id", "lot_id", "name", "status", "region",
            "altitude_m", "processing", "grade", "varietal",
            "sca_score", "flavor_notes", "volume_kg", "price_per_kg",
            # marketplace
            "flavor_tags", "available_qty_kg", "fob_price_usd", "min_order_kg",
            "delivery_window", "lot_type",
            "is_organic", "is_fair_trade", "is_rainforest_alliance",
            "tasting_notes",
            # compliance
            "deforestation_free", "eudr_dds_ready", "gps_verified",
            "phyto_cert_uploaded", "ecta_license_active",
            "nbe_fx_declared", "cta_floor_met",
            "green_passport_ready", "export_ready",
            "compliance_score", "is_eudr_ready",
            # computed
            "latest_sca_score",
            "exporter_name", "exporter_company",
            "harvest_date", "created_at", "boundary",
        ]

    def get_compliance_score(self, obj):
        return obj.compliance_score()

    def get_is_eudr_ready(self, obj):
        return obj.is_eudr_ready()

    def get_latest_sca_score(self, obj):
        score = obj.cupping_scores.filter(status="confirmed").first()
        if score:
            return score.total_score
        score = obj.cupping_scores.first()
        return score.total_score if score else None


class CoffeeLotDetailSerializer(GeoFeatureModelSerializer):
    green_passport_ready = serializers.ReadOnlyField()
    export_ready         = serializers.ReadOnlyField()
    compliance_score     = serializers.SerializerMethodField()
    is_eudr_ready        = serializers.SerializerMethodField()
    cupping_scores       = CuppingScoreSerializer(many=True, read_only=True)
    exporter_name        = serializers.CharField(source="exporter.get_full_name", read_only=True)
    exporter_company     = serializers.CharField(source="exporter.company_name", read_only=True)
    exporter_ecta_number = serializers.CharField(source="exporter.ecta_license_number", read_only=True)
    exporter_ecta_file   = serializers.FileField(source="exporter.ecta_license_file", read_only=True)
    exporter_ecta_expiry = serializers.DateField(source="exporter.ecta_license_expiry", read_only=True)
    sample_requests_count = serializers.SerializerMethodField()
    offers_count         = serializers.SerializerMethodField()

    class Meta:
        model     = CoffeeLot
        geo_field = "farm_location"
        fields    = "__all__"

    def get_compliance_score(self, obj):
        return obj.compliance_score()

    def get_is_eudr_ready(self, obj):
        return obj.is_eudr_ready()

    def get_sample_requests_count(self, obj):
        return obj.sample_requests.count()

    def get_offers_count(self, obj):
        return obj.offers.count()


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


class OfferSerializer(serializers.ModelSerializer):
    buyer_email   = serializers.EmailField(source="buyer.email", read_only=True)
    buyer_name    = serializers.SerializerMethodField()
    buyer_company = serializers.CharField(source="buyer.company_name", read_only=True)
    lot_name      = serializers.CharField(source="lot.name", read_only=True)
    lot_id_display = serializers.CharField(source="lot.lot_id", read_only=True)
    lot_region    = serializers.CharField(source="lot.region", read_only=True)
    lot_fob_price = serializers.DecimalField(
        source="lot.fob_price_usd", max_digits=10, decimal_places=4, read_only=True
    )

    class Meta:
        model  = Offer
        fields = [
            "id", "lot", "lot_name", "lot_id_display", "lot_region", "lot_fob_price",
            "buyer", "buyer_email", "buyer_name", "buyer_company",
            "quantity_kg", "price_per_kg_usd", "delivery_window", "notes",
            "status",
            "counter_price", "counter_qty", "exporter_notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "buyer", "status",
            "counter_price", "counter_qty", "exporter_notes",
            "created_at", "updated_at",
        ]

    def get_buyer_name(self, obj):
        u = obj.buyer
        return f"{u.first_name} {u.last_name}".strip() or u.email
