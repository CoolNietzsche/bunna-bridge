"""
Quality data API (roadmap Phase 4) — /api/v1/quality/...

reference/                               defect table, screen sizes, CVA categories
lots/<lot>/cva/  · lots/<lot>/physical/  list / record for a lot
cva/<id>/confirm/                        Q-grader confirms → lot score
contract-samples/<sid>/cva/ · /physical/ record against a pre-shipment or arrival sample
contracts/<id>/comparison/               pre-shipment vs arrival report
exporters/<user_id>/reliability/         shipment, claim and sample record
sessions/ …                              blind cupping sessions and calibration
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.views import is_admin
from bunna_bridge.lots.views import visible_lots
from bunna_bridge.orgs.access import same_team
from bunna_bridge.trade.models import ContractSample
from bunna_bridge.trade.services import contracts_for
from bunna_bridge.trade.services import party
from bunna_bridge.users.models import User

from . import services as svc
from .models import CuppingSession
from .models import CvaAssessment
from .models import PhysicalAnalysis
from .models import SessionGrader
from .models import SessionSample
from .scoring import CVA_AFFECTIVE
from .scoring import CVA_DESCRIPTIVE
from .scoring import CVA_FLAVOR_CATEGORIES
from .scoring import DEFECTS
from .scoring import SCREEN_SIZES
from .serializers import CvaSerializer
from .serializers import PhysicalSerializer
from .serializers import SessionSerializer

IsAuth = permissions.IsAuthenticated
SESSION_ROLES = ("exporter", "roaster", "qgrader", "buyer", "importer", "cooperative", "admin")


def _err(msg, code=400):
    return Response({"detail": str(msg)}, status=code)


def _lot(request, lot_pk):
    return get_object_or_404(visible_lots(request.user, CoffeeLot.objects.select_related("exporter")), pk=lot_pk)


class ReferenceView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        return Response({
            "affective": list(CVA_AFFECTIVE), "descriptive": list(CVA_DESCRIPTIVE),
            "flavor_categories": list(CVA_FLAVOR_CATEGORIES), "screens": list(SCREEN_SIZES),
            "defects": [{"key": k, "label": v[0], "category": v[1], "per_full_defect": v[2]} for k, v in DEFECTS.items()],
        })


# ── Lot-level CVA and physical analysis ─────────────────────────────────────

class LotCvaView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, lot_pk):
        lot = _lot(request, lot_pk)
        qs = lot.cva_assessments.filter(session_sample__isnull=True, contract_sample__isnull=True).select_related(
            "grader", "lot")
        if not (is_admin(request.user) or same_team(request.user, lot.exporter_id)):
            qs = qs.filter(status="confirmed") | qs.filter(grader=request.user)
        return Response({"assessments": CvaSerializer(qs.distinct(), many=True).data,
                         "latest": svc.latest_confirmed(lot)})

    def post(self, request, lot_pk):
        lot = _lot(request, lot_pk)
        if not svc.can_record_for_lot(request.user, lot):
            return _err("Q-graders and the lot owner's team record cupping.", 403)
        s = CvaSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        a = s.save(lot=lot, grader=request.user, status=CvaAssessment.Status.SUBMITTED,
                   assessed_on=s.validated_data.get("assessed_on") or timezone.localdate())
        return Response(CvaSerializer(a).data, status=201)


class CvaConfirmView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk):
        a = get_object_or_404(CvaAssessment.objects.select_related("lot", "grader"), pk=pk)
        try:
            svc.confirm_cva(request.user, a)
        except svc.QualityError as exc:
            return _err(exc, 403)
        return Response(CvaSerializer(a).data)


class LotPhysicalView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, lot_pk):
        lot = _lot(request, lot_pk)
        qs = lot.physical_analyses.filter(contract_sample__isnull=True).select_related("analysed_by")
        return Response(PhysicalSerializer(qs, many=True).data)

    def post(self, request, lot_pk):
        lot = _lot(request, lot_pk)
        if not svc.can_record_for_lot(request.user, lot):
            return _err("Q-graders and the lot owner's team record lab analyses.", 403)
        s = PhysicalSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        p = s.save(lot=lot, analysed_by=request.user,
                   analysed_on=s.validated_data.get("analysed_on") or timezone.localdate())
        return Response(PhysicalSerializer(p).data, status=201)


# ── Contract samples (Q-4 inputs) ───────────────────────────────────────────

def _contract_sample(request, sid):
    cs = get_object_or_404(ContractSample.objects.select_related("contract", "contract__lot"), pk=sid)
    if party(request.user, cs.contract) not in ("seller", "buyer", "admin"):
        from django.http import Http404

        raise Http404
    return cs


class ContractSampleCvaView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, sid):
        cs = _contract_sample(request, sid)
        return Response(CvaSerializer(cs.cva_assessments.select_related("grader"), many=True).data)

    def post(self, request, sid):
        cs = _contract_sample(request, sid)
        s = CvaSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        a = s.save(lot=cs.contract.lot, contract_sample=cs, grader=request.user,
                   assessed_on=s.validated_data.get("assessed_on") or timezone.localdate())
        return Response(CvaSerializer(a).data, status=201)


class ContractSamplePhysicalView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, sid):
        cs = _contract_sample(request, sid)
        return Response(PhysicalSerializer(cs.physical_analyses.all(), many=True).data)

    def post(self, request, sid):
        cs = _contract_sample(request, sid)
        s = PhysicalSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        p = s.save(lot=cs.contract.lot, contract_sample=cs, analysed_by=request.user,
                   analysed_on=s.validated_data.get("analysed_on") or timezone.localdate())
        return Response(PhysicalSerializer(p).data, status=201)


class ComparisonView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract = get_object_or_404(contracts_for(request.user), pk=pk)
        return Response(svc.comparison(contract))


class ReliabilityView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, user_id):
        exporter = get_object_or_404(User, pk=user_id, role__in=["exporter", "roaster"])
        return Response(svc.reliability(exporter))


# ── Cupping sessions (Q-3) ───────────────────────────────────────────────────

def _session(request, pk):
    return get_object_or_404(svc.sessions_for(request.user).select_related("owner"), pk=pk)


def _sample_payload(request, session, sample, mine):
    show = svc.can_see_identity(request.user, session)
    return {
        "id": sample.pk, "code": sample.code, "position": sample.position,
        "name": sample.display_name if show else None,
        "lot": str(sample.lot_id) if show and sample.lot_id else None,
        "published_score": float(sample.published_score) if sample.published_score is not None else None,
        "my_assessment": CvaSerializer(mine).data if mine else None,
    }


class SessionListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        qs = svc.sessions_for(request.user).select_related("owner")
        return Response(SessionSerializer(qs, many=True).data)

    def post(self, request):
        if getattr(request.user, "role", "") not in SESSION_ROLES and not is_admin(request.user):
            return _err("Your account cannot organise cupping sessions.", 403)
        s = SessionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        session = s.save(owner=request.user)
        if getattr(request.user, "role", "") == "qgrader":
            SessionGrader.objects.create(session=session, user=request.user)
        return Response(SessionSerializer(session).data, status=201)


class SessionDetailView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        session = _session(request, pk)
        organiser = svc.is_organiser(request.user, session)
        grader = svc.is_grader(request.user, session)
        mine = {a.session_sample_id: a for a in CvaAssessment.objects.filter(
            session_sample__session=session, grader=request.user)}
        data = SessionSerializer(session).data
        data.update({
            "is_organiser": organiser,
            "is_grader": grader,
            "samples": [_sample_payload(request, session, s, mine.get(s.pk))
                        for s in session.samples.select_related("lot", "contract_sample__contract")],
            "graders": [{"id": g.pk, "name": g.user.get_full_name() or g.user.email, "email": g.user.email}
                        for g in session.graders.select_related("user")],
            "results": svc.results(session) if (organiser or session.status == "revealed") else None,
        })
        return Response(data)

    def patch(self, request, pk):
        session = _session(request, pk)
        if not svc.is_organiser(request.user, session):
            return _err("Only the organiser can change the session.", 403)
        s = SessionSerializer(session, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return self.get(request, pk)


class SessionStatusView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk):
        session = _session(request, pk)
        if not svc.is_organiser(request.user, session):
            return _err("Only the organiser can open, close or reveal.", 403)
        new = request.data.get("status")
        if new not in CuppingSession.Status.values:
            return _err("Unknown status.")
        if new == "revealed" and not CvaAssessment.objects.filter(session_sample__session=session).exists():
            return _err("No scores yet.")
        session.status = new
        session.save(update_fields=["status"])
        return SessionDetailView().get(request, pk)


class SessionSamplesView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk):
        session = _session(request, pk)
        if not svc.is_organiser(request.user, session):
            return _err("Only the organiser adds samples.", 403)
        if session.status != "open":
            return _err("Samples can only be added while the session is open.")
        lot = cs = None
        if request.data.get("lot"):
            lot = get_object_or_404(visible_lots(request.user, CoffeeLot.objects.all()), pk=request.data["lot"])
        elif request.data.get("contract_sample"):
            cs = get_object_or_404(ContractSample, pk=request.data["contract_sample"])
            if party(request.user, cs.contract) not in ("seller", "buyer", "admin"):
                return _err("Contract sample not found.", 404)
            lot = cs.contract.lot
        elif not (request.data.get("label") or "").strip():
            return _err("Choose a lot, a contract sample, or give the sample a label.")
        sample = SessionSample.objects.create(
            session=session, code=session.new_code(), position=session.samples.count() + 1, lot=lot,
            contract_sample=cs, label=(request.data.get("label") or "")[:120],
        )
        return Response({"id": sample.pk, "code": sample.code, "name": sample.display_name}, status=201)


class SessionSampleDeleteView(APIView):
    permission_classes = [IsAuth]

    def delete(self, request, pk, sid):
        session = _session(request, pk)
        if not svc.is_organiser(request.user, session) or session.status != "open":
            return _err("Not allowed.", 403)
        sample = get_object_or_404(SessionSample, pk=sid, session=session)
        if sample.assessments.exists():
            return _err("This sample already has scores.")
        sample.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionGradersView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk):
        session = _session(request, pk)
        if not svc.is_organiser(request.user, session):
            return _err("Only the organiser invites graders.", 403)
        user = User.objects.filter(email__iexact=(request.data.get("email") or "").strip()).first()
        if user is None:
            return _err("No Beersheba account with this email.")
        if user.role not in ("qgrader", "exporter", "roaster", "buyer", "importer", "cooperative", "admin"):
            return _err("This account cannot cup.")
        seat, created = SessionGrader.objects.get_or_create(session=session, user=user)
        if created:
            from bunna_bridge.lots.models import Notification

            Notification.objects.create(
                recipient=user, notification_type="compliance", title=f"Cupping session: {session.name}",
                message=f"You are invited to cup {session.samples.count()} samples on {session.held_on:%d %b %Y}.",
                link=f"/cupping-sessions/{session.pk}",
            )
        return Response({"id": seat.pk, "name": user.get_full_name() or user.email, "email": user.email},
                        status=201 if created else 200)


class SessionGraderDeleteView(APIView):
    permission_classes = [IsAuth]

    def delete(self, request, pk, gid):
        session = _session(request, pk)
        if not svc.is_organiser(request.user, session):
            return _err("Not allowed.", 403)
        seat = get_object_or_404(SessionGrader, pk=gid, session=session)
        if CvaAssessment.objects.filter(session_sample__session=session, grader=seat.user).exists():
            return _err("This grader has already scored; their scores stay in the results.")
        seat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionScoreView(APIView):
    """A grader scores one coded cup (create or update while the session is open)."""

    permission_classes = [IsAuth]

    def post(self, request, pk, sid):
        session = _session(request, pk)
        if not svc.is_grader(request.user, session):
            return _err("You are not a grader in this session.", 403)
        if session.status != "open":
            return _err("Scoring is closed for this session.")
        sample = get_object_or_404(SessionSample, pk=sid, session=session)
        existing = CvaAssessment.objects.filter(session_sample=sample, grader=request.user).first()
        s = CvaSerializer(existing, data=request.data, partial=existing is not None)
        s.is_valid(raise_exception=True)
        draft = str(request.data.get("draft", "")).lower() in ("1", "true")
        a = s.save(session_sample=sample, lot=sample.lot, contract_sample=sample.contract_sample,
                   grader=request.user, status="draft" if draft else "submitted",
                   assessed_on=s.validated_data.get("assessed_on") or session.held_on or timezone.localdate())
        return Response(CvaSerializer(a).data, status=200 if existing else 201)


class SessionPublishView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk, sid):
        session = _session(request, pk)
        sample = get_object_or_404(SessionSample.objects.select_related("lot"), pk=sid, session=session)
        try:
            mean = svc.publish(request.user, session, sample)
        except svc.QualityError as exc:
            return _err(exc)
        return Response({"published_score": float(mean)})
