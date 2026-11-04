"""
Scoring rules for Phase 4 quality data. Pure functions, no database access.

CVA (SCA Coffee Value Assessment, 2024) — affective assessment
    Eight attributes are scored on a 1–9 hedonic scale: fragrance, aroma,
    flavour, aftertaste, acidity, sweetness, mouthfeel and overall. The
    100-point cupping score is
        S = 0.65625 × Σh + 52.75 − 2u − 4d
    where u = non-uniform cups and d = defective cups (out of 5).
    All 9s give 100; all 1s give 58.

Green grading (SCA Arabica Green Coffee Defect Handbook)
    Defects in a 350 g sample are converted to "full defect equivalents".
    Category 1 (primary) defects disqualify specialty grade.
    Specialty: 0 primary and ≤ 5 full defects; Premium: ≤ 8 full defects.
    Moisture should be 10–12 %.

NOTE: verify the formula and tables against the current SCA standards
(CVA protocol and SCA 2024 green grading) before relying on them commercially.
"""

from decimal import ROUND_HALF_UP
from decimal import Decimal

CVA_AFFECTIVE = ("fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall")
CVA_DESCRIPTIVE = ("fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel")
CVA_FLAVOR_CATEGORIES = (
    "floral", "fruity", "berry", "dried_fruit", "citrus", "sour_fermented", "green_vegetative", "other",
    "roasted", "spices", "nutty_cocoa", "brown_sugar", "vanilla",
)
CVA_MAX_CATEGORIES = 5


def cva_score(hedonic, non_uniform_cups=0, defective_cups=0):
    """100-point score from the eight 1–9 affective ratings."""
    total = sum(Decimal(str(hedonic[a])) for a in CVA_AFFECTIVE)
    score = Decimal("0.65625") * total + Decimal("52.75") - 2 * int(non_uniform_cups) - 4 * int(defective_cups)
    return score.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def cva_band(score):
    score = Decimal(str(score))
    if score >= 90:  # noqa: PLR2004
        return "Outstanding"
    if score >= 85:  # noqa: PLR2004
        return "Excellent"
    if score >= 80:  # noqa: PLR2004
        return "Very good (specialty)"
    return "Below specialty"


# SCA defect table: key → (label, category, count that equals one full defect)
DEFECTS = {
    "full_black": ("Full black", 1, 1),
    "full_sour": ("Full sour", 1, 1),
    "dried_cherry": ("Dried cherry / pod", 1, 1),
    "fungus": ("Fungus damaged", 1, 1),
    "foreign_matter": ("Foreign matter", 1, 1),
    "severe_insect": ("Severe insect damage", 1, 5),
    "partial_black": ("Partial black", 2, 3),
    "partial_sour": ("Partial sour", 2, 3),
    "parchment": ("Parchment / pergamino", 2, 5),
    "floater": ("Floater", 2, 5),
    "immature": ("Immature / unripe", 2, 5),
    "withered": ("Withered", 2, 5),
    "shell": ("Shell", 2, 5),
    "broken": ("Broken / chipped / cut", 2, 5),
    "hull": ("Hull / husk", 2, 5),
    "slight_insect": ("Slight insect damage", 2, 10),
}
SCREEN_SIZES = ("20", "19", "18", "17", "16", "15", "14", "below_14")


def full_defects(counts):
    """(primary_full, secondary_full) full-defect equivalents from raw counts."""
    primary = secondary = Decimal("0")
    for key, n in (counts or {}).items():
        if key not in DEFECTS or not n:
            continue
        _, category, per_full = DEFECTS[key]
        # Fractions of a full defect are rounded down, as in the handbook.
        full = Decimal(int(n) // per_full)
        if category == 1:
            primary += full
        else:
            secondary += full
    return int(primary), int(secondary)


def green_classification(counts, quakers=0):
    """SCA green grade from defect counts (350 g sample) and quakers (100 g roasted)."""
    primary, secondary = full_defects(counts)
    total = primary + secondary
    if primary == 0 and total <= 5 and quakers == 0:  # noqa: PLR2004
        grade = "Specialty"
    elif total <= 8 and quakers <= 3:  # noqa: PLR2004
        grade = "Premium"
    elif total <= 23:  # noqa: PLR2004
        grade = "Exchange"
    else:
        grade = "Below standard"
    return {"primary_full_defects": primary, "secondary_full_defects": secondary,
            "total_full_defects": total, "grade": grade}


def physical_warnings(moisture=None, water_activity=None, density=None, screens=None):
    warnings = []
    if moisture is not None and not (Decimal("10") <= Decimal(str(moisture)) <= Decimal("12")):
        warnings.append(f"Moisture {moisture}% is outside the 10–12% range buyers expect.")
    if water_activity is not None and Decimal(str(water_activity)) > Decimal("0.70"):
        warnings.append(f"Water activity {water_activity} is above 0.70 — risk of mould and fast ageing.")
    if density is not None and Decimal(str(density)) < Decimal("650"):
        warnings.append(f"Free-settled density {density} g/L is low for high-grown Ethiopian coffee.")
    if screens:
        total = sum(Decimal(str(v or 0)) for v in screens.values())
        if total and abs(total - 100) > 2:  # noqa: PLR2004
            warnings.append(f"Screen percentages add up to {total}%, not 100%.")
    return warnings
