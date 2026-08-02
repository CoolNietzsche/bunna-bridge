from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Offer, CoffeeLot, Notification
from .serializers import OfferSerializer
from .signals import create_lot_status_notification


def _contract_lot(lot):
    """Move a lot to 'contracted' when an offer on it is accepted.

    No-op if the lot isn't currently 'listed' (e.g. it was already
    contracted by another offer, or moved on manually).
    """
    if lot.status == "listed":
        lot.status = "contracted"
        lot.save(update_fields=["status"])
        create_lot_status_notification(lot, "listed", "contracted")


class OfferListCreateView(generics.ListCreateAPIView):
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "roaster":
            # Dual-role: offers they made as a buyer, plus offers received
            # on lots they own/export.
            return Offer.objects.filter(
                Q(buyer=user) | Q(lot__exporter=user)
            ).select_related("lot", "buyer")
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
            offer.save()
            _contract_lot(offer.lot)
            Notification.objects.create(
                recipient=offer.buyer,
                notification_type="offer",
                title="Offer Accepted",
                message=f"Your offer on lot {offer.lot.lot_id} ({offer.lot.name}) was accepted.",
                link="/buyer/offers",
            )
        elif action == "reject":
            offer.status = "rejected"
            offer.exporter_notes = request.data.get("exporter_notes", "")
            offer.save()
            Notification.objects.create(
                recipient=offer.buyer,
                notification_type="offer",
                title="Offer Rejected",
                message=f"Your offer on lot {offer.lot.lot_id} ({offer.lot.name}) was rejected.",
                link="/buyer/offers",
            )
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
            offer.save()
            Notification.objects.create(
                recipient=offer.buyer,
                notification_type="offer",
                title="Counter-Offer Received",
                message=(
                    f"The exporter countered your offer on lot {offer.lot.lot_id} "
                    f"({offer.lot.name}) at {counter_price}."
                ),
                link="/buyer/offers",
            )
        else:
            return Response(
                {"detail": "action must be accept, reject, or counter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        Notification.objects.create(
            recipient=offer.lot.exporter,
            notification_type="offer",
            title="Offer Withdrawn",
            message=f"{offer.buyer.email} withdrew their offer on lot {offer.lot.lot_id} ({offer.lot.name}).",
            link="/offers",
        )
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
        _contract_lot(offer.lot)
        Notification.objects.create(
            recipient=offer.lot.exporter,
            notification_type="offer",
            title="Counter-Offer Accepted",
            message=f"{offer.buyer.email} accepted your counter-offer on lot {offer.lot.lot_id} ({offer.lot.name}).",
            link="/offers",
        )
        return Response(OfferSerializer(offer).data)
