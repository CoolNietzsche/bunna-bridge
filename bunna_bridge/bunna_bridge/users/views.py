from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from .serializers import UserSerializer, RegisterSerializer, ExporterPublicSerializer
from .serializers import FarmerSerializer, CertificationSerializer
from .models import Certification
User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def user_list(request):
    users = User.objects.all().order_by("role", "email")
    return Response(UserSerializer(users, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def farmer_list(request):
    """Farmers available for an exporter to link when assembling a lot."""
    if request.user.role not in ("exporter", "admin") and not request.user.is_staff:
        return Response({"detail": "Not allowed."}, status=403)
    farmers = User.objects.filter(role="farmer").order_by("farm_name", "email")
    return Response(FarmerSerializer(farmers, many=True).data)


class FarmerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        user = self.get_object()
        if user.role != "farmer" and not user.is_staff:
            return Response({"detail": "Not a farmer account."}, status=403)
        return super().get(request, *args, **kwargs)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def farmer_lots(request):
    from bunna_bridge.lots.models import CoffeeLot
    from bunna_bridge.lots.serializers import CoffeeLotListSerializer
    user = request.user

    heuristic = Q(pk__in=[])
    if user.farm_kebele:
        heuristic = Q(farmer__isnull=True, kebele__icontains=user.farm_kebele)
    elif user.farm_region:
        heuristic = Q(farmer__isnull=True, region=user.farm_region)

    qs = CoffeeLot.objects.filter(Q(farmer=user) | heuristic)
    return Response(CoffeeLotListSerializer(qs, many=True).data)


class RoasterProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        user = self.get_object()
        if user.role != "roaster" and not user.is_staff:
            return Response({"detail": "Not a roaster account."}, status=403)
        return super().get(request, *args, **kwargs)


class ExporterProfileView(generics.RetrieveAPIView):
    serializer_class   = ExporterPublicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return generics.get_object_or_404(
            User, id=self.kwargs["pk"], role="exporter"
        )

class ExporterLotsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from bunna_bridge.lots.models import CoffeeLot
        return CoffeeLot.objects.filter(
            exporter_id=self.kwargs["pk"],
            status__in=["listed", "contracted", "exported"]
        ).order_by("-created_at")

    def get_serializer_class(self):
        from bunna_bridge.lots.serializers import CoffeeLotListSerializer
        return CoffeeLotListSerializer


class CertificationListCreateView(generics.ListCreateAPIView):
    serializer_class   = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Certification.objects.filter(holder=self.request.user)

    def perform_create(self, serializer):
        serializer.save(holder=self.request.user)


class CertificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Certification.objects.filter(holder=self.request.user)


class ExporterEctaLicenseDownloadView(generics.GenericAPIView):
    """
    Owner/admin-only download of an exporter's ECTA license file.
    The storage path (users/ecta/) is blocked at the nginx layer — this is
    the only way to fetch it.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        exporter = generics.get_object_or_404(User, id=pk, role="exporter")
        is_owner_or_admin = (
            request.user.role == "admin"
            or request.user.is_staff
            or request.user == exporter
        )
        if not is_owner_or_admin:
            return Response({"detail": "Not allowed."}, status=403)
        if not exporter.ecta_license_file:
            return Response({"detail": "No license file uploaded."}, status=404)

        from django.http import FileResponse
        return FileResponse(
            exporter.ecta_license_file.open("rb"),
            filename=exporter.ecta_license_file.name.rsplit("/", 1)[-1],
        )
