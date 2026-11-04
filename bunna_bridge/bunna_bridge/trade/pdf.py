"""Printable coffee purchase contract (T-1)."""

import io

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


def _kv(rows):
    t = Table([[Paragraph(f"<b>{k}</b>", S_BODY), Paragraph(str(v), S_BODY)] for k, v in rows],
              colWidths=[52 * mm, 122 * mm])
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LINEN, WHITE]),
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _party(user):
    lines = [user.company_name or user.get_full_name() or user.email, user.email]
    if user.country:
        lines.append(user.country)
    if getattr(user, "ecta_license_number", ""):
        lines.append(f"ECTA licence {user.ecta_license_number}")
    return "<br/>".join(lines)


def _signature(when, who):
    if not when:
        return "Not signed"
    name = who.get_full_name() or who.email if who else "—"
    return f"Signed electronically by {name} on {timezone.localtime(when):%d %B %Y %H:%M %Z}"


def contract_pdf(contract) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm,
                            bottomMargin=18 * mm, title=f"Contract {contract.number}", author="Beersheba")
    lot = contract.lot
    shipment = "—"
    if contract.shipment_from and contract.shipment_to:
        shipment = f"{contract.shipment_from:%d %b %Y} – {contract.shipment_to:%d %b %Y}"
    payment = contract.get_payment_terms_display()
    if contract.payment_terms in ("advance", "advance_cad"):
        payment += f" — {contract.advance_percent}% in advance"
    story = [
        Paragraph("BEERSHEBA", S_SECTION),
        Paragraph("Green coffee purchase contract", S_TITLE),
        Paragraph(f"Contract {contract.number} &middot; {contract.get_status_display()}", S_SUBTITLE),
        Spacer(1, 3 * mm),
        HRFlowable(width="100%", thickness=1.2, color=FOREST, spaceAfter=3 * mm),
        Paragraph("1. PARTIES", S_SECTION),
        _kv([("Seller", _party(contract.seller)), ("Buyer", _party(contract.buyer))]),
        Paragraph("2. GOODS", S_SECTION),
        _kv([
            ("Coffee", f"Ethiopian green coffee, lot {lot.lot_id} — {lot.name}"),
            ("Origin", f"{lot.get_region_display()}, Ethiopia"),
            ("Quality", contract.quality_spec or "—"),
            ("Quantity", f"{contract.quantity_kg:,.2f} kg net (about {contract.bags} bags of 60 kg)"),
            ("Pre-shipment sample", "Required — buyer approval before loading" if contract.pss_required else
             "Not required"),
        ]),
        Paragraph("3. PRICE AND DELIVERY", S_SECTION),
        _kv([
            ("Price", f"USD {contract.price_usd_per_kg:,.4f} per kg {contract.incoterm} {contract.named_place}"),
            ("Contract value", f"USD {contract.value_usd:,.2f}"),
            ("Incoterm", f"{contract.get_incoterm_display()} ({contract.named_place}), Incoterms 2020"),
            ("Shipment period", shipment),
            ("Destination", contract.destination or "—"),
        ]),
        Paragraph("4. PAYMENT AND TERMS", S_SECTION),
        _kv([
            ("Payment", payment),
            ("General terms", contract.get_terms_basis_display()),
            ("EUDR", "Seller provides the due-diligence evidence package (plot geolocation, risk assessment, "
                     "legality documents). Buyer, as EU operator, files the Due Diligence Statement."),
            ("ECTA registration", contract.ecta_registration_number or "Pending"),
            ("Other terms", contract.notes or "—"),
        ]),
        Paragraph("5. SIGNATURES", S_SECTION),
        _kv([
            ("Seller", _signature(contract.seller_signed_at, contract.seller_signed_by)),
            ("Buyer", _signature(contract.buyer_signed_at, contract.buyer_signed_by)),
            ("Terms fingerprint", contract.terms_hash or "—"),
        ]),
        Spacer(1, 4 * mm),
        Paragraph(
            "Electronic signatures were applied in the Beersheba platform. The terms fingerprint (SHA-256) "
            "identifies the exact terms both parties agreed; any later change requires new signatures.", S_SMALL,
        ),
    ]
    doc.build(story)
    return buffer.getvalue()
