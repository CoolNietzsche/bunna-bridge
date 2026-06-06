from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Offer, CoffeeLot
from .serializers import OfferSerializer


class OfferListCreateView(generics.ListCreateAPIView):
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "buyer":
            return Offer.objects.filter(buyer=user).select_related("lot", "buyer")
        if role in ("exporter", "admin"):
            return Offer.objects.filter(lot__exporter=user).select_related("lot", "buyer")
        return Offer.objects.none()

    def perform_create(self, serializer):
        lot_id = self.request.data.get("lot")
        lot = get_object_or_404(CoffeeLot, id=lot_id)
        serializer.save(buyer=self.request.user, lot=lot)


class OfferDetailView(generics.RetrieveAPIView):
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Offer.objects.filter(buyer=user) |
            Offer.objects.filter(lot__exporter=user)
        ).select_related("lot", "buyer")


class OfferRespondView(APIView):
    """Exporter accepts, rejects, or counters an offer."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        offer = get_object_or_404(Offer, pk=pk, lot__exporter=request.user)
        action = request.data.get("action")

        if offer.status not in ("pending", "countered"):
            return Response(
                {"detail": "Offer is no longer active."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "accept":
            offer.status = "accepted"
        elif action == "reject":
            offer.status = "rejected"
            offer.exporter_notes = request.data.get("exporter_notes", "")
        elif action == "counter":
            counter_price = request.data.get("counter_price")
            if not counter_price:
                return Response(
                    {"detail": "counter_price is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            offer.status = "countered"
            offer.counter_price = counter_price
            offer.counter_qty = request.data.get("counter_qty") or offer.quantity_kg
            offer.exporter_notes = request.data.get("exporter_notes", "")
        else:
            return Response(
                {"detail": "action must be accept, reject, or counter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer.save()
        return Response(OfferSerializer(offer).data)


class OfferWithdrawView(APIView):
    """Buyer withdraws their own offer."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        offer = get_object_or_404(Offer, pk=pk, buyer=request.user)
        if offer.status not in ("pending", "countered"):
            return Response(
                {"detail": "Cannot withdraw — offer is already resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        offer.status = "withdrawn"
        offer.save()
        return Response(OfferSerializer(offer).data)


class OfferAcceptCounterView(APIView):
    """Buyer accepts exporter's counter-offer."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        offer = get_object_or_404(Offer, pk=pk, buyer=request.user)
        if offer.status != "countered":
            return Response(
                {"detail": "No counter-offer to accept."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        offer.status = "accepted"
        offer.save()
        return Response(OfferSerializer(offer).data)
