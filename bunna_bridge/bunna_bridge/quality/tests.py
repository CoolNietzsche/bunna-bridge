"""Quality data (roadmap Phase 4, Q-1 … Q-4)."""

from datetime import date
from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.lots.models import Offer
from bunna_bridge.trade.models import Contract
from bunna_bridge.trade.models import ContractSample
from bunna_bridge.users.models import User

from .models import CvaAssessment
from .scoring import cva_score
from .scoring import full_defects
from .scoring import green_classification

pytestmark = pytest.mark.django_db
PASSWORD = "Highland-Coffee-2026!"  # noqa: S105
NINES = dict.fromkeys(("fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"), 9)


def make_user(role, **kw):
    n = User.objects.count()
    return User.objects.create_user(username=f"{role}{n}", email=f"{role}{n}@example.com", role=role,
                                    password=PASSWORD, first_name=role.title(), last_name=str(n), **kw)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def make_lot(exporter, **kw):
    data = {"lot_id": f"Q-{CoffeeLot.objects.count():03d}", "name": "Quality lot", "status": "listed",
            "exporter": exporter, "region": "sidama", "altitude_m": 2000, "processing": "washed", "grade": "G1",
            "harvest_date": date(2026, 1, 1), "volume_kg": Decimal("1200"), "available_qty_kg": Decimal("1200")}
    data.update(kw)
    return CoffeeLot.objects.create(**data)


def cva(**overrides):
    body = {"fragrance": 7, "aroma": 7, "flavor": 7, "aftertaste": 7, "acidity": 7, "sweetness": 7, "mouthfeel": 7,
            "overall": 7, "intensities": {"acidity": 9, "sweetness": 8}, "flavor_categories": ["floral", "citrus"],
            "descriptors": "jasmine, bergamot"}
    body.update(overrides)
    return body


class TestScoring:
    def test_cva_formula(self):
        assert cva_score(NINES) == Decimal("100.00")
        assert cva_score(dict.fromkeys(NINES, 1)) == Decimal("58.00")
        assert cva_score(dict.fromkeys(NINES, 7)) == Decimal("89.50")
        assert cva_score(dict.fromkeys(NINES, 7), non_uniform_cups=1, defective_cups=1) == Decimal("83.50")

    def test_defects_and_grade(self):
        assert full_defects({"full_black": 1, "partial_black": 3, "broken": 9}) == (1, 2)
        assert green_classification({})["grade"] == "Specialty"
        assert green_classification({"broken": 25})["grade"] == "Specialty"  # 5 full defects
        assert green_classification({"full_black": 1})["grade"] == "Premium"  # any primary defect
        assert green_classification({"broken": 45})["grade"] == "Exchange"


class TestCva:
    def test_qgrader_records_and_confirms(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        grader = make_user("qgrader")
        r = client_for(grader).post(reverse("lot-cva", args=[lot.pk]), cva(), format="json")
        assert r.status_code == 201, r.data
        assert r.data["score"] == "89.50"
        assert r.data["band"] == "Excellent"
        assert client_for(grader).post(reverse("cva-confirm", args=[r.data["id"]])).status_code == 200
        lot.refresh_from_db()
        assert lot.sca_score == Decimal("89.5")
        latest = client_for(make_user("buyer")).get(reverse("lot-cva", args=[lot.pk])).data["latest"]
        assert latest["method"] == "CVA" and latest["score"] == 89.5  # noqa: PLR2004
        listed = client_for(make_user("buyer")).get(reverse("lot-list") + "?marketplace=1").data["results"]
        assert next(x for x in listed if x["lot_id"] == lot.lot_id)["latest_sca_score"] == 89.5  # noqa: PLR2004

    def test_validation(self):
        grader = make_user("qgrader")
        lot = make_lot(make_user("exporter"))
        c = client_for(grader)
        assert c.post(reverse("lot-cva", args=[lot.pk]), cva(flavor=10), format="json").status_code == 400
        assert c.post(reverse("lot-cva", args=[lot.pk]), cva(intensities={"acidity": 16}),
                      format="json").status_code == 400
        assert c.post(reverse("lot-cva", args=[lot.pk]),
                      cva(flavor_categories=["floral", "fruity", "berry", "citrus", "spices", "vanilla"]),
                      format="json").status_code == 400

    def test_exporter_lab_records_but_cannot_confirm(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        r = client_for(exp).post(reverse("lot-cva", args=[lot.pk]), cva(), format="json")
        assert r.status_code == 201
        assert client_for(exp).post(reverse("cva-confirm", args=[r.data["id"]])).status_code == 403
        assert client_for(make_user("buyer")).post(reverse("lot-cva", args=[lot.pk]), cva(),
                                                   format="json").status_code == 403


class TestPhysical:
    def test_record_analysis_with_grade_and_warnings(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        r = client_for(exp).post(reverse("lot-physical", args=[lot.pk]), {
            "moisture_pct": "12.8", "water_activity": "0.62", "density_g_l": "720",
            "screens": {"20": 10, "19": 25, "18": 35, "17": 20, "16": 10},
            "defects": {"partial_black": 3, "broken": 10, "full_black": 0}, "ecta_grade": "G1",
        }, format="json")
        assert r.status_code == 201, r.data
        assert r.data["sca_green_grade"] == "Specialty"
        assert r.data["total_full_defects"] == 3  # noqa: PLR2004
        assert Decimal(r.data["screen_18_plus"]) == Decimal("70")
        assert any("Moisture" in w for w in r.data["warnings"])
        # Anyone who can see the lot can read it.
        assert len(client_for(make_user("buyer")).get(reverse("lot-physical", args=[lot.pk])).data) == 1

    def test_unknown_defect_rejected(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        r = client_for(exp).post(reverse("lot-physical", args=[lot.pk]), {"defects": {"rocks": 3}}, format="json")
        assert r.status_code == 400


class TestSessions:
    def _session(self):
        exp = make_user("exporter", company_name="Highland")
        lots = [make_lot(exp, lot_id=f"S-{i}", name=f"Lot {i}") for i in range(2)]
        c = client_for(exp)
        r = c.post(reverse("session-list"), {"name": "Harvest calibration", "held_on": str(date.today())},
                   format="json")
        sid = r.data["id"]
        samples = [c.post(reverse("session-samples", args=[sid]), {"lot": str(lot.pk)}, format="json").data
                   for lot in lots]
        graders = [make_user("qgrader") for _ in range(3)]
        for g in graders:
            assert c.post(reverse("session-graders", args=[sid]), {"email": g.email},
                          format="json").status_code == 201
        return exp, lots, sid, samples, graders

    def test_blind_scoring_reveal_calibration_and_publish(self):
        exp, lots, sid, samples, graders = self._session()
        # Blind: graders see codes, not lots.
        view = client_for(graders[0]).get(reverse("session-detail", args=[sid])).data
        assert view["samples"][0]["name"] is None and view["results"] is None
        assert len(view["samples"][0]["code"]) == 3  # noqa: PLR2004
        # Three graders score both cups; the third is consistently 3 levels lower on one cup.
        for i, g in enumerate(graders):
            for j, s in enumerate(samples):
                level = 6 if (i == 2 and j == 0) else 8  # noqa: PLR2004
                r = client_for(g).post(reverse("session-score", args=[sid, s["id"]]),
                                       cva(**dict.fromkeys(NINES, level)), format="json")
                assert r.status_code == 201, r.data
        # Re-scoring updates instead of duplicating.
        assert client_for(graders[0]).post(reverse("session-score", args=[sid, samples[1]["id"]]),
                                           cva(**dict.fromkeys(NINES, 8)), format="json").status_code == 200
        assert CvaAssessment.objects.filter(session_sample__session_id=sid).count() == 6  # noqa: PLR2004
        # Outsiders cannot score or see the session.
        assert client_for(make_user("qgrader")).get(reverse("session-detail", args=[sid])).status_code == 404
        # Organiser closes and reveals.
        c = client_for(exp)
        assert c.post(reverse("session-status", args=[sid]), {"status": "closed"}, format="json").status_code == 200
        assert client_for(graders[0]).post(reverse("session-score", args=[sid, samples[0]["id"]]), cva(),
                                           format="json").status_code == 400
        res = c.post(reverse("session-status", args=[sid]), {"status": "revealed"}, format="json").data["results"]
        cup0 = next(x for x in res["samples"] if x["id"] == samples[0]["id"])
        assert cup0["n"] == 3 and cup0["sd"] > 0  # noqa: PLR2004
        outlier = max(res["graders"], key=lambda g: g["mean_abs_deviation"])
        assert outlier["grader"] == graders[2].get_full_name()
        assert res["progress"] == {"done": 6, "expected": 6}
        # After reveal graders see identities and results.
        view = client_for(graders[1]).get(reverse("session-detail", args=[sid])).data
        assert view["samples"][0]["name"].startswith("S-") and view["results"] is not None
        # Publish the panel mean to the organiser's own lot.
        r = c.post(reverse("session-publish", args=[sid, samples[1]["id"]]))
        assert r.status_code == 200, r.data
        lots[1].refresh_from_db()
        assert lots[1].sca_score == Decimal(str(round(r.data["published_score"], 1)))
        assert lots[1].q_grader_name.startswith("Panel of 3")

    def test_only_graders_score_and_only_organiser_manages(self):
        exp, lots, sid, samples, graders = self._session()
        buyer = make_user("buyer")
        assert client_for(buyer).post(reverse("session-score", args=[sid, samples[0]["id"]]), cva(),
                                      format="json").status_code == 404
        assert client_for(graders[0]).post(reverse("session-status", args=[sid]), {"status": "revealed"},
                                           format="json").status_code == 403
        assert client_for(make_user("farmer")).post(reverse("session-list"), {"name": "x", "held_on": "2026-11-05"},
                                                    format="json").status_code == 403


class TestComparisonAndReliability:
    def _contract(self):
        FloorPrice.objects.create(min_price_usd_per_kg=Decimal("4"), valid_from=date(2026, 1, 1))
        exp = make_user("exporter")
        buyer = make_user("importer")
        lot = make_lot(exp)
        offer = Offer.objects.create(lot=lot, buyer=buyer, quantity_kg=Decimal("600"), price_per_kg_usd=Decimal("7"),
                                     status="accepted")
        contract = Contract.objects.get(offer=offer)
        return exp, buyer, contract

    def test_pss_vs_arrival_flags_drop(self):
        exp, buyer, contract = self._contract()
        pss = ContractSample.objects.create(contract=contract, kind="pss", status="approved",
                                            cup_score=Decimal("86.5"), moisture_pct=Decimal("10.8"))
        arrival = ContractSample.objects.create(contract=contract, kind="arrival", status="received",
                                                cup_score=Decimal("83.0"), moisture_pct=Decimal("11.1"))
        b = client_for(buyer)
        r = b.post(reverse("contract-sample-physical", args=[arrival.pk]),
                   {"density_g_l": "690", "defects": {"broken": 20}}, format="json")
        assert r.status_code == 201, r.data
        b.post(reverse("contract-sample-physical", args=[pss.pk]), {"density_g_l": "735"}, format="json")
        report = client_for(exp).get(reverse("contract-comparison", args=[contract.pk])).data
        cup = next(x for x in report["rows"] if x["key"] == "cup_score")
        assert cup["delta"] == -3.5 and cup["flag"] is True  # noqa: PLR2004
        density = next(x for x in report["rows"] if x["key"] == "density_g_l")
        assert density["flag"] is True
        assert report["consistent"] is False and len(report["flags"]) >= 2  # noqa: PLR2004
        assert client_for(make_user("buyer")).get(reverse("contract-comparison", args=[contract.pk])).status_code == 404

    def test_reliability_record(self):
        exp, buyer, contract = self._contract()
        from bunna_bridge.trade.models import Claim
        from bunna_bridge.trade.models import Shipment
        from bunna_bridge.trade.models import ShipmentEvent

        contract.status = "shipped"
        contract.shipment_to = date.today() + timedelta(days=5)
        contract.save()
        shipment = Shipment.objects.create(contract=contract)
        ShipmentEvent.objects.create(shipment=shipment, kind="departed")
        ContractSample.objects.create(contract=contract, kind="pss", status="approved", cup_score=Decimal("86"))
        ContractSample.objects.create(contract=contract, kind="arrival", status="received", cup_score=Decimal("85"))
        Claim.objects.create(contract=contract, reason="weight", description="short", status="accepted")
        r = client_for(buyer).get(reverse("exporter-reliability", args=[exp.pk])).data
        assert r["shipped"] == 1 and r["on_time_shipments"] == 1 and r["on_time_rate"] == 100  # noqa: PLR2004
        assert r["claims"] == 1 and r["accepted_claims"] == 1 and r["claim_rate"] == 100  # noqa: PLR2004
        assert r["pss_first_time_approval"] == 100  # noqa: PLR2004
        assert r["average_cup_change_pss_to_arrival"] == -1.0  # noqa: PLR2004
