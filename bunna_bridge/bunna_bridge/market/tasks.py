from celery import shared_task


@shared_task()
def close_due_auctions():
    """Close Beersheba Select auction lots whose time has passed (runs every few minutes)."""
    from .services import close_due

    return close_due()


@shared_task(autoretry_for=(OSError,), retry_backoff=60, max_retries=5)
def notify_new_lead(lead_id):
    """Email a new website enquiry to the team. Retries if the mail server is unreachable."""
    from django.conf import settings
    from django.core.mail import EmailMessage
    from django.utils import timezone

    from .models import Lead

    lead = Lead.objects.filter(pk=lead_id, notified_at__isnull=True).first()
    if lead is None or not settings.LEADS_NOTIFY_EMAIL:
        return False
    lines = [
        f"Role:     {lead.get_role_display()}",
        f"Name:     {lead.name}",
        f"Company:  {lead.company}",
        f"Country:  {lead.country}",
        f"Email:    {lead.email}",
        f"Phone:    {lead.phone or '-'}",
        f"Volume:   {lead.volume or '-'}",
        f"Page:     {lead.source or '-'}",
        "",
        lead.message or "(no message)",
        "",
        "Reply to this email to answer them directly. Track it in the admin under Market > Leads.",
    ]
    EmailMessage(
        subject=f"New {lead.get_role_display().lower()} enquiry: {lead.company}",
        body="\n".join(lines),
        to=[settings.LEADS_NOTIFY_EMAIL],
        reply_to=[lead.email],
    ).send()
    Lead.objects.filter(pk=lead.pk).update(notified_at=timezone.now())
    return True
