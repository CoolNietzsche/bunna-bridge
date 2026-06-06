from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CoffeeLotViewSet, CuppingScoreViewSet,
    SettlementView, SampleRequestViewSet,
    LotStatusUpdateView, EudrDdsView,
    LotBoundaryView, LotBoundaryInheritView,
    NotificationListView, notification_unread_count,
    notification_mark_read, notification_mark_all_read,
)
from .offer_views import (
    OfferListCreateView,
    OfferDetailView,
    OfferRespondView,
    OfferWithdrawView,
    OfferAcceptCounterView,
)

router = DefaultRouter()
router.register(r"lots",            CoffeeLotViewSet,      basename="lot")
router.register(r"cupping-scores",  CuppingScoreViewSet,   basename="cupping-score")
router.register(r"sample-requests", SampleRequestViewSet,  basename="sample-request")

urlpatterns = router.urls + [
    path("lots/<uuid:lot_pk>/settlement/",
         SettlementView.as_view({"post": "create"}),          name="lot-settlement"),
    path("lots/<uuid:lot_pk>/status/",
         LotStatusUpdateView.as_view({"patch": "partial_update"}), name="lot-status"),
    path("lots/<uuid:lot_pk>/eudr-dds/",
         EudrDdsView.as_view({"get": "retrieve"}),            name="lot-eudr-dds"),
    path("lots/<uuid:lot_pk>/boundary/",
         LotBoundaryView.as_view(),                           name="lot-boundary"),
    path("lots/<uuid:lot_pk>/boundary/inherit/",
         LotBoundaryInheritView.as_view(),                    name="lot-boundary-inherit"),
    path("notifications/",
         NotificationListView.as_view(),                      name="notification-list"),
    path("notifications/unread-count/",
         notification_unread_count,                           name="notification-unread-count"),
    path("notifications/read-all/",
         notification_mark_all_read,                          name="notification-read-all"),
    path("notifications/<int:pk>/read/",
         notification_mark_read,                              name="notification-read"),
    # ── Offers ──────────────────────────────────────────────────────────────
    path("offers/",
         OfferListCreateView.as_view(),                       name="offer-list-create"),
    path("offers/<uuid:pk>/",
         OfferDetailView.as_view(),                           name="offer-detail"),
    path("offers/<uuid:pk>/respond/",
         OfferRespondView.as_view(),                          name="offer-respond"),
    path("offers/<uuid:pk>/withdraw/",
         OfferWithdrawView.as_view(),                         name="offer-withdraw"),
    path("offers/<uuid:pk>/accept-counter/",
         OfferAcceptCounterView.as_view(),                    name="offer-accept-counter"),
]
