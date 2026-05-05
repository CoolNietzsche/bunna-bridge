from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CoffeeLot
from .serializers import CoffeeLotListSerializer, CoffeeLotDetailSerializer


class CoffeeLotViewSet(viewsets.ModelViewSet):
    queryset           = CoffeeLot.objects.select_related("exporter").all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["region", "grade", "processing", "status",
                          "deforestation_free", "eudr_dds_ready"]
    search_fields      = ["lot_id", "name", "washing_station", "region"]
    ordering_fields    = ["sca_score", "altitude_m", "volume_kg", "created_at"]

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
