from django.db import transaction
from django.utils import timezone

from .models import Membership
from .signals import create_personal_org

REQUIRED_EXPORTER_DOCUMENTS = ("lab_certificate", "taster_certificate", "capital_attestation")


@transaction.atomic
def accept_invitation(invitation, user):
    """Move `user` into the inviting organisation with the invited role."""
    org = invitation.organization
    previous = Membership.objects.filter(user=user).select_related("organization").first()
    if previous is not None and previous.organization_id != org.pk:
        old_org = previous.organization
        previous.delete()
        # An organisation nobody belongs to any more is removed.
        if not old_org.memberships.exists():
            old_org.delete()
    Membership.objects.update_or_create(user=user, defaults={"organization": org, "role": invitation.role})
    if user.role != org.kind and org.kind != "platform":
        user.role = org.kind
        user.save(update_fields=["role"])
    invitation.accepted_at = timezone.now()
    invitation.save(update_fields=["accepted_at"])
    return org


@transaction.atomic
def remove_member(membership):
    """Take a member out of the team; they keep a login with their own empty organisation."""
    user = membership.user
    membership.delete()
    create_personal_org(user)


def compliance_profile(org):
    """Status of each document ECTA Directive 1106/2025 expects of an exporter."""
    docs = list(org.compliance_documents.all())
    items = []
    for kind in REQUIRED_EXPORTER_DOCUMENTS:
        mine = [d for d in docs if d.kind == kind]
        latest = max(mine, key=lambda d: d.uploaded_at) if mine else None
        if latest is None:
            state = "missing"
        elif latest.is_expired:
            state = "expired"
        elif latest.rejection_reason:
            state = "rejected"
        elif latest.verified_at:
            state = "verified"
        else:
            state = "pending"
        items.append({"kind": kind, "state": state, "document_id": str(latest.pk) if latest else None})
    complete = all(i["state"] == "verified" for i in items)
    return {"complete": complete, "items": items}
