import json

from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import CoffeeLot, CuppingScore, SampleRequest, Offer, WashingStation, ComplianceEvent
from .models import GATE_FIELDS

# Commercial terms hidden from anonymous marketplace visitors — same set the
# public Lot Story page has always excluded, now applied consistently to the
# list/detail endpoints anonymous users can reach too.
COMMERCIAL_FIELDS = ["price_per_kg", "fob_price_usd", "min_order_kg", "delivery_window"]


def mask_commercial_fields(properties, request):
    user = getattr(request, "user", None) if request else None
    if not (user and user.is_authenticated):
        for field in COMMERCIAL_FIELDS:
            if field in properties:
                properties[field] = None


def lot_certifications(lot):
    """Currently-valid (non-expired) certifications held by the lot's exporter."""
    if not lot.exporter_id:
        return []
    return [
        {"cert_type": cert.cert_type, "label": cert.get_cert_type_display()}
        for cert in lot.exporter.certifications.all()
        if not cert.is_expired
    ]


class WashingStationSerializer(serializers.ModelSerializer):
    lots_count = serializers.IntegerField(source="lots.count", read_only=True)

    class Meta:
        model  = WashingStation
        fields = ["id", "name", "region", "location", "capacity_kg_per_day", "lots_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


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
    farmer_name          = serializers.SerializerMethodField()
    farmer_farm_id       = serializers.CharField(
        source="farmer.farm_id", read_only=True,
    )
    certifications       = serializers.SerializerMethodField()

    class Meta:
        model  = CoffeeLot
        fields = [
            "id", "lot_id", "name", "status", "region",
            "kebele", "washing_station", "washing_station_facility",
            "altitude_m", "processing", "grade", "varietal",
            "sca_score", "flavor_notes", "volume_kg", "price_per_kg",
            # marketplace
            "flavor_tags", "available_qty_kg", "fob_price_usd", "min_order_kg",
            "delivery_window", "lot_type",
            "is_organic", "is_fair_trade", "is_rainforest_alliance", "certifications",
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
            "farmer", "farmer_name", "farmer_farm_id",
            "harvest_date", "created_at", "boundary", "farm_location",
            "readiness_percent", "sca_verified",
            # documents — write-only here; owners read them via the detail
            # endpoint and download through LotDocumentDownloadView.
            "phyto_cert_file", "phyto_cert_expiry",
            "ecex_permit_file", "ecex_permit_number", "ecex_permit_expiry",
            "nbe_fx_declaration_file",
            "customs_declaration_file", "customs_declaration_id",
            "eudr_dds_reference",
        ]
        # Every gate is derived in CoffeeLot.save() (lots/compliance.py), so
        # none are writable. `status` only changes through the status endpoint
        # (which enforces the pipeline and the export gate) or offer acceptance.
        # Certification badges are derived from Certification records.
        read_only_fields = [
            *GATE_FIELDS, "status",
            "is_organic", "is_fair_trade", "is_rainforest_alliance",
        ]
        extra_kwargs = {
            "phyto_cert_file":          {"write_only": True},
            "ecex_permit_file":         {"write_only": True},
            "nbe_fx_declaration_file":  {"write_only": True},
            "customs_declaration_file": {"write_only": True},
            "phyto_cert_expiry":        {"write_only": True},
            "ecex_permit_number":       {"write_only": True},
            "ecex_permit_expiry":       {"write_only": True},
            "customs_declaration_id":   {"write_only": True},
            "eudr_dds_reference":       {"write_only": True},
        }

    readiness_percent = serializers.SerializerMethodField()
    sca_verified      = serializers.SerializerMethodField()

    def _request_user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def validate_farmer(self, value):
        if value is not None and value.role != "farmer":
            raise serializers.ValidationError("Linked producer must be a farmer account.")
        return value

    def validate_washing_station_facility(self, value):
        user = self._request_user()
        if value is None or user is None:
            return value
        if value.owner_id != user.id and not (user.is_staff or getattr(user, "role", "") == "admin"):
            raise serializers.ValidationError("You can only link your own washing stations.")
        return value

    def validate_sca_score(self, value):
        if self.instance is not None and value != self.instance.sca_score and \
                self.instance.cupping_scores.filter(status="confirmed").exists():
            raise serializers.ValidationError(
                "This lot has a confirmed Q-grader score; the SCA score can no longer be edited.",
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # New lots start with their full volume available for sale.
        if self.instance is None and "volume_kg" in attrs and not attrs.get("available_qty_kg"):
            attrs["available_qty_kg"] = attrs["volume_kg"]
        return attrs

    def get_readiness_percent(self, obj):
        return round(100 * obj.compliance_score() / len(GATE_FIELDS))

    def _confirmed_scores(self, obj):
        # Uses the prefetched cupping_scores when available (no N+1).
        return [s for s in obj.cupping_scores.all() if s.status == "confirmed"]

    def get_sca_verified(self, obj):
        return bool(self._confirmed_scores(obj))

    def get_farmer_name(self, obj):
        if not obj.farmer_id:
            return None
        return f"{obj.farmer.first_name} {obj.farmer.last_name}".strip() or obj.farmer.email

    def get_compliance_score(self, obj):
        return obj.compliance_score()

    def get_is_eudr_ready(self, obj):
        return obj.is_eudr_ready()

    def get_latest_sca_score(self, obj):
        confirmed = self._confirmed_scores(obj)
        if confirmed:
            return confirmed[0].total_score
        return float(obj.sca_score) if obj.sca_score is not None else None

    def get_certifications(self, obj):
        return lot_certifications(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("farm_location"):
            data["gps_lng"], data["gps_lat"] = data["farm_location"]["coordinates"][:2]
        mask_commercial_fields(data, self.context.get("request"))
        return data


class CoffeeLotDetailSerializer(GeoFeatureModelSerializer):
    # Restricted to the lot's own exporter and admins — see to_representation().
    # Even with that check, these are only URLs; the actual files must also be
    # gated at the serving layer (LotDocumentDownloadView), since anyone with
    # a URL could otherwise fetch it directly regardless of what the API returns.
    RESTRICTED_DOCUMENT_FIELDS = [
        "phyto_cert_file", "ecex_permit_file", "nbe_fx_declaration_file",
        "customs_declaration_file", "eudr_dds_file", "exporter_ecta_file",
    ]

    green_passport_ready = serializers.ReadOnlyField()
    export_ready         = serializers.ReadOnlyField()
    compliance_score     = serializers.SerializerMethodField()
    is_eudr_ready        = serializers.SerializerMethodField()
    cupping_scores       = serializers.SerializerMethodField()
    gate_report          = serializers.SerializerMethodField()
    readiness_percent    = serializers.SerializerMethodField()
    exporter_name        = serializers.CharField(source="exporter.get_full_name", read_only=True)
    exporter_company     = serializers.CharField(source="exporter.company_name", read_only=True)
    exporter_verified    = serializers.SerializerMethodField()
    exporter_ecta_number = serializers.CharField(source="exporter.ecta_license_number", read_only=True)
    exporter_ecta_file   = serializers.FileField(source="exporter.ecta_license_file", read_only=True)
    exporter_ecta_expiry = serializers.DateField(source="exporter.ecta_license_expiry", read_only=True)
    sample_requests_count = serializers.SerializerMethodField()
    offers_count         = serializers.SerializerMethodField()
    certifications        = serializers.SerializerMethodField()

    class Meta:
        model     = CoffeeLot
        geo_field = "farm_location"
        fields    = "__all__"
        # Same 5 gates as CoffeeLotListSerializer — this serializer is only
        # wired to the read-only "retrieve" action today, but marking these
        # read-only here too means that stays true even if that changes.
        read_only_fields = [*GATE_FIELDS, "status"]

    def _is_owner_or_admin(self, instance):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user) and bool(user.is_authenticated) and (
            getattr(user, "role", None) == "admin"
            or getattr(user, "is_staff", False)
            or instance.exporter_id == getattr(user, "id", None)
        )

    def get_cupping_scores(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        scores = list(obj.cupping_scores.all())
        if not self._is_owner_or_admin(obj):
            scores = [
                s for s in scores
                if s.status == "confirmed" or (user and s.grader_id == getattr(user, "id", None))
            ]
        return CuppingScoreSerializer(scores, many=True).data

    def get_gate_report(self, obj):
        from .compliance import gate_report
        return gate_report(obj)

    def get_readiness_percent(self, obj):
        return round(100 * obj.compliance_score() / len(GATE_FIELDS))

    def get_exporter_verified(self, obj):
        return bool(obj.exporter_id and obj.exporter.ecta_license_verified_at)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        properties = data.get("properties", data)
        if not self._is_owner_or_admin(instance):
            for field in self.RESTRICTED_DOCUMENT_FIELDS:
                properties.pop(field, None)
            for field in ("ecex_permit_number", "customs_declaration_id", "eudr_dds_reference"):
                properties.pop(field, None)
        mask_commercial_fields(properties, request)
        return data

    def get_compliance_score(self, obj):
        return obj.compliance_score()

    def get_is_eudr_ready(self, obj):
        return obj.is_eudr_ready()

    def get_sample_requests_count(self, obj):
        return obj.sample_requests.count()

    def get_offers_count(self, obj):
        return obj.offers.count()

    def get_certifications(self, obj):
        return lot_certifications(obj)


class PublicLotStorySerializer(serializers.ModelSerializer):
    """
    Whitelisted fields only, for the public/unauthenticated Lot Story page.
    Deliberately excludes: pricing/commercial terms, exporter contact info,
    and all restricted document files (phyto cert, ECTA license, NBE FX
    declaration, customs declaration, EUDR DDS) — those stay behind auth.
    """

    exporter_company = serializers.CharField(
        source="exporter.company_name", read_only=True,
    )
    compliance_score = serializers.SerializerMethodField()
    export_ready      = serializers.ReadOnlyField()
    latest_sca_score  = serializers.SerializerMethodField()
    latest_q_grader   = serializers.SerializerMethodField()
    boundary_geojson      = serializers.SerializerMethodField()
    farm_location_geojson = serializers.SerializerMethodField()
    certifications         = serializers.SerializerMethodField()

    class Meta:
        model  = CoffeeLot
        fields = [
            "id", "lot_id", "name",
            "region", "washing_station", "altitude_m",
            "processing", "grade", "varietal", "harvest_date",
            "flavor_notes", "tasting_notes", "farm_story", "flavor_tags", "farm_photos",
            "is_organic", "is_fair_trade", "is_rainforest_alliance", "certifications",
            "latest_sca_score", "latest_q_grader",
            "compliance_score", "export_ready",
            "exporter_company",
            "boundary_geojson", "farm_location_geojson",
        ]

    def get_compliance_score(self, obj):
        return obj.compliance_score()

    def get_latest_sca_score(self, obj):
        score = obj.cupping_scores.filter(status="confirmed").first()
        if score:
            return score.total_score
        return float(obj.sca_score) if obj.sca_score is not None else None

    def get_latest_q_grader(self, obj):
        score = obj.cupping_scores.filter(status="confirmed").first()
        if score:
            return score.grader.get_full_name() or score.grader.email
        return obj.q_grader_name or None

    def get_boundary_geojson(self, obj):
        return json.loads(obj.boundary.geojson) if obj.boundary else None

    def get_farm_location_geojson(self, obj):
        return json.loads(obj.farm_location.geojson) if obj.farm_location else None

    def get_certifications(self, obj):
        return lot_certifications(obj)


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
        read_only_fields = ["id", "buyer", "status", "response", "tracking_number", "created_at", "updated_at"]

    def validate_lot(self, lot):
        user = self.context["request"].user
        if lot.status != "listed":
            raise serializers.ValidationError("Samples can only be requested for lots listed on the marketplace.")
        if lot.exporter_id == user.id:
            raise serializers.ValidationError("You cannot request a sample of your own lot.")
        return lot

    def validate_quantity_g(self, value):
        if not 50 <= value <= 2000:
            raise serializers.ValidationError("Sample size must be between 50 g and 2,000 g.")
        return value


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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context["request"].user
        lot = attrs.get("lot")
        if getattr(user, "role", None) not in ("buyer", "roaster"):
            raise serializers.ValidationError("Only buyer and roaster accounts can make offers.")
        if lot is None:
            raise serializers.ValidationError({"lot": "This field is required."})
        if lot.status != "listed":
            raise serializers.ValidationError({"lot": "This lot is not open for offers."})
        if lot.exporter_id == user.id:
            raise serializers.ValidationError({"lot": "You cannot make an offer on your own lot."})
        qty = attrs.get("quantity_kg")
        if qty is not None:
            if qty <= 0:
                raise serializers.ValidationError({"quantity_kg": "Quantity must be positive."})
            if lot.min_order_kg and qty < lot.min_order_kg:
                raise serializers.ValidationError({"quantity_kg": f"Minimum order is {lot.min_order_kg} kg."})
            if qty > lot.available_qty_kg:
                raise serializers.ValidationError({"quantity_kg": f"Only {lot.available_qty_kg} kg is available."})
        price = attrs.get("price_per_kg_usd")
        if price is not None and price <= 0:
            raise serializers.ValidationError({"price_per_kg_usd": "Price must be positive."})
        return attrs


class ComplianceEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model  = ComplianceEvent
        fields = ["id", "gate", "old_value", "new_value", "actor_name", "reason", "created_at", "hash"]

    def get_actor_name(self, obj):
        if not obj.actor_id:
            return "System"
        return obj.actor.get_full_name() or obj.actor.email
