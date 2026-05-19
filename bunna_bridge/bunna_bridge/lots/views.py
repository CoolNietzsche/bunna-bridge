from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CoffeeLot, CuppingScore, SampleRequest
from .serializers import (
    CoffeeLotListSerializer, CoffeeLotDetailSerializer,
    CuppingScoreSerializer, SampleRequestSerializer, LotStatusUpdateSerializer
)


class IsExporterOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            getattr(request.user, "role", None) in ("exporter", "admin")
            or request.user.is_staff
            or request.user.is_superuser
        )


class CoffeeLotViewSet(viewsets.ModelViewSet):
    queryset           = CoffeeLot.objects.select_related("exporter").all()
    permission_classes = [IsExporterOrReadOnly]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["region", "grade", "processing", "status",
                          "deforestation_free", "eudr_dds_ready"]
    search_fields      = ["lot_id", "name", "washing_station", "region"]
    ordering_fields    = ["sca_score", "altitude_m", "volume_kg", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs   = CoffeeLot.objects.select_related("exporter").all()
        if user.is_staff or user.is_superuser:
            return qs
        role = getattr(user, "role", "exporter")
        if role == "exporter":
            return qs.filter(exporter=user)
        if role == "buyer":
            return qs.filter(status__in=["listed", "contracted", "exported"])
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CoffeeLotDetailSerializer
        return CoffeeLotListSerializer

    def perform_create(self, serializer):
        serializer.save(exporter=self.request.user)

    @action(detail=True, methods=["get"], url_path="compliance-check")
    def compliance_check(self, request, pk=None):
        lot   = self.get_object()
        gates = {
            "gps_verified":        lot.gps_verified,
            "deforestation_free":  lot.deforestation_free,
            "eudr_dds_ready":      lot.eudr_dds_ready,
            "phyto_cert_uploaded": lot.phyto_cert_uploaded,
            "ecta_license_active": lot.ecta_license_active,
            "nbe_fx_declared":     lot.nbe_fx_declared,
            "cta_floor_met":       lot.cta_floor_met,
        }
        return Response({
            "lot_id":               lot.lot_id,
            "gates":                gates,
            "export_ready":         lot.export_ready,
            "green_passport_ready": lot.green_passport_ready,
            "failed_gates":         [k for k, v in gates.items() if not v],
        })

    @action(detail=True, methods=["get", "post"], url_path="cupping-scores")
    def cupping_scores(self, request, pk=None):
        lot = self.get_object()

        if request.method == "GET":
            scores = lot.cupping_scores.select_related("grader").all()
            return Response(CuppingScoreSerializer(scores, many=True).data)

        # POST — only Q-Graders and admins can submit
        role = getattr(request.user, "role", "")
        if role not in ("qgrader", "admin") and not request.user.is_staff:
            return Response(
                {"detail": "Only Q-Graders can submit cupping scores."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CuppingScoreSerializer(
            data=request.data,
            context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(grader=request.user, lot=lot)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cupping-scores/(?P<score_id>[^/.]+)/confirm")
    def confirm_score(self, request, pk=None, score_id=None):
        lot = self.get_object()
        try:
            score = lot.cupping_scores.get(id=score_id)
        except CuppingScore.DoesNotExist:
            return Response({"detail": "Score not found."}, status=404)

        # Only the grader or admin can confirm
        if score.grader != request.user and not request.user.is_staff:
            return Response({"detail": "Not authorized."}, status=403)

        if score.status == "confirmed":
            return Response({"detail": "Already confirmed."}, status=400)

        score.status = "confirmed"
        score.save()  # triggers lot quality field update

        return Response({
            "detail":      "Score confirmed and lot quality updated.",
            "total_score": score.total_score,
            "lot_id":      lot.lot_id,
        })


class CuppingScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for browsing all cupping scores."""
    queryset           = CuppingScore.objects.select_related("lot", "grader").all()
    serializer_class   = CuppingScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["lot", "status", "grader"]


from decimal import Decimal, InvalidOperation
from .settlement import calculate_settlement


class SettlementView(viewsets.ViewSet):
    """
    Calculate settlement breakdown for a lot contract.
    POST /api/v1/lots/{id}/settlement/
    Body: { "nbe_rate": 59.85 }  (optional — defaults to 59.85)
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, lot_pk=None):
        try:
            lot = CoffeeLot.objects.get(pk=lot_pk)
        except CoffeeLot.DoesNotExist:
            return Response({"detail": "Lot not found."}, status=404)

        try:
            nbe_rate = Decimal(str(request.data.get("nbe_rate", "59.85")))
        except InvalidOperation:
            return Response({"detail": "Invalid nbe_rate."}, status=400)

        # Use total_usd from request if provided,
        # otherwise calculate from lot price * volume
        total_usd_input = request.data.get("total_usd")

        if total_usd_input:
            try:
                total_usd = Decimal(str(total_usd_input))
                volume_kg    = total_usd / nbe_rate if not lot.price_per_kg else Decimal(str(lot.volume_kg or 1))
                price_per_kg = total_usd / volume_kg
            except (InvalidOperation, ZeroDivisionError):
                return Response({"detail": "Invalid total_usd."}, status=400)
        else:
            if not lot.price_per_kg or not lot.volume_kg:
                return Response(
                    {"detail": "Lot must have price_per_kg and volume_kg, or provide total_usd."},
                    status=400
                )
            total_usd    = Decimal(str(lot.volume_kg)) * Decimal(str(lot.price_per_kg))
            volume_kg    = Decimal(str(lot.volume_kg))
            price_per_kg = Decimal(str(lot.price_per_kg))

        # Calculate split
        platform_fee_pct = Decimal("0.025")
        platform_fee     = (total_usd * platform_fee_pct).quantize(Decimal("0.01"))
        net_usd          = total_usd - platform_fee
        usd_retained     = (net_usd * Decimal("0.50")).quantize(Decimal("0.01"))
        etb_portion_usd  = net_usd - usd_retained
        etb_converted    = (etb_portion_usd * nbe_rate).quantize(Decimal("0.00"))

        from datetime import datetime, timezone
        return Response({
            "lot_id":        str(lot.id),
            "lot_ref":       lot.lot_id,
            "total_usd":     float(total_usd),
            "platform_fee":  float(platform_fee),
            "net_usd":       float(net_usd),
            "usd_retained":  float(usd_retained),
            "etb_converted": float(etb_converted),
            "nbe_rate":      float(nbe_rate),
            "split_percent": 50.0,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        })


# ── Sample Request ViewSet ────────────────────────────────
class SampleRequestViewSet(viewsets.ModelViewSet):
    serializer_class   = SampleRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", "buyer")
        if user.is_staff or role == "admin":
            return SampleRequest.objects.select_related("lot","buyer").all()
        if role == "buyer":
            return SampleRequest.objects.filter(buyer=user).select_related("lot","buyer")
        if role == "exporter":
            return SampleRequest.objects.filter(
                lot__exporter=user
            ).select_related("lot","buyer")
        return SampleRequest.objects.none()

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    @action(detail=True, methods=["post"], url_path="respond")
    def respond(self, request, pk=None):
        sample = self.get_object()
        role   = getattr(request.user, "role", "")
        if role not in ("exporter","admin") and not request.user.is_staff:
            return Response({"detail": "Only exporters can respond."}, status=403)

        new_status = request.data.get("status")
        response_msg = request.data.get("response", "")
        tracking    = request.data.get("tracking_number", "")

        if new_status not in ("approved","rejected","shipped"):
            return Response({"detail": "Invalid status."}, status=400)

        sample.status   = new_status
        sample.response = response_msg
        if tracking:
            sample.tracking_number = tracking
        sample.save()
        return Response(SampleRequestSerializer(sample).data)


# ── Lot Status Pipeline ────────────────────────────────────
class LotStatusUpdateView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def partial_update(self, request, lot_pk=None):
        try:
            lot = CoffeeLot.objects.get(pk=lot_pk)
        except CoffeeLot.DoesNotExist:
            return Response({"detail": "Lot not found."}, status=404)

        role = getattr(request.user, "role", "")
        if role not in ("exporter","admin") and not request.user.is_staff:
            return Response({"detail": "Only exporters can update lot status."}, status=403)

        if role == "exporter" and lot.exporter != request.user:
            return Response({"detail": "Not your lot."}, status=403)

        serializer = LotStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        new_status = serializer.validated_data["status"]

        # Validate pipeline progression
        pipeline = ["draft", "listed", "contracted", "exported"]
        current_idx = pipeline.index(lot.status)
        new_idx     = pipeline.index(new_status)

        # Allow moving forward or back to draft
        if new_idx > current_idx + 1:
            return Response(
                {"detail": f"Cannot skip from {lot.status} to {new_status}."},
                status=400
            )

        # Block export if compliance not ready
        if new_status == "exported" and not lot.export_ready:
            return Response(
                {"detail": "Cannot mark as exported — compliance gates not all passed."},
                status=400
            )

        lot.status = new_status
        lot.save()

        return Response({
            "lot_id":     lot.lot_id,
            "status":     lot.status,
            "export_ready": lot.export_ready,
        })


# ── EUDR DDS Generator ────────────────────────────────────
class EudrDdsView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, lot_pk=None):
        """GET /api/v1/lots/{id}/eudr-dds/ — returns DDS data as JSON"""
        try:
            lot = CoffeeLot.objects.select_related("exporter").get(pk=lot_pk)
        except CoffeeLot.DoesNotExist:
            return Response({"detail": "Lot not found."}, status=404)

        if not lot.gps_verified:
            return Response({"detail": "GPS not verified — cannot generate DDS."}, status=400)

        # Build GeoJSON geometry
        if lot.farm_location:
            geometry = {
                "type": "Point",
                "coordinates": [
                    float(lot.farm_location.x),
                    float(lot.farm_location.y),
                ]
            }
        elif lot.farm_polygon:
            coords = list(lot.farm_polygon.coords[0])
            geometry = {"type": "Polygon", "coordinates": [coords]}
        else:
            return Response({"detail": "No GPS coordinates found."}, status=400)

        from datetime import date
        dds = {
            "dds_version":    "1.0",
            "regulation":     "EU 2023/1115",
            "reference_date": "2020-12-31",
            "generated_at":   date.today().isoformat(),
            "operator": {
                "name":    lot.exporter.get_full_name() or lot.exporter.username,
                "email":   lot.exporter.email,
                "company": getattr(lot.exporter, "company_name", ""),
                "country": "ET",
            },
            "commodity": {
                "hs_code":         "0901",
                "description":     "Coffee",
                "scientific_name": "Coffea arabica",
                "quantity_kg":     float(lot.volume_kg),
                "country_of_production": "ET",
            },
            "lot": {
                "id":              str(lot.id),
                "lot_id":          lot.lot_id,
                "name":            lot.name,
                "region":          lot.region,
                "grade":           lot.grade,
                "processing":      lot.processing,
                "harvest_date":    lot.harvest_date.isoformat() if lot.harvest_date else None,
                "washing_station": lot.washing_station,
                "altitude_m":      lot.altitude_m,
            },
            "geolocation": {
                "type":     "Feature",
                "geometry": geometry,
                "properties": {
                    "lot_id":   lot.lot_id,
                    "region":   lot.region,
                    "country":  "ET",
                    "verified": lot.gps_verified,
                    "deforestation_free": lot.deforestation_free,
                    "reference_date":     "2020-12-31",
                }
            },
            "compliance": {
                "deforestation_free":  lot.deforestation_free,
                "gps_verified":        lot.gps_verified,
                "phyto_cert_uploaded": lot.phyto_cert_uploaded,
                "ecta_license_active": lot.ecta_license_active,
                "nbe_fx_declared":     lot.nbe_fx_declared,
                "cta_floor_met":       lot.cta_floor_met,
                "eudr_dds_ready":      lot.eudr_dds_ready,
                "export_ready":        lot.export_ready,
            },
        }

        # Return as downloadable JSON file
        import json
        from django.http import HttpResponse
        response = HttpResponse(
            json.dumps(dds, indent=2),
            content_type="application/json"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="DDS-{lot.lot_id}-{date.today().isoformat()}.json"'
        )
        return response
