from django.urls import path
from .views import (
    RegisterView, MeView, user_list, FarmerProfileView, farmer_lots, farmer_list,
    RoasterProfileView,
    ExporterProfileView, ExporterLotsView, ExporterEctaLicenseDownloadView,
    CertificationListCreateView, CertificationDetailView,
)

urlpatterns = [
    path("register/",               RegisterView.as_view(),      name="register"),
    path("me/",                     MeView.as_view(),            name="me"),
    path("users/",                  user_list,                   name="user-list"),
    path("farmer/profile/",         FarmerProfileView.as_view(), name="farmer-profile"),
    path("farmer/lots/",            farmer_lots,                 name="farmer-lots"),
    path("farmers/",                farmer_list,                 name="farmer-list"),
    path("roaster/profile/",        RoasterProfileView.as_view(), name="roaster-profile"),
    path("exporters/<int:pk>/",     ExporterProfileView.as_view(), name="exporter-profile"),
    path("exporters/<int:pk>/lots/",ExporterLotsView.as_view(),    name="exporter-lots"),
    path("exporters/<int:pk>/ecta-license/",
         ExporterEctaLicenseDownloadView.as_view(),         name="exporter-ecta-license"),
    path("certifications/",         CertificationListCreateView.as_view(), name="certification-list"),
    path("certifications/<uuid:pk>/", CertificationDetailView.as_view(),   name="certification-detail"),
]
