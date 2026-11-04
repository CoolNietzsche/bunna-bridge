"""
Build a complete, realistic demo dataset by going through the real code paths
(gates are derived, DDS PDFs generated, offers accepted, etc.). Every demo
account uses an @demo.beersheba.et email so it can be removed with --reset.

    python manage.py seed_demo                       # full dataset (local / staging)
    python manage.py seed_demo --reset               # delete demo data, then rebuild
    python manage.py seed_demo --users-only --password 'YourOwnSecret'
        # just one login per role, no lots/offers/samples — the safe way to
        # get demo logins on the live site without polluting the marketplace

The default password is public (it is in this file), so always pass
--password when the accounts live anywhere reachable from the internet.
The full dataset adds fake lots to the marketplace: local/staging only.
"""
from datetime import date
from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from django.contrib.gis.geos import MultiPolygon
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import Polygon
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from bunna_bridge.lots.dds import generate_dds_pdf
from bunna_bridge.lots.deforestation import DeforestationZone
from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import ComplianceEvent
from bunna_bridge.lots.models import CuppingScore
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.models import Offer
from bunna_bridge.lots.models import SampleRequest
from bunna_bridge.lots.models import WashingStation
from bunna_bridge.market import services as market
from bunna_bridge.market.models import Article
from bunna_bridge.market.models import Bid
from bunna_bridge.market.models import SavedSearch
from bunna_bridge.market.models import SelectEntry
from bunna_bridge.market.models import SelectProgramme
from bunna_bridge.market.models import StockOrder
from bunna_bridge.market.models import WarehouseStock
from bunna_bridge.market.models import WatchItem
from bunna_bridge.roasting.models import RoastBatch
from bunna_bridge.messaging.models import SmsMessage
from bunna_bridge.quality.models import CuppingSession
from bunna_bridge.quality.models import CvaAssessment
from bunna_bridge.quality.models import PhysicalAnalysis
from bunna_bridge.quality.models import SessionGrader
from bunna_bridge.quality.models import SessionSample
from bunna_bridge.orgs.models import ComplianceDocument
from bunna_bridge.orgs.models import Invitation
from bunna_bridge.orgs.models import Membership
from bunna_bridge.orgs.models import Organization
from bunna_bridge.traceability.models import CherryDelivery
from bunna_bridge.traceability.models import DdsReference
from bunna_bridge.traceability.models import SupplyTransfer
from bunna_bridge.trade.models import Contract
from bunna_bridge.trade.models import ContractSample
from bunna_bridge.trade.models import Conversation
from bunna_bridge.trade.models import Message
from bunna_bridge.trade.models import Payment
from bunna_bridge.trade.models import ShipmentDocument
from bunna_bridge.trade.models import ShipmentEvent
from bunna_bridge.traceability.models import LotSource
from bunna_bridge.traceability.models import Plot
from bunna_bridge.traceability.models import Producer
from bunna_bridge.traceability.models import ProducerConsent
from bunna_bridge.traceability.models import RiskSignOff
from bunna_bridge.roasting.models import RoastBatchLot
from bunna_bridge.roasting.models import RoastEquipment
from bunna_bridge.users.models import Certification
from bunna_bridge.users.models import User

DOMAIN = "demo.beersheba.et"

ARTICLES = [
    ("yirgacheffe-origin-guide", "Yirgacheffe: a buyer's origin guide", "origin", "Yirgacheffe",
     "Altitude, kebeles, processing and what to expect in the cup from Gedeo's best-known coffee.",
     "Yirgacheffe is a woreda in the Gedeo zone of southern Ethiopia, and the name buyers know best. Most coffee "
     "here grows between 1,800 and 2,200 metres on small garden plots of under one hectare.\n\n"
     "## Kebeles worth knowing\n\nKochere, Gedeb, Konga, Aricha and Idido each have a recognisable profile. "
     "Washed Kochere tends towards jasmine, bergamot and lemon; Gedeb lots are often denser and sweeter.\n\n"
     "## Processing\n\nWashed coffees are fermented 36 to 72 hours and dried on raised beds. Naturals dry as "
     "whole cherry for three to four weeks and bring blueberry and strawberry notes.\n\n"
     "## Traceability\n\nBecause farms are small, one export lot may combine cherry from hundreds of "
     "producers. On Beersheba each lot lists its supply plots, so you can see the farms behind it."),
    ("harvest-update-2026-27", "Harvest update 2026/27: early picking in the south", "harvest", "",
     "Volumes, timing and early cup quality from Sidama, Gedeo and Guji as the season starts.",
     "Picking began two to three weeks early in lower Sidama after a dry September. Higher kebeles in Gedeo and "
     "Guji are on a normal schedule.\n\n## Volumes\n\nStations report cherry deliveries close to last year. "
     "Expect first washed lots at the ECX and in direct trade from January.\n\n## Prices\n\nCherry prices "
     "paid at stations are higher than last season. Check the farmers' share shown on each lot's impact score."),
    ("eudr-buying-guide", "Buying Ethiopian coffee under the EUDR", "guide", "",
     "What the EU deforestation rule asks of importers and how a Beersheba evidence package answers it.",
     "From 30 December 2026 large and medium operators placing coffee on the EU market must file a due-diligence "
     "statement showing the coffee was not grown on land deforested after 31 December 2020.\n\n"
     "## What you need from origin\n\nGeolocation of every plot (a polygon for plots over four hectares), the "
     "harvest period, the quantity and the producer's consent to share the data.\n\n"
     "## What Beersheba provides\n\nEach lot carries its plots, a forest check against the 2020 baseline, a "
     "risk assessment with sign-off and a downloadable evidence package with GeoJSON ready for TRACES."),
    ("webinar-cupping-select", "Live: cupping the Beersheba Select lots", "webinar", "",
     "Join the jury as they talk through the top lots of the season before the auction closes.",
     "The jury will cup the top-ranked Select lots live from Addis Ababa and answer buyers' questions.\n\n"
     "Sample sets are available on request to registered buyers before the session."),
]
PASSWORD = "Beersheba-Demo-2026"  # noqa: S105 — demo accounts only
ASSETS = Path(__file__).parent / "demo_assets"
DEMO_ZONE_SOURCE = "Beersheba demo zone"


def square(lng, lat, size=0.006):
    return Polygon(
        ((lng, lat), (lng, lat + size), (lng + size * 1.3, lat + size),
         (lng + size * 1.4, lat + size * 0.4), (lng + size, lat - size * 0.2), (lng, lat)),
        srid=4326,
    )


def demo_pdf(title, subtitle):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(72, 760, title)
    c.setFont("Helvetica", 11)
    c.drawString(72, 736, subtitle)
    c.drawString(72, 712, "DEMO DOCUMENT — generated by manage.py seed_demo")
    c.showPage()
    c.save()
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Create a complete demo dataset (all roles, lots, offers, samples, cupping, roasting)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing demo data first.")
        parser.add_argument("--password", default=PASSWORD,
                            help="Password for every demo account (default is public — override it on any live server).")
        parser.add_argument("--users-only", action="store_true",
                            help="Create one login per role only: no lots, offers, samples, floor prices or zones.")

    def handle(self, *args, **options):
        self.password = options["password"]
        self.users_only = options["users_only"]
        if len(self.password) < 10:
            self.stderr.write(self.style.ERROR("Use a password of at least 10 characters."))
            return
        if options["reset"]:
            self._reset()
        if User.objects.filter(email__endswith=f"@{DOMAIN}").exists():
            self.stdout.write(self.style.WARNING("Demo data already present — use --reset to rebuild."))
            return
        with transaction.atomic():
            self._create()
        self.stdout.write(self.style.SUCCESS(
            ("Demo accounts ready" if self.users_only else "Demo data ready")
            + f". Log in with any account below, password: {self.password}\n"
            + "\n".join(f"  {u.role:9} {u.email}" for u in User.objects.filter(email__endswith=f"@{DOMAIN}")
                        .order_by("role")),
        ))

    # ── reset ──────────────────────────────────────────────────────────────
    def _reset(self):
        users = User.objects.filter(email__endswith=f"@{DOMAIN}")
        lots = CoffeeLot.objects.filter(exporter__in=users)
        RoastBatch.objects.filter(roaster__in=users).delete()
        StockOrder.objects.filter(buyer__in=users).delete()
        StockOrder.objects.filter(partner__in=users).delete()
        WarehouseStock.objects.filter(partner__in=users).delete()
        SelectProgramme.objects.filter(entries__lot__in=lots).delete()
        SelectEntry.objects.filter(lot__in=lots).delete()
        Article.objects.filter(slug__in=[a[0] for a in ARTICLES]).delete()
        Bid.objects.filter(bidder__in=users).delete()
        RoastEquipment.objects.filter(roaster__in=users).delete()
        SampleRequest.objects.filter(lot__in=lots).delete()
        SampleRequest.objects.filter(buyer__in=users).delete()
        CuppingScore.objects.filter(lot__in=lots).delete()
        ComplianceEvent.objects.filter(lot__in=lots).delete()
        DdsReference.objects.filter(lot__in=lots).delete()
        Conversation.objects.filter(lot__in=lots).delete()
        CuppingSession.objects.filter(owner__in=users).delete()
        CvaAssessment.objects.filter(lot__in=lots).delete()
        CvaAssessment.objects.filter(grader__in=users).delete()
        PhysicalAnalysis.objects.filter(lot__in=lots).delete()
        for contract in Contract.objects.filter(lot__in=lots):
            contract.payments.all().delete()
            for shipment in contract.shipments.all():
                shipment.delete()
            contract.delete()
        SupplyTransfer.objects.filter(seller__in=users).delete()
        SupplyTransfer.objects.filter(buyer__in=users).delete()
        SmsMessage.objects.filter(producer__owner__in=users).delete()
        CherryDelivery.objects.filter(owner__in=users).delete()
        LotSource.objects.filter(lot__in=lots).delete()
        Offer.objects.filter(lot__in=lots).delete()
        lots.delete()
        Plot.objects.filter(producer__owner__in=users).delete()
        Producer.objects.filter(owner__in=users).delete()
        Notification.objects.filter(recipient__in=users).delete()
        DeforestationZone.objects.filter(source=DEMO_ZONE_SOURCE).delete()
        FloorPrice.objects.filter(source__startswith="Demo").delete()
        orgs = Organization.objects.filter(memberships__user__in=users).distinct()
        count = users.count()
        org_ids = list(orgs.values_list("pk", flat=True))
        users.delete()
        Organization.objects.filter(pk__in=org_ids).delete()
        self.stdout.write(f"Removed {count} demo users and their data.")

    # ── helpers ────────────────────────────────────────────────────────────
    def _user(self, key, role, first, last, **extra):
        user = User.objects.create_user(
            username=f"{key}-demo", email=f"{key}@{DOMAIN}", password=self.password,
            role=role, first_name=first, last_name=last, country=extra.pop("country", "Ethiopia"), **extra,
        )
        return user

    def _photo(self, lot, name):
        path = default_storage.save(f"lots/photos/{lot.lot_id}/{name}", ContentFile((ASSETS / name).read_bytes()))
        return default_storage.url(path)

    def _generate_dds(self, lot, actor):
        lot.refresh_from_db()
        lot.eudr_dds_file.save(f"EUDR-DDS-{lot.lot_id}.pdf", ContentFile(generate_dds_pdf(lot)), save=False)
        lot.eudr_dds_generated_at = timezone.now()
        lot.save(actor=actor)

    def _trace(self, lot, owner, plots, consent=True):
        """Register producers + plots and link them to the lot as supply sources.

        `plots`: list of (name, ref, kebele, geometry, declared_ha, kg)."""
        for name, ref, kebele, geom, declared, kg in plots:
            producer = Producer.objects.filter(owner=owner, external_ref=ref).first() or Producer.objects.create(
                owner=owner, external_ref=ref, name=name, kebele=kebele, region=lot.get_region_display(),
                cooperative=lot.washing_station, created_by=owner,
            )
            if consent and not producer.current_consent("eudr_sharing"):
                ProducerConsent.objects.create(producer=producer, purpose="eudr_sharing", method="witnessed",
                                               captured_by=owner)
            is_polygon = isinstance(geom, Polygon)
            plot = Plot.objects.create(
                producer=producer, name=f"{name.split()[0]}'s plot", boundary=geom if is_polygon else None,
                location=None if is_polygon else geom, declared_area_ha=Decimal(declared), land_tenure="owned",
                created_by=owner,
            )
            LotSource.objects.create(lot=lot, plot=plot, quantity_kg=Decimal(kg),
                                     delivery_reference=f"WS-{ref}", created_by=owner)
        lot.refresh_from_db()
        return lot

    def _sign_and_package(self, lot, owner, package=True):
        from bunna_bridge.traceability import due_diligence as dd
        from bunna_bridge.traceability.package import build_package

        dd.sync_risks(lot)
        for risk in lot.risks.filter(status="open").exclude(severity="high").exclude(code="country_standard_risk"):
            risk.status = "accepted"
            risk.justification = "Reviewed by the export manager: supplier records on file at the washing station."
            risk.save()
        RiskSignOff.objects.create(
            lot=lot, signed_by=owner, register_fingerprint=dd.register_fingerprint(lot),
            conclusion="Risk of non-compliance is negligible: every plot is mapped, clear of post-2020 "
                       "forest loss and covered by producer consent.",
        )
        if package:
            build_package(lot, owner)
        lot.save(actor=owner)
        lot.refresh_from_db()
        return lot

    def _phase2(self, exporter, farmers, kochere, today):
        """Teams, ECTA compliance documents, cherry intake with payments, and a cooperative sale."""
        org = exporter.membership.organization
        # Teammates join through invitations, as they would in the app.
        for key, first, last, role in [
            ("sales", "Hanna", "Tadesse", Membership.Role.SALES),
            ("agent", "Bekele", "Girma", Membership.Role.FIELD_AGENT),
        ]:
            mate = User(username=f"{key}-demo", email=f"{key}@{DOMAIN}", role="exporter", first_name=first,
                        last_name=last, company_name=org.name, country="Ethiopia")
            mate.set_password(self.password)
            mate._skip_org_creation = True  # noqa: SLF001
            mate.save()
            Membership.objects.create(organization=org, user=mate, role=role)
        Invitation.objects.create(organization=org, email=f"logistics@{DOMAIN}", role=Membership.Role.LOGISTICS,
                                  invited_by=exporter)
        # ECTA Directive 1106/2025 documents: two verified, the taster awaiting review.
        for kind, extra, verified in [
            ("lab_certificate", {"holder_name": "Highland Exports QC laboratory", "number": "ECTA-LAB-0412"}, True),
            ("capital_attestation", {"amount_birr": Decimal("15000000"), "number": "AUD-2026-118"}, True),
            ("taster_certificate", {"holder_name": "Tigist Bekele", "number": "ECTA-TST-2291"}, False),
        ]:
            doc = ComplianceDocument(organization=org, kind=kind, uploaded_by=exporter,
                                     issued_on=today - timedelta(days=200), expires_on=today + timedelta(days=500),
                                     verified_at=timezone.now() if verified else None, **extra)
            doc.file.save(f"{kind}.pdf", demo_pdf(kind.replace("_", " ").title(), org.name), save=False)
            doc.save()
        # Farmer Abebe has a login: link it so he can see his deliveries and payments.
        abebe = Producer.objects.get(owner=exporter, external_ref="KOC-001")
        abebe.user = farmers["farmer"]
        abebe.phone = "0911234567"
        abebe.save()
        station = kochere.washing_station_facility
        for i, (ref, kg, paid) in enumerate([("KOC-001", "420", True), ("KOC-002", "310", True), ("KOC-003", "260", False),
                                             ("KOC-004", "390", False), ("KOC-001", "150", False)], start=1):
            producer = Producer.objects.get(owner=exporter, external_ref=ref)
            CherryDelivery.objects.create(
                owner=exporter, station=station, producer=producer, plot=producer.plots.first(), form="cherry",
                receipt_number=f"KWS-26-{i:04d}", delivered_on=today - timedelta(days=12 - i),
                weight_kg=Decimal(kg), price_per_kg_etb=Decimal("118.00"),
                amount_paid_etb=(Decimal(kg) * Decimal("118.00")) if paid else None,
                paid_on=(today - timedelta(days=10 - i)) if paid else None,
                payment_reference=f"TB{9310 + i}" if paid else "", recorded_by=exporter,
            )
        # A cooperative union with members, deliveries and an open sale to the exporter.
        coop = self._user("cooperative", "cooperative", "Desta", "Lemma", company_name="Sidama Highlands Union",
                          phone="+251 916 000 222")
        coop_deliveries = []
        for n, (name, lng, lat) in enumerate([("Worku Abate", 38.452, 6.861), ("Meseret Dagne", 38.461, 6.866),
                                               ("Tsegaye Bulcha", 38.447, 6.874)], start=1):
            member = Producer.objects.create(owner=coop, external_ref=f"SHU-{n:03d}", name=name, kebele="Bensa",
                                             woreda="Bensa", region="Sidama", phone=f"09160000{n:02d}",
                                             language="am" if n != 2 else "om", created_by=coop)
            ProducerConsent.objects.create(producer=member, purpose="eudr_sharing", method="witnessed", captured_by=coop)
            plot = Plot.objects.create(producer=member, name="Home garden", location=Point(lng, lat, srid=4326),
                                       declared_area_ha=Decimal("1.4"), land_tenure="owned", created_by=coop)
            coop_deliveries.append(CherryDelivery.objects.create(
                owner=coop, producer=member, plot=plot, form="parchment", receipt_number=f"SHU-26-{n:04d}",
                delivered_on=today - timedelta(days=6), weight_kg=Decimal("600"), price_per_kg_etb=Decimal("310"),
                amount_paid_etb=Decimal("186000"), paid_on=today - timedelta(days=5), payment_reference=f"CBE-77{n}",
                recorded_by=coop,
            ))
        sale = SupplyTransfer.objects.create(seller=coop, buyer=exporter, reference="SHU-2026-007", form="parchment",
                                             quantity_kg=Decimal("1800"), price_per_kg_etb=Decimal("335"),
                                             notes="Washed Bensa parchment, 11.5% moisture.", created_by=coop)
        sale.deliveries.set(coop_deliveries)

    def _phase3(self, exporter, buyer, harrar, bensa, kochere, today):
        """Contracts at different stages, a shipment at sea with a forwarder, payments and a conversation."""
        from datetime import datetime

        from bunna_bridge.trade import services as trade

        FloorPrice.objects.create(region="yirgacheffe", grade="G1", processing="washed",
                                  min_price_usd_per_kg=Decimal("5.60"), valid_from=date(2026, 9, 1),
                                  source="Demo floor — Yirgacheffe G1 washed")
        forwarder = self._user("forwarder", "forwarder", "Ahmed", "Ali", company_name="Red Sea Freight Logistics",
                               phone="+251 911 555 010")
        importer = User.objects.get(email=f"importer@{DOMAIN}")
        sales = User.objects.get(email=f"sales@{DOMAIN}")

        # Harrar: signed, registered, PSS approved, shipped and at sea, 30% advance received and converted.
        c = Contract.objects.get(lot=harrar, buyer=importer)
        c.shipment_from, c.shipment_to = today - timedelta(days=20), today + timedelta(days=10)
        c.payment_terms, c.advance_percent, c.destination = "advance_cad", Decimal("30"), "Hamburg"
        c.save()
        trade.send_for_signature(exporter, c)
        trade.buyer_sign(importer, c, c.terms_hash)
        trade.register_with_ecta(exporter, c, "ECTA/CR/2026/04117", today - timedelta(days=18))
        ContractSample.objects.create(contract=c, kind="pss", status="approved", sent_on=today - timedelta(days=16),
                                      courier="DHL", tracking_number="DHL 4471 0092", cup_score=Decimal("86.25"),
                                      moisture_pct=Decimal("10.8"), buyer_notes="Clean, blueberry and cacao — approved.",
                                      created_by=exporter, decided_by=importer, decided_at=timezone.now())
        shipment = trade.create_shipment(exporter, c, {
            "forwarder": forwarder, "booking_number": "MAEU 2611874", "container_number": "MSKU 7134220",
            "seal_number": "ML-ET 448120", "shipping_line": "Maersk", "vessel": "Maersk Gironde", "voyage": "247N",
            "port_of_discharge": "Hamburg", "bags": c.bags, "net_weight_kg": c.quantity_kg,
            "etd": today - timedelta(days=4), "eta": today + timedelta(days=17),
        })
        for doc in shipment.documents.all():
            if doc.kind in ("ecta_quality", "phyto", "origin", "ico_marks", "invoice", "packing", "customs", "bl"):
                doc.file.save(f"{doc.kind}.pdf", demo_pdf(doc.get_kind_display(), c.number), save=False)
                doc.status = "approved" if doc.kind in ("phyto", "origin", "invoice") else "uploaded"
                doc.number = f"{doc.kind.upper()}-{c.number[-4:]}"
                doc.uploaded_by = forwarder if doc.responsible == "forwarder" else exporter
                doc.uploaded_at = timezone.now()
                doc.save()
        for days, kind, place in [(12, "booked", "Addis Ababa"), (9, "stuffed", "Highland warehouse, Addis Ababa"),
                                  (8, "trucked", "Modjo dry port"), (6, "at_port", "Djibouti"),
                                  (5, "customs", "Djibouti"), (4, "loaded", "Djibouti"), (4, "departed", "Djibouti")]:
            ShipmentEvent.objects.create(shipment=shipment, kind=kind, location=place, recorded_by=forwarder,
                                         happened_at=timezone.make_aware(datetime.combine(today - timedelta(days=days),
                                                                                          datetime.min.time().replace(hour=10))))
        c.status = "shipped"
        c.save()
        Payment.objects.create(contract=c, kind="advance", amount_usd=(c.value_usd * Decimal("0.30")).quantize(Decimal("0.01")),
                               received_on=today - timedelta(days=15), bank="Commercial Bank of Ethiopia",
                               reference="SWIFT 26CBE88412",
                               converted_usd=(c.value_usd * Decimal("0.15")).quantize(Decimal("0.01")),
                               rate_etb_per_usd=Decimal("154.80"), converted_on=today - timedelta(days=14),
                               recorded_by=exporter)

        # Bensa: terms agreed by the exporter, waiting for the buyer's countersignature.
        b = Contract.objects.get(lot=bensa, buyer=buyer)
        b.shipment_from, b.shipment_to = today + timedelta(days=45), today + timedelta(days=75)
        b.payment_terms, b.destination = "cad", "Gothenburg"
        b.save()
        trade.send_for_signature(sales, b)

        # A buyer asking the exporter about Kochere.
        conv = Conversation.objects.create(lot=kochere, buyer=buyer)
        for sender, body in [
            (buyer, "Hi Dawit — could you ship 600 kg of Kochere in March, and send a type sample first?"),
            (sales, "Hello Sarah, yes. March loading from Djibouti works. Type sample goes out with DHL on Monday."),
            (buyer, "Perfect. We will make an offer once we have cupped it."),
        ]:
            Message.objects.create(conversation=conv, sender=sender, body=body)
        conv.last_message_at = timezone.now()
        conv.save()

    def _phase4(self, exporter, grader, kochere, hambela, bensa, harrar, today):
        """Lab analysis, a confirmed CVA, a revealed calibration session and an open one."""
        from bunna_bridge.quality.services import apply_to_lot

        PhysicalAnalysis.objects.create(
            lot=kochere, analysed_by=exporter, analysed_on=today - timedelta(days=9), lab="Highland Exports QC lab",
            moisture_pct=Decimal("10.6"), water_activity=Decimal("0.54"), density_g_l=Decimal("742"),
            screens={"20": 6, "19": 22, "18": 38, "17": 21, "16": 10, "15": 3},
            defects={"partial_black": 2, "broken": 7, "immature": 4, "slight_insect": 6}, ecta_grade="G1",
            ecta_certificate="ECTA-LQ-26-08812", odour="Clean", color="Bluish green",
        )
        PhysicalAnalysis.objects.create(
            lot=harrar, analysed_by=exporter, analysed_on=today - timedelta(days=21), lab="Highland Exports QC lab",
            moisture_pct=Decimal("11.4"), water_activity=Decimal("0.61"), density_g_l=Decimal("705"),
            screens={"20": 4, "19": 15, "18": 34, "17": 27, "16": 15, "15": 5},
            defects={"full_sour": 1, "broken": 12, "shell": 6, "immature": 5}, ecta_grade="G1",
        )
        cva = CvaAssessment.objects.create(
            grader=grader, lot=kochere, assessed_on=today - timedelta(days=7), status="confirmed",
            fragrance=7, aroma=7, flavor=7, aftertaste=6, acidity=7, sweetness=6, mouthfeel=6, overall=7,
            intensities={"acidity": 10, "sweetness": 9, "mouthfeel": 7}, flavor_categories=["floral", "citrus", "berry"],
            main_acid="citric", mouthfeel_type="silky", descriptors="jasmine, bergamot, peach, black tea",
        )
        apply_to_lot(kochere, cva.score, grader.get_full_name(), cva.assessed_on, cva.descriptors, actor=grader)

        panel = [grader] + [
            self._user(f"qgrader{n}", "qgrader", first, last, company_name="Licensed Q Arabica Grader")
            for n, (first, last) in [(2, ("Mekdes", "Assefa")), (3, ("Lars", "Holm"))]
        ]
        revealed = CuppingSession.objects.create(owner=exporter, name="Harvest calibration — Gedeo & Guji",
                                                 held_on=today - timedelta(days=5), location="Highland QC lab, Addis",
                                                 blind=True, status="revealed")
        cups = [(kochere, None), (hambela, None), (bensa, None), (None, "Guji Uraga offer sample")]
        base = [[7, 7, 6, 6], [7, 7, 6, 6], [6, 7, 6, 5]]  # grader × cup baseline liking
        for g in panel:
            SessionGrader.objects.create(session=revealed, user=g)
        for j, (lot, label) in enumerate(cups, start=1):
            ss = SessionSample.objects.create(session=revealed, code=str(300 + j * 47), position=j, lot=lot,
                                              label=label or "")
            for i, g in enumerate(panel):
                lvl = base[i][j - 1]
                CvaAssessment.objects.create(
                    grader=g, lot=lot, session_sample=ss, assessed_on=revealed.held_on, status="submitted",
                    fragrance=lvl, aroma=lvl, flavor=lvl, aftertaste=max(lvl - 1, 1), acidity=lvl, sweetness=lvl,
                    mouthfeel=max(lvl - 1, 1), overall=lvl,
                    descriptors=["jasmine, lemon", "blueberry, cacao", "apricot, honey", "strawberry, winey"][j - 1],
                )
        open_session = CuppingSession.objects.create(owner=exporter, name="Pre-shipment check — Harrar & Kochere",
                                                     held_on=today, location="Highland QC lab, Addis", blind=True)
        SessionGrader.objects.create(session=open_session, user=grader)
        for j, lot in enumerate([harrar, kochere], start=1):
            SessionSample.objects.create(session=open_session, code=str(510 + j * 33), position=j, lot=lot)

    def _phase5(self, admin, exporter, buyer, importer, kochere, hambela, bensa, harrar, kaffa, today):
        """Select auction live, EU stock with an order, availability states, saved search, articles, genders."""
        now = timezone.now()
        # Producer gender (optional; feeds the women-producers criterion of the impact score).
        for i, producer in enumerate(Producer.objects.filter(owner=exporter).order_by("external_ref", "name")):
            producer.gender = ["female", "male", "female", "male", "undisclosed"][i % 5]
            producer.save(update_fields=["gender"])

        # Availability states (M-2).
        CoffeeLot.objects.filter(pk=bensa.pk).update(availability="forward", expected_ready=today + timedelta(days=75))
        CoffeeLot.objects.filter(pk=kaffa.pk).update(availability="afloat", expected_ready=today + timedelta(days=18))

        # Beersheba Select with the auction live (M-1).
        jury = CuppingSession.objects.filter(owner=exporter, status="revealed").first()
        programme = SelectProgramme.objects.create(
            name="Beersheba Select", season="2026/27", status="auction", nominations_close=today - timedelta(days=21),
            min_jury_score=Decimal("86.00"), jury_session=jury, auction_starts=now - timedelta(hours=20),
            auction_ends=now + timedelta(days=2), description=(
                "The season's top washed and natural lots from Gedeo and Guji, cupped blind by a three-grader jury. "
                "Every lot is traced to the farm with an EUDR evidence package."),
        )
        top = SelectEntry.objects.create(programme=programme, lot=kochere, nominated_by=exporter, status="selected",
                                         jury_score=Decimal("88.19"), rank=1, quantity_kg=Decimal("600"),
                                         starting_price_usd=Decimal("7.50"), reserve_price_usd=Decimal("8.00"),
                                         closes_at=programme.auction_ends)
        second = SelectEntry.objects.create(programme=programme, lot=hambela, nominated_by=exporter, status="selected",
                                            jury_score=Decimal("87.06"), rank=2, quantity_kg=Decimal("300"),
                                            starting_price_usd=Decimal("7.00"), closes_at=programme.auction_ends)
        SelectEntry.objects.create(programme=programme, lot=bensa, nominated_by=exporter, status="not_selected",
                                   jury_score=Decimal("84.31"), quantity_kg=Decimal("300"),
                                   starting_price_usd=Decimal("6.50"))
        market.place_bid(buyer, top.pk, Decimal("7.50"))
        market.place_bid(importer, top.pk, Decimal("7.80"))
        market.place_bid(buyer, top.pk, Decimal("8.10"))
        market.place_bid(importer, second.pk, Decimal("7.00"))

        # EU stock held by the importer on the Harrar lot it bought (M-3), and an order from the buyer.
        dds = DdsReference.objects.filter(lot=harrar).first()
        stock = WarehouseStock.objects.create(
            lot=harrar, partner=importer, warehouse="hamburg", warehouse_name="Hamburg Freeport, Schuppen 52",
            bag_kg=Decimal("30"), bags_total=20, bags_available=20, price_eur_per_kg=Decimal("12.80"), min_bags=1,
            landed_on=today - timedelta(days=12), dds_reference=dds.reference_number if dds else "",
        )
        CoffeeLot.objects.filter(pk=harrar.pk).update(availability="eu_stock")
        order = market.place_order(buyer, [(str(stock.pk), 4)], "Nordic Green Imports AB, Frihamnen 12, Stockholm")
        market.update_order(importer, order, "confirm")

        # Watchlist and a saved search with alerts (M-4).
        WatchItem.objects.get_or_create(user=buyer, lot=hambela)
        SavedSearch.objects.create(user=buyer, name="Washed Yirgacheffe 86+",
                                   filters={"origin": "yirgacheffe", "process": "washed", "minScore": 86})
        SavedSearch.objects.create(user=importer, name="EUDR-ready naturals", alert=False,
                                   filters={"process": "natural", "compliance": "eudr"})

        # Education hub (M-7).
        for i, (slug, title, kind, region, summary, body) in enumerate(ARTICLES):
            Article.objects.create(slug=slug, title=title, kind=kind, region=region, summary=summary, body=body,
                                   author=admin, published_at=now - timedelta(days=3 + 9 * i),
                                   event_at=now + timedelta(days=16) if kind == "webinar" else None)

    def _cup(self, lot, grader, base, confirm=True, notes=""):
        b = Decimal(str(base))
        score = CuppingScore.objects.create(
            lot=lot, grader=grader,
            fragrance_aroma=b + Decimal("0.25"), flavor=b + Decimal("0.25"), aftertaste=b, acidity=b + Decimal("0.25"),
            body=b, balance=b, uniformity=Decimal("10"), clean_cup=Decimal("10"), sweetness=Decimal("10"),
            overall=b + Decimal("0.25"), flavor_notes=notes, cupping_date=date(2026, 9, 18),
            cupping_location="Beersheba cupping lab, Addis Ababa",
        )
        if confirm:
            score.status = "confirmed"
            score.save()
        return score

    # ── dataset ────────────────────────────────────────────────────────────
    def _create_accounts_only(self):
        """One login per role with realistic profiles; nothing else is created."""
        # Platform-admin role only — deliberately NOT Django staff/superuser,
        # so a shared demo password can never open /admin/.
        self._user("admin", "admin", "Meron", "Alemu", company_name="Beersheba")
        self._user("exporter", "exporter", "Dawit", "Haile", company_name="Highland Exports PLC (demo)",
                   bio="Demo exporter account.")
        self._user("buyer", "buyer", "Sarah", "Lindqvist", company_name="Nordic Green Imports AB (demo)",
                   country="Sweden")
        self._user("importer", "importer", "Jonas", "Weber", company_name="Hamburg Green Coffee GmbH (demo)",
                   country="Germany")
        self._user("roaster", "roaster", "Yonas", "Tesfaye", company_name="Addis Micro Roastery (demo)",
                   roastery_type="micro", roastery_monthly_capacity_kg=400)
        self._user("farmer", "farmer", "Abebe", "Worku", farm_name="Kochere Ridge Farm (demo)",
                   farm_region="Yirgacheffe", farm_kebele="Kochere", cooperative="Kochere Farmers Coop",
                   farm_altitude_m=1950, farm_size_ha=Decimal("3.20"))
        self._user("qgrader", "qgrader", "Tigist", "Bekele", company_name="Licensed Q Arabica Grader (demo)")
        self._user("cooperative", "cooperative", "Desta", "Lemma", company_name="Sidama Highlands Union (demo)")

    def _create(self):
        today = timezone.localdate()
        if self.users_only:
            self._create_accounts_only()
            return

        FloorPrice.objects.create(min_price_usd_per_kg=Decimal("4.20"), valid_from=date(2026, 1, 1),
                                  source="Demo floor — replace with the current ECTA minimum")
        FloorPrice.objects.create(grade="G1", processing="washed", min_price_usd_per_kg=Decimal("5.10"),
                                  valid_from=date(2026, 1, 1), source="Demo floor — G1 washed")
        # A forest-loss patch that the Limu demo farm overlaps.
        DeforestationZone.objects.create(
            geometry=MultiPolygon(square(36.505, 7.605, 0.01), srid=4326), year=2022,
            region="Ethiopia", area_ha=110.0, source=DEMO_ZONE_SOURCE,
        )

        admin = self._user("admin", "admin", "Meron", "Alemu", is_staff=True, is_superuser=True,
                           company_name="Beersheba")
        exporter = self._user("exporter", "exporter", "Dawit", "Haile", company_name="Highland Exports PLC",
                              phone="+251 911 000 111",
                              bio="Family exporter sourcing washed and natural lots from Gedeo, Guji and Sidama since 2009.")
        exporter.ecta_license_number = "ECTA/EXP/2026/0412"
        exporter.ecta_license_expiry = today + timedelta(days=240)
        exporter.ecta_license_file.save("ecta-license.pdf", demo_pdf("ECTA Export License", "Highland Exports PLC"),
                                        save=False)
        exporter.save()
        exporter.ecta_license_verified_at = timezone.now()
        exporter.is_verified = True
        exporter.save()

        exporter2 = self._user("exporter2", "exporter", "Selam", "Getachew", company_name="Kaffa Forest Coffee",
                               bio="New exporter working with forest-garden producers in Kaffa and Bench Maji.")
        exporter2.ecta_license_number = "ECTA/EXP/2026/0977"
        exporter2.ecta_license_expiry = today + timedelta(days=300)
        exporter2.ecta_license_file.save("ecta-license.pdf", demo_pdf("ECTA Export License", "Kaffa Forest Coffee"),
                                         save=False)
        exporter2.save()  # uploaded, awaiting verification

        buyer = self._user("buyer", "buyer", "Sarah", "Lindqvist", company_name="Nordic Green Imports AB",
                           country="Sweden")
        importer = self._user("importer", "importer", "Jonas", "Weber", company_name="Hamburg Green Coffee GmbH",
                              country="Germany",
                              bio="EU operator: imports Ethiopian green coffee and files the EUDR due diligence "
                                  "statement in the EU Information System.")
        roaster = self._user("roaster", "roaster", "Yonas", "Tesfaye", company_name="Addis Micro Roastery",
                             roastery_type="micro", roastery_monthly_capacity_kg=400,
                             roastery_roast_styles="light, medium", roastery_preferred_origins="Yirgacheffe, Guji",
                             roastery_established_year=2019)
        grader = self._user("qgrader", "qgrader", "Tigist", "Bekele", company_name="Licensed Q Arabica Grader")

        farmers = {}
        for key, first, last, farm, region, kebele, coop, lng, lat, alt, size in [
            ("farmer", "Abebe", "Worku", "Kochere Ridge Farm", "Yirgacheffe", "Kochere", "Kochere Farmers Coop",
             38.215, 6.324, 1950, "3.20"),
            ("farmer2", "Almaz", "Tadesse", "Hambela Highlands", "Guji", "Hambela Wamena", "Hambela Coop",
             38.62, 5.82, 2150, "2.40"),
            ("farmer3", "Kebede", "Mamo", "Bensa Garden Plot", "Sidama", "Bensa", "Bensa Union",
             38.45, 6.87, 1820, "1.80"),
        ]:
            farmers[key] = self._user(
                key, "farmer", first, last, farm_name=farm, farm_region=region, farm_kebele=kebele,
                cooperative=coop, farm_altitude_m=alt, farm_size_ha=Decimal(size),
                gps_lat=Decimal(str(lat)), gps_lng=Decimal(str(lng)), boundary=square(lng, lat),
            )

        Certification.objects.create(holder=exporter, cert_type="organic", issuing_body="CERES GmbH",
                                     cert_number="ORG-ET-22871", issue_date=date(2025, 3, 1),
                                     expiry_date=today + timedelta(days=420))
        Certification.objects.create(holder=exporter, cert_type="fair_trade", issuing_body="FLOCERT",
                                     cert_number="FT-40912", issue_date=date(2024, 6, 1),
                                     expiry_date=today + timedelta(days=21))
        Certification.objects.create(holder=roaster, cert_type="haccp", issuing_body="Ethiopian Conformity Assessment",
                                     cert_number="HACCP-1182", expiry_date=today + timedelta(days=300))

        kochere_ws = WashingStation.objects.create(owner=exporter, name="Kochere Washing Station",
                                                   region="yirgacheffe", location="Kochere, Gedeo zone",
                                                   capacity_kg_per_day=9000)
        hambela_ws = WashingStation.objects.create(owner=exporter, name="Hambela Dry Mill", region="guji",
                                                   location="Hambela Wamena", capacity_kg_per_day=6000)

        def lot(owner, **kw):
            photos = kw.pop("photos", [])
            docs = kw.pop("docs", ())
            obj = CoffeeLot(exporter=owner, **kw)
            for field in docs:
                getattr(obj, field).save(f"{field}.pdf", demo_pdf(field.replace("_", " ").title(), kw["name"]),
                                         save=False)
            obj.save(actor=owner)
            if photos:
                obj.farm_photos = [self._photo(obj, p) for p in photos]
                obj.save(update_fields=["farm_photos"])
            return obj

        all_docs = ("phyto_cert_file", "nbe_fx_declaration_file", "ecex_permit_file", "customs_declaration_file")

        kochere = lot(
            exporter, lot_id="YRG-2026-0847", name="Kochere Washed G1", status="listed", farmer=farmers["farmer"],
            region="yirgacheffe", kebele="Kochere", washing_station_facility=kochere_ws, altitude_m=1950,
            processing="washed", grade="G1", harvest_date=date(2026, 1, 10), boundary=farmers["farmer"].boundary,
            volume_kg=Decimal("3200"), price_per_kg=Decimal("6.42"), fob_price_usd=Decimal("6.4200"),
            min_order_kg=Decimal("60"), delivery_window="Mar–Apr 2027", flavor_tags=["Jasmine", "Bergamot", "Lemon"],
            tasting_notes="Floral and tea-like, with a clean bergamot finish and lingering stone-fruit sweetness.",
            farm_story="Abebe's family has tended this ridge above Kochere for three generations. Cherries are "
                       "hand-sorted at dawn and delivered to the Kochere station within hours of picking.",
            phyto_cert_expiry=today + timedelta(days=120), ecex_permit_number="ECEX-26-11873",
            ecex_permit_expiry=today + timedelta(days=90), customs_declaration_id="ERCA-0026-7721",
            docs=all_docs, photos=["origin-yirgacheffe.webp", "cupping-detail.webp", "cta-band.webp"],
        )
        self._cup(kochere, grader, "8.00", notes="Jasmine, bergamot, lemon zest, peach")
        # Kochere blends six smallholders delivering cherry to the station.
        kochere.channel = "vertical"
        kochere.save(actor=exporter)
        self._trace(kochere, exporter, [
            ("Abebe Worku", "KOC-001", "Kochere", farmers["farmer"].boundary, "3.20", "900"),
            ("Mulu Gebre", "KOC-002", "Kochere", Point(38.2231, 6.3312, srid=4326), "1.10", "420"),
            ("Tesfaye Alemu", "KOC-003", "Kochere", Point(38.2205, 6.3378, srid=4326), "0.90", "380"),
            ("Hirut Desta", "KOC-004", "Kochere", Point(38.2289, 6.3294, srid=4326), "1.60", "560"),
            ("Bekele Shiferaw", "KOC-005", "Banko Gotiti", Point(38.2102, 6.3420, srid=4326), "2.30", "510"),
            ("Etenesh Dukale", "KOC-006", "Banko Gotiti", Point(38.2153, 6.3466, srid=4326), "1.20", "430"),
        ])
        self._sign_and_package(kochere, exporter)
        self._generate_dds(kochere, exporter)

        hambela = lot(
            exporter, lot_id="GUJ-2026-0311", name="Hambela Natural G1", status="listed", farmer=farmers["farmer2"],
            region="guji", kebele="Hambela Wamena", washing_station_facility=hambela_ws, altitude_m=2150,
            processing="natural", grade="G1", harvest_date=date(2026, 1, 22), boundary=farmers["farmer2"].boundary,
            volume_kg=Decimal("1800"), price_per_kg=Decimal("6.90"), fob_price_usd=Decimal("6.9000"),
            delivery_window="Apr 2027", flavor_tags=["Blueberry", "Cacao", "Red wine"],
            tasting_notes="Jammy blueberry and cacao nib, syrupy body, winey acidity.",
            farm_story="Grown at 2,150 m under native shade trees and dried on raised beds for 21 days.",
            docs=("ecex_permit_file",), photos=["origin-guji.webp"],
        )
        self._cup(hambela, grader, "7.75", notes="Blueberry, cacao, red wine")
        self._cup(hambela, grader, "7.75", confirm=False, notes="Second cupping — awaiting confirmation")
        # Hambela: plots mapped, but one producer has not yet given data-sharing consent.
        hambela.channel = "vertical"
        hambela.save(actor=exporter)
        self._trace(hambela, exporter, [
            ("Almaz Tadesse", "HAM-001", "Hambela Wamena", farmers["farmer2"].boundary, "2.40", "1100"),
        ])
        self._trace(hambela, exporter, [
            ("Gemechu Dida", "HAM-002", "Hambela Wamena", Point(38.6304, 5.8311, srid=4326), "1.40", "700"),
        ], consent=False)

        bensa = lot(
            exporter, lot_id="SDM-2026-0213", name="Bensa Honey G2", status="listed", farmer=farmers["farmer3"],
            region="sidama", kebele="Bensa", altitude_m=1820, processing="honey", grade="G2",
            harvest_date=date(2025, 12, 5), boundary=farmers["farmer3"].boundary, volume_kg=Decimal("2400"),
            price_per_kg=Decimal("5.60"), fob_price_usd=Decimal("5.6000"), flavor_tags=["Apricot", "Honey", "Black tea"],
            tasting_notes="Honeyed apricot and black tea with a round, sweet body.",
            phyto_cert_expiry=today + timedelta(days=60), docs=all_docs, photos=["origin-sidama.webp"],
        )
        self._cup(bensa, grader, "7.50", notes="Apricot, honey, black tea")
        # Bensa: union lot, mapped and consented — risk assessment not signed yet.
        bensa.channel = "union"
        bensa.save(actor=exporter)
        self._trace(bensa, exporter, [
            ("Kebede Mamo", "BEN-001", "Bensa", farmers["farmer3"].boundary, "1.80", "1300"),
            ("Aster Hailu", "BEN-002", "Bensa", Point(38.4622, 6.8811, srid=4326), "1.50", "1100"),
        ])
        self._generate_dds(bensa, exporter)

        harrar = lot(
            exporter, lot_id="HAR-2025-0098", name="Harrar Longberry Natural", status="listed", region="harrar",
            kebele="Gara Muleta", altitude_m=2000, processing="natural", grade="G1", harvest_date=date(2025, 11, 2),
            boundary=square(41.87, 9.28), volume_kg=Decimal("1200"), price_per_kg=Decimal("7.10"),
            fob_price_usd=Decimal("7.1000"), flavor_tags=["Blueberry", "Spice", "Dark chocolate"],
            phyto_cert_expiry=today + timedelta(days=45), docs=all_docs, photos=["origin-harrar.webp"],
        )
        self._cup(harrar, grader, "7.75", notes="Blueberry, cardamom, dark chocolate")
        # Harrar: a single estate, fully through due diligence.
        harrar.channel = "direct"
        harrar.save(actor=exporter)
        self._trace(harrar, exporter, [
            ("Gara Muleta Estate", "HAR-001", "Gara Muleta", square(41.87, 9.28), "48.0", "1200"),
        ])
        self._sign_and_package(harrar, exporter)
        self._generate_dds(harrar, exporter)

        lot(
            exporter, lot_id="JIM-2026-0450", name="Jimma Sun-dried G3", status="draft", region="jimma",
            altitude_m=1700, processing="natural", grade="G3", harvest_date=date(2026, 2, 1),
            volume_kg=Decimal("5000"), price_per_kg=Decimal("3.90"), fob_price_usd=Decimal("3.9000"),
        )
        lot(
            exporter, lot_id="LIM-2026-0120", name="Limu Washed G2", status="draft", region="limu", kebele="Genji",
            altitude_m=1850, processing="washed", grade="G2", harvest_date=date(2026, 1, 28),
            boundary=square(36.51, 7.61), volume_kg=Decimal("900"), price_per_kg=Decimal("5.20"),
            fob_price_usd=Decimal("5.2000"),
        )
        kaffa = lot(
            exporter2, lot_id="KAF-2026-0007", name="Kaffa Forest Natural", status="listed", region="other",
            kebele="Bonga", altitude_m=1750, processing="natural", grade="G2", harvest_date=date(2025, 12, 20),
            farm_location=Point(36.24, 7.27, srid=4326), volume_kg=Decimal("800"), price_per_kg=Decimal("5.90"),
            fob_price_usd=Decimal("5.9000"), flavor_tags=["Wild berry", "Spice"],
            tasting_notes="Wild-grown forest coffee: dark berries, clove and a cedar finish.",
            photos=["cta-band.webp"],
        )
        roaster_lot = lot(
            roaster, lot_id="ARM-2026-0001", name="Roastery Reserve Sidama", status="draft", region="sidama",
            altitude_m=1900, processing="washed", grade="G1", harvest_date=date(2026, 1, 15),
            farm_location=Point(38.5, 6.75, srid=4326), volume_kg=Decimal("300"), price_per_kg=Decimal("6.10"),
            fob_price_usd=Decimal("6.1000"),
        )

        # Marketplace activity --------------------------------------------------
        Offer.objects.create(lot=kochere, buyer=buyer, quantity_kg=Decimal("600"), price_per_kg_usd=Decimal("6.20"),
                             delivery_window="Mar 2027", notes="Looking for a repeat lot for our spring menu.")
        Offer.objects.create(lot=hambela, buyer=roaster, quantity_kg=Decimal("120"),
                             price_per_kg_usd=Decimal("6.50"), status="countered", counter_price=Decimal("6.80"),
                             counter_qty=Decimal("120"), exporter_notes="We can meet you at $6.80 for 120 kg.")

        from bunna_bridge.lots.offer_views import _accept
        bensa_offer = Offer.objects.create(lot=bensa, buyer=buyer, quantity_kg=Decimal("900"),
                                           price_per_kg_usd=Decimal("5.70"))
        _accept(bensa_offer, bensa_offer.quantity_kg, bensa_offer.price_per_kg_usd)

        # Harrar was bought by an EU importer, who filed the DDS with the evidence package.
        import_offer = Offer.objects.create(lot=harrar, buyer=importer, quantity_kg=Decimal("600"),
                                            price_per_kg_usd=Decimal("7.30"), delivery_window="Jan 2027")
        _accept(import_offer, import_offer.quantity_kg, import_offer.price_per_kg_usd)
        DdsReference.objects.create(
            lot=harrar, offer=import_offer, reference_number="26DEHH4Q7N2Z81", verification_number="KX7PQ2LM",
            submitted_on=today - timedelta(days=3), package=harrar.evidence_packages.first(), recorded_by=importer,
        )
        harrar.refresh_from_db()
        assert harrar.export_ready, "Harrar demo lot should pass all 7 gates"
        harrar.status = "exported"
        harrar.save(actor=exporter)

        SampleRequest.objects.create(lot=kochere, buyer=roaster, quantity_g=250,
                                     message="Would love to cup this for our filter menu.",
                                     shipping_address="Bole Road, Addis Ababa")
        SampleRequest.objects.create(lot=hambela, buyer=buyer, quantity_g=300, status="approved",
                                     response="Approved — shipping Monday.",
                                     shipping_address="Hamngatan 12, Stockholm, Sweden")
        SampleRequest.objects.create(lot=kochere, buyer=buyer, quantity_g=300, status="shipped",
                                     response="On its way.", tracking_number="DHL 7731 9920 18",
                                     shipping_address="Hamngatan 12, Stockholm, Sweden")

        # Roastery ---------------------------------------------------------------
        drum = RoastEquipment.objects.create(roaster=roaster, name="Probat P12", machine_type="drum",
                                             brand="Probat", batch_capacity_kg=Decimal("12"),
                                             installed_date=date(2022, 5, 1))
        batch = RoastBatch.objects.create(batch_code="AMR-0915", roaster=roaster, equipment=drum, status="resting",
                                          roast_date=today - timedelta(days=1), roast_level="light",
                                          charge_temp_c=Decimal("205"), drop_temp_c=Decimal("212.5"),
                                          first_crack_time_s=480, development_time_s=95)
        RoastBatchLot.objects.create(batch=batch, lot=harrar, quantity_kg=Decimal("10"))
        RoastBatch.objects.create(batch_code="AMR-0916", roaster=roaster, equipment=drum, status="queued",
                                  roast_level="medium")
        self._phase2(exporter, farmers, kochere, today)
        self._phase3(exporter, buyer, harrar, bensa, kochere, today)
        self._phase4(exporter, grader, kochere, hambela, bensa, harrar, today)
        self._phase5(admin, exporter, buyer, importer, kochere, hambela, bensa, harrar, kaffa, today)
        del roaster_lot
