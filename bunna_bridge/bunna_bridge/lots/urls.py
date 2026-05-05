from rest_framework.routers import DefaultRouter
from .views import CoffeeLotViewSet

router = DefaultRouter()
router.register(r"lots", CoffeeLotViewSet, basename="lot")

urlpatterns = router.urls
