from django.urls import path

from . import views as v

urlpatterns = [
    path("quality/reference/", v.ReferenceView.as_view(), name="quality-reference"),
    path("quality/lots/<uuid:lot_pk>/cva/", v.LotCvaView.as_view(), name="lot-cva"),
    path("quality/lots/<uuid:lot_pk>/physical/", v.LotPhysicalView.as_view(), name="lot-physical"),
    path("quality/cva/<uuid:pk>/confirm/", v.CvaConfirmView.as_view(), name="cva-confirm"),
    path("quality/contract-samples/<int:sid>/cva/", v.ContractSampleCvaView.as_view(), name="contract-sample-cva"),
    path("quality/contract-samples/<int:sid>/physical/", v.ContractSamplePhysicalView.as_view(),
         name="contract-sample-physical"),
    path("quality/contracts/<uuid:pk>/comparison/", v.ComparisonView.as_view(), name="contract-comparison"),
    path("quality/exporters/<int:user_id>/reliability/", v.ReliabilityView.as_view(), name="exporter-reliability"),
    path("quality/sessions/", v.SessionListView.as_view(), name="session-list"),
    path("quality/sessions/<uuid:pk>/", v.SessionDetailView.as_view(), name="session-detail"),
    path("quality/sessions/<uuid:pk>/status/", v.SessionStatusView.as_view(), name="session-status"),
    path("quality/sessions/<uuid:pk>/samples/", v.SessionSamplesView.as_view(), name="session-samples"),
    path("quality/sessions/<uuid:pk>/samples/<int:sid>/", v.SessionSampleDeleteView.as_view(),
         name="session-sample"),
    path("quality/sessions/<uuid:pk>/samples/<int:sid>/score/", v.SessionScoreView.as_view(), name="session-score"),
    path("quality/sessions/<uuid:pk>/samples/<int:sid>/publish/", v.SessionPublishView.as_view(),
         name="session-publish"),
    path("quality/sessions/<uuid:pk>/graders/", v.SessionGradersView.as_view(), name="session-graders"),
    path("quality/sessions/<uuid:pk>/graders/<int:gid>/", v.SessionGraderDeleteView.as_view(),
         name="session-grader"),
]
