from django.db.models import Q
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response

from bunna_bridge.lots.models import CoffeeLot, Offer

from .models import RoastBatch, RoastEquipment
from .serializers import (
    AvailableLotSerializer, RoastBatchSerializer, RoastEquipmentSerializer,
)


class IsRoaster(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            getattr(request.user, "role", None) == "roaster"
            or request.user.is_staff
            or request.user.is_superuser
        )


class RoastEquipmentListCreateView(generics.ListCreateAPIView):
    serializer_class   = RoastEquipmentSerializer
    permission_classes = [IsRoaster]

    def get_queryset(self):
        return RoastEquipment.objects.filter(roaster=self.request.user)

    def perform_create(self, serializer):
        serializer.save(roaster=self.request.user)


class RoastEquipmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = RoastEquipmentSerializer
    permission_classes = [IsRoaster]

    def get_queryset(self):
        return RoastEquipment.objects.filter(roaster=self.request.user)


class RoastBatchListCreateView(generics.ListCreateAPIView):
    serializer_class   = RoastBatchSerializer
    permission_classes = [IsRoaster]

    def get_queryset(self):
        return RoastBatch.objects.filter(roaster=self.request.user).prefetch_related("lot_inputs__lot")

    def perform_create(self, serializer):
        serializer.save(roaster=self.request.user)


class RoastBatchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = RoastBatchSerializer
    permission_classes = [IsRoaster]

    def get_queryset(self):
        return RoastBatch.objects.filter(roaster=self.request.user).prefetch_related("lot_inputs__lot")


class RoastBatchStatusUpdateView(viewsets.ViewSet):
    permission_classes = [IsRoaster]

    def partial_update(self, request, batch_pk=None):
        try:
            batch = RoastBatch.objects.get(pk=batch_pk, roaster=request.user)
        except RoastBatch.DoesNotExist:
            return Response({"detail": "Batch not found."}, status=404)

        new_status = request.data.get("status")
        pipeline = [c[0] for c in RoastBatch.Status.choices]
        if new_status not in pipeline:
            return Response({"detail": "Invalid status."}, status=400)

        current_idx = pipeline.index(batch.status)
        new_idx     = pipeline.index(new_status)
        if new_idx > current_idx + 1:
            return Response(
                {"detail": f"Cannot skip from {batch.status} to {new_status}."},
                status=400,
            )
        if new_status == "packaged" and batch.output_weight_kg is None:
            return Response(
                {"detail": "Record the roasted output weight before packaging."},
                status=400,
            )

        batch.status = new_status
        batch.save(update_fields=["status", "updated_at"])
        return Response(RoastBatchSerializer(batch, context={"request": request}).data)


class AvailableLotsView(generics.ListAPIView):
    """Green lots this roaster may use as roast-batch input: lots they
    export themselves, plus lots they've bought via an accepted offer."""
    serializer_class   = AvailableLotSerializer
    permission_classes = [IsRoaster]

    def get_queryset(self):
        user = self.request.user
        accepted_lot_ids = Offer.objects.filter(
            buyer=user, status="accepted",
        ).values_list("lot_id", flat=True)
        return CoffeeLot.objects.filter(
            Q(exporter=user) | Q(id__in=accepted_lot_ids)
        ).distinct()
