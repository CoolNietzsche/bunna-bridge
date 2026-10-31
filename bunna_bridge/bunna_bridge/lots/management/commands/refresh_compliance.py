from django.core.management.base import BaseCommand

from bunna_bridge.lots.tasks import daily_compliance_refresh


class Command(BaseCommand):
    help = "Re-derive every compliance gate now (run once after deploying, or any time data changes)."

    def handle(self, *args, **options):
        result = daily_compliance_refresh()
        self.stdout.write(
            self.style.SUCCESS(
                f"Refreshed {result['lots_refreshed']} lots, sent {result['alerts_sent']} expiry alerts.",
            ),
        )
