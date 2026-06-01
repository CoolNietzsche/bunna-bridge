from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SampleRequest, Notification

# Avoid circular import — CoffeeLot imported inside functions


@receiver(post_save, sender=SampleRequest)
def sample_request_notifications(sender, instance, created, **kwargs):
    if created:
        # Notify exporter: new sample request
        Notification.objects.create(
            recipient=instance.lot.exporter,
            notification_type='sample_request',
            title='New Sample Request',
            message=f'{instance.buyer.email} requested a sample of lot {instance.lot.lot_id}.',
            link=f'/samples',
        )
    else:
        # Notify buyer when exporter responds
        if instance.status in ('approved', 'rejected', 'shipped'):
            status_label = instance.status.capitalize()
            Notification.objects.create(
                recipient=instance.buyer,
                notification_type='sample_request',
                title=f'Sample Request {status_label}',
                message=f'Your sample request for lot {instance.lot.lot_id} has been {instance.status}.',
                link=f'/samples',
            )


def create_lot_status_notification(lot, old_status, new_status):
    """Called manually from LotStatusUpdateView."""
    label_map = {
        'listed': 'Listed on Marketplace',
        'contracted': 'Contracted',
        'exported': 'Exported',
        'draft': 'Moved to Draft',
    }
    label = label_map.get(new_status, new_status.capitalize())
    Notification.objects.create(
        recipient=lot.exporter,
        notification_type='lot_status',
        title=f'Lot {label}',
        message=f'Lot {lot.lot_id} ({lot.name}) has moved to {new_status}.',
        link=f'/lots/{lot.id}',
    )


def create_eudr_alert_notification(lot, result):
    """Called manually from compliance check view."""
    if result == 'overlap':
        Notification.objects.create(
            recipient=lot.exporter,
            notification_type='eudr_alert',
            title='EUDR Deforestation Overlap Detected',
            message=f'Lot {lot.lot_id} ({lot.name}) intersects a flagged deforestation zone. Export is blocked.',
            link=f'/lots/{lot.id}',
        )
