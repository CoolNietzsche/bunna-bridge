"""Tests for the EUDR traceability backbone (roadmap Phase 1, E-1 … E-13)."""

import io
import json
import zipfile
from datetime import date
from datetime import timedelta
from decimal import Decimal
from http import HTTPStatus

import pytest
from django.contrib.gis.geos import MultiPolygon
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import Polygon
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from bunna_bridge.lots.deforestation import DeforestationZone
from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.users.models import User

from . import due_diligence as dd
from .geo import geodesic_area_ha
from .geo import traces_feature
from .geo import validate_plot_geometry
from .models import CherryDelivery
from .models import DdsReference
from .models import ForestBaseline2020
from .models import LotRisk
from .models import LotSource
from .models import Plot
from .models import Producer
from .models import ProducerConsent

pytestmark = pytest.mark.django_db

PASSWORD = "Highland-Coffee-2026!"  # noqa: S105
# ~1.1 km x 1.1 km near Yirgacheffe (≈ 122 ha)
BIG = Polygon(
    ((38.20, 6.15), (38.20, 6.16), (38.21, 6.16), (38.21, 6.15), (38.20, 6.15)),
    srid=4326,
)
# ~110 m x 110 m (≈ 1.2 ha)
SMALL = Polygon(
    (
        (38.300, 6.200),
        (38.300, 6.201),
        (38.301, 6.201),
        (38.301, 6.200),
        (38.300, 6.200),
    ),
    srid=4326,
)
FAR_AWAY_LOSS = MultiPolygon(
    Polygon(((36.0, 9.0), (36.0, 9.01), (36.01, 9.01), (36.01, 9.0), (36.0, 9.0))),
    srid=4326,
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


def verified_exporter():
    exp = make_user("exporter", company_name="Highland Exports")
    exp.ecta_license_file = "users/ecta/license.pdf"
    exp.ecta_license_expiry = timezone.localdate() + timedelta(days=200)
    exp.ecta_license_verified_at = timezone.now()
    exp.save()
    return exp


def make_lot(exporter, **kwargs):
    n = CoffeeLot.objects.count()
    defaults = {
        "lot_id": f"TR-{n:04d}",
        "name": "Traced Lot",
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
        "channel": "vertical",
        "ecex_permit_file": "lots/ecex/permit.pdf",
    }
    defaults.update(kwargs)
    return CoffeeLot.objects.create(**defaults)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def geojson(geom):
    return json.loads(geom.geojson)


@pytest.fixture
def loss_data():
    """Some forest-loss data must exist, or plots stay at 'no_data'."""
    return DeforestationZone.objects.create(geometry=FAR_AWAY_LOSS, year=2022)


# ── E-2: geometry validation ─────────────────────────────────────────────────


class TestGeometryRules:
    def test_valid_polygon(self):
        assert validate_plot_geometry(boundary=SMALL) == []

    def test_swapped_coordinates_rejected(self):
        swapped = Point(6.2, 38.3, srid=4326)
        assert "outside Ethiopia" in validate_plot_geometry(location=swapped)[0]

    def test_too_few_vertices(self):
        tri = Polygon(((38.3, 6.2), (38.3, 6.21), (38.31, 6.2), (38.3, 6.2)), srid=4326)
        assert "at least 4" in validate_plot_geometry(boundary=tri)[0]

    def test_self_intersecting(self):
        bowtie = Polygon(
            ((38.3, 6.2), (38.31, 6.21), (38.31, 6.2), (38.3, 6.21), (38.3, 6.2)),
            srid=4326,
        )
        assert "not valid" in validate_plot_geometry(boundary=bowtie)[0]

    def test_area_is_geodesic(self):
        area = geodesic_area_ha(SMALL)
        assert Decimal("1.1") < area < Decimal("1.3")

    def test_traces_feature_rounds_to_six_decimals(self):
        exp = make_user("exporter")
        producer = Producer.objects.create(
            owner=exp, name="Abebe", kebele="Konga", region="Sidama",
        )
        plot = Plot.objects.create(
            producer=producer,
            location=Point(38.123456789, 6.987654321, srid=4326),
            declared_area_ha=Decimal("1.5"),
        )
        feature = traces_feature(plot)
        assert feature["geometry"]["coordinates"] == [38.123457, 6.987654]
        assert feature["properties"]["ProducerName"] == "Abebe"
        assert feature["properties"]["ProducerCountry"] == "ET"
        assert feature["properties"]["Area"] == 1.5


# ── E-1: producers and plots API ─────────────────────────────────────────────


class TestProducersAndPlots:
    def test_exporter_creates_producer_and_plot(self, loss_data):
        exp = make_user("exporter")
        c = client_for(exp)
        r = c.post(
            reverse("producer-list"),
            {"name": "Tigist Haile", "external_ref": "S-001", "kebele": "Konga"},
            format="json",
        )
        assert r.status_code == HTTPStatus.CREATED, r.data
        r2 = c.post(
            reverse("plot-list"),
            {
                "producer": r.data["id"],
                "boundary": geojson(SMALL),
                "land_tenure": "owned",
            },
            format="json",
        )
        assert r2.status_code == HTTPStatus.CREATED, r2.data
        assert r2.data["deforestation_status"] == "clear"
        assert Decimal(r2.data["area_ha"]) > 1

    def test_duplicate_reference_rejected(self):
        exp = make_user("exporter")
        Producer.objects.create(owner=exp, name="A", external_ref="S-1")
        r = client_for(exp).post(
            reverse("producer-list"),
            {"name": "B", "external_ref": "S-1"},
            format="json",
        )
        assert r.status_code == HTTPStatus.BAD_REQUEST

    def test_invalid_geometry_rejected(self):
        exp = make_user("exporter")
        producer = Producer.objects.create(owner=exp, name="A")
        r = client_for(exp).post(
            reverse("plot-list"),
            {
                "producer": str(producer.pk),
                "location": {"type": "Point", "coordinates": [6.2, 38.3]},
            },
            format="json",
        )
        assert r.status_code == HTTPStatus.BAD_REQUEST
        assert "outside Ethiopia" in str(r.data)

    def test_other_exporters_producers_are_invisible(self):
        a, b = make_user("exporter"), make_user("exporter")
        producer = Producer.objects.create(owner=a, name="A")
        c = client_for(b)
        assert (
            c.get(reverse("producer-detail", args=[producer.pk])).status_code
            == HTTPStatus.NOT_FOUND
        )
        r = c.post(
            reverse("plot-list"),
            {"producer": str(producer.pk), "location": geojson(Point(38.3, 6.2))},
            format="json",
        )
        assert r.status_code == HTTPStatus.BAD_REQUEST

    def test_buyers_cannot_manage_producers(self):
        assert (
            client_for(make_user("buyer")).get(reverse("producer-list")).status_code
            == HTTPStatus.FORBIDDEN
        )

    def test_delete_archives(self):
        exp = make_user("exporter")
        producer = Producer.objects.create(owner=exp, name="A")
        plot = Plot.objects.create(
            producer=producer, location=Point(38.3, 6.2, srid=4326),
        )
        assert (
            client_for(exp)
            .delete(reverse("producer-detail", args=[producer.pk]))
            .status_code
            == 204
        )
        producer.refresh_from_db()
        plot.refresh_from_db()
        assert producer.archived_at and plot.archived_at

    def test_paper_consent_needs_evidence(self):
        exp = make_user("exporter")
        producer = Producer.objects.create(owner=exp, name="A")
        url = reverse("producer-consents", args=[producer.pk])
        c = client_for(exp)
        assert (
            c.post(url, {"purpose": "eudr_sharing", "method": "paper"}).status_code
            == 400
        )
        assert (
            c.post(url, {"purpose": "eudr_sharing", "method": "witnessed"}).status_code
            == 201
        )
        assert producer.current_consent("eudr_sharing")
        assert (
            c.post(
                url,
                {"purpose": "eudr_sharing", "method": "witnessed", "granted": False},
            ).status_code
            == 201
        )
        assert not producer.current_consent("eudr_sharing")


# ── E-3/E-5: multi-plot lots and gates across all plots ─────────────────────


def build_traced_lot(exp, plots=2, consent=True, **lot_kwargs):
    lot = make_lot(exp, **lot_kwargs)
    share = (lot.volume_kg / plots).quantize(Decimal("0.01"))
    for i in range(plots):
        producer = Producer.objects.create(
            owner=exp, name=f"Producer {i}", external_ref=f"P{i}",
        )
        if consent:
            ProducerConsent.objects.create(
                producer=producer, purpose="eudr_sharing", method="witnessed",
            )
        plot = Plot.objects.create(
            producer=producer,
            location=Point(38.3 + i / 100, 6.2, srid=4326),
            declared_area_ha=Decimal("1.2"),
            land_tenure="owned",
        )
        LotSource.objects.create(lot=lot, plot=plot, quantity_kg=share)
    lot.refresh_from_db()
    return lot


class TestMultiPlotGates:
    def test_all_plots_clear_passes_location_and_deforestation(self, loss_data):
        lot = build_traced_lot(verified_exporter())
        assert lot.gps_verified and lot.deforestation_free

    def test_one_plot_with_forest_loss_fails_the_lot(self, loss_data):
        lot = build_traced_lot(verified_exporter())
        bad = lot.sources.first().plot
        DeforestationZone.objects.create(
            geometry=MultiPolygon(bad.location.buffer(0.001), srid=4326), year=2023,
        )
        bad.location = Point(bad.location.x + 0.000001, bad.location.y, srid=4326)
        bad.save()
        lot.refresh_from_db()
        assert bad.deforestation_status == "overlap"
        assert lot.deforestation_free is False
        assert lot.risks.get(code="deforestation_overlap").status == "open"

    def test_big_plot_with_only_a_point_fails_gps(self, loss_data):
        lot = build_traced_lot(verified_exporter(), plots=1)
        plot = lot.sources.first().plot
        plot.declared_area_ha = Decimal("6")
        plot.save()
        lot.refresh_from_db()
        assert lot.gps_verified is False
        assert lot.risks.get(code="polygon_required").severity == "high"

    def test_source_must_be_own_plot(self, loss_data):
        a, b = make_user("exporter"), make_user("exporter")
        lot = make_lot(a)
        foreign = Plot.objects.create(
            producer=Producer.objects.create(owner=b, name="X"),
            location=Point(38.3, 6.2, srid=4326),
        )
        r = client_for(a).post(
            reverse("lot-sources", args=[lot.pk]),
            {"plot": str(foreign.pk), "quantity_kg": "100"},
            format="json",
        )
        assert r.status_code == HTTPStatus.BAD_REQUEST

    def test_convert_legacy_lot(self, loss_data):
        exp = make_user("exporter")
        lot = make_lot(exp, boundary=BIG)
        r = client_for(exp).post(reverse("lot-sources-convert", args=[lot.pk]))
        assert r.status_code == HTTPStatus.CREATED, r.data
        lot.refresh_from_db()
        source = lot.sources.get()
        assert source.quantity_kg == lot.volume_kg
        assert source.plot.boundary is not None
        assert lot.gps_verified and lot.deforestation_free


# ── E-7/E-10: risk register, mitigation, sign-off, consent ───────────────────


class TestRiskRegister:
    def test_auto_risks(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(
            exp, consent=False, channel="ecx", volume_kg=Decimal("5000"),
        )
        codes = {r.code: r for r in dd.sync_risks(lot)}
        assert codes["no_consent"].severity == "high"
        assert codes["ecx_channel"].severity == "high"
        assert codes["untraced_volume"].severity == "high"
        assert codes["country_standard_risk"].severity == "low"

    def test_risk_resolves_when_fixed_and_reopens(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, consent=False)
        assert lot.risks.get(code="no_consent").status == "open"
        for producer in Producer.objects.filter(owner=exp):
            ProducerConsent.objects.create(
                producer=producer, purpose="eudr_sharing", method="witnessed",
            )
        assert lot.risks.get(code="no_consent").status == "resolved"

    def test_high_risk_cannot_be_accepted(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, consent=False)
        risk = lot.risks.get(code="no_consent")
        r = client_for(exp).patch(
            reverse("lot-risk-detail", args=[lot.pk, risk.pk]),
            {"status": "accepted", "justification": "x" * 30},
            format="json",
        )
        assert r.status_code == HTTPStatus.BAD_REQUEST

    def test_mitigation_then_signoff(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, channel="unknown")
        c = client_for(exp)
        # medium risk open → sign-off refused
        assert (
            c.post(
                reverse("lot-signoff", args=[lot.pk]),
                {"conclusion": "Negligible"},
                format="json",
            ).status_code
            == 400
        )
        risk = lot.risks.get(code="channel_unknown")
        r = c.patch(
            reverse("lot-risk-detail", args=[lot.pk, risk.pk]),
            {
                "status": "accepted",
                "justification": "Bought from our own washing station.",
            },
            format="json",
        )
        assert r.status_code == 200, r.data
        r = c.post(
            reverse("lot-signoff", args=[lot.pk]),
            {"conclusion": "Risk negligible."},
            format="json",
        )
        assert r.status_code == HTTPStatus.CREATED, r.data
        assert dd.current_signoff(lot) is not None

    def test_mitigated_needs_an_action(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, channel="unknown")
        risk = lot.risks.get(code="channel_unknown")
        c = client_for(exp)
        url = reverse("lot-risk-detail", args=[lot.pk, risk.pk])
        assert c.patch(url, {"status": "mitigated"}, format="json").status_code == 400
        r = c.post(
            reverse("lot-risk-mitigations", args=[lot.pk, risk.pk]),
            {
                "kind": "document",
                "notes": "Washing-station intake records",
                "mark_mitigated": "1",
            },
        )
        assert r.status_code == 201, r.data
        risk.refresh_from_db()
        assert risk.status == "mitigated"

    def test_signoff_goes_stale_when_register_changes(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp)
        assert (
            client_for(exp)
            .post(
                reverse("lot-signoff", args=[lot.pk]),
                {"conclusion": "OK"},
                format="json",
            )
            .status_code
            == 201
        )
        producer = Producer.objects.create(owner=exp, name="New")
        plot = Plot.objects.create(
            producer=producer, location=Point(38.4, 6.2, srid=4326),
        )
        LotSource.objects.create(lot=lot, plot=plot, quantity_kg=Decimal("10"))
        assert dd.current_signoff(lot) is None


# ── E-6/E-8/E-9: evidence package, importer, DDS reference, retention ───────


@pytest.fixture
def ready_lot(loss_data, tmp_path):
    FloorPrice.objects.create(
        min_price_usd_per_kg=Decimal("4.00"), valid_from=date(2026, 1, 1),
    )
    exp = verified_exporter()
    with override_settings(MEDIA_ROOT=tmp_path):
        lot = build_traced_lot(
            exp,
            phyto_cert_file=SimpleUploadedFile("p.pdf", b"%PDF-1.4"),
            nbe_fx_declaration_file=SimpleUploadedFile("n.pdf", b"%PDF-1.4"),
            ecex_permit_file=SimpleUploadedFile("e.pdf", b"%PDF-1.4"),
        )
        c = client_for(exp)
        assert (
            c.post(
                reverse("lot-signoff", args=[lot.pk]),
                {"conclusion": "Negligible risk."},
                format="json",
            ).status_code
            == 201
        )
        yield lot, exp, tmp_path


class TestEvidencePackage:
    def test_package_passes_gate_and_contains_files(self, ready_lot):
        lot, exp, tmp_path = ready_lot
        with override_settings(MEDIA_ROOT=tmp_path):
            r = client_for(exp).post(reverse("lot-evidence-packages", args=[lot.pk]))
            assert r.status_code == HTTPStatus.CREATED, r.data
            lot.refresh_from_db()
            assert lot.eudr_dds_ready is True
            resp = client_for(exp).get(
                reverse("lot-evidence-package-download", args=[lot.pk, r.data["id"]]),
            )
            blob = b"".join(resp.streaming_content)
        names = zipfile.ZipFile(io.BytesIO(blob)).namelist()
        for expected in (
            "README.txt",
            "manifest.json",
            "geolocation/plots-1.geojson",
            "producers.csv",
            "plots.csv",
            "due-diligence-summary.pdf",
            "compliance-log.csv",
        ):
            assert expected in names
        manifest = json.loads(zipfile.ZipFile(io.BytesIO(blob)).read("manifest.json"))
        assert manifest["plots"] == 2
        assert set(manifest["files"]) >= {"producers.csv", "plots.csv"}

    def test_package_refused_without_signoff(self, loss_data, tmp_path):
        exp = verified_exporter()
        lot = build_traced_lot(exp)
        with override_settings(MEDIA_ROOT=tmp_path):
            r = client_for(exp).post(reverse("lot-evidence-packages", args=[lot.pk]))
        assert r.status_code == 400
        assert "Sign off" in r.data["detail"]

    def test_package_goes_stale_when_plot_changes(self, ready_lot):
        lot, exp, tmp_path = ready_lot
        with override_settings(MEDIA_ROOT=tmp_path):
            client_for(exp).post(reverse("lot-evidence-packages", args=[lot.pk]))
            plot = lot.sources.first().plot
            plot.location = Point(38.35, 6.25, srid=4326)
            plot.save()
        lot.refresh_from_db()
        assert lot.eudr_dds_ready is False

    def test_full_export_path_with_importer(self, ready_lot):
        lot, exp, tmp_path = ready_lot
        importer = make_user("importer", company_name="Hamburg Green Coffee")
        with override_settings(MEDIA_ROOT=tmp_path):
            pkg = (
                client_for(exp)
                .post(reverse("lot-evidence-packages", args=[lot.pk]))
                .data
            )
            ic = client_for(importer)
            # No accepted offer yet → importer sees nothing
            assert (
                ic.get(reverse("lot-due-diligence", args=[lot.pk])).status_code == 404
            )
            r = ic.post(
                reverse("offer-list-create"),
                {"lot": str(lot.pk), "quantity_kg": "100", "price_per_kg_usd": "9"},
                format="json",
            )
            assert r.status_code == 201, r.data
            assert (
                client_for(exp)
                .post(
                    reverse("offer-respond", args=[r.data["id"]]),
                    {"action": "accept"},
                    format="json",
                )
                .status_code
                == 200
            )
            dd_view = ic.get(reverse("lot-due-diligence", args=[lot.pk])).data
            assert dd_view["packages"][0]["is_current"] is True
            assert (
                ic.get(
                    reverse("lot-evidence-package-download", args=[lot.pk, pkg["id"]]),
                ).status_code
                == 200
            )
            # Exporter may not record the DDS reference; the importer does.
            ref = {
                "reference_number": "25DEXXXX1234567",
                "verification_number": "ABCD1234",
            }
            assert (
                client_for(exp)
                .post(reverse("lot-dds-references", args=[lot.pk]), ref, format="json")
                .status_code
                == 403
            )
            assert (
                ic.post(
                    reverse("lot-dds-references", args=[lot.pk]), ref, format="json",
                ).status_code
                == 201
            )
            assert DdsReference.objects.get(lot=lot).recorded_by == importer
            resp = client_for(exp).patch(
                reverse("lot-status", args=[lot.pk]),
                {"status": "exported"},
                format="json",
            )
        assert resp.status_code == HTTPStatus.OK, resp.data
        lot.refresh_from_db()
        assert lot.compliance_score() == 7

    def test_lot_with_history_is_archived_not_deleted(self, ready_lot):
        lot, exp, _ = ready_lot
        assert (
            client_for(exp).delete(reverse("lot-detail", args=[lot.pk])).status_code
            == 204
        )
        lot.refresh_from_db()
        assert lot.archived_at is not None
        assert (
            client_for(exp).get(reverse("lot-detail", args=[lot.pk])).status_code == 404
        )
        csv_resp = client_for(exp).get(reverse("records-export"))
        assert lot.lot_id in csv_resp.content.decode()

    def test_importer_can_self_register(self):
        r = APIClient().post(
            reverse("register"),
            {
                "email": "imp@example.com",
                "username": "imp",
                "password": PASSWORD,
                "password2": PASSWORD,
                "role": "importer",
                "first_name": "I",
                "last_name": "M",
            },
            format="json",
        )
        assert r.status_code == HTTPStatus.CREATED, r.data
        assert User.objects.get(email="imp@example.com").role == "importer"


# ── E-4: bulk import ─────────────────────────────────────────────────────────


class TestImports:
    def test_producer_csv_dry_run_then_import(self, loss_data):
        exp = make_user("exporter")
        content = (
            b"name,external_ref,kebele,latitude,longitude,area_ha,land_tenure,consent\n"
            b"Abebe Kebede,S-1,Konga,6.2,38.3,1.5,owned,yes\n"
            b"Almaz Tesfaye,S-2,Konga,,,,,no\n"
        )
        c = client_for(exp)
        r = c.post(
            reverse("producer-import"),
            {"file": SimpleUploadedFile("p.csv", content), "dry_run": "1"},
        )
        assert (
            r.status_code == 200
            and r.data["producers_created"] == 2
            and not r.data["saved"]
        )
        assert Producer.objects.count() == 0
        r = c.post(
            reverse("producer-import"), {"file": SimpleUploadedFile("p.csv", content)},
        )
        assert r.status_code == 200 and r.data["saved"], r.data
        assert Producer.objects.count() == 2
        assert Plot.objects.count() == 1
        assert Producer.objects.get(external_ref="S-1").current_consent("eudr_sharing")

    def test_producer_csv_errors_save_nothing(self):
        exp = make_user("exporter")
        content = b"name,latitude,longitude\nA,6.2,38.3\nB,38.3,6.2\n"
        r = client_for(exp).post(
            reverse("producer-import"), {"file": SimpleUploadedFile("p.csv", content)},
        )
        assert r.status_code == 400
        assert r.data["errors"][0]["row"] == 3
        assert Producer.objects.count() == 0

    def test_geojson_plot_import(self, loss_data):
        exp = make_user("exporter")
        fc = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"ProducerName": "Kebede", "producer_ref": "K-1"},
                    "geometry": geojson(SMALL),
                },
                {
                    "type": "Feature",
                    "properties": {
                        "ProducerName": "Kebede",
                        "producer_ref": "K-1",
                        "Area": 2,
                    },
                    "geometry": {"type": "Point", "coordinates": [38.31, 6.21, 1900]},
                },
            ],
        }
        upload = SimpleUploadedFile("plots.geojson", json.dumps(fc).encode())
        r = client_for(exp).post(reverse("plot-import"), {"file": upload})
        assert r.status_code == 200, r.data
        assert r.data["plots_created"] == 2 and r.data["producers_created"] == 1
        assert Plot.objects.filter(producer__external_ref="K-1").count() == 2

    def test_kml_plot_import(self, loss_data):
        exp = make_user("exporter")
        kml = b"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<Placemark><name>Tigist</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
38.300,6.200,0 38.300,6.201,0 38.301,6.201,0 38.301,6.200,0 38.300,6.200,0
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
</Document></kml>"""
        r = client_for(exp).post(
            reverse("plot-import"), {"file": SimpleUploadedFile("farms.kml", kml)},
        )
        assert r.status_code == 200, r.data
        assert Plot.objects.get().producer.name == "Tigist"


# ── E-11 / E-13: forest baseline and trust profile ───────────────────────────


class TestBaselineAndTrust:
    def test_forest_2020_overlap_raises_medium_risk(self, loss_data):
        ForestBaseline2020.objects.create(geometry=MultiPolygon(BIG, srid=4326))
        exp = verified_exporter()
        lot = make_lot(exp)
        producer = Producer.objects.create(owner=exp, name="Forest farm")
        plot = Plot.objects.create(
            producer=producer,
            boundary=Polygon(
                (
                    (38.201, 6.151),
                    (38.201, 6.152),
                    (38.202, 6.152),
                    (38.202, 6.151),
                    (38.201, 6.151),
                ),
                srid=4326,
            ),
        )
        assert plot.forest_2020_overlap_pct == Decimal("100.00")
        LotSource.objects.create(lot=lot, plot=plot, quantity_kg=lot.volume_kg)
        assert lot.risks.get(code="plot_in_2020_forest").severity == "medium"

    def test_public_story_has_trust_profile_without_names(self, loss_data):
        lot = build_traced_lot(verified_exporter())
        data = APIClient().get(reverse("lot-story-public", args=[lot.pk])).data
        assert data["trust_profile"]["producers"] == 2
        assert data["trust_profile"]["plots_deforestation_clear"] == 2
        assert "Producer 0" not in json.dumps(data, default=str)

    def test_automatic_risk_cannot_be_resolved_by_hand(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, consent=False)
        risk = lot.risks.get(code="no_consent")
        r = client_for(exp).patch(
            reverse("lot-risk-detail", args=[lot.pk, risk.pk]),
            {"status": "resolved"},
            format="json",
        )
        assert r.status_code == 400
        assert LotRisk.objects.get(pk=risk.pk).status == "open"


# ── Public story page: verified checklist, partner settings, consent ─────────


class TestStoryPage:
    def story(self, lot):
        return APIClient().get(reverse("lot-story-public", args=[lot.pk])).data["story"]

    def test_checklist_is_computed_from_records(self, loss_data):
        lot = build_traced_lot(verified_exporter())
        items = {i["key"]: i for i in self.story(lot)["covenant"]}
        assert items["forest"]["met"] is True
        assert items["traced"]["met"] is True
        assert items["licence"]["met"] is True
        assert items["baseline"]["met"] is False  # no EU 2020 forest map loaded in this test
        assert items["paid"]["met"] is False  # no deliveries recorded

    def test_unverified_exporter_and_untraced_lot_are_not_ticked(self):
        lot = make_lot(make_user("exporter"))
        items = {i["key"]: i for i in self.story(lot)["covenant"]}
        assert not any(i["met"] for i in items.values())

    def test_payments_on_record(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, plots=1)
        plot = lot.sources.first().plot
        CherryDelivery.objects.create(owner=exp, producer=plot.producer, plot=plot, lot=lot, receipt_number="R1",
                                      delivered_on=date(2026, 1, 5), weight_kg=Decimal("500"),
                                      price_per_kg_etb=Decimal("120"), amount_paid_etb=Decimal("60000"))
        items = {i["key"]: i for i in self.story(lot)["covenant"]}
        assert items["paid"]["met"] is True
        assert "1 of 1" in items["paid"]["detail"]

    def test_grower_names_and_plots_only_with_story_consent(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, plots=2)
        r = client_for(exp).patch(reverse("lot-story-settings", args=[lot.pk]), {"show_grower_names": True},
                                  format="json")
        assert r.status_code == 200
        story = self.story(lot)
        assert story["growers"] == ""
        assert [f for f in story["map"]["features"] if f["properties"]["kind"] == "plot"] == []
        producer = Producer.objects.get(owner=exp, name="Producer 1")
        ProducerConsent.objects.create(producer=producer, purpose="story", method="witnessed")
        story = self.story(lot)
        assert story["growers"] == "Producer 1"
        assert "Producer 0" not in json.dumps(story)
        assert len([f for f in story["map"]["features"] if f["properties"]["kind"] == "plot"]) == 1

    def test_team_edits_settings_others_cannot(self, loss_data):
        exp = verified_exporter()
        lot = build_traced_lot(exp, plots=1)
        url = reverse("lot-story-settings", args=[lot.pk])
        assert client_for(make_user("buyer")).patch(url, {"partner_line": "X"}, format="json").status_code == 403
        body = {"partner_line": "Hotel × Roastery", "reference": "SKY-SID-001", "order_label": "Take Ethiopia home",
                "order_price": "$20", "statements_by": "A Roastery",
                "statements": ["Grown under native forest canopy", "  ", "Roasted with clean energy"]}
        r = client_for(exp).patch(url, body, format="json")
        assert r.status_code == 200, r.data
        assert r.data["statements"] == ["Grown under native forest canopy", "Roasted with clean energy"]
        assert client_for(exp).patch(url, {"order_url": "http://shop.example"}, format="json").status_code == 400
        story = self.story(lot)
        assert story["reference"] == "SKY-SID-001"
        assert story["order"] == {"label": "Take Ethiopia home", "detail": "", "price": "$20", "url": None}
        assert story["statements"]["by"] == "A Roastery"
        # Partner statements never become checklist items.
        assert all("canopy" not in i["text"] for i in story["covenant"])

    def test_hero_image_upload_and_removal(self, loss_data, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        exp = verified_exporter()
        lot = build_traced_lot(exp, plots=1)
        url = reverse("lot-story-settings", args=[lot.pk])
        png = SimpleUploadedFile("hero.png", b"\x89PNG\r\n\x1a\n" + b"0" * 64, content_type="image/png")
        r = client_for(exp).patch(url, {"hero_image": png}, format="multipart")
        assert r.status_code == 200, r.data
        assert "lots/photos/story/" in r.data["hero_image"]
        r = client_for(exp).patch(url, {"remove_hero": "true"}, format="multipart")
        assert r.data["hero_image"] is None
