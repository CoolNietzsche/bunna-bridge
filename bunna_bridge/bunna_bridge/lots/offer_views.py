from decimal import Decimal
from decimal import InvalidOperation

from django.db import transaction
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


def _accept(offer, qty, price):
    """
    Accept `offer` at qty/price atomically: lock the lot, check stock,
    decrement available quantity, contract the lot, and close every other
    open offer on it. Returns an error string or None.
    """
    lot = CoffeeLot.objects.select_for_update().get(pk=offer.lot_id)
    if lot.status != "listed":
        return "This lot is no longer open — it has already been contracted."
    if qty > lot.available_qty_kg:
        return f"Only {lot.available_qty_kg} kg is still available."

    offer.status = "accepted"
    offer.quantity_kg = qty
    offer.price_per_kg_usd = price
    offer.save()

    lot.available_qty_kg = lot.available_qty_kg - qty
    lot.save(update_fields=["available_qty_kg"])
    _contract_lot(lot)

    for other in Offer.objects.filter(lot=lot, status__in=["pending", "countered"]).exclude(pk=offer.pk):
        other.status = "rejected"
        other.exporter_notes = "Lot was contracted to another buyer."
        other.save()
        Notification.objects.create(
            recipient=other.buyer, notification_type="offer",
            title="Offer Closed",
            message=f"Lot {lot.lot_id} ({lot.name}) was contracted to another buyer.",
            link="/buyer/offers",
        )
    offer.lot = lot
    return None


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
        if role == "admin" or user.is_staff:
            return Offer.objects.select_related("lot", "buyer")
        if role == "exporter":
            return Offer.objects.filter(lot__exporter=user).select_related("lot", "buyer")
        return Offer.objects.none()

    def perform_create(self, serializer):
        offer = serializer.save(buyer=self.request.user)
        Notification.objects.create(
            recipient=offer.lot.exporter, notification_type="offer",
            title="New Offer",
            message=(
                f"{offer.buyer.company_name or offer.buyer.email} offered ${offer.price_per_kg_usd}/kg "
                f"for {offer.quantity_kg} kg of lot {offer.lot.lot_id}."
            ),
            link="/offers",
        )


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

    @transaction.atomic
    def post(self, request, pk):
        offer = get_object_or_404(Offer.objects.select_for_update(), pk=pk, lot__exporter=request.user)
        action = request.data.get("action")

        if offer.status not in ("pending", "countered"):
            return Response(
                {"detail": "Offer is no longer active."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "accept":
            if offer.status == "countered":
                return Response(
                    {"detail": "You countered this offer — wait for the buyer to accept or withdraw."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            error = _accept(offer, offer.quantity_kg, offer.price_per_kg_usd)
            if error:
                return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
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
            try:
                counter_price = Decimal(str(request.data.get("counter_price")))
                counter_qty = Decimal(str(request.data.get("counter_qty") or offer.quantity_kg))
            except (InvalidOperation, TypeError):
                return Response(
                    {"detail": "counter_price (and counter_qty, if given) must be numbers."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if counter_price <= 0 or counter_qty <= 0:
                return Response({"detail": "Counter price and quantity must be positive."},
                                status=status.HTTP_400_BAD_REQUEST)
            if counter_qty > offer.lot.available_qty_kg:
                return Response({"detail": f"Only {offer.lot.available_qty_kg} kg is available."},
                                status=status.HTTP_400_BAD_REQUEST)
            offer.status = "countered"
            offer.counter_price = counter_price
            offer.counter_qty = counter_qty
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

    @transaction.atomic
    def post(self, request, pk):
        offer = get_object_or_404(Offer.objects.select_for_update(), pk=pk, buyer=request.user)
        if offer.status != "countered":
            return Response(
                {"detail": "No counter-offer to accept."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        error = _accept(offer, offer.counter_qty or offer.quantity_kg, offer.counter_price)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        Notification.objects.create(
            recipient=offer.lot.exporter,
            notification_type="offer",
            title="Counter-Offer Accepted",
            message=f"{offer.buyer.email} accepted your counter-offer on lot {offer.lot.lot_id} ({offer.lot.name}).",
            link="/offers",
        )
        return Response(OfferSerializer(offer).data)
