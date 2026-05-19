from rest_framework.routers import DefaultRouter
from .views import (
    CoffeeLotViewSet, CuppingScoreViewSet,
    SettlementView, SampleRequestViewSet,
    LotStatusUpdateView, EudrDdsView,
)
from django.urls import path

router = DefaultRouter()
router.register(r"lots",            CoffeeLotViewSet,      basename="lot")
router.register(r"cupping-scores",  CuppingScoreViewSet,   basename="cupping-score")
router.register(r"sample-requests", SampleRequestViewSet,  basename="sample-request")

urlpatterns = router.urls + [
    path(
        "lots/<uuid:lot_pk>/settlement/",
        SettlementView.as_view({"post": "create"}),
        name="lot-settlement",
    ),
    path(
        "lots/<uuid:lot_pk>/status/",
        LotStatusUpdateView.as_view({"patch": "partial_update"}),
        name="lot-status",
    ),
    path(
        "lots/<uuid:lot_pk>/eudr-dds/",
        EudrDdsView.as_view({"get": "retrieve"}),
        name="lot-eudr-dds",
    ),
]
