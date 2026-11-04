"""
The EUDR evidence package (roadmap E-6): everything the EU importer needs
to file its Due Diligence Statement, in one ZIP.

    README.txt                    how to use the package in the EU Information System
    manifest.json                 lot, counts, SHA-256 of every file, fingerprints
    geolocation/plots-N.geojson   plot geometry (WGS84, 6 decimals), split under 20 MB
    producers.csv                 producers + consent record
    plots.csv                     plot data, check results, kg delivered into this lot
    due-diligence-summary.pdf     lot, quantities, risk register, mitigation, sign-off
    legality/                     exporter licence, export permit, phyto certificate (when on file)
    compliance-log.csv            the lot's hash-chained compliance event log
"""

import csv
import hashlib
import io
import json
import zipfile
from decimal import Decimal

from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable
from reportlab.platypus import Paragraph
from reportlab.platypus import SimpleDocTemplate
from reportlab.platypus import Spacer
from reportlab.platypus import Table
from reportlab.platypus import TableStyle

from bunna_bridge.lots.spec_sheet import BORDER
from bunna_bridge.lots.spec_sheet import FOREST
from bunna_bridge.lots.spec_sheet import LINEN
from bunna_bridge.lots.spec_sheet import S_BODY
from bunna_bridge.lots.spec_sheet import S_SECTION
from bunna_bridge.lots.spec_sheet import S_SMALL
from bunna_bridge.lots.spec_sheet import S_SUBTITLE
from bunna_bridge.lots.spec_sheet import S_TITLE
from bunna_bridge.lots.spec_sheet import WHITE

from . import due_diligence as dd
from .geo import TRACES_PROPERTIES
from .geo import effective_area_ha
from .geo import traces_feature_collections
from .models import EvidencePackage
from .models import ProducerConsent

HS_CODE = "0901 11"

README = """EUDR evidence package — lot {lot_id}
Generated {generated} by Beersheba for {company}.

What this is
  The information an EU operator needs to file a Due Diligence Statement
  (DDS) for this coffee under Regulation (EU) 2023/1115 as amended. The
  exporter is established outside the EU; the EU importer who first places
  the coffee on the EU market files the DDS in the EU Information System.

How to use it
  1. In the EU Information System, start a DDS for HS {hs} (coffee, not
     roasted, not decaffeinated), country of production Ethiopia (ET),
     net mass {kg} kg.
  2. Upload geolocation/plots-*.geojson (one file per upload if split).
  3. Use due-diligence-summary.pdf, producers.csv, plots.csv and the
     legality/ folder as the supporting information and risk assessment
     you keep for 5 years.
  4. Record the DDS reference and verification numbers back on Beersheba
     (lot page > Due diligence > Record DDS reference) so downstream buyers
     can see them.

Integrity
  manifest.json lists the SHA-256 of every file. The compliance log is a
  hash chain; its head hash is in manifest.json.

Note on GeoJSON property names
  Properties used: {props}. Check them against the current EU Information
  System GeoJSON guidance before the first live filing.
"""


def _csv(rows, header):
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(header)
    writer.writerows(rows)
    return out.getvalue().encode("utf-8")


def _consent_row(producer):
    record = (
        producer.consents.filter(purpose=ProducerConsent.Purpose.EUDR_SHARING)
        .order_by(
            "-captured_at",
            "-id",
        )
        .first()
    )
    if record is None:
        return ["no", "", ""]
    granted = record.granted and record.revoked_at is None
    return [
        "yes" if granted else "no",
        record.get_method_display(),
        f"{record.captured_at:%Y-%m-%d}",
    ]


def producers_csv(sources):
    producers = {}
    for s in sources:
        producers.setdefault(s.plot.producer_id, s.plot.producer)
    rows = []
    for p in sorted(producers.values(), key=lambda x: x.name):
        rows.append(
            [
                str(p.id),
                p.external_ref,
                p.name,
                p.region,
                p.zone,
                p.woreda,
                p.kebele,
                p.cooperative,
                p.ectms_farmer_id,
                *_consent_row(p),
            ],
        )
    return _csv(
        rows,
        [
            "producer_id",
            "external_ref",
            "name",
            "region",
            "zone",
            "woreda",
            "kebele",
            "cooperative",
            "ectms_farmer_id",
            "eudr_consent",
            "consent_method",
            "consent_date",
        ],
    )


def plots_csv(sources):
    rows = []
    for s in sources:
        plot = s.plot
        geom = plot.boundary or plot.location
        centroid = geom.centroid if geom is not None else None
        rows.append(
            [
                str(plot.id),
                str(plot.producer_id),
                plot.producer.name,
                plot.name,
                plot.ectms_farm_id,
                plot.geometry_type or "",
                f"{centroid.y:.6f}" if centroid else "",
                f"{centroid.x:.6f}" if centroid else "",
                str(effective_area_ha(plot) or ""),
                plot.get_land_tenure_display(),
                plot.deforestation_status,
                f"{plot.deforestation_checked_at:%Y-%m-%d}"
                if plot.deforestation_checked_at
                else "",
                plot.deforestation_datasets,
                str(
                    plot.forest_2020_overlap_pct
                    if plot.forest_2020_overlap_pct is not None
                    else "",
                ),
                str(s.quantity_kg),
                s.delivery_reference,
                f"{s.delivered_on:%Y-%m-%d}" if s.delivered_on else "",
            ],
        )
    return _csv(
        rows,
        [
            "plot_id",
            "producer_id",
            "producer_name",
            "plot_name",
            "ectms_farm_id",
            "geometry_type",
            "centroid_lat",
            "centroid_lon",
            "area_ha",
            "land_tenure",
            "forest_loss_check",
            "checked_on",
            "datasets",
            "forest_2020_overlap_pct",
            "kg_in_this_lot",
            "delivery_reference",
            "delivered_on",
        ],
    )


def compliance_log_csv(lot):
    rows = [
        [
            e.created_at.isoformat(),
            e.gate,
            e.old_value,
            e.new_value,
            e.actor.email if e.actor_id else "system",
            e.reason,
            e.prev_hash,
            e.hash,
        ]
        for e in lot.compliance_events.select_related("actor").order_by(
            "created_at", "id",
        )
    ]
    return _csv(
        rows, ["time", "gate", "old", "new", "actor", "reason", "prev_hash", "hash"],
    )


def _kv(rows):
    t = Table(
        [
            [Paragraph(f"<b>{k}</b>", S_BODY), Paragraph(str(v), S_BODY)]
            for k, v in rows
        ],
        colWidths=[55 * mm, 119 * mm],
    )
    t.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LINEN, WHITE]),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ],
        ),
    )
    return t


def _grid(header, rows, widths):
    data = [[Paragraph(f"<b>{h}</b>", S_SMALL) for h in header]]
    data += [[Paragraph(str(c), S_SMALL) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LINEN),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ],
        ),
    )
    return t


def summary_pdf(lot, sources, signoff, generated_at):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"EUDR due diligence {lot.lot_id}",
        author="Beersheba",
    )
    exporter = lot.exporter
    total = sum((s.quantity_kg for s in sources), Decimal("0"))
    producers = {s.plot.producer_id for s in sources}
    polygons = sum(1 for s in sources if s.plot.boundary is not None)
    story = [
        Paragraph("BEERSHEBA", S_SECTION),
        Paragraph("EUDR due-diligence summary", S_TITLE),
        Paragraph(
            f"Lot {lot.lot_id} &middot; for the EU operator's Due Diligence Statement &middot; "
            f"cut-off date 31 December 2020",
            S_SUBTITLE,
        ),
        Spacer(1, 3 * mm),
        HRFlowable(width="100%", thickness=1.2, color=FOREST, spaceAfter=3 * mm),
        Paragraph("1. SUPPLIER (EXPORTER, OUTSIDE THE EU)", S_SECTION),
        _kv(
            [
                (
                    "Company",
                    exporter.company_name or exporter.get_full_name() or exporter.email,
                ),
                ("Contact", exporter.email),
                ("Country", "Ethiopia (ET)"),
                ("ECTA export licence", exporter.ecta_license_number or "—"),
            ],
        ),
        Paragraph("2. COMMODITY", S_SECTION),
        _kv(
            [
                ("HS code", f"{HS_CODE} — coffee, not roasted, not decaffeinated"),
                ("Lot", f"{lot.lot_id} — {lot.name}"),
                (
                    "Net mass",
                    f"{float(lot.volume_kg):,.2f} kg (traced to plots: {float(total):,.2f} kg)",
                ),
                (
                    "Harvest",
                    lot.harvest_date.strftime("%B %Y") if lot.harvest_date else "—",
                ),
                ("Processing / grade", f"{lot.get_processing_display()} / {lot.grade}"),
                ("Supply channel", lot.get_channel_display()),
            ],
        ),
        Paragraph("3. ORIGIN", S_SECTION),
        _kv(
            [
                ("Producers", len(producers)),
                (
                    "Plots",
                    f"{len(sources)} ({polygons} polygon, {len(sources) - polygons} point ≤ 4 ha)",
                ),
                (
                    "Geolocation",
                    "geolocation/plots-*.geojson (WGS84, 6 decimal places)",
                ),
                (
                    "Forest-loss check",
                    "Every plot clear of tree-cover loss after 31 Dec 2020 "
                    "(Hansen/UMD Global Forest Change; points checked with a 500 m radius)",
                ),
            ],
        ),
        Paragraph("4. RISK REGISTER", S_SECTION),
    ]
    risks = list(lot.risks.prefetch_related("mitigations").order_by("code"))
    rows = []
    for r in risks:
        mitigation = "; ".join(
            f"{m.get_kind_display()}: {m.notes}" for m in r.mitigations.all()
        )
        rows.append(
            [
                r.title,
                r.get_severity_display(),
                r.get_status_display(),
                r.justification
                or mitigation
                or ("Resolved automatically" if r.status == "resolved" else "—"),
            ],
        )
    story.append(
        _grid(
            ["Risk", "Severity", "Status", "Mitigation / justification"],
            rows,
            [62 * mm, 18 * mm, 26 * mm, 68 * mm],
        ),
    )
    story += [
        Paragraph("5. CONCLUSION", S_SECTION),
        _kv(
            [
                ("Conclusion", signoff.conclusion),
                (
                    "Signed by",
                    (signoff.signed_by.get_full_name() or signoff.signed_by.email)
                    if signoff.signed_by_id
                    else "—",
                ),
                (
                    "Signed on",
                    f"{timezone.localtime(signoff.signed_at):%d %B %Y %H:%M}",
                ),
                (
                    "Package generated",
                    f"{timezone.localtime(generated_at):%d %B %Y %H:%M}",
                ),
            ],
        ),
        Spacer(1, 4 * mm),
        Paragraph(
            "This summary supports, but is not, a Due Diligence Statement. The DDS is filed by the "
            "EU operator in the EU Information System, who remains responsible for it.",
            S_SMALL,
        ),
    ]
    doc.build(story)
    return buffer.getvalue()


def _legality_files(lot):
    files = []
    exporter = lot.exporter
    for label, field in [
        ("ecta-export-licence", exporter.ecta_license_file),
        ("ecex-export-permit", lot.ecex_permit_file),
        ("phytosanitary-certificate", lot.phyto_cert_file),
    ]:
        if field:
            ext = field.name.rsplit(".", 1)[-1] if "." in field.name else "bin"
            try:
                with field.open("rb") as fh:
                    files.append((f"legality/{label}.{ext}", fh.read()))
            except FileNotFoundError, OSError:
                continue
    return files


def build_package(lot, user):
    """Build, store and return a new EvidencePackage. Caller checks package_blockers() first."""
    sources = dd.lot_sources(lot)
    signoff = dd.current_signoff(lot)
    generated_at = timezone.now()
    collections = traces_feature_collections([s.plot for s in sources])

    files = []
    for i, fc in enumerate(collections, start=1):
        files.append(
            (
                f"geolocation/plots-{i}.geojson",
                json.dumps(fc, separators=(",", ":")).encode(),
            ),
        )
    files.append(("producers.csv", producers_csv(sources)))
    files.append(("plots.csv", plots_csv(sources)))
    files.append(
        ("due-diligence-summary.pdf", summary_pdf(lot, sources, signoff, generated_at)),
    )
    files.extend(_legality_files(lot))
    files.append(("compliance-log.csv", compliance_log_csv(lot)))

    last_event = lot.compliance_events.order_by("-created_at", "-id").first()
    total = sum((s.quantity_kg for s in sources), Decimal("0"))
    fingerprint = dd.sources_fingerprint(lot, sources)
    manifest = {
        "lot_id": lot.lot_id,
        "lot_uuid": str(lot.pk),
        "exporter": lot.exporter.company_name or lot.exporter.email,
        "generated_at": generated_at.isoformat(),
        "hs_code": HS_CODE,
        "country_of_production": "ET",
        "net_mass_kg": str(lot.volume_kg),
        "traced_kg": str(total),
        "producers": len({s.plot.producer_id for s in sources}),
        "plots": len(sources),
        "sources_fingerprint": fingerprint,
        "risk_register_fingerprint": signoff.register_fingerprint,
        "compliance_log_head_hash": last_event.hash if last_event else "",
        "geojson_properties": list(TRACES_PROPERTIES.values()),
        "files": {name: hashlib.sha256(data).hexdigest() for name, data in files},
    }
    readme = README.format(
        lot_id=lot.lot_id,
        generated=f"{timezone.localtime(generated_at):%d %b %Y %H:%M}",
        company=manifest["exporter"],
        hs=HS_CODE,
        kg=lot.volume_kg,
        props=", ".join(TRACES_PROPERTIES.values()),
    )

    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.txt", readme)
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
        for name, data in files:
            zf.writestr(name, data)
    blob = archive.getvalue()

    package = EvidencePackage(
        lot=lot,
        sha256=hashlib.sha256(blob).hexdigest(),
        fingerprint=fingerprint,
        plots_count=len(sources),
        producers_count=manifest["producers"],
        total_kg=total,
        geojson_files=len(collections),
        generated_by=user,
    )
    stamp = f"{timezone.localtime(generated_at):%Y%m%d-%H%M%S}"
    package.file.save(
        f"EUDR-evidence-{lot.lot_id}-{stamp}.zip", ContentFile(blob), save=False,
    )
    package.save()
    return package
