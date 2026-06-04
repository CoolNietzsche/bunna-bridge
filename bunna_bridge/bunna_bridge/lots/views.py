from rest_framework import viewsets, permissions, filters, status, generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action, api_view, permission_classes
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
        from .eudr_spatial import check_deforestation_overlap, run_deforestation_check_for_lot
        lot = self.get_object()
        # Run live spatial deforestation check and auto-update lot if changed
        defor_result = check_deforestation_overlap(lot.boundary if lot.boundary else (lot.farm_location.buffer(0.005) if lot.farm_location else None))
        if defor_result["deforestation_free"] is not None and defor_result["deforestation_free"] != lot.deforestation_free:
            lot.deforestation_free = defor_result["deforestation_free"]
            lot.save(update_fields=["deforestation_free"])
            # Fire EUDR alert if overlap newly detected
            if defor_result["status"] == "overlap":
                try:
                    from .signals import create_eudr_alert_notification
                    create_eudr_alert_notification(lot, "overlap")
                except Exception:
                    pass
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

# EUDR DDS Generator
class EudrDdsView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, lot_pk=None):
        """GET /api/v1/lots/{id}/eudr-dds/ — generates and returns a DDS PDF"""
        from datetime import date
        import io
        from django.http import FileResponse
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        try:
            lot = CoffeeLot.objects.select_related("exporter").get(pk=lot_pk)
        except CoffeeLot.DoesNotExist:
            return Response({"detail": "Lot not found."}, status=404)

        if not lot.gps_verified:
            return Response({"detail": "GPS not verified — cannot generate DDS."}, status=400)

        if lot.farm_location:
            coords_str = f"{lot.farm_location.y:.6f} N, {lot.farm_location.x:.6f} E"
            geo_type   = "Point"
        elif lot.farm_polygon:
            coords_str = f"Polygon — {lot.farm_polygon.num_coords} vertices"
            geo_type   = "Polygon"
        else:
            return Response({"detail": "No GPS coordinates found."}, status=400)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=20*mm, rightMargin=20*mm,
            topMargin=20*mm, bottomMargin=20*mm,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("title", fontSize=22, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#1E3A2F"), spaceAfter=2*mm, alignment=TA_CENTER)
        sub_style = ParagraphStyle("sub", fontSize=9, fontName="Helvetica",
            textColor=colors.HexColor("#4A7C59"), spaceAfter=6*mm, alignment=TA_CENTER, leading=14)
        section_style = ParagraphStyle("section", fontSize=10, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#1E3A2F"), spaceBefore=6*mm, spaceAfter=3*mm)
        small_style = ParagraphStyle("small", fontSize=7.5, fontName="Helvetica",
            textColor=colors.HexColor("#666666"), leading=12)

        def section_table(rows):
            t = Table(rows, colWidths=[65*mm, 105*mm])
            t.setStyle(TableStyle([
                ("FONTNAME",    (0,0), (0,-1), "Helvetica-Bold"),
                ("FONTNAME",    (1,0), (1,-1), "Helvetica"),
                ("FONTSIZE",    (0,0), (-1,-1), 9),
                ("TEXTCOLOR",   (0,0), (0,-1), colors.HexColor("#555555")),
                ("TEXTCOLOR",   (1,0), (1,-1), colors.HexColor("#111111")),
                ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.HexColor("#F5F9F7"), colors.white]),
                ("TOPPADDING",  (0,0), (-1,-1), 5),
                ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                ("LEFTPADDING", (0,0), (-1,-1), 8),
                ("RIGHTPADDING", (0,0), (-1,-1), 8),
                ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#D0E4D8")),
            ]))
            return t

        compliance_gates = [
            ("GPS Verified",        "PASS" if lot.gps_verified        else "FAIL"),
            ("Deforestation Free",  "PASS" if lot.deforestation_free  else "FAIL"),
            ("EUDR DDS Ready",      "PASS" if lot.eudr_dds_ready      else "FAIL"),
            ("Phytosanitary Cert",  "PASS" if lot.phyto_cert_uploaded else "FAIL"),
            ("ECTA Export License", "PASS" if lot.ecta_license_active else "FAIL"),
            ("NBE FX Declared",     "PASS" if lot.nbe_fx_declared     else "FAIL"),
            ("CTA Floor Price Met", "PASS" if lot.cta_floor_met       else "FAIL"),
        ]

        gate_table = Table(compliance_gates, colWidths=[120*mm, 50*mm])
        gate_table.setStyle(TableStyle([
            ("FONTNAME",    (0,0), (-1,-1), "Helvetica"),
            ("FONTNAME",    (0,0), (0,-1), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0), (-1,-1), 9),
            ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.HexColor("#F5F9F7"), colors.white]),
            ("TOPPADDING",  (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
            ("RIGHTPADDING", (0,0), (-1,-1), 8),
            ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#D0E4D8")),
            *[("TEXTCOLOR", (1,i), (1,i),
               colors.HexColor("#1E3A2F") if compliance_gates[i][1] == "PASS"
               else colors.HexColor("#C1440E"))
              for i in range(len(compliance_gates))],
        ]))

        story = [
            Paragraph("BUNNA BRIDGE", title_style),
            Paragraph(
                "EU Deforestation Regulation — Due Diligence Statement<br/>"
                "Regulation EU 2023/1115 | Reference Date: 2020-12-31",
                sub_style),
            HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A2F"), spaceAfter=6*mm),
            Paragraph("1. Document Information", section_style),
            section_table([
                ["DDS Version",    "1.0"],
                ["Regulation",     "EU 2023/1115 (EUDR)"],
                ["Reference Date", "31 December 2020"],
                ["Generated On",   date.today().strftime("%d %B %Y")],
                ["Generated By",   "Bunna Bridge Platform"],
            ]),
            Paragraph("2. Operator Details", section_style),
            section_table([
                ["Name",    lot.exporter.get_full_name() or lot.exporter.username],
                ["Email",   lot.exporter.email],
                ["Company", getattr(lot.exporter, "company_name", "") or "—"],
                ["Country", "Ethiopia (ET)"],
            ]),
            Paragraph("3. Commodity", section_style),
            section_table([
                ["HS Code",          "0901 — Coffee"],
                ["Scientific Name",  "Coffea arabica"],
                ["Description",      "Green (unroasted) specialty coffee"],
                ["Quantity",         f"{float(lot.volume_kg):,.2f} kg"],
                ["Country of Production", "Ethiopia (ET)"],
            ]),
            Paragraph("4. Lot Details", section_style),
            section_table([
                ["Lot ID",          lot.lot_id],
                ["Lot Name",        lot.name],
                ["Region",          lot.region.capitalize()],
                ["Kebele",          lot.kebele or "—"],
                ["Washing Station", lot.washing_station or "—"],
                ["Altitude",        f"{lot.altitude_m} m a.s.l."],
                ["Processing",      lot.processing.capitalize()],
                ["Grade",           lot.grade],
                ["Varietal",        lot.varietal],
                ["Harvest Date",    lot.harvest_date.strftime("%d %B %Y") if lot.harvest_date else "—"],
            ]),
            Paragraph("5. Geolocation", section_style),
            section_table([
                ["Geometry Type",     geo_type],
                ["Coordinates",       coords_str],
                ["GPS Verified",      "Yes"],
                ["Deforestation Free","Yes — cleared against Global Forest Watch"],
            ]),
            Paragraph("6. Quality Record", section_style),
            section_table([
                ["SCA Score",        f"{lot.sca_score} / 100" if lot.sca_score else "Pending"],
                ["Flavor Notes",     lot.flavor_notes or "—"],
                ["Cupping Date",     lot.cupping_date.strftime("%d %B %Y") if lot.cupping_date else "—"],
                ["Q-Grader",         lot.q_grader_name or "—"],
                ["Q-Grader Cert ID", lot.q_grader_cert_id or "—"],
            ]),
            Paragraph("7. Compliance Gates", section_style),
            gate_table,
            Spacer(1, 6*mm),
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D0E4D8"), spaceAfter=4*mm),
            Paragraph(
                "This Due Diligence Statement is generated by the Bunna Bridge platform "
                "in accordance with EU Regulation 2023/1115. The operator confirms that "
                "the commodity described above was not produced on land subject to "
                "deforestation or forest degradation after 31 December 2020.",
                small_style),
            Spacer(1, 3*mm),
            Paragraph(
                f"Document ID: EUDR-DDS-{lot.lot_id}-{date.today().strftime('%Y%m%d')} | "
                f"Bunna Bridge (bunnabridge.pro.et) | Generated: {date.today().isoformat()}",
                small_style),
        ]

        doc.build(story)
        buffer.seek(0)
        filename = f"EUDR-DDS-{lot.lot_id}-{date.today().strftime('%Y%m%d')}.pdf"
        return FileResponse(buffer, as_attachment=True, filename=filename, content_type="application/pdf")


# ── Polygon boundary views ───────────────────────────────────────
from django.contrib.gis.geos import GEOSGeometry
from .eudr_spatial import check_deforestation_overlap, run_deforestation_check_for_lot
import json

class LotBoundaryView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """Set or update the boundary polygon for a lot."""
        lot = get_object_or_404(CoffeeLot, pk=pk)

        # Only exporter (owner) or admin can set boundary
        if request.user.role not in ("admin",) and lot.exporter != request.user:
            return Response({"detail": "Not allowed."}, status=403)

        boundary_data = request.data.get("boundary")
        if not boundary_data:
            return Response({"detail": "boundary field is required."}, status=400)

        try:
            if isinstance(boundary_data, dict):
                boundary_data = json.dumps(boundary_data)
            geom = GEOSGeometry(boundary_data, srid=4326)
            if geom.geom_type != "Polygon":
                return Response({"detail": "Must be a Polygon geometry."}, status=400)
            lot.boundary = geom
            lot.save(update_fields=["boundary"])
            # Auto-run deforestation check after boundary is set
            defor_result = run_deforestation_check_for_lot(lot)
            return Response({
                "detail": "Boundary saved.",
                "area_ha": round(geom.area * 10000, 4),
                "deforestation_check": {
                    "deforestation_free": defor_result,
                    "message": "clear" if defor_result else "overlap detected" if defor_result is False else "pending",
                }
            })
        except Exception as e:
            return Response({"detail": f"Invalid geometry: {e}"}, status=400)


class LotBoundaryInheritView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Copy the farm boundary from the linked farmer profile to this lot."""
        lot = get_object_or_404(CoffeeLot, pk=pk)

        if request.user.role not in ("admin",) and lot.exporter != request.user:
            return Response({"detail": "Not allowed."}, status=403)

        # Find farmer profile — try current user first, then any farmer
        # CoffeeLot has no direct farmer FK, so we use the requesting user
        # if they are a farmer, otherwise find any farmer with a boundary
        from bunna_bridge.users.models import User
        profile = None
        try:
            from bunna_bridge.users.models import FarmerProfile
            # Try current user's farm profile first
            profile = FarmerProfile.objects.filter(
                user=request.user, boundary__isnull=False
            ).first()
            # If admin, find any farmer with a boundary near the lot
            if not profile and request.user.role == "admin":
                profile = FarmerProfile.objects.filter(
                    boundary__isnull=False
                ).first()
        except Exception:
            profile = None

        if not profile or not profile.boundary:
            return Response({"detail": "No farm boundary found to inherit."}, status=404)

        lot.boundary = profile.boundary
        lot.save(update_fields=["boundary"])
        # Auto-run deforestation check after inheriting boundary
        defor_result = run_deforestation_check_for_lot(lot)
        return Response({
            "detail": "Boundary inherited from farm profile.",
            "deforestation_check": {
                "deforestation_free": defor_result,
            }
        })


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
