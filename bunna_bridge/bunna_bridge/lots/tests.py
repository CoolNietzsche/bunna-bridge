from datetime import date
from decimal import Decimal
from http import HTTPStatus

import pytest
from django.contrib.gis.geos import Polygon
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


class TestFarmId:
    def test_farm_id_auto_generated_for_farmer_on_creation(self):
        farmer = _make_user("farmer", farm_region="Yirgacheffe")

        assert farmer.farm_id is not None
        assert farmer.farm_id.startswith("BSB-ETH-YIR-")

    def test_farm_id_is_not_regenerated_when_farm_region_changes_later(self):
        farmer = _make_user("farmer", farm_region="Yirgacheffe")
        original_farm_id = farmer.farm_id

        farmer.farm_region = "Sidama"
        farmer.save()

        assert farmer.farm_id == original_farm_id

    def test_non_farmer_users_do_not_get_a_farm_id(self):
        exporter = _make_user("exporter")

        assert exporter.farm_id is None


class TestFarmerLinkage:
    def test_farmer_role_only_sees_lots_linked_to_them(self):
        exporter = _make_user("exporter")
        farmer_a = _make_user("farmer")
        farmer_b = _make_user("farmer")
        _make_lot(exporter, lot_id="LOT-A", status="listed", farmer=farmer_a)
        _make_lot(exporter, lot_id="LOT-B", status="listed", farmer=farmer_b)

        client = APIClient()
        client.force_authenticate(farmer_a)
        resp = client.get(reverse("lot-list"))

        assert resp.status_code == HTTPStatus.OK
        lot_ids = {item["lot_id"] for item in resp.data["results"]}
        assert lot_ids == {"LOT-A"}

    def test_farmer_list_endpoint_allowed_for_exporter_denied_for_buyer(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        _make_user("farmer", farm_name="Kochere Highland Farm")

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.get(reverse("farmer-list"))
        assert resp.status_code == HTTPStatus.OK
        assert len(resp.data) == 1

        client.force_authenticate(buyer)
        resp = client.get(reverse("farmer-list"))
        assert resp.status_code == HTTPStatus.FORBIDDEN

    def test_boundary_inherit_uses_linked_farmer_not_heuristic(self):
        boundary = Polygon(((38.0, 6.0), (38.0, 6.1), (38.1, 6.1), (38.0, 6.0)))
        exporter = _make_user("exporter")
        linked_farmer = _make_user("farmer", boundary=boundary)
        # A decoy farmer that would win under the old kebele/region heuristic.
        _make_user("farmer", farm_kebele="Kochere", boundary=boundary)
        lot = _make_lot(
            exporter, status="listed", farmer=linked_farmer, kebele="Kochere",
        )

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.post(reverse("lot-boundary-inherit", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.boundary is not None
        assert lot.farmer_id == linked_farmer.id
