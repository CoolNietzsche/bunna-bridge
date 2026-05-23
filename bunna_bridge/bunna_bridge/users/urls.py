from django.urls import path
from bunna_bridge.users.views import MeView

app_name = "users"

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
]
