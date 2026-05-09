from decimal import Decimal


# NBE 50/50 rule — configurable
NBE_SPLIT_RATIO   = Decimal("0.50")   # 50% must convert to ETB
PLATFORM_FEE_PCT  = Decimal("0.025")  # 2.5% platform fee

# Milestone escrow schedule
ESCROW_MILESTONES = [
    {"label": "Sample Approved",        "pct": Decimal("0.20"), "trigger": "sample_approved"},
    {"label": "Export Docs Cleared",    "pct": Decimal("0.30"), "trigger": "docs_cleared"},
    {"label": "Delivery Confirmed",     "pct": Decimal("0.50"), "trigger": "delivery_confirmed"},
]


def calculate_settlement(
    volume_kg: Decimal,
    price_per_kg: Decimal,
    nbe_rate: Decimal,          # ETB per 1 USD — e.g. 59.85
    platform_fee_pct: Decimal = PLATFORM_FEE_PCT,
    nbe_split: Decimal = NBE_SPLIT_RATIO,
) -> dict:
    """
    Calculate full settlement breakdown for a coffee lot contract.
    Returns all amounts for display in the settlement widget.
    """
    # Gross contract value
    gross_usd = (volume_kg * price_per_kg).quantize(Decimal("0.01"))

    # Platform fee
    platform_fee_usd = (gross_usd * platform_fee_pct).quantize(Decimal("0.01"))

    # Net after platform fee
    net_usd = gross_usd - platform_fee_usd

    # NBE 50/50 split on NET amount
    etb_portion_usd = (net_usd * nbe_split).quantize(Decimal("0.01"))
    usd_retained    = (net_usd - etb_portion_usd).quantize(Decimal("0.01"))
    etb_amount      = (etb_portion_usd * nbe_rate).quantize(Decimal("0.00"))

    # Escrow milestones (on gross)
    milestones = [
        {
            "label":   m["label"],
            "trigger": m["trigger"],
            "pct":     float(m["pct"] * 100),
            "usd":     float((gross_usd * m["pct"]).quantize(Decimal("0.01"))),
        }
        for m in ESCROW_MILESTONES
    ]

    return {
        "volume_kg":        float(volume_kg),
        "price_per_kg":     float(price_per_kg),
        "gross_usd":        float(gross_usd),
        "platform_fee_usd": float(platform_fee_usd),
        "platform_fee_pct": float(platform_fee_pct * 100),
        "net_usd":          float(net_usd),
        "nbe_split_pct":    float(nbe_split * 100),
        "usd_retained":     float(usd_retained),
        "etb_portion_usd":  float(etb_portion_usd),
        "etb_amount":       float(etb_amount),
        "nbe_rate":         float(nbe_rate),
        "milestones":       milestones,
    }
