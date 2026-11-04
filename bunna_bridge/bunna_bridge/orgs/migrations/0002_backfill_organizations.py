"""Give every existing business account its own organisation (owner membership)."""

from django.db import migrations

ORG_ROLES = ("exporter", "importer", "buyer", "roaster", "cooperative")


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    Organization = apps.get_model("orgs", "Organization")
    Membership = apps.get_model("orgs", "Membership")
    for user in User.objects.filter(role__in=ORG_ROLES, membership__isnull=True):
        name = user.company_name or user.cooperative or f"{user.first_name} {user.last_name}".strip() or user.email
        org = Organization.objects.create(name=name[:200], kind=user.role, country=user.country or "")
        Membership.objects.create(organization=org, user=user, role="owner")


class Migration(migrations.Migration):
    dependencies = [
        ("orgs", "0001_initial"),
        ("users", "0012_alter_user_role"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
