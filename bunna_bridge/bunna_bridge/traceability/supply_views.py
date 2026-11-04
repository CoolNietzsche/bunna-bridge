"""
Cherry intake (roadmap O-3) and cooperative-to-exporter supply (O-2).

/api/v1/traceability/deliveries/              record / list cherry deliveries
/api/v1/traceability/deliveries/<id>/         update (e.g. record payment)
/api/v1/traceability/my-deliveries/           a farmer's own deliveries and payments
/api/v1/lots/<id>/allocate-deliveries/        process deliveries into a lot (creates lot sources)
/api/v1/traceability/transfers/               cooperative sells deliveries to an exporter
/api/v1/traceability/transfers/<id>/respond/  exporter accepts / rejects
/api/v1/traceability/transfers/<id>/cancel/   seller withdraws an open offer
/api/v1/traceability/exporters/               exporters a cooperative can sell to
"""

from decimal import Decimal
from decimal import InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework import permissions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.views import is_admin
from bunna_bridge.lots.views import owned_lot_or_404
from bunna_bridge.orgs.access import can
from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids
from bunna_bridge.users.models import User

from .models import CherryDelivery
from .models import LotSource
from .models import SupplyTransfer
from .supply_serializers import CherryDeliverySerializer
from .supply_serializers import ExporterChoiceSerializer
from .supply_serializers import SupplyTransferSerializer
from .supply_serializers import default_green_ratio
from .views import CanManageSupply
from .views import _truthy


def _deliveries_for(user):
    """Deliveries the user's team received, plus those bought from cooperatives."""
    ids = team_ids(user)
    return CherryDelivery.objects.filter(
        Q(owner_id__in=ids) | Q(transfers__buyer_id__in=ids, transfers__status="accepted"),
    ).distinct()


class DeliveryListCreateView(generics.ListCreateAPIView):
    serializer_class = CherryDeliverySerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        p = self.request.query_params
        qs = _deliveries_for(self.request.user).select_related("producer", "plot", "station", "lot").prefetch_related(
            "transfers__buyer",
        )
        if p.get("producer"):
            qs = qs.filter(producer_id=p["producer"])
        if p.get("station"):
            qs = qs.filter(station_id=p["station"])
        if p.get("lot"):
            qs = qs.filter(lot_id=p["lot"])
        if _truthy(p.get("unallocated", "")):
            qs = qs.filter(lot__isnull=True)
        if _truthy(p.get("unpaid", "")):
            qs = qs.filter(Q(amount_paid_etb__isnull=True) | Q(amount_paid_etb=0))
        if _truthy(p.get("available", "")):
            qs = qs.exclude(transfers__status__in=["offered", "accepted"], owner_id__in=team_ids(self.request.user))
        search = p.get("search", "").strip()
        if search:
            qs = qs.filter(Q(receipt_number__icontains=search) | Q(producer__name__icontains=search))
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        ids = self.filter_queryset(self.get_queryset()).values("pk")
        plain = CherryDelivery.objects.filter(pk__in=ids)
        totals = plain.aggregate(kg=Sum("weight_kg"), paid=Sum("amount_paid_etb"))
        due = sum((d.amount_due_etb or Decimal("0") for d in plain.only("weight_kg", "price_per_kg_etb")), Decimal("0"))
        summary = {"weight_kg": str(totals["kg"] or 0), "paid_etb": str(totals["paid"] or 0), "due_etb": str(due)}
        if isinstance(response.data, dict):
            response.data["summary"] = summary
        else:
            response.data = {"results": response.data, "summary": summary}
        return response

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, recorded_by=self.request.user)


class DeliveryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CherryDeliverySerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        return CherryDelivery.objects.filter(owner_id__in=team_ids(self.request.user))

    def destroy(self, request, *args, **kwargs):
        delivery = self.get_object()
        if delivery.lot_id or delivery.transfers.filter(status__in=["offered", "accepted"]).exists():
            return Response({"detail": "This delivery is already in a lot or a sale and is kept on record."},
                            status=400)
        delivery.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyDeliveriesView(APIView):
    """A farmer with a login sees every delivery recorded against them, and what they were paid."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = CherryDelivery.objects.filter(producer__user=request.user).select_related(
            "producer", "plot", "station", "lot", "owner",
        )
        rows = []
        for d in qs:
            rows.append({
                "id": str(d.id), "receipt_number": d.receipt_number, "delivered_on": d.delivered_on,
                "form": d.get_form_display(), "weight_kg": str(d.weight_kg),
                "price_per_kg_etb": str(d.price_per_kg_etb) if d.price_per_kg_etb is not None else None,
                "amount_due_etb": str(d.amount_due_etb) if d.amount_due_etb is not None else None,
                "amount_paid_etb": str(d.amount_paid_etb) if d.amount_paid_etb is not None else None,
                "paid_on": d.paid_on, "received_by": d.owner.company_name or d.owner.email,
                "station": d.station.name if d.station_id else None,
                "lot": d.lot.lot_id if d.lot_id else None,
            })
        totals = qs.aggregate(kg=Sum("weight_kg"), paid=Sum("amount_paid_etb"))
        return Response({"results": rows, "summary": {"weight_kg": str(totals["kg"] or 0),
                                                      "paid_etb": str(totals["paid"] or 0)}})


class AllocateDeliveriesView(APIView):
    """Credit deliveries to a lot: each plot's green-equivalent kg is added to the lot's sources."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, lot_pk):
        lot = owned_lot_or_404(request, lot_pk)
        if not (is_admin(request.user) or can(request.user, "manage_lots")):
            return Response({"detail": "Your team role cannot change lots."}, status=403)
        ids = request.data.get("deliveries") or []
        ratio_raw = request.data.get("green_ratio")
        try:
            ratio = Decimal(str(ratio_raw)) if ratio_raw not in (None, "") else None
        except InvalidOperation:
            return Response({"green_ratio": ["Enter a number between 0 and 1."]}, status=400)
        if ratio is not None and not (Decimal("0") < ratio <= Decimal("1")):
            return Response({"green_ratio": ["Enter a number between 0 and 1."]}, status=400)
        allowed = list(_deliveries_for(lot.exporter).filter(pk__in=ids).values_list("pk", flat=True))
        deliveries = list(
            CherryDelivery.objects.filter(pk__in=allowed).select_for_update(of=("self",)).select_related("plot", "lot"),
        )
        if not deliveries or len(deliveries) != len(set(ids)):
            return Response({"detail": "Select deliveries your team received or bought."}, status=400)
        problems = [f"{d.receipt_number}: already in lot {d.lot.lot_id}" for d in deliveries if d.lot_id]
        problems += [f"{d.receipt_number}: no plot recorded" for d in deliveries if d.plot_id is None]
        problems += [
            f"{d.receipt_number}: offered to another exporter" for d in deliveries
            if same_team(lot.exporter, d.owner_id) and d.transfers.filter(status__in=["offered", "accepted"]).exists()
        ]
        if problems:
            return Response({"detail": "Some deliveries cannot be allocated.", "problems": problems}, status=400)

        per_plot = {}
        for d in deliveries:
            green = (d.weight_kg * (ratio or default_green_ratio(d.form))).quantize(Decimal("0.01"))
            d.lot = lot
            d.green_equivalent_kg = green
            d.save(update_fields=["lot", "green_equivalent_kg"])
            entry = per_plot.setdefault(d.plot_id, {"kg": Decimal("0"), "receipts": [], "last": d.delivered_on})
            entry["kg"] += green
            entry["receipts"].append(d.receipt_number)
            entry["last"] = max(entry["last"], d.delivered_on)
        for plot_id, entry in per_plot.items():
            source, created = LotSource.objects.get_or_create(
                lot=lot, plot_id=plot_id,
                defaults={"quantity_kg": entry["kg"], "delivery_reference": ", ".join(entry["receipts"])[:80],
                          "delivered_on": entry["last"], "created_by": request.user},
            )
            if not created:
                source.quantity_kg += entry["kg"]
                source.delivery_reference = ", ".join(
                    p for p in [source.delivery_reference, *entry["receipts"]] if p
                )[:80]
                source.save()
        return Response({
            "detail": f"Allocated {len(deliveries)} deliveries from {len(per_plot)} plot(s).",
            "green_kg": str(sum((e["kg"] for e in per_plot.values()), Decimal("0"))),
        })


class TransferListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplyTransferSerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        ids = team_ids(self.request.user)
        qs = SupplyTransfer.objects.filter(Q(seller_id__in=ids) | Q(buyer_id__in=ids)).select_related(
            "seller", "buyer",
        ).prefetch_related("deliveries__producer", "deliveries__plot", "deliveries__lot",
                           "deliveries__transfers__buyer", "deliveries__station")
        direction = self.request.query_params.get("direction")
        if direction == "incoming":
            qs = qs.filter(buyer_id__in=ids)
        elif direction == "outgoing":
            qs = qs.filter(seller_id__in=ids)
        return qs

    def perform_create(self, serializer):
        transfer = serializer.save(seller=self.request.user, created_by=self.request.user)
        seller = self.request.user
        Notification.objects.create(
            recipient=transfer.buyer, notification_type="offer",
            title="Coffee offered by a cooperative",
            message=f"{seller.company_name or seller.email} offered {transfer.quantity_kg} kg "
                    f"({transfer.get_form_display().lower()}), ref {transfer.reference}, traced to "
                    f"{len({d.plot_id for d in transfer.deliveries.all()})} plot(s).",
            link="/supply",
        )


class TransferRespondView(APIView):
    permission_classes = [CanManageSupply]

    @transaction.atomic
    def post(self, request, pk):
        transfer = get_object_or_404(
            SupplyTransfer.objects.select_for_update(), pk=pk, buyer_id__in=team_ids(request.user),
        )
        if transfer.status != SupplyTransfer.Status.OFFERED:
            return Response({"detail": "This offer is no longer open."}, status=400)
        action = request.data.get("action")
        if action not in ("accept", "reject"):
            return Response({"action": ["Use 'accept' or 'reject'."]}, status=400)
        transfer.status = SupplyTransfer.Status.ACCEPTED if action == "accept" else SupplyTransfer.Status.REJECTED
        transfer.responded_at = timezone.now()
        transfer.responded_by = request.user
        transfer.save()
        Notification.objects.create(
            recipient=transfer.seller, notification_type="offer",
            title=f"Sale {transfer.reference} {transfer.status}",
            message=f"{request.user.company_name or request.user.email} {transfer.status} your offer "
                    f"of {transfer.quantity_kg} kg.",
            link="/supply",
        )
        return Response(SupplyTransferSerializer(transfer, context={"request": request}).data)


class TransferCancelView(APIView):
    permission_classes = [CanManageSupply]

    def post(self, request, pk):
        transfer = get_object_or_404(SupplyTransfer, pk=pk, seller_id__in=team_ids(request.user))
        if transfer.status != SupplyTransfer.Status.OFFERED:
            return Response({"detail": "Only open offers can be withdrawn."}, status=400)
        transfer.status = SupplyTransfer.Status.CANCELLED
        transfer.responded_at = timezone.now()
        transfer.save(update_fields=["status", "responded_at"])
        return Response(SupplyTransferSerializer(transfer, context={"request": request}).data)


class ExporterChoicesView(generics.ListAPIView):
    serializer_class = ExporterChoiceSerializer
    permission_classes = [CanManageSupply]
    pagination_class = None

    def get_queryset(self):
        qs = User.objects.filter(role="exporter", is_active=True).exclude(pk__in=team_ids(self.request.user))
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(company_name__icontains=search) | Q(email__icontains=search))
        # One entry per organisation: prefer owners.
        return qs.filter(Q(membership__role="owner") | Q(membership__isnull=True)).order_by("company_name")[:50]
