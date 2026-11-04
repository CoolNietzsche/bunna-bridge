"""Re-run the forest-loss and 2020-forest checks on every active plot (after loading new reference data)."""

from django.core.management.base import BaseCommand

from bunna_bridge.traceability.geo import run_plot_checks
from bunna_bridge.traceability.models import Plot


class Command(BaseCommand):
    help = "Re-run deforestation checks on all active plots and refresh the lots they supply."

    def handle(self, *args, **opts):
        counts = {}
        for plot in Plot.objects.active().select_related("producer").iterator():
            run_plot_checks(plot)
            plot.save()
            counts[plot.deforestation_status] = (
                counts.get(plot.deforestation_status, 0) + 1
            )
        summary = (
            ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())) or "no plots"
        )
        self.stdout.write(self.style.SUCCESS(f"Re-checked plots — {summary}."))
