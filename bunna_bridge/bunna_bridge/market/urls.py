from django.urls import path

from . import views as v

urlpatterns = [
    path("market/select/", v.ProgrammeListView.as_view(), name="select-list"),
    path("market/select/<uuid:pk>/", v.ProgrammeDetailView.as_view(), name="select-detail"),
    path("market/select/<uuid:pk>/nominate/", v.NominateView.as_view(), name="select-nominate"),
    path("market/select/<uuid:pk>/start-jury/", v.ProgrammeStepView.as_view(step="jury"), name="select-start-jury"),
    path("market/select/<uuid:pk>/publish/", v.ProgrammeStepView.as_view(step="publish"), name="select-publish"),
    path("market/select/<uuid:pk>/start-auction/", v.ProgrammeStepView.as_view(step="auction"),
         name="select-start-auction"),
    path("market/select/entries/<int:eid>/bid/", v.BidView.as_view(), name="select-bid"),
    path("market/stock/", v.StockListView.as_view(), name="stock-list"),
    path("market/stock/<uuid:pk>/", v.StockDetailView.as_view(), name="stock-detail"),
    path("market/orders/", v.OrderListView.as_view(), name="stock-orders"),
    path("market/orders/<uuid:pk>/<str:action>/", v.OrderActionView.as_view(), name="stock-order-action"),
    path("market/watchlist/", v.WatchlistView.as_view(), name="watchlist"),
    path("market/watchlist/<uuid:lot_pk>/", v.WatchToggleView.as_view(), name="watchlist-item"),
    path("market/saved-searches/", v.SavedSearchListView.as_view(), name="saved-searches"),
    path("market/saved-searches/<int:pk>/", v.SavedSearchDetailView.as_view(), name="saved-search"),
    path("market/lots/<uuid:lot_pk>/impact/", v.ImpactView.as_view(), name="lot-impact"),
    path("market/exporters/<int:user_id>/reliability-score/", v.ReliabilityScoreView.as_view(),
         name="reliability-score"),
    path("market/leads/", v.LeadCreateView.as_view(), name="lead-create"),
    path("market/articles/", v.ArticleListView.as_view(), name="article-list"),
    path("market/articles/<slug:slug>/", v.ArticleDetailView.as_view(), name="article-detail"),
]
