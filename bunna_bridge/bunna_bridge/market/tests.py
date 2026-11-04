"""Marketplace growth (roadmap Phase 5, M-1 … M-7)."""

from datetime import date
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.models import Offer
from bunna_bridge.trade.models import Contract
from bunna_bridge.traceability.models import CherryDelivery
from bunna_bridge.traceability.models import LotSource
from bunna_bridge.traceability.models import Plot
from bunna_bridge.traceability.models import Producer
from bunna_bridge.traceability.models import ProducerConsent
from bunna_bridge.users.models import User

from . import services as svc
from .models import SelectEntry
from .models import SelectProgramme
from .models import WarehouseStock

pytestmark = pytest.mark.django_db
PASSWORD = "Highland-Coffee-2026!"  # noqa: S105


def make_user(role, **kw):
    n = User.objects.count()
    return User.objects.create_user(username=f"{role}{n}", email=f"{role}{n}@example.com", role=role,
                                    password=PASSWORD, first_name=role.title(), last_name=str(n), **kw)


def client_for(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c


def make_lot(exporter, **kw):
    data = {"lot_id": f"M-{CoffeeLot.objects.count():03d}", "name": "Market lot", "status": "listed",
            "exporter": exporter, "region": "sidama", "altitude_m": 2000, "processing": "washed", "grade": "G1",
            "harvest_date": date(2026, 1, 1), "volume_kg": Decimal("1200"), "available_qty_kg": Decimal("1200"),
            "fob_price_usd": Decimal("7.00"), "price_per_kg": Decimal("7.00")}
    data.update(kw)
    return CoffeeLot.objects.create(**data)


def make_ready(lot):
    CoffeeLot.objects.filter(pk=lot.pk).update(eudr_dds_ready=True, ecta_license_active=True)
    lot.refresh_from_db()
    return lot


def cva_body(level):
    return dict.fromkeys(("fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"),
                         level)


@pytest.fixture
def select_setup():
    FloorPrice.objects.create(min_price_usd_per_kg=Decimal("4"), valid_from=date(2026, 1, 1))
    admin = make_user("admin")
    exp = make_user("exporter", company_name="Highland")
    good, weak, not_ready = make_lot(exp), make_lot(exp), make_lot(exp)
    make_ready(good)
    make_ready(weak)
    r = client_for(admin).post(reverse("select-list"), {
        "name": "Beersheba Select", "season": "2026/27", "nominations_close": str(date.today() + timedelta(days=7)),
    }, format="json")
    assert r.status_code == 201, r.data
    programme = SelectProgramme.objects.get(pk=r.data["id"])
    return admin, exp, programme, good, weak, not_ready


class TestSelect:
    def _nominate(self, exp, programme, lot, **extra):
        body = {"lot": str(lot.pk), "quantity_kg": "600", "starting_price_usd": "8.00", **extra}
        return client_for(exp).post(reverse("select-nominate", args=[programme.pk]), body, format="json")

    def test_full_programme_jury_auction_and_close(self, select_setup):
        admin, exp, programme, good, weak, not_ready = select_setup
        assert self._nominate(exp, programme, good, reserve_price_usd="9.00").status_code == 201
        assert self._nominate(exp, programme, weak).status_code == 201
        r = self._nominate(exp, programme, not_ready)
        assert r.data["status"] == "ineligible" and "EUDR" in r.data["eligibility_notes"]
        assert self._nominate(make_user("exporter"), programme, good).status_code == 400  # not their lot / duplicate
        # Jury: a blind session is created with the eligible lots.
        c = client_for(admin)
        assert c.post(reverse("select-start-jury", args=[programme.pk])).status_code == 200
        programme.refresh_from_db()
        session = programme.jury_session
        assert session.samples.count() == 2  # noqa: PLR2004
        graders = [make_user("qgrader") for _ in range(2)]
        for g in graders:
            client_for(admin).post(reverse("session-graders", args=[session.pk]), {"email": g.email}, format="json")
            for sample in session.samples.all():
                level = 7 if sample.lot_id == good.pk else 5
                r = client_for(g).post(reverse("session-score", args=[session.pk, sample.pk]), cva_body(level),
                                       format="json")
                assert r.status_code == 201, r.data
        assert c.post(reverse("select-publish", args=[programme.pk])).status_code == 400  # not revealed yet
        client_for(admin).post(reverse("session-status", args=[session.pk]), {"status": "revealed"}, format="json")
        data = c.post(reverse("select-publish", args=[programme.pk])).data
        statuses = {e["lot_code"]: e["status"] for e in data["entries"]}
        assert statuses[good.lot_id] == "selected" and statuses[weak.lot_id] == "not_selected"
        # The public catalogue shows selected lots only.
        public = client_for().get(reverse("select-detail", args=[programme.pk])).data["entries"]
        assert [e["lot_code"] for e in public] == [good.lot_id]
        # Auction.
        ends = (timezone.now() + timedelta(hours=1)).isoformat()
        assert c.post(reverse("select-start-auction", args=[programme.pk]), {"ends_at": ends},
                      format="json").status_code == 200
        entry = SelectEntry.objects.get(programme=programme, lot=good)
        b1, b2 = make_user("importer", company_name="Hamburg"), make_user("roaster", company_name="Oslo Roasters")
        bid = reverse("select-bid", args=[entry.pk])
        assert client_for(b1).post(bid, {"price_usd_per_kg": "7.50"}, format="json").status_code == 400  # below start
        assert client_for(exp).post(bid, {"price_usd_per_kg": "9"}, format="json").status_code == 400  # exporter
        assert client_for(b1).post(bid, {"price_usd_per_kg": "8.50"}, format="json").status_code == 201
        assert client_for(b2).post(bid, {"price_usd_per_kg": "8.55"}, format="json").status_code == 400  # increment
        r = client_for(b2).post(bid, {"price_usd_per_kg": "9.40"}, format="json")
        assert r.status_code == 201 and r.data["i_am_winning"] is True and r.data["reserve_met"] is True
        assert Notification.objects.filter(recipient=b1, title__startswith="Outbid").exists()
        # Anti-sniping: a bid in the last minutes extends the close.
        SelectEntry.objects.filter(pk=entry.pk).update(closes_at=timezone.now() + timedelta(seconds=30))
        client_for(b1).post(bid, {"price_usd_per_kg": "9.60"}, format="json")
        entry.refresh_from_db()
        assert entry.closes_at > timezone.now() + timedelta(minutes=2)
        # Close: highest bidder wins, an accepted offer and a contract are created.
        assert svc.close_due(now=entry.closes_at + timedelta(seconds=1)) == 1
        entry.refresh_from_db()
        assert entry.status == "sold" and entry.winning_bid.bidder == b1
        offer = Offer.objects.get(lot=good, buyer=b1)
        assert offer.status == "accepted" and offer.price_per_kg_usd == Decimal("9.60")
        assert Contract.objects.filter(offer=offer).exists()

    def test_reserve_not_met_is_unsold(self, select_setup):
        admin, exp, programme, good, *_ = select_setup
        entry = SelectEntry.objects.create(programme=programme, lot=good, quantity_kg=Decimal("600"),
                                           starting_price_usd=Decimal("8"), reserve_price_usd=Decimal("10"),
                                           status="selected", closes_at=timezone.now() + timedelta(hours=1))
        programme.status = "auction"
        programme.save()
        assert client_for(make_user("buyer")).post(reverse("select-bid", args=[entry.pk]),
                                                   {"price_usd_per_kg": "8.10"}, format="json").status_code == 201
        svc.close_due(now=timezone.now() + timedelta(hours=2))
        entry.refresh_from_db()
        assert entry.status == "unsold"
        assert not Offer.objects.filter(lot=good).exists()

    def test_only_admin_runs_programmes(self, select_setup):
        _, exp, programme, *_ = select_setup
        assert client_for(exp).post(reverse("select-start-jury", args=[programme.pk])).status_code == 403
        assert client_for(exp).post(reverse("select-list"), {"name": "x"}, format="json").status_code == 403


class TestEuStock:
    def _setup(self):
        FloorPrice.objects.create(min_price_usd_per_kg=Decimal("4"), valid_from=date(2026, 1, 1))
        exp = make_user("exporter")
        importer = make_user("importer", company_name="Hamburg GmbH")
        lot1, lot2 = make_lot(exp), make_lot(exp)
        for lot in (lot1, lot2):
            Offer.objects.create(lot=lot, buyer=importer, quantity_kg=Decimal("600"), price_per_kg_usd=Decimal("7"),
                                 status="accepted")
        return exp, importer, lot1, lot2

    def test_list_order_confirm_cancel(self):
        exp, importer, lot1, lot2 = self._setup()
        ci = client_for(importer)
        body = {"lot": str(lot1.pk), "warehouse": "hamburg", "bag_kg": "30", "bags_total": 20, "price_eur_per_kg": "14.50"}
        assert client_for(make_user("importer")).post(reverse("stock-list"), body, format="json").status_code == 403
        r = ci.post(reverse("stock-list"), body, format="json")
        assert r.status_code == 201, r.data
        s1 = r.data["id"]
        lot1.refresh_from_db()
        assert lot1.availability == "eu_stock"
        s2 = ci.post(reverse("stock-list"), {**body, "lot": str(lot2.pk), "warehouse": "antwerp"}, format="json").data["id"]
        roaster = make_user("roaster")
        cr = client_for(roaster)
        r = cr.post(reverse("stock-orders"), {"lines": [{"stock": s1, "bags": 2}, {"stock": s2, "bags": 1}]}, format="json")
        assert r.status_code == 400 and "warehouse" in r.data["detail"]
        assert cr.post(reverse("stock-orders"), {"lines": [{"stock": s1, "bags": 25}]}, format="json").status_code == 400
        r = cr.post(reverse("stock-orders"), {"lines": [{"stock": s1, "bags": 3}], "delivery": "Oslo"}, format="json")
        assert r.status_code == 201, r.data
        order = r.data["id"]
        assert r.data["total_kg"] == "90.0" and r.data["total_eur"] == "1305.00"
        assert cr.post(reverse("stock-order-action", args=[order, "confirm"])).status_code == 400  # buyer can't confirm
        assert ci.post(reverse("stock-order-action", args=[order, "confirm"])).status_code == 200
        assert WarehouseStock.objects.get(pk=s1).bags_available == 17  # noqa: PLR2004
        assert cr.post(reverse("stock-order-action", args=[order, "cancel"])).status_code == 400  # confirmed
        assert ci.post(reverse("stock-order-action", args=[order, "cancel"])).status_code == 200
        assert WarehouseStock.objects.get(pk=s1).bags_available == 20  # noqa: PLR2004
        browse = client_for(make_user("buyer")).get(reverse("stock-list")).data
        assert {x["warehouse"] for x in browse} == {"hamburg", "antwerp"}


class TestWatchAndSearches:
    def test_watchlist(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        buyer = make_user("buyer")
        c = client_for(buyer)
        assert c.put(reverse("watchlist-item", args=[lot.pk])).status_code == 204
        assert c.get(reverse("watchlist")).data == [str(lot.pk)]
        draft = make_lot(exp, status="draft")
        assert c.post(reverse("watchlist"), {"lots": [str(draft.pk), str(lot.pk)]}, format="json").data == [str(lot.pk)]
        c.delete(reverse("watchlist-item", args=[lot.pk]))
        assert c.get(reverse("watchlist")).data == []

    def test_saved_search_alerts_on_new_matching_listing(self, django_capture_on_commit_callbacks):
        exp = make_user("exporter")
        buyer = make_user("buyer")
        r = client_for(buyer).post(reverse("saved-searches"), {
            "name": "Sidama washed", "filters": {"origin": "sidama", "process": "washed", "minAltitude": 1900,
                                                 "junk": "x"},
        }, format="json")
        assert r.status_code == 201 and "junk" not in r.data["filters"]
        match = make_lot(exp, status="draft")
        with django_capture_on_commit_callbacks(execute=True):
            make_lot(exp, status="listed", region="guji")  # does not match
            match.status = "listed"
            match.save()
        alerts = Notification.objects.filter(recipient=buyer, title__startswith="New lot")
        assert alerts.count() == 1 and match.lot_id in alerts.first().message
        with django_capture_on_commit_callbacks(execute=True):
            match.save()  # still listed → no second alert
        assert alerts.count() == 1
        own = client_for(exp).post(reverse("saved-searches"), {"name": "mine", "filters": {}}, format="json")
        assert own.status_code == 201
        with django_capture_on_commit_callbacks(execute=True):
            make_lot(exp)
        assert not Notification.objects.filter(recipient=exp, title__startswith="New lot").exists()


class TestScores:
    def test_impact_score_explains_each_criterion(self):
        exp = make_user("exporter")
        lot = make_lot(exp, volume_kg=Decimal("100"), is_organic=True)
        data = client_for().get(reverse("lot-impact", args=[lot.pk])).data
        assert data["coverage"] < 50 and {c["key"] for c in data["criteria"]} >= {"farm_price_share", "certifications"}  # noqa: PLR2004
        for i, gender in enumerate(["female", "male", "female"]):
            p = Producer.objects.create(owner=exp, name=f"P{i}", gender=gender)
            ProducerConsent.objects.create(producer=p, purpose="eudr_sharing", method="witnessed")
            plot = Plot.objects.create(producer=p, location=Point(38.3 + i / 100, 6.2, srid=4326))
            LotSource.objects.create(lot=lot, plot=plot, quantity_kg=Decimal("33.4"))
            CherryDelivery.objects.create(owner=exp, producer=p, plot=plot, receipt_number=f"R{i}", lot=lot,
                                          delivered_on=date(2026, 11, 1), weight_kg=Decimal("167"),
                                          price_per_kg_etb=Decimal("150"),
                                          amount_paid_etb=Decimal("25050") if i < 2 else None)  # noqa: PLR2004
        data = client_for().get(reverse("lot-impact", args=[lot.pk])).data
        crit = {c["key"]: c for c in data["criteria"]}
        assert crit["women"]["points"] == 10  # noqa: PLR2004
        assert crit["payments_recorded"]["points"] == 10  # 2 of 3 paid → 10 of 15  # noqa: PLR2004
        assert crit["farm_price_share"]["has_data"] is True and "%" in crit["farm_price_share"]["detail"]
        assert crit["certifications"]["points"] == 5  # noqa: PLR2004
        assert data["score"] is not None and data["coverage"] == 100  # noqa: PLR2004

    def test_reliability_score_provisional(self):
        exp = make_user("exporter")
        data = client_for(make_user("buyer")).get(reverse("reliability-score", args=[exp.pk])).data
        assert data["provisional"] is True and data["score"] is None


class TestArticles:
    def test_publish_and_drafts(self):
        admin = make_user("admin")
        c = client_for(admin)
        r = c.post(reverse("article-list"), {
            "slug": "sidama-2026-harvest", "title": "Sidama harvest update", "kind": "harvest", "region": "sidama",
            "summary": "Cherry arrivals are up.", "body": "## Volumes\nArrivals are up.\n\nPrices firm.",
            "published_at": timezone.now().isoformat(),
        }, format="json")
        assert r.status_code == 201, r.data
        c.post(reverse("article-list"), {"slug": "draft", "title": "Draft", "summary": "x", "body": "y"}, format="json")
        public = client_for().get(reverse("article-list")).data
        assert [a["slug"] for a in public] == ["sidama-2026-harvest"] and "body" not in public[0]
        assert client_for().get(reverse("article-detail", args=["draft"])).status_code == 404
        assert client_for().get(reverse("article-detail", args=["sidama-2026-harvest"])).data["body"].startswith("## ")
        assert client_for(make_user("exporter")).post(reverse("article-list"), {"slug": "x"}, format="json").status_code == 403


