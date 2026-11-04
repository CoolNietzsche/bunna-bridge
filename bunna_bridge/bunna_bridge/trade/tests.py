"""Trade execution (roadmap Phase 3, T-1 … T-7)."""

from datetime import date
from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.lots.models import Offer
from bunna_bridge.orgs.models import Membership
from bunna_bridge.users.models import User

from .models import Contract
from .models import ShipmentDocument

pytestmark = pytest.mark.django_db
PASSWORD = "Highland-Coffee-2026!"  # noqa: S105


def make_user(role, **kw):
    n = User.objects.count()
    return User.objects.create_user(username=f"{role}{n}", email=f"{role}{n}@example.com", role=role,
                                    password=PASSWORD, **kw)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def make_lot(exporter, **kw):
    data = {
        "lot_id": f"TR-{CoffeeLot.objects.count():03d}", "name": "Trade lot", "status": "listed", "exporter": exporter,
        "region": "yirgacheffe", "altitude_m": 1950, "processing": "washed", "grade": "G1",
        "harvest_date": date(2026, 1, 1), "volume_kg": Decimal("1200"), "available_qty_kg": Decimal("1200"),
        "fob_price_usd": Decimal("7.00"), "price_per_kg": Decimal("7.00"),
    }
    data.update(kw)
    return CoffeeLot.objects.create(**data)


def accepted_contract(price="7.00", qty="600"):
    exp = make_user("exporter", company_name="Highland Exports")
    buyer = make_user("importer", company_name="Hamburg GmbH", country="Germany")
    lot = make_lot(exp)
    offer = Offer.objects.create(lot=lot, buyer=buyer, quantity_kg=Decimal(qty), price_per_kg_usd=Decimal(price))
    r = client_for(exp).post(reverse("offer-respond", args=[offer.pk]), {"action": "accept"}, format="json")
    assert r.status_code == 200, r.data
    return Contract.objects.get(offer=offer), exp, buyer


def complete_terms(exp, contract):
    r = client_for(exp).patch(reverse("contract-detail", args=[contract.pk]), {
        "shipment_from": str(date.today() + timedelta(days=30)), "shipment_to": str(date.today() + timedelta(days=60)),
        "payment_terms": "advance_cad", "advance_percent": "30", "destination": "Hamburg",
    }, format="json")
    assert r.status_code == 200, r.data


def sign_both(contract, exp, buyer):
    complete_terms(exp, contract)
    assert client_for(exp).post(reverse("contract-send", args=[contract.pk])).status_code == 200
    contract.refresh_from_db()
    r = client_for(buyer).post(reverse("contract-sign", args=[contract.pk]), {"terms_hash": contract.terms_hash},
                               format="json")
    assert r.status_code == 200, r.data
    contract.refresh_from_db()


@pytest.fixture
def floor():
    return FloorPrice.objects.create(min_price_usd_per_kg=Decimal("5.00"), valid_from=date(2026, 1, 1),
                                     source="ECTA 2026 table")


# ── T-1 contracts ────────────────────────────────────────────────────────────

class TestContracts:
    def test_accepted_offer_creates_draft_contract(self):
        contract, exp, buyer = accepted_contract()
        assert contract.status == "draft"
        assert contract.number.startswith(f"BB-{timezone.localdate().year}-")
        assert contract.quantity_kg == Decimal("600")
        assert contract.value_usd == Decimal("4200.00")
        assert contract.bags == 10  # noqa: PLR2004

    def test_send_requires_complete_terms(self):
        contract, exp, _ = accepted_contract()
        r = client_for(exp).post(reverse("contract-send", args=[contract.pk]))
        assert r.status_code == 400
        assert "shipment period" in r.data["detail"]

    def test_signing_flow_and_change_voids_signatures(self):
        contract, exp, buyer = accepted_contract()
        complete_terms(exp, contract)
        assert client_for(buyer).post(reverse("contract-send", args=[contract.pk])).status_code == 400
        assert client_for(exp).post(reverse("contract-send", args=[contract.pk])).status_code == 200
        contract.refresh_from_db()
        old_hash = contract.terms_hash
        assert contract.status == "sent" and contract.seller_signed_at
        # Seller changes the price after sending → signatures void, back to draft.
        client_for(exp).patch(reverse("contract-detail", args=[contract.pk]), {"price_usd_per_kg": "7.10"},
                              format="json")
        contract.refresh_from_db()
        assert contract.status == "draft" and contract.seller_signed_at is None
        client_for(exp).post(reverse("contract-send", args=[contract.pk]))
        r = client_for(buyer).post(reverse("contract-sign", args=[contract.pk]), {"terms_hash": old_hash},
                                   format="json")
        assert r.status_code == 400  # stale terms
        contract.refresh_from_db()
        r = client_for(buyer).post(reverse("contract-sign", args=[contract.pk]), {"terms_hash": contract.terms_hash},
                                   format="json")
        assert r.status_code == 200
        contract.refresh_from_db()
        assert contract.status == "signed"
        # Buyer cannot edit; after signing nobody can.
        assert client_for(exp).patch(reverse("contract-detail", args=[contract.pk]), {"notes": "x"},
                                     format="json").status_code == 403

    def test_pdf_and_visibility(self):
        contract, exp, buyer = accepted_contract()
        r = client_for(buyer).get(reverse("contract-pdf", args=[contract.pk]))
        assert r.status_code == 200 and r["Content-Type"] == "application/pdf"
        stranger = make_user("buyer")
        assert client_for(stranger).get(reverse("contract-detail", args=[contract.pk])).status_code == 404
        assert client_for(stranger).get(reverse("contract-list")).data == []

    def test_cancel_draft_returns_quantity(self):
        contract, exp, _ = accepted_contract()
        lot = contract.lot
        lot.refresh_from_db()
        assert lot.available_qty_kg == Decimal("600")
        r = client_for(exp).post(reverse("contract-cancel", args=[contract.pk]), {"reason": "Buyer withdrew"},
                                 format="json")
        assert r.status_code == 200
        lot.refresh_from_db()
        assert lot.available_qty_kg == Decimal("1200") and lot.status == "listed"

    def test_signed_contract_cannot_be_cancelled_by_party(self):
        contract, exp, buyer = accepted_contract()
        sign_both(contract, exp, buyer)
        r = client_for(buyer).post(reverse("contract-cancel", args=[contract.pk]), {"reason": "x"}, format="json")
        assert r.status_code == 400

    def test_teammate_with_sales_role_can_edit(self):
        contract, exp, _ = accepted_contract()
        mate = make_user("exporter")
        Membership.objects.filter(user=mate).update(organization=exp.membership.organization, role="sales")
        mate = User.objects.get(pk=mate.pk)
        r = client_for(mate).patch(reverse("contract-detail", args=[contract.pk]), {"notes": "ok"}, format="json")
        assert r.status_code == 200


# ── T-2 ECTA registration and floor prices ───────────────────────────────────

class TestEctaRegistration:
    def test_register_blocked_below_floor(self, floor):
        FloorPrice.objects.create(region="yirgacheffe", grade="G1", processing="washed",
                                  min_price_usd_per_kg=Decimal("7.50"), valid_from=date(2026, 1, 1),
                                  source="ECTA Yirgacheffe G1 washed")
        contract, exp, buyer = accepted_contract(price="7.00")
        sign_both(contract, exp, buyer)
        check = client_for(exp).get(reverse("contract-floor-check", args=[contract.pk])).data
        assert check["ok"] is False and check["floor_usd"] == "7.50"
        r = client_for(exp).post(reverse("contract-register", args=[contract.pk]), {"registration_number": "ECTA-1"},
                                 format="json")
        assert r.status_code == 400 and "below" in r.data["detail"]

    def test_register_ok(self, floor):
        contract, exp, buyer = accepted_contract(price="7.00")
        sign_both(contract, exp, buyer)
        r = client_for(exp).post(reverse("contract-register", args=[contract.pk]),
                                 {"registration_number": "ECTA/CR/2026/1182", "registered_on": "2026-11-05"},
                                 format="json")
        assert r.status_code == 200, r.data
        contract.refresh_from_db()
        assert contract.status == "registered" and contract.ecta_floor_price_usd == Decimal("5.00")

    def test_register_requires_signatures(self, floor):
        contract, exp, _ = accepted_contract()
        r = client_for(exp).post(reverse("contract-register", args=[contract.pk]), {"registration_number": "X"},
                                 format="json")
        assert r.status_code == 400

    def test_floor_price_csv_import(self):
        admin = make_user("admin")
        content = (
            "grade,processing,region,min_price_usd_per_kg,valid_from,valid_to,source\n"
            "G1,washed,sidama,6.80,2026-11-01,,ECTA Nov 2026\n"
            "G2,,,4.10,2026-11-01,2027-01-31,ECTA Nov 2026\n"
        )
        c = client_for(admin)
        r = c.post(reverse("floor-prices"), {"file": SimpleUploadedFile("f.csv", content.encode()), "dry_run": "1"})
        assert r.status_code == 200 and r.data["valid"] == 2 and not r.data["saved"]  # noqa: PLR2004
        r = c.post(reverse("floor-prices"), {"file": SimpleUploadedFile("f.csv", content.encode())})
        assert r.data["saved"]
        assert FloorPrice.objects.get(region="sidama").min_price_usd_per_kg == Decimal("6.80")
        # Re-import updates instead of duplicating.
        c.post(reverse("floor-prices"), {"file": SimpleUploadedFile("f.csv", content.replace("6.80", "6.90").encode())})
        assert FloorPrice.objects.filter(region="sidama").count() == 1
        assert client_for(make_user("exporter")).post(reverse("floor-prices"), {}).status_code == 403

    def test_region_specific_floor_wins(self):
        from bunna_bridge.lots.compliance import applicable_floor_price

        exp = make_user("exporter")
        lot = make_lot(exp)
        FloorPrice.objects.create(min_price_usd_per_kg=Decimal("4"), valid_from=date(2026, 1, 1))
        FloorPrice.objects.create(grade="G1", processing="washed", min_price_usd_per_kg=Decimal("5"),
                                  valid_from=date(2026, 1, 1))
        FloorPrice.objects.create(region="yirgacheffe", min_price_usd_per_kg=Decimal("6"), valid_from=date(2026, 1, 1))
        FloorPrice.objects.create(region="sidama", grade="G1", processing="washed", min_price_usd_per_kg=Decimal("9"),
                                  valid_from=date(2026, 1, 1))
        assert applicable_floor_price(lot).min_price_usd_per_kg == Decimal("6")


# ── T-3 … T-6: samples, shipment, documents, payments ────────────────────────

@pytest.fixture
def registered(floor):
    contract, exp, buyer = accepted_contract()
    sign_both(contract, exp, buyer)
    client_for(exp).post(reverse("contract-register", args=[contract.pk]), {"registration_number": "ECTA-77"},
                         format="json")
    contract.refresh_from_db()
    return contract, exp, buyer


class TestExecution:
    def test_shipment_flow_with_pss_documents_forwarder_and_claim(self, registered, tmp_path):
        contract, exp, buyer = registered
        fwd = make_user("forwarder", company_name="Red Sea Logistics")
        e, b, f = client_for(exp), client_for(buyer), client_for(fwd)
        with override_settings(MEDIA_ROOT=tmp_path):
            r = e.post(reverse("contract-shipments", args=[contract.pk]), {
                "forwarder_email": fwd.email, "booking_number": "MSK123", "container_number": "MSKU1234567",
                "etd": str(date.today() + timedelta(days=40)),
            }, format="json")
            assert r.status_code == 201, r.data
            shipment_id = r.data["id"]
            assert len(r.data["documents"]) == len(ShipmentDocument.DEFAULT_CHECKLIST)
            assert r.data["bags"] == 10  # noqa: PLR2004
            # The forwarder now sees the contract and can post milestones.
            assert f.get(reverse("contract-detail", args=[contract.pk])).data["my_party"] == "forwarder"
            ev = reverse("shipment-events", args=[shipment_id])
            assert f.post(ev, {"kind": "stuffed", "location": "Addis Ababa"}, format="json").status_code == 201
            # Loading is blocked until the PSS is approved and key documents are uploaded.
            r = f.post(ev, {"kind": "loaded"}, format="json")
            assert r.status_code == 400 and "pre-shipment" in r.data["detail"]
            r = e.post(reverse("contract-samples", args=[contract.pk]),
                       {"kind": "pss", "courier": "DHL", "tracking_number": "77"}, format="json")
            sample_id = r.data["id"]
            assert e.post(reverse("contract-sample-decide", args=[contract.pk, sample_id]),
                          {"decision": "approved"}, format="json").status_code == 403
            assert b.post(reverse("contract-sample-decide", args=[contract.pk, sample_id]),
                          {"decision": "approved", "cup_score": "86.5"}, format="json").status_code == 200
            r = f.post(ev, {"kind": "loaded"}, format="json")
            assert r.status_code == 400 and "ECTA quality certificate" in r.data["detail"]
            docs = {d["kind"]: d["id"] for d in e.get(reverse("contract-shipments", args=[contract.pk])).data[0]["documents"]}
            for kind in ("ecta_quality", "phyto", "origin"):
                r = e.post(reverse("shipment-document", args=[shipment_id, docs[kind]]),
                           {"file": SimpleUploadedFile(f"{kind}.pdf", b"%PDF-1.4"), "number": f"N-{kind}"})
                assert r.status_code == 200, r.data
            # Buyer asks for a correction on one document.
            r = b.post(reverse("shipment-document", args=[shipment_id, docs["origin"]]),
                       {"review": "rejected", "comment": "Wrong consignee"}, format="json")
            assert r.data["status"] == "rejected"
            assert f.post(ev, {"kind": "loaded"}, format="json").status_code == 400
            e.post(reverse("shipment-document", args=[shipment_id, docs["origin"]]),
                   {"file": SimpleUploadedFile("o.pdf", b"%PDF-1.4")})
            assert f.post(ev, {"kind": "loaded"}, format="json").status_code == 201
            assert f.post(ev, {"kind": "departed", "location": "Djibouti"}, format="json").status_code == 201
            contract.refresh_from_db()
            assert contract.status == "shipped"
            # Buyer cannot post milestones; arrival claim flow.
            assert b.post(ev, {"kind": "arrived"}, format="json").status_code == 400
            r = b.post(reverse("contract-claims", args=[contract.pk]),
                       {"reason": "weight", "description": "Two bags short on arrival", "amount_usd": "840"})
            assert r.status_code == 201, r.data
            claim_id = r.data["id"]
            r = e.post(reverse("contract-claim-respond", args=[contract.pk, claim_id]),
                       {"action": "accept", "resolution": "Agreed — credit on balance."}, format="json")
            assert r.data["status"] == "accepted"
            money = e.get(reverse("contract-payments", args=[contract.pk])).data["summary"]
            assert money["amount_due_usd"] == "3360.00"
            assert f.post(ev, {"kind": "delivered"}, format="json").status_code == 201
            contract.refresh_from_db()
            assert contract.status == "completed"

    def test_payments_and_nbe_conversion(self, registered):
        contract, exp, buyer = registered
        e = client_for(exp)
        url = reverse("contract-payments", args=[contract.pk])
        r = e.post(url, {"kind": "advance", "amount_usd": "1260", "received_on": "2026-11-10", "bank": "CBE"},
                   format="json")
        s = r.data["summary"]
        assert s["received_usd"] == "1260.00" and s["nbe_conversion_ok"] is False
        assert s["required_conversion_usd"] == "630.00"
        pid = r.data["payments"][0]["id"]
        r = e.patch(reverse("contract-payment", args=[contract.pk, pid]), {"converted_usd": "630"}, format="json")
        assert r.status_code == 400  # needs the rate
        r = e.patch(reverse("contract-payment", args=[contract.pk, pid]),
                    {"converted_usd": "630", "rate_etb_per_usd": "155.20", "converted_on": "2026-11-10"}, format="json")
        s = r.data["summary"]
        assert s["nbe_conversion_ok"] is True and s["converted_etb"] == "97776.00"
        assert s["outstanding_usd"] == "2940.00"
        assert client_for(buyer).post(url, {"amount_usd": "1", "received_on": "2026-11-10"},
                                      format="json").status_code == 403
        assert client_for(buyer).get(url).status_code == 200

    def test_shipment_needs_registration(self, floor):
        contract, exp, buyer = accepted_contract()
        sign_both(contract, exp, buyer)
        r = client_for(exp).post(reverse("contract-shipments", args=[contract.pk]), {}, format="json")
        assert r.status_code == 400

    def test_unknown_forwarder_email(self, registered):
        contract, exp, _ = registered
        r = client_for(exp).post(reverse("contract-shipments", args=[contract.pk]),
                                 {"forwarder_email": "nobody@example.com"}, format="json")
        assert r.status_code == 400


# ── T-7 messaging ────────────────────────────────────────────────────────────

class TestMessaging:
    def test_buyer_and_exporter_team_converse(self):
        exp = make_user("exporter", company_name="Highland")
        mate = make_user("exporter")
        Membership.objects.filter(user=mate).update(organization=exp.membership.organization, role="sales")
        mate = User.objects.get(pk=mate.pk)
        buyer = make_user("buyer", company_name="Nordic")
        lot = make_lot(exp)
        r = client_for(buyer).post(reverse("conversation-list"), {"lot": str(lot.pk)}, format="json")
        assert r.status_code == 201
        cid = r.data["id"]
        url = reverse("conversation-messages", args=[cid])
        assert client_for(buyer).post(url, {"body": "Can you ship in March?"}, format="json").status_code == 201
        inbox = client_for(mate).get(reverse("conversation-list")).data
        assert inbox["unread"] == 1
        thread = client_for(mate).get(url).data
        assert thread["messages"][0]["sender_side"] == "buyer"
        assert client_for(mate).get(reverse("conversation-list")).data["unread"] == 0
        client_for(mate).post(url, {"body": "Yes, early March."}, format="json")
        assert client_for(buyer).get(reverse("conversation-list")).data["unread"] == 1
        # Same buyer + lot reuses the conversation; outsiders see nothing.
        again = client_for(buyer).post(reverse("conversation-list"), {"lot": str(lot.pk)}, format="json")
        assert again.data["id"] == cid
        assert client_for(make_user("buyer")).get(url).status_code == 404

    def test_cannot_message_own_lot_or_draft_lot(self):
        exp = make_user("exporter")
        lot = make_lot(exp)
        assert client_for(exp).post(reverse("conversation-list"), {"lot": str(lot.pk)},
                                    format="json").status_code == 400
        draft = make_lot(exp, status="draft")
        assert client_for(make_user("buyer")).post(reverse("conversation-list"), {"lot": str(draft.pk)},
                                                   format="json").status_code == 404
