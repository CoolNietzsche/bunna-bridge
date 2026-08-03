from datetime import date
from decimal import Decimal
from http import HTTPStatus

import pytest
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import Polygon
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.models import Offer
from bunna_bridge.users.models import Certification
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


class TestAnonymousMarketplaceAccess:
    def test_anonymous_can_list_marketplace_lots(self):
        exporter = _make_user("exporter")
        _make_lot(exporter, lot_id="LOT-LISTED", status="listed")
        _make_lot(exporter, lot_id="LOT-DRAFT", status="draft")

        resp = APIClient().get(reverse("lot-list"))

        assert resp.status_code == HTTPStatus.OK
        lot_ids = {item["lot_id"] for item in resp.data["results"]}
        assert lot_ids == {"LOT-LISTED"}

    def test_anonymous_can_retrieve_a_listed_lot(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed")

        resp = APIClient().get(reverse("lot-detail", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK

    def test_anonymous_cannot_retrieve_a_draft_lot(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="draft")

        resp = APIClient().get(reverse("lot-detail", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.NOT_FOUND

    def test_anonymous_pricing_is_masked_on_list_and_detail(self):
        exporter = _make_user("exporter")
        lot = _make_lot(
            exporter, status="listed",
            price_per_kg=Decimal("12.50"), fob_price_usd=Decimal("9.75"),
            min_order_kg=Decimal("300.00"), delivery_window="Q3 2026",
        )
        commercial_fields = ["price_per_kg", "fob_price_usd", "min_order_kg", "delivery_window"]

        list_resp = APIClient().get(reverse("lot-list"))
        detail_resp = APIClient().get(reverse("lot-detail", args=[lot.pk]))

        assert list_resp.status_code == HTTPStatus.OK
        item = list_resp.data["results"][0]
        for field in commercial_fields:
            assert item[field] is None, f"{field} should be masked for anonymous list requests"

        assert detail_resp.status_code == HTTPStatus.OK
        props = detail_resp.data.get("properties", detail_resp.data)
        for field in commercial_fields:
            assert props[field] is None, f"{field} should be masked for anonymous detail requests"

    def test_authenticated_buyer_still_sees_real_pricing(self):
        exporter = _make_user("exporter")
        buyer = _make_user("buyer")
        _make_lot(exporter, status="listed", fob_price_usd=Decimal("9.75"))

        client = APIClient()
        client.force_authenticate(buyer)
        resp = client.get(reverse("lot-list"))

        assert resp.status_code == HTTPStatus.OK
        assert Decimal(resp.data["results"][0]["fob_price_usd"]) == Decimal("9.75")

    def test_anonymous_cannot_create_a_lot(self):
        resp = APIClient().post(
            reverse("lot-list"),
            {"lot_id": "LOT-X", "name": "X", "status": "draft"},
            format="json",
        )

        assert resp.status_code == HTTPStatus.UNAUTHORIZED


class TestCertificationBadges:
    def _cert(self, holder, cert_type, **kwargs):
        return Certification.objects.create(holder=holder, cert_type=cert_type, **kwargs)

    def test_lot_list_includes_the_exporters_valid_certifications(self):
        exporter = _make_user("exporter")
        self._cert(exporter, Certification.CertType.ORGANIC)
        self._cert(exporter, Certification.CertType.Q_ARABICA)
        _make_lot(exporter, status="listed")

        resp = APIClient().get(reverse("lot-list"))

        assert resp.status_code == HTTPStatus.OK
        cert_types = {c["cert_type"] for c in resp.data["results"][0]["certifications"]}
        assert cert_types == {"organic", "q_arabica"}

    def test_expired_certifications_are_excluded(self):
        exporter = _make_user("exporter")
        self._cert(exporter, Certification.CertType.ORGANIC, expiry_date=date(2020, 1, 1))
        _make_lot(exporter, status="listed")

        resp = APIClient().get(reverse("lot-list"))

        assert resp.data["results"][0]["certifications"] == []

    def test_lot_story_includes_certifications(self):
        exporter = _make_user("exporter")
        self._cert(exporter, Certification.CertType.FAIR_TRADE)
        lot = _make_lot(exporter, status="listed")

        resp = APIClient().get(reverse("lot-story-public", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        assert resp.data["certifications"] == [{"cert_type": "fair_trade", "label": "Fair Trade"}]


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


def _make_photo(name="farm.jpg", content=b"fake-jpeg-bytes", content_type="image/jpeg"):
    return SimpleUploadedFile(name, content, content_type=content_type)


def _upload_photo(client, lot, photo=None):
    return client.post(
        reverse("lot-photos", args=[lot.pk]),
        {"photo": photo or _make_photo()},
        format="multipart",
    )


class TestLotPhotos:
    def test_owner_can_upload_and_delete_a_photo(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            lot = _make_lot(exporter, status="listed")

            client = APIClient()
            client.force_authenticate(exporter)
            resp = _upload_photo(client, lot)

            assert resp.status_code == HTTPStatus.CREATED
            assert len(resp.data["farm_photos"]) == 1
            lot.refresh_from_db()
            assert lot.farm_photos == resp.data["farm_photos"]

            resp = client.delete(
                reverse("lot-photos", args=[lot.pk]),
                {"url": lot.farm_photos[0]},
                format="json",
            )
            assert resp.status_code == HTTPStatus.OK
            assert resp.data["farm_photos"] == []

    def test_non_owner_cannot_upload_photo(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            other_exporter = _make_user("exporter")
            lot = _make_lot(exporter, status="listed")

            client = APIClient()
            client.force_authenticate(other_exporter)
            resp = _upload_photo(client, lot)

            assert resp.status_code == HTTPStatus.FORBIDDEN

    def test_rejects_non_image_content_type(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            lot = _make_lot(exporter, status="listed")
            bad_file = _make_photo("farm.pdf", b"%PDF-1.4", "application/pdf")

            client = APIClient()
            client.force_authenticate(exporter)
            resp = _upload_photo(client, lot, bad_file)

            assert resp.status_code == HTTPStatus.BAD_REQUEST
            lot.refresh_from_db()
            assert lot.farm_photos == []

    def test_rejects_upload_past_the_per_lot_limit(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            lot = _make_lot(
                exporter, status="listed",
                farm_photos=[f"/media/lots/photos/x{i}.jpg" for i in range(8)],
            )

            client = APIClient()
            client.force_authenticate(exporter)
            resp = _upload_photo(client, lot)

            assert resp.status_code == HTTPStatus.BAD_REQUEST

    def test_upload_writes_a_real_file_to_storage(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            lot = _make_lot(exporter, status="listed")

            client = APIClient()
            client.force_authenticate(exporter)
            _upload_photo(client, lot)

            written = list(tmp_path.rglob("*.jpg"))
            assert len(written) == 1
            assert written[0].read_bytes() == b"fake-jpeg-bytes"


class TestComplianceGatesNotSelfCertifiable:
    """Regression coverage for the audit's §2 finding: an exporter could
    PATCH their own lot's compliance gates directly with no real check
    behind it. These 5 gates must be read-only via the API now."""

    GATES = [
        "deforestation_free", "gps_verified", "eudr_dds_ready",
        "ecta_license_active", "cta_floor_met",
    ]

    def test_exporter_cannot_patch_any_of_the_5_gates(self):
        exporter = _make_user("exporter")
        # gps_verified is derived from a real location in CoffeeLot.save(),
        # so give the lot one — otherwise gps_verified can never genuinely
        # be True in the first place, which is the fix working as intended,
        # not something this test should be exercising.
        point = Point(38.2, 6.15, srid=4326)
        lot = _make_lot(
            exporter, status="listed", farm_location=point,
            **dict.fromkeys(self.GATES, True),
        )

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.patch(
            reverse("lot-detail", args=[lot.pk]),
            dict.fromkeys(self.GATES, False),
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        for g in self.GATES:
            assert getattr(lot, g) is True, f"{g} should not have been writable"

    def test_admin_also_cannot_patch_gates_via_the_api(self):
        # Matches CuppingScoreSerializer / SampleRequestSerializer precedent:
        # read_only_fields blocks everyone at the API layer. Admins manage
        # these through Django admin instead, which bypasses DRF entirely.
        exporter = _make_user("exporter")
        admin = _make_user("admin")
        lot = _make_lot(exporter, status="listed", cta_floor_met=True)

        client = APIClient()
        client.force_authenticate(admin)
        resp = client.patch(
            reverse("lot-detail", args=[lot.pk]),
            {"cta_floor_met": False},
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.cta_floor_met is True

    def test_phyto_and_nbe_gates_still_ignore_direct_patch_as_before(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed")

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.patch(
            reverse("lot-detail", args=[lot.pk]),
            {"phyto_cert_uploaded": True, "nbe_fx_declared": True},
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.phyto_cert_uploaded is False
        assert lot.nbe_fx_declared is False


class TestGpsVerifiedAutoDerivation:
    def test_setting_boundary_marks_gps_verified(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed", gps_verified=False)

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.patch(
            reverse("lot-boundary", args=[lot.pk]),
            {"boundary": {
                "type": "Polygon",
                "coordinates": [[[38.0, 6.0], [38.0, 6.1], [38.1, 6.1], [38.0, 6.0]]],
            }},
            format="json",
        )

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.gps_verified is True

    def test_lot_with_no_location_is_not_gps_verified(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed")
        assert lot.gps_verified is False


class TestEudrDdsReadyAutoSet:
    def test_generating_a_real_dds_sets_eudr_dds_ready(self):
        point = Point(38.2, 6.15, srid=4326)
        exporter = _make_user("exporter")
        lot = _make_lot(
            exporter, status="listed",
            gps_verified=True, farm_location=point, eudr_dds_ready=False,
        )

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.get(reverse("lot-eudr-dds", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        lot.refresh_from_db()
        assert lot.eudr_dds_ready is True

    def test_dds_generation_blocked_without_gps(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed", gps_verified=False)

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.get(reverse("lot-eudr-dds", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.BAD_REQUEST
        lot.refresh_from_db()
        assert lot.eudr_dds_ready is False


class TestComplianceDocumentAccessControl:
    """Regression coverage for the audit's §4 finding #2: any buyer could
    see (and, once /media/ actually served files, download) an exporter's
    compliance documents and ECTA license."""

    def _lot_with_docs(self, exporter):
        return _make_lot(
            exporter, status="listed",
            phyto_cert_file=SimpleUploadedFile(
                "cert.pdf", b"%PDF-1.4 fake", content_type="application/pdf",
            ),
        )

    def test_buyer_does_not_receive_document_urls_in_lot_detail(self):
        exporter = _make_user("exporter", ecta_license_number="ECTA-1")
        buyer = _make_user("buyer")
        lot = self._lot_with_docs(exporter)

        client = APIClient()
        client.force_authenticate(buyer)
        resp = client.get(reverse("lot-detail", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        props = resp.data.get("properties", resp.data)
        for field in [
            "phyto_cert_file", "ecex_permit_file", "nbe_fx_declaration_file",
            "customs_declaration_file", "eudr_dds_file", "exporter_ecta_file",
        ]:
            assert field not in props, f"{field} should be hidden from buyers"

    def test_owner_exporter_does_receive_document_urls(self):
        exporter = _make_user("exporter")
        lot = self._lot_with_docs(exporter)

        client = APIClient()
        client.force_authenticate(exporter)
        resp = client.get(reverse("lot-detail", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        props = resp.data.get("properties", resp.data)
        assert props["phyto_cert_file"] is not None

    def test_admin_does_receive_document_urls(self):
        exporter = _make_user("exporter")
        admin = _make_user("admin")
        lot = self._lot_with_docs(exporter)

        client = APIClient()
        client.force_authenticate(admin)
        resp = client.get(reverse("lot-detail", args=[lot.pk]))

        assert resp.status_code == HTTPStatus.OK
        props = resp.data.get("properties", resp.data)
        assert props["phyto_cert_file"] is not None

    def test_document_download_view_rejects_buyer(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            buyer = _make_user("buyer")
            lot = self._lot_with_docs(exporter)

            client = APIClient()
            client.force_authenticate(buyer)
            resp = client.get(
                reverse("lot-document-download", args=[lot.pk, "phyto_cert_file"]),
            )

            assert resp.status_code == HTTPStatus.FORBIDDEN

    def test_document_download_view_allows_owner(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            lot = self._lot_with_docs(exporter)

            client = APIClient()
            client.force_authenticate(exporter)
            resp = client.get(
                reverse("lot-document-download", args=[lot.pk, "phyto_cert_file"]),
            )

            assert resp.status_code == HTTPStatus.OK

    def test_document_download_view_rejects_unknown_field(self, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            exporter = _make_user("exporter")
            lot = self._lot_with_docs(exporter)

            client = APIClient()
            client.force_authenticate(exporter)
            resp = client.get(
                reverse("lot-document-download", args=[lot.pk, "farm_photos"]),
            )

            assert resp.status_code == HTTPStatus.NOT_FOUND


class TestDocumentUploadValidators:
    def test_rejects_disallowed_extension(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed")
        lot.phyto_cert_file = SimpleUploadedFile(
            "cert.exe", b"MZ fake binary", content_type="application/octet-stream",
        )
        with pytest.raises(ValidationError):
            lot.full_clean()

    def test_rejects_oversized_file(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed")
        lot.phyto_cert_file = SimpleUploadedFile(
            "cert.pdf", b"x" * (11 * 1024 * 1024), content_type="application/pdf",
        )
        with pytest.raises(ValidationError):
            lot.full_clean()

    def test_allows_a_normal_pdf(self):
        exporter = _make_user("exporter")
        lot = _make_lot(exporter, status="listed")
        lot.phyto_cert_file = SimpleUploadedFile(
            "cert.pdf", b"%PDF-1.4 fake", content_type="application/pdf",
        )
        lot.full_clean()  # should not raise
