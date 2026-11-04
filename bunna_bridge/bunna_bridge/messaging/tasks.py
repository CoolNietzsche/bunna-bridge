from celery import shared_task


@shared_task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def deliver_sms(message_id):
    from .service import _deliver

    _deliver(message_id)
