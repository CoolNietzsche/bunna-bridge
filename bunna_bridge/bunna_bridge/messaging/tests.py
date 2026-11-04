"""SMS to producers (O-6) and ECTMS import (O-8)."""

from datetime import date
from decimal import Decimal
from unittest import mock

import pytest
from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from bunna_bridge.traceability.models import CherryDelivery
from bunna_bridge.traceability.models import Plot
from bunna_bridge.traceability.models import Producer
from bunna_bridge.traceability.models import ProducerConsent
from bunna_bridge.users.models import User

from .backends import SmsError
from .models import SmsMessage
from .service import normalize_et_phone
from .service import render

pytestmark = pytest.mark.django_db


def make_user(role, **kw):
    n = User.objects.count()
    return User.objects.create_user(username=f"{role}{n}", email=f"{role}{n}@example.com", role=role,
                                    password="Highland-Coffee-2026!", **kw)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class TestPhoneNumbers:
    @pytest.mark.parametrize(("raw", "expected"), [
        ("0911 223344", "+251911223344"),
        ("911223344", "+251911223344"),
        ("+251-911-223-344", "+251911223344"),
        ("00251711223344", "+251711223344"),
        ("0711223344", "+251711223344"),
        ("0111234567", ""),  # landline
        ("12345", ""),
        ("", ""),
    ])
    def test_normalize(self, raw, expected):
        assert normalize_et_phone(raw) == expected


class TestTemplates:
    def test_all_languages_render(self):
        for kind in ("delivery_receipt", "payment", "consent"):
            for lang in ("en", "am", "om"):
                text = render(kind, lang, name="Abebe", weight="50", date="01/11/2026", receipt="R1",
                              buyer="Highland", amount="6,000.00", ref="TB1")
                assert "Abebe" in text
                assert len(text) < 320  # noqa: PLR2004 - at most two SMS segments in Latin script


@pytest.mark.django_db(transaction=True)
class TestProducerSms:
    def _setup(self, phone="0911223344", language="am"):
        exp = make_user("exporter", company_name="Highland")
        producer = Producer.objects.create(owner=exp, name="Abebe Kebede", phone=phone, language=language)
        Plot.objects.create(producer=producer, location=Point(38.3, 6.2, srid=4326))
        return exp, producer

    def test_receipt_and_payment_sms(self):
        exp, producer = self._setup()
        r = client_for(exp).post(reverse("delivery-list"), {
            "producer": str(producer.pk), "receipt_number": "R-1", "delivered_on": "2026-11-01", "weight_kg": "50",
            "price_per_kg_etb": "120",
        }, format="json")
        assert r.status_code == 201
        receipt = SmsMessage.objects.get(kind="delivery_receipt")
        assert receipt.status == "sent"
        assert receipt.to == "+251911223344"
        assert "R-1" in receipt.body
        assert "ተረክበናል" in receipt.body  # Amharic template
        client_for(exp).patch(reverse("delivery-detail", args=[r.data["id"]]),
                              {"amount_paid_etb": "6000", "payment_reference": "TB1"}, format="json")
        assert SmsMessage.objects.filter(kind="payment", status="sent").count() == 1
        # Saving again without a new payment does not re-send.
        client_for(exp).patch(reverse("delivery-detail", args=[r.data["id"]]), {"notes": "ok"}, format="json")
        assert SmsMessage.objects.filter(kind="payment").count() == 1

    def test_consent_sms_in_oromo(self):
        _, producer = self._setup(language="om")
        ProducerConsent.objects.create(producer=producer, purpose="eudr_sharing", method="witnessed")
        msg = SmsMessage.objects.get(kind="consent")
        assert "Kabajamoo" in msg.body

    def test_no_valid_number_is_skipped(self):
        _, producer = self._setup(phone="")
        CherryDelivery.objects.create(owner=producer.owner, producer=producer, receipt_number="R",
                                      delivered_on=date(2026, 11, 1), weight_kg=Decimal("5"))
        assert SmsMessage.objects.get().status == "skipped"

    def test_gateway_failure_is_recorded(self):
        _, producer = self._setup()
        with mock.patch("bunna_bridge.messaging.backends.LogBackend.send", side_effect=SmsError("down")):
            CherryDelivery.objects.create(owner=producer.owner, producer=producer, receipt_number="R",
                                          delivered_on=date(2026, 11, 1), weight_kg=Decimal("5"))
        msg = SmsMessage.objects.get()
        assert msg.status == "failed"
        assert msg.error == "down"

    @override_settings(SMS_ENABLED=False)
    def test_disabled(self):
        _, producer = self._setup()
        CherryDelivery.objects.create(owner=producer.owner, producer=producer, receipt_number="R",
                                      delivered_on=date(2026, 11, 1), weight_kg=Decimal("5"))
        assert not SmsMessage.objects.exists()

    def test_team_sees_messages_for_its_producers(self):
        exp, producer = self._setup()
        ProducerConsent.objects.create(producer=producer, purpose="eudr_sharing", method="witnessed")
        assert len(client_for(exp).get(reverse("sms-list")).data["results"]) == 1
        assert client_for(make_user("exporter")).get(reverse("sms-list")).data["results"] == []


class TestEctmsImport:
    CSV = (
        "FarmerID,Farmer Name,FarmID,Kebele,Woreda,Latitude,Longitude,Area_ha\n"
        "ET-F-001,Abebe Kebede,ET-P-001,Konga,Yirgacheffe,6.2,38.3,1.2\n"
        "ET-F-002,Almaz Tesfaye,ET-P-002,Konga,Yirgacheffe,6.21,38.31,0.8\n"
    )

    def _import(self, user, content, dry_run=False):
        data = {"file": SimpleUploadedFile("ectms.csv", content.encode())}
        if dry_run:
            data["dry_run"] = "1"
        return client_for(user).post(reverse("ectms-import"), data)

    def test_import_and_reimport_updates(self):
        exp = make_user("exporter")
        r = self._import(exp, self.CSV, dry_run=True)
        assert r.data["producers_created"] == 2 and not r.data["saved"]
        assert Producer.objects.count() == 0
        r = self._import(exp, self.CSV)
        assert r.status_code == 200, r.data
        assert Producer.objects.get(ectms_farmer_id="ET-F-001").plots.get().ectms_farm_id == "ET-P-001"
        moved = self.CSV.replace("6.2,38.3,1.2", "6.25,38.35,1.5")
        r = self._import(exp, moved)
        assert r.data["producers_updated"] == 2 and r.data["plots_updated"] == 2
        assert Producer.objects.count() == 2
        assert Plot.objects.get(ectms_farm_id="ET-P-001").declared_area_ha == Decimal("1.5")

    def test_bad_row_saves_nothing(self):
        exp = make_user("exporter")
        r = self._import(exp, self.CSV + "ET-F-003,Bad,ET-P-003,K,W,38.3,6.2,1\n")
        assert r.status_code == 400
        assert Producer.objects.count() == 0

    def test_lookup_not_configured(self):
        exp = make_user("exporter")
        assert client_for(exp).get(reverse("ectms-lookup", args=["ET-P-001"])).status_code == 503
