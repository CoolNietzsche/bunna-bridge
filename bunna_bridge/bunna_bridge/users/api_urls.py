from django.urls import path
from .views import RegisterView, MeView, user_list, FarmerProfileView, farmer_lots

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/",       MeView.as_view(),       name="me"),
    path("users/",    user_list,              name="user-list"),
    path("farmer/profile/", FarmerProfileView.as_view(), name="farmer-profile"),
    path("farmer/lots/",    farmer_lots,                  name="farmer-lots"),
]
