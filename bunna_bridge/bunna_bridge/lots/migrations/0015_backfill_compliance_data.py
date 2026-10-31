from django.db import migrations
from django.db.models import F
from django.utils import timezone


def forwards(apps, schema_editor):
    CoffeeLot = apps.get_model("lots", "CoffeeLot")
    User = apps.get_model("users", "User")

    # Offers now check available_qty_kg, which used to default to 0 and was
    # never maintained. Open lots start with their full volume available.
    CoffeeLot.objects.filter(
        status__in=["draft", "listed"],
        available_qty_kg=0,
    ).update(available_qty_kg=F("volume_kg"))

    # Gate 5 is now derived from a staff-verified license. Keep the decision
    # admins already made by hand: an exporter whose lots had the gate set,
    # and who has a license file on record, counts as verified.
    approved_ids = CoffeeLot.objects.filter(ecta_license_active=True).values_list(
        "exporter_id", flat=True,
    )
    User.objects.filter(pk__in=approved_ids).exclude(ecta_license_file="").exclude(
        ecta_license_file__isnull=True,
    ).filter(ecta_license_verified_at__isnull=True).update(
        ecta_license_verified_at=timezone.now(),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("lots", "0014_compliance_engine"),
        ("users", "0010_user_ecta_license_verified_at"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
