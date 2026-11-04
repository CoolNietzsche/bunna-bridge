"""
Traceability API (roadmap Phase 1).

/api/v1/traceability/producers/…   producers, consent, CSV import
/api/v1/traceability/plots/…       plots, re-check, GeoJSON/KML/Shapefile import
/api/v1/traceability/records-export/  5-year record-keeping export (CSV)
/api/v1/lots/<id>/sources/…        which plots a lot came from
/api/v1/lots/<id>/due-diligence/   risk register, sign-off, evidence packages, DDS references
"""

import csv

from django.db import transaction
from django.db.models import Count
from django.db.models import Q
from django.http import FileResponse
from django.http import Http404
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework import permissions
from rest_framework import status
from rest_framework.parsers import FormParser
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.views import is_admin
from bunna_bridge.orgs.access import can
from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids
from bunna_bridge.lots.views import owned_lot_or_404

from . import due_diligence as dd
from .geo import run_plot_checks
from .models import EvidencePackage
from .models import LotRisk
from .models import LotSource
from .models import Plot
from .models import Producer
from .serializers import ConsentSerializer
from .serializers import DdsReferenceSerializer
from .serializers import EvidencePackageSerializer
from .serializers import LotRiskSerializer
from .serializers import LotSourceSerializer
from .serializers import MitigationSerializer
from .serializers import PlotSerializer
from .serializers import ProducerSerializer
from .serializers import SignOffSerializer

# Roles that register producers and build lots.
SUPPLY_ROLES = ("exporter", "roaster", "cooperative", "admin")


class CanManageSupply(permissions.BasePermission):
    message = "Only exporters (and roasters who export) manage producers and plots."

    def has_permission(self, request, view):
        user = request.user
        if not (
            user
            and user.is_authenticated
            and (getattr(user, "role", None) in SUPPLY_ROLES or is_admin(user))
        ):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin(user) or can(user, "manage_supply")


def _truthy(value):
    return str(value).lower() in ("1", "true", "yes", "on")


# ── Producers ────────────────────────────────────────────────────────────────


class ProducerListCreateView(generics.ListCreateAPIView):
    serializer_class = ProducerSerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Producer.objects.all()
            if is_admin(user)
            else Producer.objects.filter(owner_id__in=team_ids(user))
        )
        if not _truthy(self.request.query_params.get("archived", "")):
            qs = qs.filter(archived_at__isnull=True)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(external_ref__icontains=search)
                | Q(kebele__icontains=search)
                | Q(woreda__icontains=search)
                | Q(ectms_farmer_id__icontains=search),
            )
        return (
            qs.annotate(
                active_plots=Count("plots", filter=Q(plots__archived_at__isnull=True)),
            )
            .select_related("owner")
            .prefetch_related("consents")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, created_by=self.request.user)


class ProducerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProducerSerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        user = self.request.user
        return (
            Producer.objects.all()
            if is_admin(user)
            else Producer.objects.filter(owner_id__in=team_ids(user))
        )

    def destroy(self, request, *args, **kwargs):
        """Archive, never delete: EUDR records are kept for 5 years."""
        producer = self.get_object()
        now = timezone.now()
        producer.archived_at = now
        producer.save(update_fields=["archived_at", "updated_at"])
        Plot.objects.filter(producer=producer, archived_at__isnull=True).update(
            archived_at=now,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProducerConsentView(generics.ListCreateAPIView):
    serializer_class = ConsentSerializer
    permission_classes = [CanManageSupply]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_producer(self):
        user = self.request.user
        qs = (
            Producer.objects.all()
            if is_admin(user)
            else Producer.objects.filter(owner_id__in=team_ids(user))
        )
        return get_object_or_404(qs, pk=self.kwargs["pk"])

    def get_queryset(self):
        return self.get_producer().consents.select_related("captured_by")

    def perform_create(self, serializer):
        producer = self.get_producer()
        with transaction.atomic():
            purpose = serializer.validated_data["purpose"]
            # A new record supersedes earlier ones for the same purpose.
            producer.consents.filter(purpose=purpose, revoked_at__isnull=True).update(
                revoked_at=timezone.now(),
            )
            serializer.save(producer=producer, captured_by=self.request.user)


class ProducerImportView(APIView):
    """POST a CSV of producers (optionally with lat/lon/area per row). ?dry_run=1 validates only."""

    permission_classes = [CanManageSupply]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from .importers import import_producers_csv

        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {"detail": "Attach a CSV file in the 'file' field."}, status=400,
            )
        dry_run = _truthy(
            request.data.get("dry_run", request.query_params.get("dry_run", "")),
        )
        result = import_producers_csv(upload, request.user, dry_run=dry_run)
        result["saved"] = not dry_run and not result["errors"]
        return Response(result, status=200 if not result["errors"] or dry_run else 400)


# ── Plots ────────────────────────────────────────────────────────────────────


def _plots_for(user):
    qs = Plot.objects.select_related("producer")
    return qs if is_admin(user) else qs.filter(producer__owner_id__in=team_ids(user))


class PlotListCreateView(generics.ListCreateAPIView):
    serializer_class = PlotSerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        params = self.request.query_params
        if _truthy(params.get("available", "")):
            # Plots usable as lot sources: own team's plus those bought from cooperatives.
            from .access import available_plots

            qs = available_plots(self.request.user, Plot.objects.select_related("producer"))
        else:
            qs = _plots_for(self.request.user)
        if not _truthy(params.get("archived", "")):
            qs = qs.filter(archived_at__isnull=True)
        if params.get("producer"):
            qs = qs.filter(producer_id=params["producer"])
        if params.get("status"):
            qs = qs.filter(deforestation_status=params["status"])
        search = params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(producer__name__icontains=search)
                | Q(ectms_farm_id__icontains=search),
            )
        return qs.prefetch_related("lot_sources__lot")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlotSerializer
    permission_classes = [CanManageSupply]

    def get_queryset(self):
        return _plots_for(self.request.user)

    def destroy(self, request, *args, **kwargs):
        plot = self.get_object()
        plot.archived_at = timezone.now()
        plot.save(update_fields=["archived_at", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlotRecheckView(APIView):
    permission_classes = [CanManageSupply]

    def post(self, request, pk):
        plot = get_object_or_404(_plots_for(request.user), pk=pk)
        result = run_plot_checks(plot)
        plot.save()
        data = PlotSerializer(plot, context={"request": request}).data
        data["check_message"] = result["message"]
        return Response(data)


class PlotImportView(APIView):
    """POST GeoJSON / KML / zipped Shapefile of plots. ?dry_run=1 validates only."""

    permission_classes = [CanManageSupply]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from .importers import import_plots_file

        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {
                    "detail": "Attach a GeoJSON, KML or zipped Shapefile in the 'file' field.",
                },
                status=400,
            )
        dry_run = _truthy(
            request.data.get("dry_run", request.query_params.get("dry_run", "")),
        )
        producer_id = request.data.get("producer") or None
        result = import_plots_file(
            upload, request.user, dry_run=dry_run, producer_id=producer_id,
        )
        result["saved"] = not dry_run and not result["errors"]
        return Response(result, status=200 if not result["errors"] or dry_run else 400)


# ── Lot sources ──────────────────────────────────────────────────────────────


class LotSourceListCreateView(generics.ListCreateAPIView):
    serializer_class = LotSourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_lot(self):
        if not hasattr(self, "_lot"):
            self._lot = owned_lot_or_404(self.request, self.kwargs["lot_pk"])
        return self._lot

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["lot"] = self.get_lot()
        return ctx

    def get_queryset(self):
        return LotSource.objects.filter(lot=self.get_lot()).select_related(
            "plot", "plot__producer",
        )

    def perform_create(self, serializer):
        serializer.save(lot=self.get_lot(), created_by=self.request.user)


class LotSourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LotSourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_lot(self):
        if not hasattr(self, "_lot"):
            self._lot = owned_lot_or_404(self.request, self.kwargs["lot_pk"])
        return self._lot

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["lot"] = self.get_lot()
        return ctx

    def get_queryset(self):
        return LotSource.objects.filter(lot=self.get_lot()).select_related(
            "plot", "plot__producer",
        )


class ConvertLegacyLotView(APIView):
    """
    Turn a lot's single farm point/polygon into a registered producer + plot +
    source covering the whole lot volume, so it can use the evidence package.
    """

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, lot_pk):
        lot = owned_lot_or_404(request, lot_pk)
        if dd.lot_has_sources(lot):
            return Response(
                {"detail": "This lot already has supply sources."}, status=400,
            )
        if not (lot.boundary or lot.farm_location):
            return Response(
                {
                    "detail": "The lot has no farm location to convert. Add plots instead.",
                },
                status=400,
            )
        farmer = lot.farmer if lot.farmer_id else None
        ref = farmer.farm_id if farmer and farmer.farm_id else ""
        producer = None
        if ref:
            producer = Producer.objects.filter(
                owner=lot.exporter, external_ref=ref,
            ).first()
        if producer is None:
            producer = Producer.objects.create(
                owner=lot.exporter,
                user=farmer
                if farmer and not Producer.objects.filter(user=farmer).exists()
                else None,
                external_ref=ref,
                name=(farmer.get_full_name() or farmer.farm_name or farmer.email)
                if farmer
                else (lot.kebele or lot.name),
                region=lot.get_region_display(),
                kebele=lot.kebele,
                created_by=request.user,
            )
        boundary = None
        if lot.boundary:
            boundary = lot.boundary.clone()
            boundary.srid = 4326
        plot = Plot.objects.create(
            producer=producer,
            name=f"{lot.lot_id} plot",
            boundary=boundary,
            location=None if boundary else lot.farm_location,
            declared_area_ha=(
                farmer.farm_size_ha
                if farmer and getattr(farmer, "farm_size_ha", None)
                else None
            ),
            created_by=request.user,
        )
        LotSource.objects.create(
            lot=lot, plot=plot, quantity_kg=lot.volume_kg, created_by=request.user,
        )
        lot.refresh_from_db()
        return Response(
            {
                "detail": "Converted to a registered producer and plot.",
                "producer": str(producer.pk),
                "plot": str(plot.pk),
            },
            status=201,
        )


# ── Due diligence ────────────────────────────────────────────────────────────


def _contracted_buyer(lot, user):
    return lot.offers.filter(buyer_id__in=team_ids(user), status="accepted").first()


def _lot_for_due_diligence(request, lot_pk):
    """(lot, is_owner). Owners/admins get everything; contracted buyers get packages + references."""
    lot = get_object_or_404(CoffeeLot.objects.select_related("exporter"), pk=lot_pk)
    if is_admin(request.user) or same_team(request.user, lot.exporter_id):
        return lot, True
    if _contracted_buyer(lot, request.user) is not None:
        return lot, False
    raise Http404


class DueDiligenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, lot_pk):
        lot, is_owner = _lot_for_due_diligence(request, lot_pk)
        risks = dd.sync_risks(lot) if is_owner else list(lot.risks.all())
        package = dd.current_package(lot)
        data = {
            "lot": str(lot.pk),
            "lot_id": lot.lot_id,
            "is_owner": is_owner,
            "summary": dd.due_diligence_summary(lot),
            "risks": LotRiskSerializer(
                sorted(
                    risks,
                    key=lambda r: (
                        r.status != "open",
                        {"high": 0, "medium": 1, "low": 2}[r.severity],
                    ),
                ),
                many=True,
            ).data,
            "signoff": None,
            "signoff_current": False,
            "package_blockers": dd.package_blockers(lot) if is_owner else [],
            "packages": EvidencePackageSerializer(
                lot.evidence_packages.select_related("generated_by")[:10],
                many=True,
                context={"current_package_id": package.pk if package else None},
            ).data,
            "dds_references": DdsReferenceSerializer(
                lot.dds_references.select_related("recorded_by"),
                many=True,
            ).data,
            "can_record_reference": (not is_owner) or is_admin(request.user),
        }
        latest = lot.risk_signoffs.select_related("signed_by").first()
        if latest is not None:
            data["signoff"] = SignOffSerializer(latest).data
            data["signoff_current"] = dd.current_signoff(lot) is not None
        return Response(data)


class LotRiskCreateView(APIView):
    """Add a manual risk (something the exporter knows that the platform can't detect)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lot_pk):
        lot = owned_lot_or_404(request, lot_pk)
        serializer = LotRiskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        n = lot.risks.filter(automatic=False).count() + 1
        risk = serializer.save(lot=lot, automatic=False, code=f"manual-{n}")
        lot.save(actor=request.user)
        return Response(LotRiskSerializer(risk).data, status=201)


class LotRiskDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, lot_pk, pk):
        lot = owned_lot_or_404(request, lot_pk)
        risk = get_object_or_404(LotRisk, lot=lot, pk=pk)
        serializer = LotRiskSerializer(risk, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        lot.save(actor=request.user)
        return Response(LotRiskSerializer(risk).data)


class MitigationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, lot_pk, pk):
        lot = owned_lot_or_404(request, lot_pk)
        risk = get_object_or_404(LotRisk, lot=lot, pk=pk)
        serializer = MitigationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(risk=risk, performed_by=request.user)
        if (
            _truthy(request.data.get("mark_mitigated", ""))
            and risk.status == LotRisk.Status.OPEN
        ):
            risk.status = LotRisk.Status.MITIGATED
            risk.save(update_fields=["status", "updated_at"])
            lot.save(actor=request.user)
        return Response(LotRiskSerializer(risk).data, status=201)


class SignOffView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lot_pk):
        lot = owned_lot_or_404(request, lot_pk)
        if not dd.lot_has_sources(lot):
            return Response(
                {
                    "detail": "Add supply sources before signing off the risk assessment.",
                },
                status=400,
            )
        dd.sync_risks(lot)
        high = dd.open_high_risks(lot)
        if high.exists():
            return Response(
                {
                    "detail": "Mitigate every high risk before signing off.",
                    "open_high_risks": [r.title for r in high],
                },
                status=400,
            )
        open_other = lot.risks.filter(status=LotRisk.Status.OPEN).exclude(
            code="country_standard_risk",
        )
        if open_other.exists():
            return Response(
                {
                    "detail": "Mitigate or accept (with justification) every open risk before signing off.",
                    "open_risks": [r.title for r in open_other],
                },
                status=400,
            )
        serializer = SignOffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signoff = serializer.save(
            lot=lot,
            signed_by=request.user,
            register_fingerprint=dd.register_fingerprint(lot),
        )
        lot.save(actor=request.user)
        return Response(SignOffSerializer(signoff).data, status=201)


class EvidencePackageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lot_pk):
        lot = owned_lot_or_404(request, lot_pk)
        lot.save(actor=request.user)  # make sure gates + register are current
        blockers = dd.package_blockers(lot)
        if blockers:
            return Response(
                {"detail": " ".join(blockers), "blockers": blockers}, status=400,
            )
        missing_consent = [
            s.plot.producer.name
            for s in dd.lot_sources(lot)
            if not s.plot.producer.current_consent("eudr_sharing")
        ]
        if missing_consent:
            return Response(
                {
                    "detail": "Record EUDR data-sharing consent for every producer first.",
                    "producers": sorted(set(missing_consent)),
                },
                status=400,
            )
        from .package import build_package

        package = build_package(lot, request.user)
        lot.save(actor=request.user)
        for offer in lot.offers.filter(status="accepted").select_related("buyer"):
            Notification.objects.create(
                recipient=offer.buyer,
                notification_type="eudr_alert",
                title="EUDR evidence package ready",
                message=f"The due-diligence evidence for lot {lot.lot_id} is ready to download for your DDS.",
                link=f"/marketplace/{lot.pk}",
            )
        return Response(
            EvidencePackageSerializer(
                package, context={"current_package_id": package.pk},
            ).data,
            status=201,
        )


class EvidencePackageDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, lot_pk, pk):
        lot, _ = _lot_for_due_diligence(request, lot_pk)
        package = get_object_or_404(EvidencePackage, lot=lot, pk=pk)
        return FileResponse(
            package.file.open("rb"),
            as_attachment=True,
            filename=package.file.name.rsplit("/", 1)[-1],
            content_type="application/zip",
        )


class DdsReferenceCreateView(APIView):
    """The EU importer records the DDS reference it got from the EU Information System."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lot_pk):
        lot, is_owner = _lot_for_due_diligence(request, lot_pk)
        offer = _contracted_buyer(lot, request.user)
        if is_owner and not is_admin(request.user):
            return Response(
                {
                    "detail": "The EU importer records the DDS reference, not the exporter.",
                },
                status=403,
            )
        serializer = DdsReferenceSerializer(data=request.data, context={"lot": lot})
        serializer.is_valid(raise_exception=True)
        reference = serializer.save(
            lot=lot,
            offer=offer,
            recorded_by=request.user,
            package=dd.current_package(lot),
        )
        Notification.objects.create(
            recipient=lot.exporter,
            notification_type="eudr_alert",
            title="DDS reference recorded",
            message=f"{request.user.company_name or request.user.email} filed the EUDR DDS for lot "
            f"{lot.lot_id}: {reference.reference_number}.",
            link=f"/lots/{lot.pk}",
        )
        return Response(DdsReferenceSerializer(reference).data, status=201)


# ── Records export (5-year retention) ────────────────────────────────────────


class RecordsExportView(APIView):
    """CSV of every lot source (archived included): lot, producer, plot, kg, package, DDS reference."""

    permission_classes = [CanManageSupply]

    def get(self, request):
        sources = LotSource.objects.select_related(
            "lot", "plot", "plot__producer",
        ).order_by(
            "lot__created_at",
            "plot__producer__name",
        )
        if not is_admin(request.user):
            sources = sources.filter(lot__exporter_id__in=team_ids(request.user))
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="beersheba-eudr-records-{timezone.localdate():%Y%m%d}.csv"'
        )
        writer = csv.writer(response)
        writer.writerow(
            [
                "lot_id",
                "lot_status",
                "lot_archived",
                "harvest_date",
                "lot_volume_kg",
                "producer",
                "producer_ref",
                "plot_id",
                "plot_name",
                "geometry_type",
                "kg_from_plot",
                "delivery_reference",
                "forest_loss_check",
                "latest_package_sha256",
                "dds_references",
            ],
        )
        packages = {}
        refs = {}
        for s in sources:
            lot = s.lot
            if lot.pk not in packages:
                pkg = lot.evidence_packages.first()
                packages[lot.pk] = pkg.sha256 if pkg else ""
                refs[lot.pk] = "; ".join(
                    lot.dds_references.values_list("reference_number", flat=True),
                )
            writer.writerow(
                [
                    lot.lot_id,
                    lot.status,
                    "yes" if lot.archived_at else "no",
                    lot.harvest_date,
                    lot.volume_kg,
                    s.plot.producer.name,
                    s.plot.producer.external_ref,
                    s.plot_id,
                    s.plot.name,
                    s.plot.geometry_type or "",
                    s.quantity_kg,
                    s.delivery_reference,
                    s.plot.deforestation_status,
                    packages[lot.pk],
                    refs[lot.pk],
                ],
            )
        return response
