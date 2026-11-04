"""Which producers and plots an account may use (its own team's, plus supply bought from cooperatives)."""

from django.db.models import Q

from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids


def transferred_plot_q(user):
    """Plots that reached `user`'s team through an accepted cooperative transfer."""
    return Q(
        deliveries__transfers__buyer_id__in=team_ids(user),
        deliveries__transfers__status="accepted",
    )


def plot_available_to(plot, user):
    from .models import Plot

    if same_team(user, plot.producer.owner_id):
        return True
    return Plot.objects.filter(pk=plot.pk).filter(transferred_plot_q(user)).exists()


def available_plots(user, base=None):
    from .models import Plot

    qs = base if base is not None else Plot.objects.all()
    ids = team_ids(user)
    return qs.filter(Q(producer__owner_id__in=ids) | transferred_plot_q(user)).distinct()
