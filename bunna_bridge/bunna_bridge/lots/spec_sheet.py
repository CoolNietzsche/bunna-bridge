"""
Bunna Bridge — Lot Spec Sheet PDF Generator
Uses ReportLab. No WeasyPrint / no Pango required.
"""
import io
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand colours (approximate ReportLab RGB from hex) ──────────────────────
ESPRESSO   = colors.HexColor("#1A0F07")
ROAST      = colors.HexColor("#2C1810")
TERRACOTTA = colors.HexColor("#C1440E")
AMBER      = colors.HexColor("#D4824A")
GOLD       = colors.HexColor("#C9952A")
FOREST     = colors.HexColor("#1E3A2F")
SAGE       = colors.HexColor("#4A7C59")
CREAM      = colors.HexColor("#F5EDD8")
PARCHMENT  = colors.HexColor("#EDE0C4")
WHITE      = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# ── Styles ───────────────────────────────────────────────────────────────────
_base = getSampleStyleSheet()

S_TITLE = ParagraphStyle(
    "BbTitle",
    fontName="Helvetica-Bold",
    fontSize=22,
    textColor=CREAM,
    leading=28,
    spaceAfter=2,
)
S_SUBTITLE = ParagraphStyle(
    "BbSubtitle",
    fontName="Helvetica",
    fontSize=11,
    textColor=AMBER,
    leading=15,
    spaceAfter=0,
)
S_SECTION = ParagraphStyle(
    "BbSection",
    fontName="Helvetica-Bold",
    fontSize=9,
    textColor=AMBER,
    leading=13,
    spaceBefore=10,
    spaceAfter=4,
    letterSpacing=1.2,
)
S_BODY = ParagraphStyle(
    "BbBody",
    fontName="Helvetica",
    fontSize=9,
    textColor=PARCHMENT,
    leading=13,
    spaceAfter=3,
)
S_MONO = ParagraphStyle(
    "BbMono",
    fontName="Courier",
    fontSize=8,
    textColor=GOLD,
    leading=12,
)
S_ITALIC = ParagraphStyle(
    "BbItalic",
    fontName="Helvetica-Oblique",
    fontSize=9,
    textColor=PARCHMENT,
    leading=13,
    spaceAfter=3,
)
S_SMALL = ParagraphStyle(
    "BbSmall",
    fontName="Helvetica",
    fontSize=7.5,
    textColor=colors.HexColor("#A8C5A0"),
    leading=11,
)
S_WATERMARK = ParagraphStyle(
    "BbWatermark",
    fontName="Helvetica-Bold",
    fontSize=42,
    textColor=colors.HexColor("#2C1810"),
    leading=50,
)


def _gate_row(label, passed):
    icon = "✓" if passed else "✗"
    icon_color = SAGE if passed else TERRACOTTA
    return [
        Paragraph(f'<font color="#{("4A7C59" if passed else "C1440E")}">{icon}</font>', S_BODY),
        Paragraph(label, S_BODY),
    ]


def _sca_bar(score, max_score=10):
    """Return a simple ASCII-style bar string for SCA attributes."""
    if score is None:
        return "—"
    try:
        val = float(score)
    except (TypeError, ValueError):
        return "—"
    filled = int(round((val / max_score) * 10))
    bar = "█" * filled + "░" * (10 - filled)
    return f"{val:.2f}  {bar}"


def generate_spec_sheet(lot) -> bytes:
    """
    Generate a spec sheet PDF for a CoffeeLot instance.
    Returns raw PDF bytes.
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"Spec Sheet — {lot.lot_id}",
        author="Bunna Bridge",
    )

    story = []

    # ── Header bar ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("BUNNA BRIDGE", ParagraphStyle(
            "hdr", fontName="Helvetica-Bold", fontSize=10,
            textColor=AMBER, leading=14)),
        Paragraph("LOT SPEC SHEET", ParagraphStyle(
            "hdr2", fontName="Helvetica", fontSize=9,
            textColor=PARCHMENT, leading=14, alignment=2)),
    ]]
    header_table = Table(header_data, colWidths=[(PAGE_W - 2*MARGIN)/2]*2)
    header_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), ESPRESSO),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("LEFTPADDING",  (0, 0), (0, -1),  10),
        ("RIGHTPADDING", (-1, 0),(-1, -1), 10),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # ── Lot title ────────────────────────────────────────────────────────────
    story.append(Paragraph(lot.name, S_TITLE))
    story.append(Paragraph(lot.lot_id, S_MONO))
    story.append(Spacer(1, 3))
    story.append(HRFlowable(width="100%", thickness=1, color=ROAST))
    story.append(Spacer(1, 8))

    # ── Two-column layout: Lot Details | Pricing & Exporter ─────────────────
    col = (PAGE_W - 2*MARGIN - 6*mm) / 2

    def kv(label, value):
        return [
            Paragraph(f"<b>{label}</b>", S_SMALL),
            Paragraph(str(value) if value else "—", S_BODY),
        ]

    region_display = (lot.region or "").replace("_", " ").title()
    processing_display = (lot.processing or "").title()
    grade_display = lot.grade or "—"
    altitude = f"{lot.altitude_m} m" if lot.altitude_m else "—"

    # FOB price
    fob = "—"
    if hasattr(lot, "fob_price_usd") and lot.fob_price_usd:
        fob = f"USD {float(lot.fob_price_usd):.2f} / kg"
    elif lot.price_per_kg:
        fob = f"USD {float(lot.price_per_kg):.2f} / kg"

    available = "—"
    if hasattr(lot, "available_qty_kg") and lot.available_qty_kg:
        available = f"{lot.available_qty_kg} kg"
    elif lot.volume_kg:
        available = f"{lot.volume_kg} kg"

    min_order = "—"
    if hasattr(lot, "min_order_kg") and lot.min_order_kg:
        min_order = f"{lot.min_order_kg} kg"

    delivery = "—"
    if hasattr(lot, "delivery_window") and lot.delivery_window:
        delivery = str(lot.delivery_window)

    exporter_name = "—"
    exporter_company = "—"
    if lot.exporter:
        exporter_name = lot.exporter.get_full_name() or lot.exporter.email
        if hasattr(lot.exporter, "company_name") and lot.exporter.company_name:
            exporter_company = lot.exporter.company_name

    # GPS centroid
    centroid_str = "—"
    if lot.boundary:
        try:
            c = lot.boundary.centroid
            centroid_str = f"{c.y:.5f}°N, {c.x:.5f}°E"
        except Exception:
            pass
    elif lot.farm_location:
        try:
            centroid_str = f"{lot.farm_location.y:.5f}°N, {lot.farm_location.x:.5f}°E"
        except Exception:
            pass

    left_data = [
        kv("Region", region_display),
        kv("Kebele / Washing Station", lot.washing_station or lot.kebele or "—"),
        kv("Processing", processing_display),
        kv("Grade", grade_display),
        kv("Varietal", lot.varietal or "Ethiopian Heirloom"),
        kv("Altitude", altitude),
        kv("GPS Centroid", centroid_str),
    ]

    right_data = [
        kv("FOB Price", fob),
        kv("Available Volume", available),
        kv("Minimum Order", min_order),
        kv("Delivery Window", delivery),
        kv("Exporter", exporter_name),
        kv("Company", exporter_company),
        kv("Lot Status", (lot.status or "").title()),
    ]

    def make_kv_table(rows):
        data = []
        for row in rows:
            data.append(row)
        t = Table(data, colWidths=[col * 0.38, col * 0.62])
        t.setStyle(TableStyle([
            ("VALIGN",       (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",   (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 2),
            ("LEFTPADDING",  (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        return t

    two_col = Table(
        [[make_kv_table(left_data), make_kv_table(right_data)]],
        colWidths=[col + 3*mm, col + 3*mm],
    )
    two_col.setStyle(TableStyle([
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",(0, 0), (-1, -1), 0),
        ("LINEAFTER",   (0, 0), (0, -1),  0.5, colors.HexColor("#2C1810")),
        ("RIGHTPADDING",(0, 0), (0, -1),  8),
        ("LEFTPADDING", (1, 0), (1, -1),  8),
    ]))
    story.append(two_col)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ROAST))

    # ── SCA / Cupping ────────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph("CUPPING PROFILE", S_SECTION))

    sca_total = "—"
    if lot.sca_score:
        try:
            sca_total = f"{float(lot.sca_score):.2f} pts"
        except Exception:
            sca_total = str(lot.sca_score)

    q_grader = lot.q_grader_name or "—"
    cupping_date = str(lot.cupping_date) if lot.cupping_date else "—"

    sca_meta = Table(
        [[
            Paragraph(f"<b>SCA Total Score:</b>  {sca_total}", S_BODY),
            Paragraph(f"<b>Q-Grader:</b>  {q_grader}", S_BODY),
            Paragraph(f"<b>Date:</b>  {cupping_date}", S_BODY),
        ]],
        colWidths=[(PAGE_W - 2*MARGIN)/3]*3,
    )
    sca_meta.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    story.append(sca_meta)

    # Latest confirmed cupping score attributes
    try:
        latest = lot.cuppingscores.filter(status="confirmed").order_by("-cupping_date").first()
    except Exception:
        latest = None

    if latest:
        attrs = [
            ("Fragrance / Aroma", latest.fragrance_aroma),
            ("Flavor",            latest.flavor),
            ("Aftertaste",        latest.aftertaste),
            ("Acidity",           latest.acidity),
            ("Body",              latest.body),
            ("Balance",           latest.balance),
            ("Overall",           latest.overall),
        ]
        bar_data = [[
            Paragraph(f"<b>{label}</b>", S_SMALL),
            Paragraph(_sca_bar(val), ParagraphStyle(
                "bar", fontName="Courier", fontSize=8,
                textColor=GOLD, leading=11)),
        ] for label, val in attrs if val is not None]

        if bar_data:
            bar_table = Table(bar_data, colWidths=[55*mm, (PAGE_W - 2*MARGIN - 55*mm)])
            bar_table.setStyle(TableStyle([
                ("TOPPADDING",   (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 1),
                ("LEFTPADDING",  (0, 0), (-1, -1), 0),
            ]))
            story.append(bar_table)

    flavor_notes = None
    if hasattr(lot, "tasting_notes") and lot.tasting_notes:
        flavor_notes = lot.tasting_notes
    elif lot.flavor_notes:
        flavor_notes = lot.flavor_notes

    if flavor_notes:
        story.append(Spacer(1, 4))
        story.append(Paragraph(f'"{flavor_notes}"', S_ITALIC))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ROAST))

    # ── EUDR Compliance ──────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph("EUDR COMPLIANCE GATES", S_SECTION))

    gates = [
        ("Deforestation-Free verified",        lot.deforestation_free),
        ("GPS boundary verified",               lot.gps_verified),
        ("EUDR DDS ready",                      lot.eudr_dds_ready),
        ("Phytosanitary certificate uploaded",  lot.phyto_cert_uploaded),
        ("ECTA export license active",          lot.ecta_license_active),
        ("NBE foreign exchange declared",       lot.nbe_fx_declared),
        ("CTA floor price met",                 lot.cta_floor_met),
    ]

    passed_count = sum(1 for _, v in gates if v)
    gate_rows = [_gate_row(label, val) for label, val in gates]
    gate_table = Table(gate_rows, colWidths=[8*mm, PAGE_W - 2*MARGIN - 8*mm])
    gate_table.setStyle(TableStyle([
        ("TOPPADDING",   (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 2),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(gate_table)
    story.append(Spacer(1, 4))

    compliance_color = SAGE if passed_count == 7 else (GOLD if passed_count >= 5 else TERRACOTTA)
    story.append(Paragraph(
        f'<font color="#{("1E3A2F" if passed_count==7 else ("C9952A" if passed_count>=5 else "C1440E"))}">'
        f'<b>{passed_count}/7 gates passed</b></font>',
        S_BODY,
    ))

    # ── Farm Story ───────────────────────────────────────────────────────────
    farm_story = None
    if hasattr(lot, "farm_story") and lot.farm_story:
        farm_story = lot.farm_story

    if farm_story:
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=0.5, color=ROAST))
        story.append(Spacer(1, 8))
        story.append(Paragraph("FARM STORY", S_SECTION))
        story.append(Paragraph(farm_story, S_BODY))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ROAST))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "This document is for pre-contract evaluation only. "
        "It does not constitute an EUDR Due Diligence Statement. "
        "Generated by Bunna Bridge · bunnabridge.pro.et",
        S_SMALL,
    ))

    # ── Build ────────────────────────────────────────────────────────────────
    def _bg(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(ESPRESSO)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.restoreState()

    doc.build(story, onFirstPage=_bg, onLaterPages=_bg)
    return buf.getvalue()
