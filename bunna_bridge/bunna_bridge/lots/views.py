from urllib.parse import urlparse

from rest_framework import viewsets, permissions, filters, status, generics
from rest_framework.parsers import MultiPartParser, JSONParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CoffeeLot, CuppingScore, SampleRequest, WashingStation, Notification
from .serializers import (
    CoffeeLotListSerializer, CoffeeLotDetailSerializer,
    CuppingScoreSerializer, SampleRequestSerializer, LotStatusUpdateSerializer,
    PublicLotStorySerializer, WashingStationSerializer, ComplianceEventSerializer,
)

MARKETPLACE_STATUSES = ["listed", "contracted", "exported"]


def is_admin(user):
    return bool(user and user.is_authenticated and (
        user.is_staff or user.is_superuser or getattr(user, "role", None) == "admin"
    ))


def visible_lots(user, base=None):
    """The lots `user` may read. Single source of truth for lot scoping."""
    qs = base if base is not None else CoffeeLot.objects.all()
    if not user or not user.is_authenticated:
        return qs.filter(status__in=MARKETPLACE_STATUSES)
    if is_admin(user):
        return qs
    role = getattr(user, "role", None)
    if role in ("exporter", "roaster"):
        # Own lots (any status) plus the public marketplace.
        return qs.filter(Q(exporter=user) | Q(status__in=MARKETPLACE_STATUSES))
    if role == "farmer":
        return qs.filter(Q(farmer=user) | Q(status__in=MARKETPLACE_STATUSES))
    if role == "qgrader":
        # Q-graders cup lots before listing as well as after.
        return qs
    return qs.filter(status__in=MARKETPLACE_STATUSES)


def owned_lot_or_404(request, lot_pk):
    lot = get_object_or_404(CoffeeLot.objects.select_related("exporter", "farmer"), pk=lot_pk)
    if not (is_admin(request.user) or lot.exporter_id == request.user.id):
        # 404 rather than 403 so lot existence isn't disclosed.
        from django.http import Http404
        raise Http404
    return lot


class CanManageLotOrReadOnly(permissions.BasePermission):
    """
    Exporters and roasters can create/manage lots they own (roasters often
    run their own washing stations and export directly). Everyone else
    (buyer, farmer, qgrader) gets read-only access via get_queryset.

    has_object_permission is required here, not just has_permission: a
    roaster's get_queryset includes other exporters' listed/contracted/
    exported lots for marketplace browsing, so without an object-level
    ownership check a roaster could PATCH/DELETE a lot they don't own.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            getattr(request.user, "role", None) in ("exporter", "roaster", "admin")
            or request.user.is_staff
            or request.user.is_superuser
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            obj.exporter_id == request.user.id
            or getattr(request.user, "role", None) == "admin"
            or request.user.is_staff
            or request.user.is_superuser
        )


class WashingStationListCreateView(generics.ListCreateAPIView):
    serializer_class   = WashingStationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WashingStation.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class WashingStationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = WashingStationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WashingStation.objects.filter(owner=self.request.user)


class CoffeeLotViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset           = CoffeeLot.objects.select_related("exporter", "farmer").prefetch_related("exporter__certifications").all()
    permission_classes = [CanManageLotOrReadOnly]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["region", "grade", "processing", "status",
                          "deforestation_free", "eudr_dds_ready"]
    search_fields      = ["lot_id", "name", "washing_station", "region"]
    ordering_fields    = ["sca_score", "altitude_m", "volume_kg", "created_at"]

    def get_permissions(self):
        # Marketplace browsing (list/retrieve) is public; every other action
        # (create/update/delete + the custom @action endpoints below) stays
        # behind CanManageLotOrReadOnly.
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        user = self.request.user
        qs = CoffeeLot.objects.select_related("exporter", "farmer").prefetch_related(
            "exporter__certifications", "cupping_scores__grader",
        )
        qs = visible_lots(user, qs)
        if self.action != "list":
            return qs
        # ?marketplace=1 is the public catalogue for every role.
        if self.request.query_params.get("marketplace"):
            return qs.filter(status__in=MARKETPLACE_STATUSES)
        # Otherwise the list is the caller's registry: exporters see their
        # own lots, farmers the lots they produced. Roasters keep both their
        # own lots and the marketplace (they source and sell).
        role = getattr(user, "role", None) if user.is_authenticated else None
        if role == "exporter" and not is_admin(user):
            return qs.filter(exporter=user)
        if role == "farmer":
            return qs.filter(farmer=user)
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CoffeeLotDetailSerializer
        return CoffeeLotListSerializer

    def perform_create(self, serializer):
        serializer.save(exporter=self.request.user, actor=self.request.user)

    def perform_update(self, serializer):
        serializer.save(actor=self.request.user)

    @action(detail=True, methods=["get"], url_path="compliance-events")
    def compliance_events(self, request, pk=None):
        from .models import ComplianceEvent
        lot = self.get_object()
        events = ComplianceEvent.objects.filter(lot=lot).select_related("actor").order_by("-created_at", "-id")
        return Response({
            "chain_valid": ComplianceEvent.verify_chain(lot),
            "events": ComplianceEventSerializer(events, many=True).data,
        })

    @action(detail=True, methods=["get"], url_path="compliance-check")
    def compliance_check(self, request, pk=None):
        from .compliance import gate_report, readiness_percent
        from .eudr_spatial import run_deforestation_check_for_lot
        lot = self.get_object()
        was_free = lot.deforestation_free
        # Re-derive every gate (expiries, license, floor price) and re-run the satellite check.
        defor_result = run_deforestation_check_for_lot(lot, actor=request.user)
        lot.save(actor=request.user)
        if was_free and defor_result["status"] == "overlap":
            from .signals import create_eudr_alert_notification
            create_eudr_alert_notification(lot, "overlap")
        gates = {
            "gps_verified":        lot.gps_verified,
            "deforestation_free":  lot.deforestation_free,
            "eudr_dds_ready":      lot.eudr_dds_ready,
            "phyto_cert_uploaded": bool(lot.phyto_cert_file),
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
            "readiness_percent":    readiness_percent(lot),
            "report":               gate_report(lot),
            "deforestation_spatial": {
                "status":           defor_result["status"],
                "message":          defor_result["message"],
                "overlap_count":    defor_result["overlap_count"],
                "has_boundary":     bool(lot.boundary),
            },
        })

    @action(detail=True, methods=["get", "post"], url_path="cupping-scores")
    def cupping_scores(self, request, pk=None):
        lot = self.get_object()

        if request.method == "GET":
            scores = lot.cupping_scores.select_related("grader").all()
            if not (is_admin(request.user) or lot.exporter_id == request.user.id):
                scores = scores.filter(Q(status="confirmed") | Q(grader=request.user))
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
    """
    Read-only cupping scores. Graders see their own; lot owners see every
    score on their lots; everyone else sees confirmed scores on lots they
    can see. Admins see all.
    """
    serializer_class   = CuppingScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["lot", "status", "grader"]

    def get_queryset(self):
        user = self.request.user
        qs = CuppingScore.objects.select_related("lot", "grader")
        if is_admin(user):
            return qs
        visible = visible_lots(user).values("pk")
        return qs.filter(
            Q(grader=user)
            | Q(lot__exporter=user)
            | Q(status="confirmed", lot__in=visible)
        ).distinct()


from decimal import Decimal, InvalidOperation
from .settlement import calculate_settlement


class SettlementView(viewsets.ViewSet):
    """
    Calculate settlement breakdown for a lot contract.
    POST /api/v1/lots/{id}/settlement/
    Body: { "nbe_rate": 59.85 }   (optional — defaults to settings.NBE_DEFAULT_FX_RATE)
          { "total_usd": 12000 }  (optional — overrides lot.volume_kg * lot.price_per_kg)
    Delegates all math to lots.settlement.calculate_settlement() — single source of truth,
    shared with any other caller of that function.
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, lot_pk=None):
        from django.conf import settings
        from .settlement import calculate_settlement

        lot = owned_lot_or_404(request, lot_pk)

        try:
            nbe_rate = Decimal(str(request.data.get("nbe_rate", settings.NBE_DEFAULT_FX_RATE)))
        except InvalidOperation:
            return Response({"detail": "Invalid nbe_rate."}, status=400)
        if nbe_rate <= 0:
            return Response({"detail": "nbe_rate must be positive."}, status=400)

        total_usd_input = request.data.get("total_usd")
        if total_usd_input:
            try:
                total_usd = Decimal(str(total_usd_input))
            except InvalidOperation:
                return Response({"detail": "Invalid total_usd."}, status=400)
            if total_usd <= 0:
                return Response({"detail": "total_usd must be positive."}, status=400)

            if lot.volume_kg:
                # Anchor to the lot's real volume; derive price_per_kg from the override.
                volume_kg = Decimal(str(lot.volume_kg))
                price_per_kg = (total_usd / volume_kg) if volume_kg else Decimal("0")
            else:
                # No lot volume to anchor to — treat as a nominal 1kg lot so the
                # override amount is still the exact total used in the calculation.
                volume_kg = Decimal("1")
                price_per_kg = total_usd
        else:
            if not lot.price_per_kg or not lot.volume_kg:
                return Response(
                    {"detail": "Lot must have price_per_kg and volume_kg, or provide total_usd."},
                    status=400
                )
            volume_kg = Decimal(str(lot.volume_kg))
            price_per_kg = Decimal(str(lot.price_per_kg))

        result = calculate_settlement(
            volume_kg=volume_kg,
            price_per_kg=price_per_kg,
            nbe_rate=nbe_rate,
        )

        from datetime import datetime, timezone
        return Response({
            "lot_id":        str(lot.id),
            "lot_ref":       lot.lot_id,
            "total_usd":     result["gross_usd"],
            "platform_fee":  result["platform_fee_usd"],
            "net_usd":       result["net_usd"],
            "usd_retained":  result["usd_retained"],
            "etb_converted": result["etb_amount"],
            "nbe_rate":      result["nbe_rate"],
            "split_percent": result["nbe_split_pct"],
            "milestones":    result["milestones"],
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        })


class SampleRequestViewSet(viewsets.ModelViewSet):
    """
    Buyers/roasters create requests; the lot's owner moves them through
    pending -> approved/rejected -> shipped via `respond`; the requester
    confirms delivery via `received`. No generic PUT/PATCH/DELETE, so the
    status can't be set out of order.
    """
    serializer_class   = SampleRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ["get", "post", "head", "options"]
    TRANSITIONS = {
        "pending":  {"approved", "rejected"},
        "approved": {"shipped", "rejected"},
    }

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", "buyer")
        if user.is_staff or role == "admin":
            return SampleRequest.objects.select_related("lot","buyer").all()
        if role == "roaster":
            # Dual-role: sees requests they made as a buyer, plus requests
            # made on lots they own/export.
            return SampleRequest.objects.filter(
                Q(buyer=user) | Q(lot__exporter=user)
            ).select_related("lot","buyer")
        if role == "buyer":
            return SampleRequest.objects.filter(buyer=user).select_related("lot","buyer")
        if role == "exporter":
            return SampleRequest.objects.filter(
                lot__exporter=user
            ).select_related("lot","buyer")
        return SampleRequest.objects.none()

    def perform_create(self, serializer):
        if getattr(self.request.user, "role", None) not in ("buyer", "roaster"):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only buyer and roaster accounts can request samples.")
        serializer.save(buyer=self.request.user)

    @action(detail=True, methods=["post"], url_path="received")
    def received(self, request, pk=None):
        sample = self.get_object()
        if sample.buyer_id != request.user.id:
            return Response({"detail": "Only the requester can confirm delivery."}, status=403)
        if sample.status != "shipped":
            return Response({"detail": "Only shipped samples can be marked received."}, status=400)
        sample.status = "received"
        sample.save()
        Notification.objects.create(
            recipient=sample.lot.exporter, notification_type="sample_request",
            title="Sample Received",
            message=f"{sample.buyer.email} received the sample of lot {sample.lot.lot_id}.",
            link="/samples",
        )
        return Response(SampleRequestSerializer(sample).data)

    @action(detail=True, methods=["post"], url_path="respond")
    def respond(self, request, pk=None):
        sample = self.get_object()
        role   = getattr(request.user, "role", "")
        is_lot_owner = sample.lot.exporter_id == request.user.id
        if not (is_lot_owner or role == "admin" or request.user.is_staff):
            return Response({"detail": "Only the lot's exporter can respond."}, status=403)

        new_status = request.data.get("status")
        response_msg = request.data.get("response", "")
        tracking    = request.data.get("tracking_number", "")

        if new_status not in self.TRANSITIONS.get(sample.status, set()):
            return Response(
                {"detail": f"Cannot move a {sample.status} request to {new_status}."}, status=400,
            )
        if new_status == "shipped" and not (tracking or sample.tracking_number):
            return Response({"detail": "A tracking number is required to mark a sample shipped."}, status=400)

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

        admin = is_admin(request.user)
        if not admin and lot.exporter_id != request.user.id:
            return Response({"detail": "Not your lot."}, status=403)

        serializer = LotStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        new_status = serializer.validated_data["status"]
        old_status = lot.status
        if new_status == old_status:
            return Response({"detail": f"Lot is already {old_status}."}, status=400)

        pipeline = ["draft", "listed", "contracted", "exported"]
        current_idx = pipeline.index(old_status)
        new_idx     = pipeline.index(new_status)

        if new_idx > current_idx + 1:
            return Response({"detail": f"Cannot skip from {old_status} to {new_status}."}, status=400)

        if new_idx < current_idx:
            # Owners may only pull a listing back to draft; anything else
            # (undoing a contract or an export) is an admin correction.
            if not admin and not (old_status == "listed" and new_status == "draft"):
                return Response(
                    {"detail": f"A {old_status} lot can't be moved back to {new_status}. Contact support."},
                    status=400,
                )

        if new_status == "listed":
            missing = []
            if not lot.price_per_kg and lot.fob_price_usd is None:
                missing.append("a price")
            if not lot.available_qty_kg:
                missing.append("available quantity")
            if missing:
                return Response({"detail": f"Add {' and '.join(missing)} before listing."}, status=400)

        if new_status == "contracted" and not lot.offers.filter(status="accepted").exists() and not admin:
            return Response(
                {"detail": "A lot becomes contracted when you accept an offer."}, status=400,
            )

        # Re-derive gates from current evidence before the export check.
        lot.save(actor=request.user)
        if new_status == "exported" and not lot.export_ready:
            from .compliance import gate_report
            failing = [g["label"] for g in gate_report(lot) if not g["passed"]]
            return Response(
                {"detail": "Cannot mark as exported — failing gates: " + ", ".join(failing) + ".",
                 "failed_gates": failing},
                status=400,
            )

        lot.status = new_status
        lot.save(actor=request.user)
        from .signals import create_lot_status_notification
        create_lot_status_notification(lot, old_status, new_status)

        return Response({
            "lot_id":     lot.lot_id,
            "status":     lot.status,
            "export_ready": lot.export_ready,
        })


# ── EUDR DDS ────────────────────────────────────────────────────────────────
class EudrDdsView(viewsets.ViewSet):
    """
    GET /api/v1/lots/{id}/eudr-dds/ — owner/admin only. Generates the DDS PDF,
    stores it on the lot (which is what passes the DDS gate) and returns it.
    Refuses when the location or deforestation gates haven't passed, so the
    platform never issues a statement it can't back up.
    """
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, lot_pk=None):
        from django.core.files.base import ContentFile
        from django.http import HttpResponse
        from django.utils import timezone
        from .dds import dds_blockers, generate_dds_pdf

        lot = owned_lot_or_404(request, lot_pk)
        # Make sure gates reflect current evidence before deciding.
        lot.save(actor=request.user)
        blockers = dds_blockers(lot)
        if blockers:
            return Response({"detail": " ".join(blockers), "blockers": blockers}, status=400)

        pdf = generate_dds_pdf(lot)
        now = timezone.now()
        filename = f"EUDR-DDS-{lot.lot_id}-{timezone.localtime(now):%Y%m%d}.pdf"
        lot.eudr_dds_file.save(filename, ContentFile(pdf), save=False)
        lot.eudr_dds_generated_at = now
        lot.save(actor=request.user)

        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class EudrGeoJsonView(APIView):
    """GET /api/v1/lots/{id}/eudr-geojson/ — plot geolocation for the EU Information System."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, lot_pk):
        from django.http import JsonResponse
        from .dds import lot_geojson

        lot = owned_lot_or_404(request, lot_pk)
        if not lot.gps_verified:
            return Response({"detail": "This lot has no geolocation yet."}, status=400)
        response = JsonResponse(lot_geojson(lot))
        response["Content-Disposition"] = f'attachment; filename="{lot.lot_id}-plots.geojson"'
        return response


# ── Polygon boundary views ───────────────────────────────────────
from django.contrib.gis.geos import GEOSGeometry
from .eudr_spatial import METRIC_SRID, check_deforestation_overlap, check_geometry_for_lot
import json


def _boundary_response(lot, detail):
    result = check_deforestation_overlap(check_geometry_for_lot(lot))
    area_ha = None
    if lot.boundary:
        projected = lot.boundary.clone()
        projected.transform(METRIC_SRID)
        area_ha = round(projected.area / 10000, 4)
    return Response({
        "detail": detail,
        "area_ha": area_ha,
        "gps_verified": lot.gps_verified,
        "deforestation_check": {
            "status": result["status"],
            "deforestation_free": lot.deforestation_free,
            "message": result["message"],
            "overlap_count": result["overlap_count"],
        },
    })


class LotBoundaryView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, lot_pk):
        """Set or update the boundary polygon for a lot. Saving re-runs the deforestation check."""
        lot = owned_lot_or_404(request, lot_pk)

        boundary_data = request.data.get("boundary")
        if not boundary_data:
            return Response({"detail": "boundary field is required."}, status=400)
        try:
            if isinstance(boundary_data, dict):
                boundary_data = json.dumps(boundary_data)
            geom = GEOSGeometry(boundary_data, srid=4326)
        except Exception as e:
            return Response({"detail": f"Invalid geometry: {e}"}, status=400)
        if geom.geom_type != "Polygon":
            return Response({"detail": "Must be a Polygon geometry."}, status=400)
        if not geom.valid:
            return Response({"detail": "The boundary crosses itself — redraw it."}, status=400)
        minx, miny, maxx, maxy = geom.extent
        if not (33.0 <= minx and maxx <= 48.0 and 3.4 <= miny and maxy <= 15.0):
            return Response({"detail": "The boundary must be inside Ethiopia."}, status=400)

        lot.boundary = geom
        lot.save(actor=request.user)
        return _boundary_response(lot, "Boundary saved.")


class LotBoundaryInheritView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, lot_pk):
        """Copy the farm boundary from the lot's linked farmer."""
        lot = owned_lot_or_404(request, lot_pk)
        if not lot.farmer_id:
            return Response({"detail": "Link a farmer to this lot first."}, status=400)
        if not lot.farmer.boundary:
            return Response({"detail": "The linked farmer hasn't mapped their farm yet."}, status=404)

        lot.boundary = lot.farmer.boundary
        lot.save(actor=request.user)
        return _boundary_response(lot, "Boundary inherited from farm profile.")


# ── Lot Document Downloads ─────────────────────────────────────────────────
# These serve compliance/legal documents (phyto cert, ECTA license, NBE FX
# declaration, customs declaration, EUDR DDS) — never public. The underlying
# storage paths (lots/phyto/, lots/ecex/, lots/nbe/, lots/customs/, lots/dds/)
# are blocked at the nginx layer; this view is the only way to fetch them.
# Farm photos (lots/photos/) are a separate, intentionally public feature and
# are not affected — they still serve directly through /media/.
LOT_DOCUMENT_FIELDS = {
    "phyto_cert_file", "ecex_permit_file", "nbe_fx_declaration_file",
    "customs_declaration_file", "eudr_dds_file",
}


class LotDocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lot_pk, field_name):
        if field_name not in LOT_DOCUMENT_FIELDS:
            return Response({"detail": "Unknown document field."}, status=404)

        lot = owned_lot_or_404(request, lot_pk)
        file_field = getattr(lot, field_name)
        if not file_field:
            return Response({"detail": "No file uploaded for this field."}, status=404)

        from django.http import FileResponse
        return FileResponse(
            file_field.open("rb"),
            filename=file_field.name.rsplit("/", 1)[-1],
        )


# ── Lot Photos ───────────────────────────────────────────────────────────────
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTOS_PER_LOT = 8


class LotPhotosView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _check_owner(self, request, lot):
        if not (
            is_admin(request.user)
            or lot.exporter_id == request.user.id
            or lot.farmer_id == request.user.id
        ):
            return Response({"detail": "Not allowed."}, status=403)
        return None

    def post(self, request, lot_pk):
        """Upload a farm photo for a lot."""
        lot = get_object_or_404(CoffeeLot, pk=lot_pk)
        denied = self._check_owner(request, lot)
        if denied:
            return denied

        photo = request.FILES.get("photo")
        if not photo:
            return Response({"detail": "photo field is required."}, status=400)
        if photo.content_type not in ALLOWED_PHOTO_TYPES:
            return Response(
                {"detail": "Only JPEG, PNG, or WEBP images are allowed."}, status=400,
            )
        if photo.size > MAX_PHOTO_BYTES:
            return Response({"detail": "Photo must be under 5MB."}, status=400)
        if len(lot.farm_photos) >= MAX_PHOTOS_PER_LOT:
            return Response(
                {"detail": f"A lot can have at most {MAX_PHOTOS_PER_LOT} photos."},
                status=400,
            )

        path = default_storage.save(f"lots/photos/{lot.lot_id}/{photo.name}", photo)
        url = default_storage.url(path)

        lot.farm_photos = [*lot.farm_photos, url]
        lot.save(update_fields=["farm_photos"])
        return Response({"farm_photos": lot.farm_photos}, status=201)

    def delete(self, request, lot_pk):
        """Remove a farm photo from a lot."""
        lot = get_object_or_404(CoffeeLot, pk=lot_pk)
        denied = self._check_owner(request, lot)
        if denied:
            return denied

        url = request.data.get("url")
        if not url or url not in lot.farm_photos:
            return Response({"detail": "Photo not found on this lot."}, status=404)

        path = urlparse(url).path.removeprefix(settings.MEDIA_URL).lstrip("/")
        default_storage.delete(path)

        lot.farm_photos = [p for p in lot.farm_photos if p != url]
        lot.save(update_fields=["farm_photos"])
        return Response({"farm_photos": lot.farm_photos})


# ── Notification Views ──────────────────────────────────────────────────────

class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import Notification
        from django.core import serializers as dj_serializers
        import json
        qs = Notification.objects.filter(recipient=request.user)[:50]
        data = [
            {
                'id': n.id,
                'notification_type': n.notification_type,
                'title': n.title,
                'message': n.message,
                'link': n.link,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat(),
            }
            for n in qs
        ]
        return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notification_unread_count(request):
    from .models import Notification
    count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'count': count})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def notification_mark_read(request, pk):
    from .models import Notification
    try:
        n = Notification.objects.get(pk=pk, recipient=request.user)
        n.is_read = True
        n.save()
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def notification_mark_all_read(request):
    from .models import Notification
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})



# ── Public Lot Story ─────────────────────────────────────────────────────────
class LotStoryPublicView(APIView):
    """
    GET /api/v1/lots/<pk>/story/
    Public, unauthenticated. Only listed/contracted/exported lots are
    visible — draft lots 404 so nothing unfinished leaks.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, pk=None):
        lot = get_object_or_404(
            CoffeeLot.objects.select_related(
                "exporter", "farmer",
            ).prefetch_related("cupping_scores", "exporter__certifications"),
            pk=pk,
            status__in=["listed", "contracted", "exported"],
        )
        return Response(PublicLotStorySerializer(lot).data)


# ── Spec Sheet PDF ──────────────────────────────────────────────────────────
from django.http import HttpResponse
from .spec_sheet import generate_spec_sheet

class LotSpecSheetView(APIView):
    """
    GET /api/v1/lots/<lot_pk>/spec-sheet/
    Any authenticated user, for lots they can see (marketplace lots or their own).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, lot_pk=None):
        lot = get_object_or_404(
            visible_lots(request.user, CoffeeLot.objects.select_related(
                "exporter", "farmer",
            ).prefetch_related("cupping_scores")),
            pk=lot_pk,
        )
        pdf_bytes = generate_spec_sheet(lot)
        filename = f"spec-sheet-{lot.lot_id}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
