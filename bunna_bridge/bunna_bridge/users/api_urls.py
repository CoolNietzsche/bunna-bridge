from django.urls import path
from .views import RegisterView, MeView, user_list

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/",       MeView.as_view(),       name="me"),
    path("users/",    user_list,              name="user-list"),
]
