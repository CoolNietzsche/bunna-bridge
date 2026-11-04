"""
/api/v1/orgs/me/                         my organisation, team and invitations
/api/v1/orgs/me/members/<id>/            change a member's role / remove them
/api/v1/orgs/me/invitations/             invite a teammate (returns a join link)
/api/v1/orgs/me/invitations/<id>/        revoke an invitation
/api/v1/orgs/invitations/<token>/        public: what the invitation is for
/api/v1/orgs/invitations/<token>/accept/ signed-in user joins the organisation
/api/v1/orgs/me/compliance/              ECTA Dir. 1106/2025 documents + status
/api/v1/orgs/compliance-reviews/         platform admins verify documents
"""

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions
from rest_framework import status
from rest_framework.parsers import FormParser
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.views import is_admin
from bunna_bridge.users.models import User

from .access import can
from .access import membership_of
from .models import ComplianceDocument
from .models import Invitation
from .models import Membership
from .serializers import ComplianceDocumentSerializer
from .serializers import InvitationSerializer
from .serializers import MemberSerializer
from .serializers import OrganizationSerializer
from .services import accept_invitation
from .services import compliance_profile
from .services import remove_member


def _require_membership(request):
    m = membership_of(request.user)
    if m is None:
        return None, Response({"detail": "Your account does not belong to an organisation."}, status=404)
    return m, None


def _forbidden(msg="Only the organisation's owner or administrators can do this."):
    return Response({"detail": msg}, status=403)


class MyOrganizationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        m, err = _require_membership(request)
        if err:
            return err
        org = m.organization
        data = {
            "organization": OrganizationSerializer(org).data,
            "my_role": m.role,
            "can_manage_team": can(request.user, "manage_team"),
            "members": MemberSerializer(org.memberships.select_related("user"), many=True).data,
            "invitations": [],
            "roles": [{"value": v, "label": label} for v, label in Membership.Role.choices],
        }
        if data["can_manage_team"]:
            data["invitations"] = InvitationSerializer(
                [i for i in org.invitations.select_related("invited_by") if i.is_open], many=True,
            ).data
        return Response(data)

    def patch(self, request):
        m, err = _require_membership(request)
        if err:
            return err
        if not can(request.user, "manage_team"):
            return _forbidden()
        serializer = OrganizationSerializer(m.organization, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _target(self, request, pk):
        m, err = _require_membership(request)
        if err:
            return None, None, err
        if not can(request.user, "manage_team"):
            return None, None, _forbidden()
        target = get_object_or_404(Membership.objects.select_related("user"), pk=pk, organization=m.organization)
        return m, target, None

    def patch(self, request, pk):
        m, target, err = self._target(request, pk)
        if err:
            return err
        role = request.data.get("role")
        if role not in Membership.Role.values:
            return Response({"role": ["Choose a valid role."]}, status=400)
        owners = m.organization.memberships.filter(role=Membership.Role.OWNER)
        if target.role == Membership.Role.OWNER and role != Membership.Role.OWNER and owners.count() == 1:
            return Response({"detail": "An organisation needs at least one owner."}, status=400)
        if role == Membership.Role.OWNER and m.role != Membership.Role.OWNER:
            return _forbidden("Only an owner can make someone else an owner.")
        target.role = role
        target.save(update_fields=["role"])
        return Response(MemberSerializer(target).data)

    def delete(self, request, pk):
        m, target, err = self._target(request, pk)
        if err:
            return err
        if target.role == Membership.Role.OWNER and m.organization.memberships.filter(role="owner").count() == 1:
            return Response({"detail": "An organisation needs at least one owner."}, status=400)
        remove_member(target)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        m, err = _require_membership(request)
        if err:
            return err
        if not can(request.user, "manage_team"):
            return _forbidden()
        serializer = InvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        if m.organization.memberships.filter(user__email__iexact=email).exists():
            return Response({"email": ["This person is already in your team."]}, status=400)
        with transaction.atomic():
            m.organization.invitations.filter(email__iexact=email, accepted_at__isnull=True).update(
                revoked_at=timezone.now(),
            )
            invitation = serializer.save(organization=m.organization, invited_by=request.user, email=email)
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None:
            Notification.objects.create(
                recipient=existing, notification_type="compliance",
                title=f"Invitation to join {m.organization.name}",
                message=f"{request.user.get_full_name() or request.user.email} invited you to join "
                        f"{m.organization.name} as {invitation.get_role_display()}.",
                link=f"/invite/{invitation.token}",
            )
        return Response(InvitationSerializer(invitation).data, status=201)


class InvitationRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        m, err = _require_membership(request)
        if err:
            return err
        if not can(request.user, "manage_team"):
            return _forbidden()
        invitation = get_object_or_404(Invitation, pk=pk, organization=m.organization)
        invitation.revoked_at = timezone.now()
        invitation.save(update_fields=["revoked_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationPublicView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        invitation = get_object_or_404(Invitation.objects.select_related("organization"), token=token)
        if not invitation.is_open:
            return Response({"detail": "This invitation has expired or was already used."}, status=410)
        return Response({
            "organization": invitation.organization.name,
            "kind": invitation.organization.kind,
            "email": invitation.email,
            "role": invitation.role,
            "role_label": invitation.get_role_display(),
            "has_account": User.objects.filter(email__iexact=invitation.email).exists(),
        })


class InvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(Invitation.objects.select_related("organization"), token=token)
        if not invitation.is_open:
            return Response({"detail": "This invitation has expired or was already used."}, status=410)
        if invitation.email.lower() != request.user.email.lower():
            return Response({"detail": f"This invitation is for {invitation.email}. Sign in with that account."},
                            status=403)
        current = membership_of(request.user)
        if (current and current.organization_id != invitation.organization_id
                and current.organization.memberships.count() > 1 and current.role == Membership.Role.OWNER
                and current.organization.memberships.filter(role="owner").count() == 1):
            return Response({"detail": "You are the only owner of another team. Hand over ownership first."},
                            status=400)
        org = accept_invitation(invitation, request.user)
        return Response({"detail": f"You joined {org.name}.", "organization": OrganizationSerializer(org).data})


# ── ECTA Directive 1106/2025 compliance profile (O-7) ────────────────────────

class ComplianceDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        m, err = _require_membership(request)
        if err:
            return err
        org = m.organization
        return Response({
            "profile": compliance_profile(org),
            "documents": ComplianceDocumentSerializer(org.compliance_documents.select_related("uploaded_by"),
                                                      many=True).data,
            "kinds": [{"value": v, "label": label} for v, label in ComplianceDocument.Kind.choices],
        })

    def post(self, request):
        m, err = _require_membership(request)
        if err:
            return err
        if not can(request.user, "manage_compliance"):
            return _forbidden("Your team role cannot upload compliance documents.")
        serializer = ComplianceDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(organization=m.organization, uploaded_by=request.user)
        return Response(ComplianceDocumentSerializer(doc).data, status=201)


class ComplianceDocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from django.http import FileResponse

        doc = get_object_or_404(ComplianceDocument, pk=pk)
        m = membership_of(request.user)
        if not (is_admin(request.user) or (m and m.organization_id == doc.organization_id)):
            return Response({"detail": "Not found."}, status=404)
        return FileResponse(doc.file.open("rb"), filename=doc.file.name.rsplit("/", 1)[-1])

    def delete(self, request, pk):
        m, err = _require_membership(request)
        if err:
            return err
        if not can(request.user, "manage_compliance"):
            return _forbidden("Your team role cannot remove compliance documents.")
        doc = get_object_or_404(ComplianceDocument, pk=pk, organization=m.organization)
        if doc.verified_at:
            return Response({"detail": "Verified documents are kept on record. Upload a newer one instead."},
                            status=400)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ComplianceReviewListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        docs = ComplianceDocument.objects.filter(verified_at__isnull=True, rejection_reason="").select_related(
            "organization", "uploaded_by",
        ).order_by("uploaded_at")
        return Response(ComplianceDocumentSerializer(docs, many=True).data)


class ComplianceReviewDecideView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        doc = get_object_or_404(ComplianceDocument.objects.select_related("organization"), pk=pk)
        decision = request.data.get("decision")
        if decision == "verify":
            doc.verified_at = timezone.now()
            doc.verified_by = request.user
            doc.rejection_reason = ""
            title = f"{doc.get_kind_display()} verified"
            message = f"Your {doc.get_kind_display().lower()} was verified by the Beersheba team."
        elif decision == "reject":
            reason = (request.data.get("reason") or "").strip()
            if not reason:
                return Response({"reason": ["Say why it was rejected."]}, status=400)
            doc.rejection_reason = reason[:300]
            doc.verified_at = None
            title = f"{doc.get_kind_display()} needs attention"
            message = reason
        else:
            return Response({"decision": ["Use 'verify' or 'reject'."]}, status=400)
        doc.save()
        owner = doc.organization.owner
        if owner is not None:
            Notification.objects.create(recipient=owner, notification_type="compliance", title=title,
                                        message=message, link="/settings/team")
        return Response(ComplianceDocumentSerializer(doc).data)
