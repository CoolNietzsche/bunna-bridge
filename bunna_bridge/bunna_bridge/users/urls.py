from django.urls import path
from bunna_bridge.users.views import MeView, ExporterProfileView, ExporterLotsView

app_name = "users"
urlpatterns = [
    path("me/",                          MeView.as_view(),            name="me"),
    path("exporters/<int:pk>/",          ExporterProfileView.as_view(), name="exporter-profile"),
    path("exporters/<int:pk>/lots/",     ExporterLotsView.as_view(),    name="exporter-lots"),
]
