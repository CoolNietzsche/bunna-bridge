from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, RegisterSerializer, ExporterPublicSerializer
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
    qs = CoffeeLot.objects.filter(
        kebele__icontains=user.farm_kebele
    ) if user.farm_kebele else CoffeeLot.objects.filter(
        region=user.farm_region
    ) if user.farm_region else CoffeeLot.objects.none()
    return Response(CoffeeLotListSerializer(qs, many=True).data)


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
