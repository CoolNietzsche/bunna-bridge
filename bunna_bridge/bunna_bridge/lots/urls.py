from rest_framework.routers import DefaultRouter
from .views import CoffeeLotViewSet, CuppingScoreViewSet, SettlementView
from django.urls import path

router = DefaultRouter()
router.register(r"lots",           CoffeeLotViewSet,    basename="lot")
router.register(r"cupping-scores", CuppingScoreViewSet, basename="cupping-score")

urlpatterns = router.urls + [
    path(
        "lots/<uuid:lot_pk>/settlement/",
        SettlementView.as_view({"post": "create"}),
        name="lot-settlement",
    ),
]
