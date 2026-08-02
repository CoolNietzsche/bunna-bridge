from django.urls import path

from .views import (
    AvailableLotsView,
    RoastBatchDetailView,
    RoastBatchListCreateView,
    RoastBatchStatusUpdateView,
    RoastEquipmentDetailView,
    RoastEquipmentListCreateView,
)

urlpatterns = [
    path("roasting/equipment/",
         RoastEquipmentListCreateView.as_view(),          name="roast-equipment-list"),
    path("roasting/equipment/<uuid:pk>/",
         RoastEquipmentDetailView.as_view(),               name="roast-equipment-detail"),
    path("roasting/batches/",
         RoastBatchListCreateView.as_view(),                name="roast-batch-list"),
    path("roasting/batches/<uuid:pk>/",
         RoastBatchDetailView.as_view(),                    name="roast-batch-detail"),
    path("roasting/batches/<uuid:batch_pk>/status/",
         RoastBatchStatusUpdateView.as_view({"patch": "partial_update"}), name="roast-batch-status"),
    path("roasting/available-lots/",
         AvailableLotsView.as_view(),                        name="roast-available-lots"),
]
