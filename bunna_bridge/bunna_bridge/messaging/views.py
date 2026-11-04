from rest_framework import generics
from rest_framework import serializers

from bunna_bridge.lots.views import is_admin
from bunna_bridge.orgs.access import team_ids
from bunna_bridge.traceability.views import CanManageSupply

from .models import SmsMessage


class SmsSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = SmsMessage
        fields = ["id", "to", "body", "language", "kind", "kind_label", "status", "error", "created_at", "sent_at"]


class SmsListView(generics.ListAPIView):
    """Messages sent to the team's producers (?producer=<id>)."""

    serializer_class = SmsSerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        qs = SmsMessage.objects.all()
        if not is_admin(self.request.user):
            qs = qs.filter(producer__owner_id__in=team_ids(self.request.user))
        producer = self.request.query_params.get("producer")
        if producer:
            qs = qs.filter(producer_id=producer)
        return qs
