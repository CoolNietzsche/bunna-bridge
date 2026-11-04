from django.urls import path

from . import views as v

urlpatterns = [
    path("trade/contracts/", v.ContractListView.as_view(), name="contract-list"),
    path("trade/contracts/<uuid:pk>/", v.ContractDetailView.as_view(), name="contract-detail"),
    path("trade/contracts/<uuid:pk>/send/", v.ContractActionView.as_view(action="send"), name="contract-send"),
    path("trade/contracts/<uuid:pk>/sign/", v.ContractActionView.as_view(action="sign"), name="contract-sign"),
    path("trade/contracts/<uuid:pk>/cancel/", v.ContractActionView.as_view(action="cancel"), name="contract-cancel"),
    path("trade/contracts/<uuid:pk>/register/", v.ContractActionView.as_view(action="register"),
         name="contract-register"),
    path("trade/contracts/<uuid:pk>/pdf/", v.ContractPdfView.as_view(), name="contract-pdf"),
    path("trade/contracts/<uuid:pk>/floor-check/", v.FloorCheckView.as_view(), name="contract-floor-check"),
    path("trade/contracts/<uuid:pk>/samples/", v.SampleListView.as_view(), name="contract-samples"),
    path("trade/contracts/<uuid:pk>/samples/<int:sid>/decide/", v.SampleDecideView.as_view(),
         name="contract-sample-decide"),
    path("trade/contracts/<uuid:pk>/claims/", v.ClaimListView.as_view(), name="contract-claims"),
    path("trade/contracts/<uuid:pk>/claims/<int:cid>/respond/", v.ClaimRespondView.as_view(),
         name="contract-claim-respond"),
    path("trade/contracts/<uuid:pk>/shipments/", v.ShipmentListView.as_view(), name="contract-shipments"),
    path("trade/contracts/<uuid:pk>/payments/", v.PaymentListView.as_view(), name="contract-payments"),
    path("trade/contracts/<uuid:pk>/payments/<int:pid>/", v.PaymentDetailView.as_view(), name="contract-payment"),
    path("trade/shipments/<uuid:sid>/", v.ShipmentDetailView.as_view(), name="shipment-detail"),
    path("trade/shipments/<uuid:sid>/events/", v.ShipmentEventView.as_view(), name="shipment-events"),
    path("trade/shipments/<uuid:sid>/documents/<int:did>/", v.ShipmentDocumentView.as_view(),
         name="shipment-document"),
    path("trade/conversations/", v.ConversationListView.as_view(), name="conversation-list"),
    path("trade/conversations/<uuid:cid>/messages/", v.MessageListView.as_view(), name="conversation-messages"),
    path("trade/conversations/<uuid:cid>/messages/<int:mid>/attachment/", v.MessageAttachmentView.as_view(),
         name="message-attachment"),
    path("trade/floor-prices/", v.FloorPriceView.as_view(), name="floor-prices"),
]
