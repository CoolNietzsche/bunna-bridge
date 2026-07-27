from datetime import date
from decimal import Decimal
from http import HTTPStatus

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.models import Offer
from bunna_bridge.users.models import User

pytestmark = pytest.mark.django_db

TEST_PASSWORD = "testpass123"  # noqa: S105


def _make_user(role, **kwargs):
    n = User.objects.count()
    defaults = {
        "username": f"{role}{n}",
        "email": f"{role}{n}@example.com",
        "role": role,
    }
    defaults.update(kwargs)
    return User.objects.create_user(password=TEST_PASSWORD, **defaults)


def _make_lot(exporter, **kwargs):
    defaults = {
        "lot_id": "LOT-TEST-0001",
        "name": "Test Lot",
        "status": "listed",
        "exporter": exporter,
        "region": "yirgacheffe",
        "altitude_m": 2000,
        "processing": "washed",
        "grade": "G1",
        "harvest_date": date(2026, 1, 1),
        "volume_kg": Decimal("100.00"),
    }
    defaults.update(kwargs)
    return CoffeeLot.objects.create(**defaults)


def _make_offer(lot, buyer, **kwargs):
    defaults = {
        "lot": lot,
        "buyer": buyer,
        "quantity_kg": Decimal("60.00"),
        "price_per_kg_usd": Decimal("5.0000"),
    }
    defaults.update(kwargs)
    return Offer.objects.create(**defaults)


class TestOfferAcceptContractsLot:
    def test_exporter_accepting_offer_contracts_the_lot(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        lot = _make_lot(exporter, status="listed")
        offer = _make_offer(lot, buyer)

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.post(
            reverse("offer-respond", args=[offer.pk]),
            {"action": "accept"},
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.status == "contracted"

        assert Notification.objects.filter(
            recipient=buyer,
            notification_type="offer",
            title="Offer Accepted",
        ).exists()
        assert Notification.objects.filter(
            recipient=exporter,
            notification_type="lot_status",
        ).exists()

    def test_accepting_offer_on_non_listed_lot_leaves_status_untouched(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        lot = _make_lot(exporter, status="contracted")
        offer = _make_offer(lot, buyer)

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.post(
            reverse("offer-respond", args=[offer.pk]),
            {"action": "accept"},
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.status == "contracted"

    def test_buyer_accepting_counter_offer_contracts_the_lot(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        lot = _make_lot(exporter, status="listed")
        offer = _make_offer(
            lot, buyer, status="countered", counter_price=Decimal("5.5000"),
        )

        client = APIClient()
        client.force_authenticate(buyer)
        resp = client.post(reverse("offer-accept-counter", args=[offer.pk]))

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.status == "contracted"
        assert Notification.objects.filter(
            recipient=exporter,
            notification_type="offer",
            title="Counter-Offer Accepted",
        ).exists()

    def test_rejecting_offer_does_not_change_lot_status_and_notifies_buyer(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        lot = _make_lot(exporter, status="listed")
        offer = _make_offer(lot, buyer)

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.post(
            reverse("offer-respond", args=[offer.pk]),
            {"action": "reject"},
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.status == "listed"
        assert Notification.objects.filter(
            recipient=buyer,
            notification_type="offer",
            title="Offer Rejected",
        ).exists()

    def test_buyer_withdrawing_offer_notifies_exporter(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        lot = _make_lot(exporter, status="listed")
        offer = _make_offer(lot, buyer)

        client = APIClient()
        client.force_authenticate(buyer)
        resp = client.post(reverse("offer-withdraw", args=[offer.pk]))

        assert resp.status_code == HTTPStatus.OK
        assert Notification.objects.filter(
            recipient=exporter,
            notification_type="offer",
            title="Offer Withdrawn",
        ).exists()


class TestPublicLotStory:
    def test_listed_lot_is_publicly_readable_without_auth(self):
        exporter = _make_user("exporter", company_name="Addis Coffee Exports")
        lot = _make_lot(exporter, status="listed", price_per_kg=Decimal("12.50"))

        resp = APIClient().get(reverse("lot-story-public", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        assert resp.data["lot_id"] == lot.lot_id
        assert resp.data["exporter_company"] == "Addis Coffee Exports"

    def test_draft_lot_404s_publicly(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="draft")

        resp = APIClient().get(reverse("lot-story-public", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.NOT_FOUND

    def test_public_payload_excludes_price_and_restricted_fields(self):
        exporter = _make_user("exporter", ecta_license_number="ECTA-12345")
        lot = _make_lot(exporter, status="listed", price_per_kg=Decimal("12.50"))

        resp = APIClient().get(reverse("lot-story-public", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        forbidden_keys = {
            "price_per_kg", "fob_price_usd", "volume_kg", "available_qty_kg",
            "exporter", "exporter_name", "phyto_cert_file", "ecex_permit_file",
            "nbe_fx_declaration_file", "customs_declaration_file", "eudr_dds_file",
            "exporter_ecta_number", "exporter_ecta_file",
        }
        assert not (forbidden_keys & set(resp.data.keys()))
