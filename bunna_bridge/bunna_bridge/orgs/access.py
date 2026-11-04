"""
Team-aware access checks used across the API.

A user who belongs to an organisation shares lots, producers, offers and
washing stations with their teammates. What each member may change depends
on their team role. A user with no organisation (older accounts, platform
staff) keeps the original single-user behaviour.
"""

from .models import Membership

R = Membership.Role

# capability -> team roles that hold it
CAPABILITIES = {
    "manage_team": {R.OWNER, R.ADMIN},
    "manage_lots": {R.OWNER, R.ADMIN, R.SALES, R.QUALITY, R.LOGISTICS},
    "manage_offers": {R.OWNER, R.ADMIN, R.SALES},
    "manage_documents": {R.OWNER, R.ADMIN, R.LOGISTICS},
    "manage_supply": {R.OWNER, R.ADMIN, R.FIELD_AGENT, R.QUALITY, R.LOGISTICS},
    "manage_compliance": {R.OWNER, R.ADMIN, R.LOGISTICS},
}


def membership_of(user):
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    cached = getattr(user, "_membership_cache", "unset")
    if cached != "unset":
        return cached
    m = Membership.objects.filter(user_id=user.pk).select_related("organization").first()
    user._membership_cache = m  # noqa: SLF001
    return m


def org_of(user):
    m = membership_of(user)
    return m.organization if m else None


def team_ids(user):
    """IDs of every user whose records `user` shares (always includes `user`)."""
    if user is None or not getattr(user, "is_authenticated", False):
        return []
    cached = getattr(user, "_team_cache", None)
    if cached is not None:
        return cached
    m = membership_of(user)
    if m is None:
        ids = [user.pk]
    else:
        ids = list(Membership.objects.filter(organization_id=m.organization_id).values_list("user_id", flat=True))
        if user.pk not in ids:
            ids.append(user.pk)
    user._team_cache = ids  # noqa: SLF001
    return ids


def same_team(user, owner_id):
    return owner_id is not None and owner_id in team_ids(user)


def can(user, capability):
    """True if `user` may perform `capability` for their organisation."""
    m = membership_of(user)
    if m is None:
        return True
    return m.role in CAPABILITIES.get(capability, set())
