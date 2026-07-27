import re

from django.db import migrations


def _region_code(text):
    letters = re.sub(r"[^A-Za-z]", "", text or "").upper()
    return (letters[:3] or "GEN").ljust(3, "X")


def backfill(apps, schema_editor):
    User = apps.get_model("users", "User")
    CoffeeLot = apps.get_model("lots", "CoffeeLot")

    # Assign a permanent Farm ID to every existing farmer that doesn't have one.
    seq = 0
    for farmer in User.objects.filter(role="farmer", farm_id__isnull=True).order_by("date_joined"):
        seq += 1
        region_code = _region_code(farmer.farm_region)
        candidate = f"BSB-ETH-{region_code}-{seq:06d}"
        while User.objects.filter(farm_id=candidate).exists():
            seq += 1
            candidate = f"BSB-ETH-{region_code}-{seq:06d}"
        farmer.farm_id = candidate
        farmer.save(update_fields=["farm_id"])

    # Link existing lots to a farmer where the old kebele/region heuristic
    # points at exactly one unambiguous match.
    farmers = list(User.objects.filter(role="farmer"))
    for lot in CoffeeLot.objects.filter(farmer__isnull=True):
        matches = []
        if lot.kebele:
            matches = [f for f in farmers if f.farm_kebele and f.farm_kebele.lower() in lot.kebele.lower()]
        if not matches and lot.region:
            matches = [f for f in farmers if f.farm_region and f.farm_region.lower() == lot.region.lower()]
        if len(matches) == 1:
            lot.farmer = matches[0]
            lot.save(update_fields=["farmer"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("lots", "0010_coffeelot_farmer"),
        ("users", "0006_user_farm_id"),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
