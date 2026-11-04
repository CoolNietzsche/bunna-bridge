"""
Marketplace growth API (roadmap Phase 5) — /api/v1/market/...

select/                              programmes (admin creates)
select/<id>/                         programme + entries (catalogue/auction view)
select/<id>/nominate/                exporter nominates a lot
select/<id>/start-jury/ | publish/ | start-auction/   admin steps
select/entries/<eid>/bid/            buyer bids
stock/                               EU warehouse stock (partner importer lists; everyone browses)
stock/<id>/                          partner updates
orders/                              buyer orders (one warehouse per order); partner sees received orders
orders/<id>/<action>/                confirm / release / cancel
watchlist/ · watchlist/<lot>/        server-side watchlist
saved-searches/ · saved-searches/<id>/
lots/<lot>/impact/                   impact and transparency score
exporters/<user>/reliability-score/  reliability score
articles/ · articles/<slug>/         education hub (admins publish)
"""

from decimal import Decimal
from decimal import InvalidOperation

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import permissions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.views import is_admin
from bunna_bridge.lots.views import visible_lots
from bunna_bridge.orgs.access import team_ids
from bunna_bridge.users.models import User

from . import scores
from . import services as svc
from .models import Article
from .models import SavedSearch
from .models import SelectEntry
from .models import SelectProgramme
from .models import StockOrder
from .models import WarehouseStock
from .models import WatchItem
from .serializers import ArticleSerializer
from .serializers import EntrySerializer
from .serializers import OrderSerializer
from .serializers import ProgrammeSerializer
from .serializers import SavedSearchSerializer
from .serializers import StockSerializer

IsAuth = permissions.IsAuthenticated


def _err(msg, code=400):
    return Response({"detail": str(msg)}, status=code)


def _dec(value, field):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError) as exc:
        raise svc.MarketError(f"{field} must be a number.") from exc


# ── M-1 Beersheba Select ─────────────────────────────────────────────────────

class ProgrammeListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        svc.close_due()
        return Response(ProgrammeSerializer(SelectProgramme.objects.all(), many=True).data)

    def post(self, request):
        if not is_admin(request.user):
            return _err("Only the Beersheba team creates Select programmes.", 403)
        s = ProgrammeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(ProgrammeSerializer(s.save()).data, status=201)


class ProgrammeDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        svc.close_due()
        programme = get_object_or_404(SelectProgramme, pk=pk)
        entries = programme.entries.select_related("lot__exporter", "programme").prefetch_related("bids")
        user = request.user
        public_statuses = ["selected", "sold", "unsold"]
        if not is_admin(user):
            ids = team_ids(user) if user.is_authenticated else []
            entries = entries.filter(Q(status__in=public_statuses) | Q(lot__exporter_id__in=ids))
        data = ProgrammeSerializer(programme).data
        data["entries"] = EntrySerializer(entries, many=True, context={"request": request}).data
        data["is_admin"] = is_admin(user)
        data["server_time"] = timezone.now()
        return Response(data)


class NominateView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk):
        programme = get_object_or_404(SelectProgramme, pk=pk)
        lot = get_object_or_404(CoffeeLot, pk=request.data.get("lot"))
        try:
            reserve = request.data.get("reserve_price_usd")
            entry = svc.nominate(request.user, programme, lot, _dec(request.data.get("quantity_kg"), "Quantity"),
                                 _dec(request.data.get("starting_price_usd"), "Starting price"),
                                 _dec(reserve, "Reserve") if reserve not in (None, "") else None)
        except svc.MarketError as exc:
            return _err(exc)
        return Response(EntrySerializer(entry, context={"request": request}).data, status=201)


class ProgrammeStepView(APIView):
    permission_classes = [IsAuth]
    step = ""

    def post(self, request, pk):
        if not is_admin(request.user):
            return _err("Only the Beersheba team runs Select.", 403)
        programme = get_object_or_404(SelectProgramme, pk=pk)
        try:
            if self.step == "jury":
                svc.start_jury(request.user, programme)
            elif self.step == "publish":
                svc.publish_catalogue(request.user, programme)
            elif self.step == "auction":
                ends = parse_datetime(str(request.data.get("ends_at", "")))
                if ends is None:
                    return _err("Give the closing time, e.g. 2026-12-01T15:00.")
                if timezone.is_naive(ends):
                    ends = timezone.make_aware(ends)
                svc.start_auction(request.user, programme, ends)
        except svc.MarketError as exc:
            return _err(exc)
        return ProgrammeDetailView().get(request, pk)


class BidView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, eid):
        svc.close_due()
        try:
            bid = svc.place_bid(request.user, eid, _dec(request.data.get("price_usd_per_kg"), "Bid"))
        except svc.MarketError as exc:
            return _err(exc)
        except SelectEntry.DoesNotExist:
            return _err("Lot not found.", 404)
        entry = SelectEntry.objects.select_related("lot__exporter", "programme").get(pk=bid.entry_id)
        return Response(EntrySerializer(entry, context={"request": request}).data, status=201)


# ── M-3 EU warehouse stock ───────────────────────────────────────────────────

class StockListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        qs = WarehouseStock.objects.select_related("lot", "partner")
        if request.query_params.get("mine"):
            qs = qs.filter(partner_id__in=team_ids(request.user))
        else:
            qs = qs.filter(active=True, bags_available__gt=0)
        if request.query_params.get("warehouse"):
            qs = qs.filter(warehouse=request.query_params["warehouse"])
        return Response(StockSerializer(qs, many=True).data)

    def post(self, request):
        s = StockSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        lot = s.validated_data["lot"]
        if not svc.can_list_stock(request.user, lot):
            return _err("Only an importer who bought this lot can list it as EU stock.", 403)
        stock = s.save(partner=request.user, bags_available=s.validated_data["bags_total"])
        if lot.availability != "eu_stock":
            lot.availability = "eu_stock"
            lot.save(update_fields=["availability"])
        return Response(StockSerializer(stock).data, status=201)


class StockDetailView(APIView):
    permission_classes = [IsAuth]

    def patch(self, request, pk):
        stock = get_object_or_404(WarehouseStock, pk=pk, partner_id__in=team_ids(request.user))
        s = StockSerializer(stock, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(StockSerializer(stock).data)


class OrderListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        ids = team_ids(request.user)
        qs = StockOrder.objects.filter(Q(buyer_id__in=ids) | Q(partner_id__in=ids)).select_related("buyer", "partner")
        return Response(OrderSerializer(qs, many=True).data)

    def post(self, request):
        try:
            lines = [(str(line["stock"]), int(line["bags"])) for line in request.data.get("lines", [])]
            order = svc.place_order(request.user, lines, request.data.get("delivery", ""), request.data.get("notes", ""))
        except (KeyError, ValueError, TypeError):
            return _err("Each line needs a stock id and a number of bags.")
        except svc.MarketError as exc:
            return _err(exc)
        return Response(OrderSerializer(order).data, status=201)


class OrderActionView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk, action):
        ids = team_ids(request.user)
        order = get_object_or_404(StockOrder.objects.filter(Q(buyer_id__in=ids) | Q(partner_id__in=ids)), pk=pk)
        try:
            order = svc.update_order(request.user, order, action)
        except svc.MarketError as exc:
            return _err(exc)
        return Response(OrderSerializer(order).data)


# ── M-4 watchlist and saved searches ─────────────────────────────────────────

class WatchlistView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        return Response([str(x) for x in WatchItem.objects.filter(user=request.user).values_list("lot_id", flat=True)])

    def post(self, request):
        """Merge a list of lot ids (e.g. from the browser's old local watchlist)."""
        ids = [str(x) for x in request.data.get("lots", [])][:500]
        lots = visible_lots(request.user, CoffeeLot.objects.filter(pk__in=ids))
        for lot in lots:
            WatchItem.objects.get_or_create(user=request.user, lot=lot)
        return self.get(request)


class WatchToggleView(APIView):
    permission_classes = [IsAuth]

    def put(self, request, lot_pk):
        lot = get_object_or_404(visible_lots(request.user, CoffeeLot.objects.all()), pk=lot_pk)
        WatchItem.objects.get_or_create(user=request.user, lot=lot)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, lot_pk):
        WatchItem.objects.filter(user=request.user, lot_id=lot_pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedSearchListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        return Response(SavedSearchSerializer(SavedSearch.objects.filter(user=request.user), many=True).data)

    def post(self, request):
        if SavedSearch.objects.filter(user=request.user).count() >= 20:  # noqa: PLR2004
            return _err("You can keep up to 20 saved searches.")
        s = SavedSearchSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        search = s.save(user=request.user)
        data = SavedSearchSerializer(search).data
        lots = visible_lots(request.user, CoffeeLot.objects.filter(status="listed"))
        data["current_matches"] = sum(1 for lot in lots if svc.matches(search.filters, lot))
        return Response(data, status=201)


class SavedSearchDetailView(APIView):
    permission_classes = [IsAuth]

    def patch(self, request, pk):
        search = get_object_or_404(SavedSearch, pk=pk, user=request.user)
        s = SavedSearchSerializer(search, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(SavedSearchSerializer(s.save()).data)

    def delete(self, request, pk):
        get_object_or_404(SavedSearch, pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── M-5 / M-6 scores ─────────────────────────────────────────────────────────

class ImpactView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, lot_pk):
        lot = get_object_or_404(visible_lots(request.user, CoffeeLot.objects.all()), pk=lot_pk)
        return Response(scores.impact(lot))


class ReliabilityScoreView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, user_id):
        exporter = get_object_or_404(User, pk=user_id, role__in=["exporter", "roaster"])
        return Response(scores.reliability(exporter))


# ── M-7 education hub ────────────────────────────────────────────────────────

class ArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Article.objects.select_related("author")
        if not is_admin(request.user):
            qs = qs.filter(published_at__isnull=False, published_at__lte=timezone.now())
        if request.query_params.get("kind"):
            qs = qs.filter(kind=request.query_params["kind"])
        data = ArticleSerializer(qs, many=True).data
        for row in data:
            row.pop("body", None)
        return Response(data)

    def post(self, request):
        if not is_admin(request.user):
            return _err("Only the Beersheba team publishes articles.", 403)
        s = ArticleSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(ArticleSerializer(s.save(author=request.user)).data, status=201)


class ArticleDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def _get(self, request, slug):
        qs = Article.objects.select_related("author")
        if not is_admin(request.user):
            qs = qs.filter(published_at__isnull=False, published_at__lte=timezone.now())
        return get_object_or_404(qs, slug=slug)

    def get(self, request, slug):
        return Response(ArticleSerializer(self._get(request, slug)).data)

    def patch(self, request, slug):
        if not is_admin(request.user):
            return _err("Only the Beersheba team edits articles.", 403)
        article = self._get(request, slug)
        s = ArticleSerializer(article, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(ArticleSerializer(s.save()).data)

    def delete(self, request, slug):
        if not is_admin(request.user):
            return _err("Only the Beersheba team removes articles.", 403)
        self._get(request, slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

