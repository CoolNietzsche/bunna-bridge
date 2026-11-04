"""Organisations, team roles (O-1) and the ECTA compliance profile (O-7)."""

from datetime import date
from datetime import timedelta
from decimal import Decimal
from http import HTTPStatus

import pytest
from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import Offer
from bunna_bridge.traceability.models import Producer
from bunna_bridge.users.models import User

from .models import Invitation
from .models import Membership

pytestmark = pytest.mark.django_db
PASSWORD = "Highland-Coffee-2026!"  # noqa: S105


def make_user(role, **kw):
    n = User.objects.count()
    return User.objects.create_user(
        username=f"{role}{n}", email=f"{role}{n}@example.com", role=role, password=PASSWORD, **kw,
    )


def client_for(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c


def make_lot(exporter, **kw):
    n = CoffeeLot.objects.count()
    data = {
        "lot_id": f"ORG-{n:03d}", "name": "Team lot", "status": "draft", "exporter": exporter,
        "region": "sidama", "altitude_m": 1900, "processing": "washed", "grade": "G1",
        "harvest_date": date(2026, 1, 1), "volume_kg": Decimal("500"),
    }
    data.update(kw)
    return CoffeeLot.objects.create(**data)


def invite(owner, email, role):
    r = client_for(owner).post(reverse("org-invitations"), {"email": email, "role": role}, format="json")
    assert r.status_code == HTTPStatus.CREATED, r.data
    return r.data["token"]


def join(owner, role):
    """Create a teammate of `owner` with `role` via the invitation + register flow."""
    n = User.objects.count()
    email = f"mate{n}@example.com"
    token = invite(owner, email, role)
    r = APIClient().post(reverse("register"), {
        "email": email, "username": f"mate{n}", "password": PASSWORD, "password2": PASSWORD,
        "first_name": "Team", "last_name": "Mate", "invite_token": token,
    }, format="json")
    assert r.status_code == HTTPStatus.CREATED, r.data
    return User.objects.get(email=email)


class TestOrganisations:
    def test_business_accounts_get_an_organisation(self):
        exp = make_user("exporter", company_name="Highland Exports")
        m = Membership.objects.get(user=exp)
        assert m.role == "owner"
        assert m.organization.name == "Highland Exports"
        assert m.organization.kind == "exporter"
        assert not Membership.objects.filter(user=make_user("farmer")).exists()

    def test_me_shows_organisation_and_capabilities(self):
        exp = make_user("exporter", company_name="Highland")
        data = client_for(exp).get(reverse("me")).data["organization"]
        assert data["name"] == "Highland"
        assert "manage_team" in data["capabilities"]

    def test_invited_user_joins_the_team_and_shares_lots(self):
        owner = make_user("exporter", company_name="Highland")
        lot = make_lot(owner)
        mate = join(owner, "sales")
        assert mate.role == "exporter"
        assert Membership.objects.get(user=mate).organization == Membership.objects.get(user=owner).organization
        r = client_for(mate).get(reverse("lot-detail", args=[lot.pk]))
        assert r.status_code == 200
        r = client_for(mate).patch(reverse("lot-detail", args=[lot.pk]), {"name": "Renamed"}, format="json")
        assert r.status_code == 200
        assert client_for(mate).get(reverse("lot-list")).data["count"] == 1

    def test_invite_requires_matching_email(self):
        owner = make_user("exporter")
        token = invite(owner, "right@example.com", "sales")
        r = APIClient().post(reverse("register"), {
            "email": "wrong@example.com", "username": "w", "password": PASSWORD, "password2": PASSWORD,
            "invite_token": token,
        }, format="json")
        assert r.status_code == 400

    def test_only_managers_invite(self):
        owner = make_user("exporter")
        agent = join(owner, "field_agent")
        r = client_for(agent).post(reverse("org-invitations"), {"email": "x@example.com", "role": "sales"},
                                   format="json")
        assert r.status_code == 403

    def test_field_agent_manages_supply_but_not_lots(self):
        owner = make_user("exporter")
        lot = make_lot(owner)
        agent = join(owner, "field_agent")
        c = client_for(agent)
        assert c.patch(reverse("lot-detail", args=[lot.pk]), {"name": "x"}, format="json").status_code == 403
        r = c.post(reverse("producer-list"), {"name": "Field producer"}, format="json")
        assert r.status_code == 201
        # The owner sees the producer the agent registered.
        names = [p["name"] for p in client_for(owner).get(reverse("producer-list")).data["results"]]
        assert "Field producer" in names

    def test_viewer_is_read_only(self):
        owner = make_user("exporter")
        Producer.objects.create(owner=owner, name="P")
        viewer = join(owner, "viewer")
        c = client_for(viewer)
        assert c.get(reverse("producer-list")).data["count"] == 1
        assert c.post(reverse("producer-list"), {"name": "No"}, format="json").status_code == 403

    def test_sales_responds_to_offers_logistics_cannot(self):
        owner = make_user("exporter")
        lot = make_lot(owner, status="listed", available_qty_kg=Decimal("500"))
        buyer = make_user("buyer")
        offer = Offer.objects.create(lot=lot, buyer=buyer, quantity_kg=Decimal("100"), price_per_kg_usd=Decimal("9"))
        logistics = join(owner, "logistics")
        sales = join(owner, "sales")
        url = reverse("offer-respond", args=[offer.pk])
        assert client_for(logistics).post(url, {"action": "reject"}, format="json").status_code == 403
        assert client_for(sales).post(url, {"action": "reject"}, format="json").status_code == 200

    def test_importer_team_shares_offers(self):
        exp = make_user("exporter")
        lot = make_lot(exp, status="listed", available_qty_kg=Decimal("500"))
        imp = make_user("importer", company_name="Hamburg GmbH")
        Offer.objects.create(lot=lot, buyer=imp, quantity_kg=Decimal("100"), price_per_kg_usd=Decimal("9"))
        mate = join(imp, "sales")
        assert mate.role == "importer"
        assert len(client_for(mate).get(reverse("offer-list-create")).data["results"]) == 1

    def test_removed_member_loses_access(self):
        owner = make_user("exporter")
        lot = make_lot(owner)
        mate = join(owner, "sales")
        m = Membership.objects.get(user=mate)
        assert client_for(owner).delete(reverse("org-member", args=[m.pk])).status_code == 204
        mate = User.objects.get(pk=mate.pk)
        assert client_for(mate).get(reverse("lot-detail", args=[lot.pk])).status_code == 404

    def test_last_owner_cannot_be_removed_or_demoted(self):
        owner = make_user("exporter")
        m = Membership.objects.get(user=owner)
        c = client_for(owner)
        assert c.patch(reverse("org-member", args=[m.pk]), {"role": "sales"}, format="json").status_code == 400
        assert c.delete(reverse("org-member", args=[m.pk])).status_code == 400

    def test_existing_user_accepts_invitation(self):
        owner = make_user("exporter", company_name="Highland")
        other = make_user("exporter", company_name="Solo")
        token = invite(owner, other.email, "quality")
        assert APIClient().get(reverse("org-invitation-public", args=[token])).data["has_account"] is True
        r = client_for(other).post(reverse("org-invitation-accept", args=[token]))
        assert r.status_code == 200, r.data
        assert Membership.objects.get(user=other).role == "quality"
        assert Invitation.objects.get(token=token).accepted_at is not None
        # Second use fails.
        assert client_for(other).post(reverse("org-invitation-accept", args=[token])).status_code == 410

    def test_teammate_can_add_team_plot_to_team_lot(self):
        owner = make_user("exporter")
        agent = join(owner, "field_agent")
        producer = Producer.objects.create(owner=agent, name="By agent")
        from bunna_bridge.traceability.models import Plot

        plot = Plot.objects.create(producer=producer, location=Point(38.3, 6.2, srid=4326))
        lot = make_lot(owner)
        r = client_for(owner).post(reverse("lot-sources", args=[lot.pk]), {"plot": str(plot.pk), "quantity_kg": "500"},
                                   format="json")
        assert r.status_code == 201, r.data


class TestComplianceProfile:
    def _upload(self, user, **data):
        payload = {"file": SimpleUploadedFile("doc.pdf", b"%PDF-1.4"), **data}
        return client_for(user).post(reverse("org-compliance"), payload)

    def test_profile_flow(self, tmp_path):
        exp = make_user("exporter")
        admin = make_user("admin")
        with override_settings(MEDIA_ROOT=tmp_path):
            profile = client_for(exp).get(reverse("org-compliance")).data["profile"]
            assert profile["complete"] is False
            assert {i["state"] for i in profile["items"]} == {"missing"}
            assert self._upload(exp, kind="taster_certificate").status_code == 400  # needs taster name
            ids = []
            for kind, extra in [
                ("lab_certificate", {"holder_name": "Highland lab"}),
                ("taster_certificate", {"holder_name": "Tigist Bekele"}),
                ("capital_attestation", {"amount_birr": "15000000"}),
            ]:
                r = self._upload(exp, kind=kind, expires_on=str(timezone.localdate() + timedelta(days=200)), **extra)
                assert r.status_code == 201, r.data
                ids.append(r.data["id"])
            pending = client_for(admin).get(reverse("org-compliance-reviews")).data
            assert len(pending) == 3
            for doc_id in ids:
                r = client_for(admin).post(reverse("org-compliance-review", args=[doc_id]), {"decision": "verify"},
                                           format="json")
                assert r.status_code == 200
            assert client_for(exp).get(reverse("org-compliance")).data["profile"]["complete"] is True

    def test_non_admin_cannot_review(self, tmp_path):
        exp = make_user("exporter")
        assert client_for(exp).get(reverse("org-compliance-reviews")).status_code == 403

    def test_field_agent_cannot_upload(self, tmp_path):
        owner = make_user("exporter")
        agent = join(owner, "field_agent")
        with override_settings(MEDIA_ROOT=tmp_path):
            assert self._upload(agent, kind="lab_certificate").status_code == 403

    def test_expired_document_shows_expired(self, tmp_path):
        exp = make_user("exporter")
        with override_settings(MEDIA_ROOT=tmp_path):
            self._upload(exp, kind="lab_certificate", expires_on=str(timezone.localdate() - timedelta(days=1)))
            items = client_for(exp).get(reverse("org-compliance")).data["profile"]["items"]
        assert next(i for i in items if i["kind"] == "lab_certificate")["state"] == "expired"
