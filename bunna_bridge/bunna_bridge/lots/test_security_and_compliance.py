"""
Regression tests for the 2026-10-31 hardening pass: privilege escalation,
compliance bypasses, endpoint scoping, offer/sample state machines and the
derived compliance-gate engine. Issue IDs refer to
docs/knowledge-base/07-known-issues.md.
"""

from datetime import date
from datetime import timedelta
from decimal import Decimal
from http import HTTPStatus

import pytest
from django.contrib.gis.geos import MultiPolygon
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import Polygon
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from bunna_bridge.lots.deforestation import DeforestationZone
from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import ComplianceEvent
from bunna_bridge.lots.models import CuppingScore
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.models import Offer
from bunna_bridge.lots.models import SampleRequest
from bunna_bridge.lots.models import WashingStation
from bunna_bridge.users.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "Highland-Coffee-2026!"  # noqa: S105
SQUARE = Polygon(
    ((38.0, 6.0), (38.0, 6.01), (38.01, 6.01), (38.01, 6.0), (38.0, 6.0)), srid=4326,
)


def make_user(role, **kwargs):
    n = User.objects.count()
    defaults = {
        "username": f"{role}{n}",
        "email": f"{role}{n}@example.com",
        "role": role,
    }
    defaults.update(kwargs)
    return User.objects.create_user(password=PASSWORD, **defaults)


def make_lot(exporter, **kwargs):
    n = CoffeeLot.objects.count()
    defaults = {
        "lot_id": f"LOT-{n:04d}",
        "name": "Test Lot",
        "status": "listed",
        "exporter": exporter,
        "region": "yirgacheffe",
        "altitude_m": 2000,
        "processing": "washed",
        "grade": "G1",
        "harvest_date": date(2026, 1, 1),
        "volume_kg": Decimal("1000.00"),
        "price_per_kg": Decimal("8.00"),
        "fob_price_usd": Decimal("8.0000"),
    }
    defaults.update(kwargs)
    return CoffeeLot.objects.create(**defaults)


def client_for(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c


def pdf(name="doc.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 test", content_type="application/pdf")


def verified_exporter(**kwargs):
    exp = make_user("exporter", company_name="Highland Exports", **kwargs)
    exp.ecta_license_file = "users/ecta/license.pdf"
    exp.ecta_license_expiry = timezone.localdate() + timedelta(days=200)
    exp.ecta_license_verified_at = timezone.now()
    exp.save()
    return exp


# ── SEC-1: role escalation ───────────────────────────────────────────────────
class TestRoleCannotBeEscalated:
    def _register(self, **overrides):
        data = {
            "email": "new@example.com",
            "username": "newuser",
            "password": PASSWORD,
            "password2": PASSWORD,
            "first_name": "Abebe",
            "last_name": "Kebede",
            "role": "exporter",
        }
        data.update(overrides)
        return client_for().post(reverse("register"), data, format="json")

    def test_cannot_register_as_admin_or_qgrader(self):
        for role in ("admin", "qgrader"):
            resp = self._register(role=role, email=f"{role}@x.com", username=role)
            assert resp.status_code == HTTPStatus.BAD_REQUEST
        assert not User.objects.filter(role__in=["admin", "qgrader"]).exists()

    def test_can_register_self_service_roles(self):
        resp = self._register(role="roaster")
        assert resp.status_code == HTTPStatus.CREATED
        assert User.objects.get(email="new@example.com").role == "roaster"

    def test_weak_password_rejected(self):
        resp = self._register(password="aaaaaaaa", password2="aaaaaaaa")
        assert resp.status_code == HTTPStatus.BAD_REQUEST
        assert "password" in resp.data

    def test_duplicate_email_rejected(self):
        make_user("buyer", email="new@example.com")
        assert self._register().status_code == HTTPStatus.BAD_REQUEST

    def test_me_cannot_change_own_role(self):
        buyer = make_user("buyer")
        for url in ("me", "farmer-profile", "roaster-profile"):
            resp = client_for(buyer).patch(
                reverse(url), {"role": "admin"}, format="json",
            )
            assert resp.status_code == HTTPStatus.OK
        buyer.refresh_from_db()
        assert buyer.role == "buyer"

    def test_me_cannot_self_verify_license(self):
        exp = make_user("exporter")
        client_for(exp).patch(
            reverse("me"),
            {"ecta_license_verified_at": timezone.now().isoformat()},
            format="json",
        )
        exp.refresh_from_db()
        assert exp.ecta_license_verified_at is None


class TestLogin:
    def test_unknown_email_and_wrong_password_give_same_error(self):
        make_user("buyer", email="known@example.com")
        c = client_for()
        a = c.post(
            "/api/auth/token/",
            {"email": "nobody@example.com", "password": "x"},
            format="json",
        )
        b = c.post(
            "/api/auth/token/",
            {"email": "known@example.com", "password": "wrong"},
            format="json",
        )
        assert a.status_code == b.status_code == HTTPStatus.BAD_REQUEST
        assert a.data == b.data

    def test_login_is_rate_limited(self, monkeypatch):
        from rest_framework.throttling import ScopedRateThrottle

        # DRF reads rates once at import; patch the class attribute directly.
        monkeypatch.setattr(
            ScopedRateThrottle,
            "THROTTLE_RATES",
            {**ScopedRateThrottle.THROTTLE_RATES, "auth": "3/minute"},
        )
        cache.clear()
        c = client_for()
        codes = [
            c.post(
                "/api/auth/token/",
                {"email": "x@example.com", "password": "x"},
                format="json",
            ).status_code
            for _ in range(4)
        ]
        cache.clear()
        assert codes[-1] == HTTPStatus.TOO_MANY_REQUESTS

    def test_logout_revokes_refresh_token(self):
        make_user("buyer", email="b@example.com")
        c = client_for()
        tokens = c.post(
            "/api/auth/token/",
            {"email": "b@example.com", "password": PASSWORD},
            format="json",
        ).data
        # No access token needed: the refresh token is the credential, so
        # logout still works after the access token has been cleared/expired.
        resp = client_for().post(
            reverse("logout"), {"refresh": tokens["refresh"]}, format="json",
        )
        assert resp.status_code == HTTPStatus.RESET_CONTENT
        resp = c.post(
            "/api/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json",
        )
        assert resp.status_code == HTTPStatus.UNAUTHORIZED


# ── SEC-2: status can't be PATCHed past the export gate ─────────────────────
class TestStatusPipeline:
    def test_generic_patch_cannot_change_status(self):
        exp = make_user("exporter")
        lot = make_lot(exp, status="draft")
        resp = client_for(exp).patch(
            reverse("lot-detail", args=[lot.pk]), {"status": "exported"}, format="json",
        )
        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.status == "draft"

    def test_export_blocked_with_failing_gate_names(self):
        exp = make_user("exporter")
        lot = make_lot(exp, status="contracted")
        resp = client_for(exp).patch(
            reverse("lot-status", args=[lot.pk]), {"status": "exported"}, format="json",
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST
        assert "ECTA export license" in resp.data["failed_gates"]

    def test_owner_can_unlist_but_not_uncontract(self):
        exp = make_user("exporter")
        listed = make_lot(exp, status="listed")
        contracted = make_lot(exp, status="contracted")
        c = client_for(exp)
        assert (
            c.patch(
                reverse("lot-status", args=[listed.pk]),
                {"status": "draft"},
                format="json",
            ).status_code
            == 200
        )
        assert (
            c.patch(
                reverse("lot-status", args=[contracted.pk]),
                {"status": "listed"},
                format="json",
            ).status_code
            == 400
        )

    def test_contracted_only_via_accepted_offer(self):
        exp = make_user("exporter")
        lot = make_lot(exp, status="listed")
        resp = client_for(exp).patch(
            reverse("lot-status", args=[lot.pk]),
            {"status": "contracted"},
            format="json",
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST

    def test_status_change_notifies_owner(self):
        exp = make_user("exporter")
        lot = make_lot(exp, status="draft")
        client_for(exp).patch(
            reverse("lot-status", args=[lot.pk]), {"status": "listed"}, format="json",
        )
        assert Notification.objects.filter(
            recipient=exp, notification_type="lot_status",
        ).exists()

    def test_exporter_registry_lists_only_own_lots(self):
        a, b = make_user("exporter"), make_user("exporter")
        make_lot(a, lot_id="A-1")
        make_lot(b, lot_id="B-1")
        ids = {
            r["lot_id"] for r in client_for(a).get(reverse("lot-list")).data["results"]
        }
        assert ids == {"A-1"}
        ids = {
            r["lot_id"]
            for r in client_for(a)
            .get(reverse("lot-list"), {"marketplace": 1})
            .data["results"]
        }
        assert ids == {"A-1", "B-1"}


# ── SEC-3/4: scoping of DDS, settlement, spec sheet, cupping ────────────────
class TestEndpointScoping:
    def test_buyer_cannot_generate_dds_or_settlement(self):
        exp, buyer = make_user("exporter"), make_user("buyer")
        lot = make_lot(
            exp, farm_location=Point(38.2, 6.15, srid=4326), deforestation_free=True,
        )
        c = client_for(buyer)
        assert (
            c.get(reverse("lot-eudr-dds", args=[lot.pk])).status_code
            == HTTPStatus.NOT_FOUND
        )
        assert (
            c.post(
                reverse("lot-settlement", args=[lot.pk]), {}, format="json",
            ).status_code
            == HTTPStatus.NOT_FOUND
        )
        lot.refresh_from_db()
        assert lot.eudr_dds_ready is False

    def test_dds_refused_when_deforestation_check_failed(self):
        exp = make_user("exporter")
        lot = make_lot(exp, farm_location=Point(38.2, 6.15, srid=4326))
        assert lot.deforestation_free is False
        resp = client_for(exp).get(reverse("lot-eudr-dds", args=[lot.pk]))
        assert resp.status_code == HTTPStatus.BAD_REQUEST
        assert "deforestation" in resp.data["detail"]

    def test_settlement_uses_submitted_rate(self):
        exp = make_user("exporter")
        lot = make_lot(exp, volume_kg=Decimal("100"), price_per_kg=Decimal("10"))
        resp = client_for(exp).post(
            reverse("lot-settlement", args=[lot.pk]), {"nbe_rate": 100}, format="json",
        )
        assert resp.status_code == HTTPStatus.OK
        assert resp.data["nbe_rate"] == 100.0
        # 1000 gross - 2.5% fee = 975 net; half converted at 100 ETB/USD
        assert resp.data["etb_converted"] == pytest.approx(48750.0)

    def test_spec_sheet_hidden_for_other_exporters_drafts(self):
        exp, buyer = make_user("exporter"), make_user("buyer")
        draft = make_lot(exp, status="draft")
        listed = make_lot(exp, status="listed")
        c = client_for(buyer)
        assert (
            c.get(reverse("lot-spec-sheet", args=[draft.pk])).status_code
            == HTTPStatus.NOT_FOUND
        )
        assert (
            c.get(reverse("lot-spec-sheet", args=[listed.pk])).status_code
            == HTTPStatus.OK
        )

    def test_cupping_scores_scoped(self):
        exp, buyer, grader = (
            make_user("exporter"),
            make_user("buyer"),
            make_user("qgrader"),
        )
        draft = make_lot(exp, status="draft")
        listed = make_lot(exp, status="listed")
        scores = dict(
            fragrance_aroma=8,
            flavor=8,
            aftertaste=8,
            acidity=8,
            body=8,
            balance=8,
            uniformity=10,
            clean_cup=10,
            sweetness=10,
            overall=8,
            cupping_date=date(2026, 2, 1),
        )
        CuppingScore.objects.create(lot=draft, grader=grader, **scores)
        pending = CuppingScore.objects.create(lot=listed, grader=grader, **scores)
        confirmed = CuppingScore.objects.create(lot=listed, grader=grader, **scores)
        confirmed.status = "confirmed"
        confirmed.save()
        ids = {
            r["id"]
            for r in client_for(buyer)
            .get(reverse("cupping-score-list"))
            .data["results"]
        }
        assert ids == {str(confirmed.pk)}
        assert str(pending.pk) not in ids
        assert (
            len(client_for(exp).get(reverse("cupping-score-list")).data["results"]) == 3
        )

    def test_sca_score_locked_after_confirmed_cupping(self):
        exp, grader = make_user("exporter"), make_user("qgrader")
        lot = make_lot(exp)
        score = CuppingScore.objects.create(
            lot=lot,
            grader=grader,
            fragrance_aroma=8,
            flavor=8,
            aftertaste=8,
            acidity=8,
            body=8,
            balance=8,
            uniformity=10,
            clean_cup=10,
            sweetness=10,
            overall=8,
            cupping_date=date(2026, 2, 1),
        )
        score.status = "confirmed"
        score.save()
        resp = client_for(exp).patch(
            reverse("lot-detail", args=[lot.pk]), {"sca_score": "95.0"}, format="json",
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST

    def test_farmer_lots_only_linked(self):
        exp = make_user("exporter")
        farmer = make_user("farmer", farm_kebele="Kochere")
        make_lot(exp, lot_id="LINKED", farmer=farmer)
        make_lot(exp, lot_id="SAME-KEBELE", kebele="Kochere", status="draft")
        ids = {r["lot_id"] for r in client_for(farmer).get(reverse("farmer-lots")).data}
        assert ids == {"LINKED"}

    def test_cannot_link_someone_elses_washing_station(self):
        a, b = make_user("exporter"), make_user("exporter")
        station = WashingStation.objects.create(owner=b, name="Not yours")
        lot = make_lot(a)
        resp = client_for(a).patch(
            reverse("lot-detail", args=[lot.pk]),
            {"washing_station_facility": str(station.pk)},
            format="json",
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_link_non_farmer_as_producer(self):
        exp, buyer = make_user("exporter"), make_user("buyer")
        lot = make_lot(exp)
        resp = client_for(exp).patch(
            reverse("lot-detail", args=[lot.pk]), {"farmer": buyer.pk}, format="json",
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST


# ── Document uploads through the generic PATCH (previously silently dropped) ─
class TestDocumentUploads:
    def test_phyto_upload_persists_and_passes_gate(self, tmp_path):
        exp = make_user("exporter")
        lot = make_lot(exp)
        with override_settings(MEDIA_ROOT=tmp_path):
            resp = client_for(exp).patch(
                reverse("lot-detail", args=[lot.pk]),
                {
                    "phyto_cert_file": pdf(),
                    "phyto_cert_expiry": str(timezone.localdate() + timedelta(days=60)),
                },
                format="multipart",
            )
        assert resp.status_code == HTTPStatus.OK
        assert "phyto_cert_file" not in resp.data  # write-only in list payloads
        lot.refresh_from_db()
        assert lot.phyto_cert_file
        assert lot.phyto_cert_uploaded is True

    def test_expired_phyto_fails_gate(self, tmp_path):
        exp = make_user("exporter")
        with override_settings(MEDIA_ROOT=tmp_path):
            lot = make_lot(
                exp,
                phyto_cert_file=pdf(),
                phyto_cert_expiry=timezone.localdate() - timedelta(days=1),
            )
        assert lot.phyto_cert_uploaded is False


# ── SEC-8: offers ────────────────────────────────────────────────────────────
class TestOffers:
    def _offer(self, user, lot, qty="100", price="9.00"):
        return client_for(user).post(
            reverse("offer-list-create"),
            {"lot": str(lot.pk), "quantity_kg": qty, "price_per_kg_usd": price},
            format="json",
        )

    def test_offer_rules(self):
        exp, buyer, farmer = (
            make_user("exporter"),
            make_user("buyer"),
            make_user("farmer"),
        )
        listed = make_lot(exp)
        draft = make_lot(exp, status="draft")
        assert self._offer(farmer, listed).status_code == HTTPStatus.BAD_REQUEST
        assert self._offer(buyer, draft).status_code == HTTPStatus.BAD_REQUEST
        assert (
            self._offer(buyer, listed, qty="10").status_code == HTTPStatus.BAD_REQUEST
        )  # below min order
        assert (
            self._offer(buyer, listed, qty="5000").status_code == HTTPStatus.BAD_REQUEST
        )  # above available
        assert self._offer(buyer, listed).status_code == HTTPStatus.CREATED
        assert Notification.objects.filter(recipient=exp, title="New Offer").exists()

    def test_roaster_cannot_offer_on_own_lot(self):
        roaster = make_user("roaster")
        lot = make_lot(roaster)
        assert self._offer(roaster, lot).status_code == HTTPStatus.BAD_REQUEST

    def test_accept_decrements_stock_and_closes_competing_offers(self):
        exp, b1, b2 = make_user("exporter"), make_user("buyer"), make_user("buyer")
        lot = make_lot(exp)
        o1 = Offer.objects.create(
            lot=lot, buyer=b1, quantity_kg=Decimal("300"), price_per_kg_usd=Decimal("9"),
        )
        o2 = Offer.objects.create(
            lot=lot, buyer=b2, quantity_kg=Decimal("200"), price_per_kg_usd=Decimal("9"),
        )
        resp = client_for(exp).post(
            reverse("offer-respond", args=[o1.pk]), {"action": "accept"}, format="json",
        )
        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        o2.refresh_from_db()
        assert lot.status == "contracted"
        assert lot.available_qty_kg == Decimal("700")
        assert o2.status == "rejected"
        assert Notification.objects.filter(recipient=b2, title="Offer Closed").exists()

    def test_counter_validation_and_acceptance_uses_counter_terms(self):
        exp, buyer = make_user("exporter"), make_user("buyer")
        lot = make_lot(exp)
        offer = Offer.objects.create(
            lot=lot,
            buyer=buyer,
            quantity_kg=Decimal("100"),
            price_per_kg_usd=Decimal("7"),
        )
        c = client_for(exp)
        bad = c.post(
            reverse("offer-respond", args=[offer.pk]),
            {"action": "counter", "counter_price": "abc"},
            format="json",
        )
        assert bad.status_code == HTTPStatus.BAD_REQUEST
        c.post(
            reverse("offer-respond", args=[offer.pk]),
            {"action": "counter", "counter_price": "8.50", "counter_qty": "150"},
            format="json",
        )
        resp = client_for(buyer).post(reverse("offer-accept-counter", args=[offer.pk]))
        assert resp.status_code == HTTPStatus.OK
        offer.refresh_from_db()
        lot.refresh_from_db()
        assert offer.price_per_kg_usd == Decimal("8.50")
        assert lot.available_qty_kg == Decimal("850")


# ── SEC-9: sample requests ───────────────────────────────────────────────────
class TestSamples:
    def test_sample_lifecycle(self):
        exp, buyer = make_user("exporter"), make_user("buyer")
        lot = make_lot(exp)
        c = client_for(buyer)
        resp = c.post(
            reverse("sample-request-list"),
            {"lot": str(lot.pk), "status": "shipped"},
            format="json",
        )
        assert resp.status_code == HTTPStatus.CREATED
        sample = SampleRequest.objects.get()
        assert sample.status == "pending"  # status not writable on create
        assert (
            c.patch(
                reverse("sample-request-detail", args=[sample.pk]),
                {"status": "received"},
                format="json",
            ).status_code
            == HTTPStatus.METHOD_NOT_ALLOWED
        )

        e = client_for(exp)
        url = reverse("sample-request-respond", args=[sample.pk])
        assert (
            e.post(url, {"status": "shipped"}, format="json").status_code == 400
        )  # must approve first
        assert e.post(url, {"status": "approved"}, format="json").status_code == 200
        assert (
            e.post(url, {"status": "shipped"}, format="json").status_code == 400
        )  # needs tracking
        assert (
            e.post(
                url, {"status": "shipped", "tracking_number": "DHL123"}, format="json",
            ).status_code
            == 200
        )
        assert (
            c.post(reverse("sample-request-received", args=[sample.pk])).status_code
            == 200
        )
        sample.refresh_from_db()
        assert sample.status == "received"

    def test_no_samples_on_drafts_or_by_farmers(self):
        exp, buyer, farmer = (
            make_user("exporter"),
            make_user("buyer"),
            make_user("farmer"),
        )
        draft = make_lot(exp, status="draft")
        listed = make_lot(exp)
        assert (
            client_for(buyer)
            .post(reverse("sample-request-list"), {"lot": str(draft.pk)}, format="json")
            .status_code
            == 400
        )
        assert (
            client_for(farmer)
            .post(
                reverse("sample-request-list"), {"lot": str(listed.pk)}, format="json",
            )
            .status_code
            == 403
        )


# ── Compliance engine ────────────────────────────────────────────────────────
class TestComplianceEngine:
    def test_license_gate_needs_verified_unexpired_license(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        assert lot.ecta_license_active is False

        exp.ecta_license_file = "users/ecta/license.pdf"
        exp.ecta_license_expiry = timezone.localdate() + timedelta(days=30)
        exp.save()
        lot.refresh_from_db()
        assert lot.ecta_license_active is False  # not verified yet

        exp.ecta_license_verified_at = timezone.now()
        exp.save()
        lot.refresh_from_db()
        assert lot.ecta_license_active is True

        exp.ecta_license_expiry = timezone.localdate() - timedelta(days=1)
        exp.save()
        lot.refresh_from_db()
        assert (
            lot.ecta_license_active is False
        )  # changing the license clears verification too
        exp.refresh_from_db()
        assert exp.ecta_license_verified_at is None

    def test_floor_price_gate(self):
        exp = make_user("exporter")
        lot = make_lot(exp, fob_price_usd=Decimal("5.00"))
        assert lot.cta_floor_met is False  # no floor configured
        FloorPrice.objects.create(
            min_price_usd_per_kg=Decimal("4.00"), valid_from=date(2026, 1, 1),
        )
        lot.refresh_from_db()
        assert lot.cta_floor_met is True
        FloorPrice.objects.create(
            grade="G1",
            processing="washed",
            min_price_usd_per_kg=Decimal("6.00"),
            valid_from=date(2026, 1, 1),
        )
        lot.refresh_from_db()
        assert lot.cta_floor_met is False  # the more specific floor wins

    def test_deforestation_check_runs_on_boundary_change(self):
        DeforestationZone.objects.create(
            geometry=MultiPolygon(
                Polygon(
                    (
                        (38.005, 6.005),
                        (38.005, 6.02),
                        (38.02, 6.02),
                        (38.02, 6.005),
                        (38.005, 6.005),
                    ),
                ),
                srid=4326,
            ),
            year=2022,
            region="Ethiopia",
        )
        exp = make_user("exporter")
        clear = make_lot(
            exp,
            boundary=Polygon(
                ((39.0, 7.0), (39.0, 7.01), (39.01, 7.01), (39.0, 7.0)), srid=4326,
            ),
        )
        assert clear.deforestation_free is True
        resp = client_for(exp).patch(
            reverse("lot-boundary", args=[clear.pk]),
            {"boundary": SQUARE.geojson},
            format="json",
        )
        assert resp.status_code == HTTPStatus.OK
        assert resp.data["deforestation_check"]["status"] == "overlap"
        clear.refresh_from_db()
        assert clear.deforestation_free is False

    def test_point_buffer_is_in_metres(self):
        DeforestationZone.objects.create(
            geometry=MultiPolygon(
                Polygon(
                    (
                        (38.004, 6.0),
                        (38.004, 6.001),
                        (38.005, 6.001),
                        (38.005, 6.0),
                        (38.004, 6.0),
                    ),
                ),
                srid=4326,
            ),
            year=2023,
        )
        exp = make_user("exporter")
        # ~440 m east of the zone: inside a 500 m radius
        near = make_lot(exp, farm_location=Point(38.0, 6.0005, srid=4326))
        # ~1.1 km away: outside
        far = make_lot(exp, farm_location=Point(37.994, 6.0005, srid=4326))
        assert near.deforestation_free is False
        assert far.deforestation_free is True

    def test_boundary_must_be_in_ethiopia(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        paris = Polygon(((2.3, 48.8), (2.3, 48.81), (2.31, 48.81), (2.3, 48.8)))
        resp = client_for(exp).patch(
            reverse("lot-boundary", args=[lot.pk]),
            {"boundary": paris.geojson},
            format="json",
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST

    def test_geometry_change_invalidates_dds(self, tmp_path):
        exp = make_user("exporter")
        with override_settings(MEDIA_ROOT=tmp_path):
            lot = make_lot(exp, boundary=SQUARE, deforestation_free=True)
            assert (
                client_for(exp).get(reverse("lot-eudr-dds", args=[lot.pk])).status_code
                == 200
            )
            lot.refresh_from_db()
            assert lot.eudr_dds_ready is True
            lot.boundary = Polygon(
                ((38.1, 6.1), (38.1, 6.11), (38.11, 6.11), (38.1, 6.1)), srid=4326,
            )
            lot.save()
        assert lot.eudr_dds_ready is False
        assert not lot.eudr_dds_file

    def test_full_export_path(self, tmp_path):
        FloorPrice.objects.create(
            min_price_usd_per_kg=Decimal("4.00"), valid_from=date(2026, 1, 1),
        )
        exp = verified_exporter()
        buyer = make_user("buyer")
        with override_settings(MEDIA_ROOT=tmp_path):
            lot = make_lot(
                exp,
                boundary=SQUARE,
                deforestation_free=True,
                phyto_cert_file=pdf(),
                nbe_fx_declaration_file=pdf("nbe.pdf"),
            )
            c = client_for(exp)
            assert c.get(reverse("lot-eudr-dds", args=[lot.pk])).status_code == 200
            offer = Offer.objects.create(
                lot=lot,
                buyer=buyer,
                quantity_kg=Decimal("100"),
                price_per_kg_usd=Decimal("9"),
            )
            assert (
                c.post(
                    reverse("offer-respond", args=[offer.pk]),
                    {"action": "accept"},
                    format="json",
                ).status_code
                == 200
            )
            resp = c.patch(
                reverse("lot-status", args=[lot.pk]),
                {"status": "exported"},
                format="json",
            )
        assert resp.status_code == HTTPStatus.OK, resp.data
        lot.refresh_from_db()
        assert lot.status == "exported"
        assert lot.compliance_score() == 7

    def test_compliance_check_returns_report(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        data = client_for(exp).get(reverse("lot-compliance-check", args=[lot.pk])).data
        assert len(data["report"]) == 7
        assert data["readiness_percent"] == 0
        gps = next(r for r in data["report"] if r["gate"] == "gps_verified")
        assert gps["passed"] is False and gps["action"]

    def test_events_are_logged_and_hash_chained(self):
        exp = verified_exporter()
        lot = make_lot(exp, farm_location=Point(38.2, 6.15, srid=4326))
        lot.farm_location = None
        lot.save(actor=exp)
        events = list(ComplianceEvent.objects.filter(lot=lot))
        gates = [(e.gate, e.new_value) for e in events]
        assert ("gps_verified", True) in gates
        assert ("gps_verified", False) in gates
        assert ComplianceEvent.verify_chain(lot)
        resp = client_for(exp).get(reverse("lot-compliance-events", args=[lot.pk]))
        assert resp.data["chain_valid"] is True

        # Tampering (bypassing the model's append-only guard) breaks the chain.
        ComplianceEvent.objects.filter(pk=events[0].pk).update(
            new_value=not events[0].new_value,
        )
        assert ComplianceEvent.verify_chain(lot) is False

    def test_events_are_append_only(self):
        exp = make_user("exporter")
        lot = make_lot(exp, farm_location=Point(38.2, 6.15, srid=4326))
        event = ComplianceEvent.objects.filter(lot=lot).first()
        with pytest.raises(ValueError, match="append-only"):
            event.save()
        with pytest.raises(ValueError, match="append-only"):
            event.delete()

    def test_daily_refresh_expires_gates_and_alerts(self, tmp_path):
        from bunna_bridge.lots.tasks import daily_compliance_refresh

        exp = make_user("exporter")
        with override_settings(MEDIA_ROOT=tmp_path):
            lot = make_lot(
                exp,
                phyto_cert_file=pdf(),
                phyto_cert_expiry=timezone.localdate() + timedelta(days=7),
            )
        assert lot.phyto_cert_uploaded is True
        result = daily_compliance_refresh()
        assert result["alerts_sent"] == 1
        assert Notification.objects.filter(
            recipient=exp, notification_type="compliance",
        ).exists()

        CoffeeLot.objects.filter(pk=lot.pk).update(
            phyto_cert_expiry=timezone.localdate() - timedelta(days=1),
        )
        daily_compliance_refresh()
        lot.refresh_from_db()
        assert lot.phyto_cert_uploaded is False


class TestLicenseReview:
    def test_admin_can_verify_license_others_cannot(self):
        exp = make_user("exporter")
        exp.ecta_license_file = "users/ecta/license.pdf"
        exp.ecta_license_expiry = timezone.localdate() + timedelta(days=90)
        exp.save()
        admin = make_user("admin", is_staff=True)
        buyer = make_user("buyer")

        assert client_for(buyer).get(reverse("license-review-list")).status_code == 403
        listing = client_for(admin).get(reverse("license-review-list")).data
        assert [u["id"] for u in listing] == [exp.pk]

        url = reverse("license-review-decide", args=[exp.pk])
        assert (
            client_for(buyer).post(url, {"approve": True}, format="json").status_code
            == 403
        )
        assert (
            client_for(admin).post(url, {"approve": True}, format="json").status_code
            == 200
        )
        exp.refresh_from_db()
        assert exp.ecta_license_verified_at is not None
        assert Notification.objects.filter(
            recipient=exp, notification_type="compliance",
        ).exists()


class TestGeoJsonExport:
    def test_owner_gets_feature_collection(self):
        exp = make_user("exporter")
        lot = make_lot(exp, boundary=SQUARE)
        resp = client_for(exp).get(reverse("lot-eudr-geojson", args=[lot.pk]))
        assert resp.status_code == HTTPStatus.OK
        body = resp.json()
        assert body["type"] == "FeatureCollection"
        assert body["features"][0]["geometry"]["type"] == "Polygon"
        assert body["features"][0]["properties"]["ProducerCountry"] == "ET"


class TestContractedBuyerDds:
    def test_only_contracted_buyer_can_download_stored_dds(self, tmp_path):
        exp, buyer, other = make_user("exporter"), make_user("buyer"), make_user("buyer")
        with override_settings(MEDIA_ROOT=tmp_path):
            lot = make_lot(exp, boundary=SQUARE, deforestation_free=True, phyto_cert_file=pdf())
            client_for(exp).get(reverse("lot-eudr-dds", args=[lot.pk]))
            Offer.objects.create(
                lot=lot, buyer=buyer, quantity_kg=Decimal("100"),
                price_per_kg_usd=Decimal("9"), status="accepted",
            )
            dds = reverse("lot-document-download", args=[lot.pk, "eudr_dds_file"])
            phyto = reverse("lot-document-download", args=[lot.pk, "phyto_cert_file"])
            assert client_for(buyer).get(dds).status_code == HTTPStatus.OK
            assert client_for(buyer).get(phyto).status_code == HTTPStatus.NOT_FOUND
            assert client_for(other).get(dds).status_code == HTTPStatus.NOT_FOUND
