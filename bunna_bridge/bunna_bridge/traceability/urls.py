from django.urls import path

from . import ectms
from . import field_sync
from . import supply_views
from . import views

urlpatterns = [
    path(
        "traceability/producers/",
        views.ProducerListCreateView.as_view(),
        name="producer-list",
    ),
    path(
        "traceability/producers/import/",
        views.ProducerImportView.as_view(),
        name="producer-import",
    ),
    path(
        "traceability/producers/<uuid:pk>/",
        views.ProducerDetailView.as_view(),
        name="producer-detail",
    ),
    path(
        "traceability/producers/<uuid:pk>/consents/",
        views.ProducerConsentView.as_view(),
        name="producer-consents",
    ),
    path("traceability/plots/", views.PlotListCreateView.as_view(), name="plot-list"),
    path(
        "traceability/plots/import/", views.PlotImportView.as_view(), name="plot-import",
    ),
    path(
        "traceability/plots/<uuid:pk>/",
        views.PlotDetailView.as_view(),
        name="plot-detail",
    ),
    path(
        "traceability/plots/<uuid:pk>/recheck/",
        views.PlotRecheckView.as_view(),
        name="plot-recheck",
    ),
    path(
        "traceability/records-export/",
        views.RecordsExportView.as_view(),
        name="records-export",
    ),
    path(
        "lots/<uuid:lot_pk>/sources/",
        views.LotSourceListCreateView.as_view(),
        name="lot-sources",
    ),
    path(
        "lots/<uuid:lot_pk>/sources/convert-legacy/",
        views.ConvertLegacyLotView.as_view(),
        name="lot-sources-convert",
    ),
    path(
        "lots/<uuid:lot_pk>/sources/<uuid:pk>/",
        views.LotSourceDetailView.as_view(),
        name="lot-source-detail",
    ),
    path(
        "lots/<uuid:lot_pk>/due-diligence/",
        views.DueDiligenceView.as_view(),
        name="lot-due-diligence",
    ),
    path(
        "lots/<uuid:lot_pk>/risks/",
        views.LotRiskCreateView.as_view(),
        name="lot-risk-create",
    ),
    path(
        "lots/<uuid:lot_pk>/risks/<int:pk>/",
        views.LotRiskDetailView.as_view(),
        name="lot-risk-detail",
    ),
    path(
        "lots/<uuid:lot_pk>/risks/<int:pk>/mitigations/",
        views.MitigationCreateView.as_view(),
        name="lot-risk-mitigations",
    ),
    path(
        "lots/<uuid:lot_pk>/sign-off/", views.SignOffView.as_view(), name="lot-signoff",
    ),
    path(
        "lots/<uuid:lot_pk>/evidence-packages/",
        views.EvidencePackageView.as_view(),
        name="lot-evidence-packages",
    ),
    path(
        "lots/<uuid:lot_pk>/evidence-packages/<uuid:pk>/download/",
        views.EvidencePackageDownloadView.as_view(),
        name="lot-evidence-package-download",
    ),
    path(
        "lots/<uuid:lot_pk>/dds-references/",
        views.DdsReferenceCreateView.as_view(),
        name="lot-dds-references",
    ),
    path("traceability/deliveries/", supply_views.DeliveryListCreateView.as_view(), name="delivery-list"),
    path("traceability/deliveries/<uuid:pk>/", supply_views.DeliveryDetailView.as_view(), name="delivery-detail"),
    path("traceability/my-deliveries/", supply_views.MyDeliveriesView.as_view(), name="my-deliveries"),
    path("traceability/transfers/", supply_views.TransferListCreateView.as_view(), name="transfer-list"),
    path("traceability/transfers/<uuid:pk>/respond/", supply_views.TransferRespondView.as_view(),
         name="transfer-respond"),
    path("traceability/transfers/<uuid:pk>/cancel/", supply_views.TransferCancelView.as_view(),
         name="transfer-cancel"),
    path("traceability/ectms/import/", ectms.EctmsImportView.as_view(), name="ectms-import"),
    path("traceability/ectms/farms/<str:farm_id>/", ectms.EctmsLookupView.as_view(), name="ectms-lookup"),
    path("traceability/field-sync/", field_sync.FieldSyncView.as_view(), name="field-sync"),
    path("traceability/exporters/", supply_views.ExporterChoicesView.as_view(), name="exporter-choices"),
    path("lots/<uuid:lot_pk>/allocate-deliveries/", supply_views.AllocateDeliveriesView.as_view(),
         name="lot-allocate-deliveries"),
]
