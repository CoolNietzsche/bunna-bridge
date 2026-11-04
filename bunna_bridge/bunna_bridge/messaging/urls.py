from django.urls import path

from .views import SmsListView

urlpatterns = [path("messaging/sms/", SmsListView.as_view(), name="sms-list")]
