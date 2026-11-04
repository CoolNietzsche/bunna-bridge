from celery import shared_task


@shared_task()
def close_due_auctions():
    """Close Beersheba Select auction lots whose time has passed (runs every few minutes)."""
    from .services import close_due

    return close_due()
