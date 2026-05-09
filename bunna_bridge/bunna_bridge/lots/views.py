from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CoffeeLot, CuppingScore
from .serializers import (
    CoffeeLotListSerializer, CoffeeLotDetailSerializer, CuppingScoreSerializer
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

        if not lot.price_per_kg or not lot.volume_kg:
            return Response(
                {"detail": "Lot must have price_per_kg and volume_kg set."},
                status=400
            )

        try:
            nbe_rate = Decimal(str(request.data.get("nbe_rate", "59.85")))
        except InvalidOperation:
            return Response({"detail": "Invalid nbe_rate."}, status=400)

        result = calculate_settlement(
            volume_kg    = Decimal(str(lot.volume_kg)),
            price_per_kg = Decimal(str(lot.price_per_kg)),
            nbe_rate     = nbe_rate,
        )
        return Response(result)
