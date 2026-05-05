from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views import defaults as default_views
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # ── Bunna Bridge API ──
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/", include("bunna_bridge.lots.urls")),
    # ── Pages ──
    path("", TemplateView.as_view(template_name="pages/home.html"), name="home"),
    path("about/", TemplateView.as_view(template_name="pages/about.html"), name="about"),
    # ── Django Admin ──
    path(settings.ADMIN_URL, admin.site.urls),
    # ── User management ──
    path("users/", include("bunna_bridge.users.urls", namespace="users")),
    path("accounts/", include("allauth.urls")),
    # ── Media ──
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
]

if settings.DEBUG:
    urlpatterns += [
        path("400/", default_views.bad_request, kwargs={"exception": Exception("Bad Request!")}),
        path("403/", default_views.permission_denied, kwargs={"exception": Exception("Permission Denied")}),
        path("404/", default_views.page_not_found, kwargs={"exception": Exception("Page not Found")}),
        path("500/", default_views.server_error),
    ]
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls)), *urlpatterns]
