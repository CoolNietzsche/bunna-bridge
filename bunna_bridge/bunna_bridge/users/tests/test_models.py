from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from bunna_bridge.users.models import User

pytestmark = pytest.mark.django_db


def test_user_str_includes_role(user: User):
    assert str(user) == f"{user.email} ({user.role})"


def test_license_verification_is_cleared_when_license_changes(user: User):
    from django.utils import timezone

    user.role = "exporter"
    user.ecta_license_number = "ECTA-1"
    user.ecta_license_verified_at = timezone.now()
    user.save()
    user.refresh_from_db()
    assert user.ecta_license_verified_at is not None

    user.ecta_license_number = "ECTA-2"
    user.save()
    user.refresh_from_db()
    assert user.ecta_license_verified_at is None
