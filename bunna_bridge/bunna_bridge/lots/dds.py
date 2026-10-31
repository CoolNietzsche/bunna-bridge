"""
EUDR Due Diligence Statement (Regulation (EU) 2023/1115).

generate_dds_pdf() builds a human-readable DDS summary for a lot and
lot_geojson() produces the plot geolocation as GeoJSON in the shape the
EU Information System (TRACES) accepts for upload. The PDF is only ever
generated for lots whose location and deforestation gates pass — it never
states something the platform hasn't verified.
"""

import io
import json

from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable
from reportlab.platypus import Paragraph
from reportlab.platypus import SimpleDocTemplate
from reportlab.platypus import Spacer
from reportlab.platypus import Table
from reportlab.platypus import TableStyle

from .compliance import gate_report
from .spec_sheet import BORDER
from .spec_sheet import FOREST
from .spec_sheet import LINEN
from .spec_sheet import RED
from .spec_sheet import S_BODY
from .spec_sheet import S_MONO
from .spec_sheet import S_SECTION
from .spec_sheet import S_SMALL
from .spec_sheet import S_SUBTITLE
from .spec_sheet import S_TITLE
from .spec_sheet import SAGE
from .spec_sheet import WHITE

HS_CODE = "0901 11"  # Coffee, not roasted, not decaffeinated
MAX_LISTED_VERTICES = 40


def dds_blockers(lot):
    """Reasons the DDS can't be generated yet (empty list = OK)."""
    blockers = []
    if not lot.gps_verified:
        blockers.append("Add the farm boundary or GPS point first.")
    elif not lot.deforestation_free:
        blockers.append("The plot has not passed the deforestation check.")
    return blockers


def lot_geojson(lot):
    """FeatureCollection with one Feature per plot (EU Information System format)."""
    features = []
    geom = lot.boundary or lot.farm_location
    if geom is not None:
        props = {
            "ProducerName": (lot.farmer.get_full_name() or lot.farmer.farm_name)
            if lot.farmer_id
            else lot.kebele or lot.name,
            "ProducerCountry": "ET",
            "ProductionPlace": ", ".join(
                p for p in [lot.kebele, lot.get_region_display()] if p
            ),
        }
        if lot.farmer_id and lot.farmer.farm_size_ha:
            props["Area"] = float(lot.farmer.farm_size_ha)
        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": json.loads(geom.geojson),
            },
        )
    return {"type": "FeatureCollection", "features": features}


def _kv_table(rows):
    data = [
        [Paragraph(f"<b>{k}</b>", S_BODY), Paragraph(str(v), S_BODY)] for k, v in rows
    ]
    t = Table(data, colWidths=[55 * mm, 119 * mm])
    t.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LINEN, WHITE]),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ],
        ),
    )
    return t


def _coordinates_rows(lot):
    if lot.boundary:
        ring = lot.boundary.coords[0]
        rows = [
            [f"{i + 1}", f"{lat:.6f}", f"{lng:.6f}"]
            for i, (lng, lat) in enumerate(ring[:MAX_LISTED_VERTICES])
        ]
        return "Polygon", rows, len(ring)
    pt = lot.farm_location
    return "Point", [["1", f"{pt.y:.6f}", f"{pt.x:.6f}"]], 1


def generate_dds_pdf(lot) -> bytes:
    now = timezone.localtime()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"EUDR DDS {lot.lot_id}",
        author="Beersheba",
    )
    exporter = lot.exporter
    geo_type, coord_rows, vertex_count = _coordinates_rows(lot)

    story = [
        Paragraph("BEERSHEBA", S_SECTION),
        Paragraph("EUDR Due Diligence Statement", S_TITLE),
        Paragraph(
            f"Regulation (EU) 2023/1115 &middot; Lot {lot.lot_id} &middot; Cut-off date 31 December 2020",
            S_SUBTITLE,
        ),
        Spacer(1, 4 * mm),
        HRFlowable(width="100%", thickness=1.2, color=FOREST, spaceAfter=4 * mm),
        Paragraph("1. OPERATOR", S_SECTION),
        _kv_table(
            [
                ("Company", exporter.company_name or "—"),
                (
                    "Contact",
                    f"{exporter.get_full_name() or exporter.username} &lt;{exporter.email}&gt;",
                ),
                ("Country", "Ethiopia (ET)"),
                ("ECTA export license", exporter.ecta_license_number or "—"),
            ],
        ),
        Paragraph("2. COMMODITY", S_SECTION),
        _kv_table(
            [
                ("HS code", f"{HS_CODE} — Coffee, not roasted, not decaffeinated"),
                ("Species", "Coffea arabica"),
                ("Quantity (net mass)", f"{float(lot.volume_kg):,.2f} kg"),
                ("Country of production", "Ethiopia (ET)"),
                (
                    "Harvest",
                    lot.harvest_date.strftime("%B %Y") if lot.harvest_date else "—",
                ),
            ],
        ),
        Paragraph("3. LOT & PRODUCER", S_SECTION),
        _kv_table(
            [
                ("Lot", f"{lot.lot_id} — {lot.name}"),
                (
                    "Region / kebele",
                    ", ".join(p for p in [lot.get_region_display(), lot.kebele] if p),
                ),
                ("Washing station", lot.washing_station or "—"),
                (
                    "Producer",
                    (lot.farmer.get_full_name() or lot.farmer.farm_name)
                    if lot.farmer_id
                    else "—",
                ),
                ("Beersheba Farm ID", lot.farmer.farm_id if lot.farmer_id else "—"),
                ("Processing / grade", f"{lot.get_processing_display()} / {lot.grade}"),
            ],
        ),
        Paragraph("4. GEOLOCATION OF PLOT(S)", S_SECTION),
        Paragraph(
            f"Geometry: <b>{geo_type}</b> (WGS84). "
            + (
                f"{vertex_count} vertices; first {MAX_LISTED_VERTICES} listed. "
                if vertex_count > MAX_LISTED_VERTICES
                else ""
            )
            + "The full GeoJSON is available from the platform for upload to the EU Information System.",
            S_BODY,
        ),
    ]

    coord_table = Table(
        [["#", "Latitude", "Longitude"], *coord_rows],
        colWidths=[12 * mm, 50 * mm, 50 * mm],
    )
    coord_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 0), (-1, 0), FOREST),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LINEN, WHITE]),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
            ],
        ),
    )
    story += [coord_table]

    story += [
        Paragraph("5. RISK ASSESSMENT", S_SECTION),
        _kv_table(
            [
                (
                    "Deforestation check",
                    "No tree-cover loss after 31 Dec 2020 detected within the plot"
                    + (
                        " (500 m radius around the GPS point)"
                        if geo_type == "Point"
                        else ""
                    ),
                ),
                (
                    "Reference dataset",
                    "Hansen / UMD Global Forest Change (Landsat, 30 m)",
                ),
                ("Checked on", now.strftime("%d %B %Y %H:%M %Z")),
            ],
        ),
        Paragraph("6. EXPORT COMPLIANCE GATES", S_SECTION),
    ]

    gate_rows = []
    for g in gate_report(lot):
        if g["gate"] == "eudr_dds_ready":
            continue  # this document is the DDS
        gate_rows.append(
            [
                Paragraph(g["label"], S_BODY),
                Paragraph("PASS" if g["passed"] else "OPEN", S_MONO),
                Paragraph(g["reason"], S_SMALL),
            ],
        )
    gate_table = Table(gate_rows, colWidths=[52 * mm, 16 * mm, 106 * mm])
    gate_table.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LINEN, WHITE]),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                *[
                    ("TEXTCOLOR", (1, i), (1, i), SAGE if r[1].text == "PASS" else RED)
                    for i, r in enumerate(gate_rows)
                ],
            ],
        ),
    )
    story += [
        gate_table,
        Spacer(1, 6 * mm),
        HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=3 * mm),
        Paragraph(
            "By submitting this statement the operator confirms that due diligence was exercised in accordance "
            "with Regulation (EU) 2023/1115 and that no or only negligible risk was found that the relevant "
            "commodity was produced on land subject to deforestation after 31 December 2020. This document "
            "summarises the evidence held on the Beersheba platform; the legally binding statement is the one "
            "submitted to the EU Information System.",
            S_SMALL,
        ),
        Spacer(1, 2 * mm),
        Paragraph(
            f"Document ID EUDR-DDS-{lot.lot_id}-{now:%Y%m%d%H%M} &middot; generated {now:%d %b %Y %H:%M} "
            f"&middot; Beersheba (bunnabridge.pro.et)",
            S_SMALL,
        ),
    ]
    doc.build(story)
    return buffer.getvalue()
