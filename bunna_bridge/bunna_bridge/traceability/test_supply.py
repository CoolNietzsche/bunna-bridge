"""Cherry intake (O-3) and cooperative → exporter supply (O-2)."""

from datetime import date
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point
from django.urls import reverse
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.users.models import User

from .models import CherryDelivery
from .models import LotSource
from .models import Plot
from .models import Producer
from .models import ProducerConsent

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


def producer_with_plot(owner, name="Abebe", consent=True, ref=""):
    p = Producer.objects.create(owner=owner, name=name, external_ref=ref)
    if consent:
        ProducerConsent.objects.create(producer=p, purpose="eudr_sharing", method="witnessed")
    plot = Plot.objects.create(producer=p, location=Point(38.3, 6.2, srid=4326), declared_area_ha=Decimal("1"))
    return p, plot


def deliver(user, producer, receipt, kg="500", **extra):
    payload = {"producer": str(producer.pk), "receipt_number": receipt, "delivered_on": "2026-11-01",
               "weight_kg": kg, "price_per_kg_etb": "120", **extra}
    r = client_for(user).post(reverse("delivery-list"), payload, format="json")
    assert r.status_code == 201, r.data
    return r.data


def make_lot(exporter):
    return CoffeeLot.objects.create(
        lot_id=f"INT-{CoffeeLot.objects.count()}", name="Intake lot", exporter=exporter, region="sidama",
        altitude_m=1900, processing="washed", grade="G1", harvest_date=date(2026, 1, 1), volume_kg=Decimal("200"),
    )


class TestIntake:
    def test_record_delivery_defaults_single_plot_and_due(self):
        exp = make_user("exporter")
        producer, plot = producer_with_plot(exp)
        data = deliver(exp, producer, "R-1")
        assert str(data["plot"]) == str(plot.pk)
        assert Decimal(data["amount_due_etb"]) == Decimal("60000")

    def test_duplicate_receipt_rejected(self):
        exp = make_user("exporter")
        producer, _ = producer_with_plot(exp)
        deliver(exp, producer, "R-1")
        r = client_for(exp).post(reverse("delivery-list"), {"producer": str(producer.pk), "receipt_number": "R-1",
                                                            "delivered_on": "2026-11-01", "weight_kg": "5"},
                                 format="json")
        assert r.status_code == 400

    def test_record_payment_and_summary(self):
        exp = make_user("exporter")
        producer, _ = producer_with_plot(exp)
        d = deliver(exp, producer, "R-1")
        r = client_for(exp).patch(reverse("delivery-detail", args=[d["id"]]),
                                  {"amount_paid_etb": "60000", "paid_on": "2026-11-02", "payment_reference": "TB-77"},
                                  format="json")
        assert r.status_code == 200, r.data
        summary = client_for(exp).get(reverse("delivery-list")).data["summary"]
        assert Decimal(summary["paid_etb"]) == Decimal("60000")

    def test_farmer_sees_own_deliveries(self):
        exp = make_user("exporter")
        farmer = make_user("farmer")
        producer, _ = producer_with_plot(exp)
        producer.user = farmer
        producer.save()
        deliver(exp, producer, "R-1", amount_paid_etb="1000")
        data = client_for(farmer).get(reverse("my-deliveries")).data
        assert len(data["results"]) == 1
        assert data["results"][0]["receipt_number"] == "R-1"
        assert client_for(make_user("farmer")).get(reverse("my-deliveries")).data["results"] == []

    def test_allocate_deliveries_creates_lot_sources(self):
        exp = make_user("exporter")
        p1, plot1 = producer_with_plot(exp, "A")
        p2, plot2 = producer_with_plot(exp, "B")
        d1 = deliver(exp, p1, "R-1", kg="500")
        d2 = deliver(exp, p1, "R-2", kg="250")
        d3 = deliver(exp, p2, "R-3", kg="250")
        lot = make_lot(exp)
        r = client_for(exp).post(reverse("lot-allocate-deliveries", args=[lot.pk]),
                                 {"deliveries": [d1["id"], d2["id"], d3["id"]]}, format="json")
        assert r.status_code == 200, r.data
        assert LotSource.objects.get(lot=lot, plot=plot1).quantity_kg == Decimal("150.00")  # 750 kg cherry × 0.2
        assert LotSource.objects.get(lot=lot, plot=plot2).quantity_kg == Decimal("50.00")
        # Allocated deliveries are locked.
        r = client_for(exp).patch(reverse("delivery-detail", args=[d1["id"]]), {"weight_kg": "1"}, format="json")
        assert r.status_code == 400
        r = client_for(exp).post(reverse("lot-allocate-deliveries", args=[lot.pk]), {"deliveries": [d1["id"]]},
                                 format="json")
        assert r.status_code == 400

    def test_cannot_allocate_another_teams_delivery(self):
        a, b = make_user("exporter"), make_user("exporter")
        p, _ = producer_with_plot(a)
        d = deliver(a, p, "R-1")
        lot = make_lot(b)
        r = client_for(b).post(reverse("lot-allocate-deliveries", args=[lot.pk]), {"deliveries": [d["id"]]},
                               format="json")
        assert r.status_code == 400


class TestCooperativeSupply:
    def test_cooperative_registers_and_sells_to_exporter(self):
        coop = make_user("cooperative", company_name="Bensa Union")
        exp = make_user("exporter", company_name="Highland")
        p, plot = producer_with_plot(coop, "Member A")
        d = deliver(coop, p, "C-1", kg="1000", form="parchment")
        names = [e["name"] for e in client_for(coop).get(reverse("exporter-choices")).data]
        assert "Highland" in names
        r = client_for(coop).post(reverse("transfer-list"), {
            "buyer": exp.pk, "reference": "BU-2026-01", "delivery_ids": [d["id"]], "quantity_kg": "1000",
            "form": "parchment",
        }, format="json")
        assert r.status_code == 201, r.data
        transfer_id = r.data["id"]
        # Before acceptance the exporter cannot use the plot.
        lot = make_lot(exp)
        r = client_for(exp).post(reverse("lot-sources", args=[lot.pk]), {"plot": str(plot.pk), "quantity_kg": "10"},
                                 format="json")
        assert r.status_code == 400
        incoming = client_for(exp).get(reverse("transfer-list") + "?direction=incoming").data["results"]
        assert incoming[0]["plots_count"] == 1
        assert client_for(exp).post(reverse("transfer-respond", args=[transfer_id]), {"action": "accept"},
                                    format="json").status_code == 200
        avail = client_for(exp).get(reverse("plot-list") + "?available=1").data["results"]
        assert str(plot.pk) in [x["id"] for x in avail]
        # The exporter allocates the bought delivery to its lot: parchment ratio 0.8.
        r = client_for(exp).post(reverse("lot-allocate-deliveries", args=[lot.pk]), {"deliveries": [d["id"]]},
                                 format="json")
        assert r.status_code == 200, r.data
        assert LotSource.objects.get(lot=lot, plot=plot).quantity_kg == Decimal("800.00")
        # The cooperative's own record shows where it went.
        row = client_for(coop).get(reverse("delivery-list")).data["results"][0]
        assert row["lot_code"] == lot.lot_id

    def test_sale_needs_consent(self):
        coop = make_user("cooperative")
        exp = make_user("exporter")
        p, _ = producer_with_plot(coop, consent=False)
        d = deliver(coop, p, "C-1")
        r = client_for(coop).post(reverse("transfer-list"), {
            "buyer": exp.pk, "reference": "X", "delivery_ids": [d["id"]], "quantity_kg": "100",
        }, format="json")
        assert r.status_code == 400
        assert "consent" in str(r.data)

    def test_delivery_cannot_be_sold_twice(self):
        coop = make_user("cooperative")
        e1, e2 = make_user("exporter"), make_user("exporter")
        p, _ = producer_with_plot(coop)
        d = deliver(coop, p, "C-1")
        body = {"reference": "X", "delivery_ids": [d["id"]], "quantity_kg": "100"}
        assert client_for(coop).post(reverse("transfer-list"), {**body, "buyer": e1.pk},
                                     format="json").status_code == 201
        assert client_for(coop).post(reverse("transfer-list"), {**body, "buyer": e2.pk},
                                     format="json").status_code == 400

    def test_rejected_and_cancelled(self):
        coop = make_user("cooperative")
        exp = make_user("exporter")
        p, _ = producer_with_plot(coop)
        d = deliver(coop, p, "C-1")
        t = client_for(coop).post(reverse("transfer-list"), {
            "buyer": exp.pk, "reference": "X", "delivery_ids": [d["id"]], "quantity_kg": "100",
        }, format="json").data
        assert client_for(coop).post(reverse("transfer-respond", args=[t["id"]]), {"action": "accept"},
                                     format="json").status_code == 404  # seller cannot accept
        assert client_for(coop).post(reverse("transfer-cancel", args=[t["id"]])).status_code == 200
        assert client_for(exp).post(reverse("transfer-respond", args=[t["id"]]), {"action": "accept"},
                                    format="json").status_code == 400
        assert CherryDelivery.objects.get(pk=d["id"]).transfers.get().status == "cancelled"

    def test_cooperative_can_self_register(self):
        r = APIClient().post(reverse("register"), {
            "email": "coop@example.com", "username": "coop", "password": PASSWORD, "password2": PASSWORD,
            "role": "cooperative", "company_name": "Sidama Union",
        }, format="json")
        assert r.status_code == 201, r.data
        assert User.objects.get(email="coop@example.com").membership.organization.kind == "cooperative"


class TestFieldSync:
    PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    def test_offline_batch_with_client_refs_is_idempotent(self, tmp_path):
        import uuid

        from django.test import override_settings

        exp = make_user("exporter")
        pid, plid, cid, did = (str(uuid.uuid4()) for _ in range(4))
        items = [
            {"client_id": pid, "type": "producer", "data": {"name": "Field Farmer", "phone": "0911000000"}},
            {"client_id": plid, "type": "plot", "data": {
                "producer": f"client:{pid}", "location": {"type": "Point", "coordinates": [38.3, 6.2]},
                "declared_area_ha": "1.1", "photo": self.PNG}},
            {"client_id": cid, "type": "consent", "data": {
                "producer": f"client:{pid}", "purpose": "eudr_sharing", "method": "paper", "evidence": self.PNG}},
            {"client_id": did, "type": "delivery", "data": {
                "producer": f"client:{pid}", "plot": f"client:{plid}", "receipt_number": "F-1",
                "delivered_on": "2026-11-03", "weight_kg": "40"}},
        ]
        with override_settings(MEDIA_ROOT=tmp_path):
            r = client_for(exp).post(reverse("field-sync"), {"items": items}, format="json")
            assert [x["status"] for x in r.data["results"]] == ["created"] * 4, r.data
            again = client_for(exp).post(reverse("field-sync"), {"items": items}, format="json")
        assert [x["status"] for x in again.data["results"]] == ["duplicate"] * 4
        producer = Producer.objects.get(name="Field Farmer")
        assert producer.current_consent("eudr_sharing")
        assert producer.plots.get().photo
        assert CherryDelivery.objects.get(receipt_number="F-1").plot == producer.plots.get()

    def test_bad_item_does_not_block_others(self):
        import uuid

        exp = make_user("exporter")
        items = [
            {"client_id": str(uuid.uuid4()), "type": "plot", "data": {"producer": "client:" + str(uuid.uuid4())}},
            {"client_id": str(uuid.uuid4()), "type": "producer", "data": {"name": "OK"}},
            {"client_id": "not-a-uuid", "type": "producer", "data": {"name": "X"}},
        ]
        r = client_for(exp).post(reverse("field-sync"), {"items": items}, format="json")
        assert [x["status"] for x in r.data["results"]] == ["error", "created", "error"]

    def test_viewer_cannot_sync(self):
        exp = make_user("buyer")
        r = client_for(exp).post(reverse("field-sync"), {"items": [{"client_id": "x"}]}, format="json")
        assert r.status_code == 403
