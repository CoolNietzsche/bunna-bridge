from django.urls import path

from . import views

urlpatterns = [
    path("orgs/me/", views.MyOrganizationView.as_view(), name="org-me"),
    path("orgs/me/members/<int:pk>/", views.MemberDetailView.as_view(), name="org-member"),
    path("orgs/me/invitations/", views.InvitationListCreateView.as_view(), name="org-invitations"),
    path("orgs/me/invitations/<int:pk>/", views.InvitationRevokeView.as_view(), name="org-invitation"),
    path("orgs/invitations/<str:token>/", views.InvitationPublicView.as_view(), name="org-invitation-public"),
    path("orgs/invitations/<str:token>/accept/", views.InvitationAcceptView.as_view(), name="org-invitation-accept"),
    path("orgs/me/compliance/", views.ComplianceDocumentsView.as_view(), name="org-compliance"),
    path("orgs/me/compliance/<uuid:pk>/", views.ComplianceDocumentDetailView.as_view(), name="org-compliance-doc"),
    path("orgs/compliance-reviews/", views.ComplianceReviewListView.as_view(), name="org-compliance-reviews"),
    path("orgs/compliance-reviews/<uuid:pk>/", views.ComplianceReviewDecideView.as_view(),
         name="org-compliance-review"),
]
