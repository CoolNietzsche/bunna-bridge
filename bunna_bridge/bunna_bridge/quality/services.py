"""Rules and reports for Phase 4 quality data."""

import statistics
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from bunna_bridge.lots.views import is_admin
from bunna_bridge.orgs.access import can
from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids

from .models import CuppingSession
from .models import CvaAssessment
from .scoring import CVA_AFFECTIVE

TWO = Decimal("0.01")


class QualityError(Exception):
    pass


def _d(x):
    return Decimal(str(x)).quantize(TWO)


# ── Who may do what ──────────────────────────────────────────────────────────

def can_record_for_lot(user, lot):
    """Lot owner's team (lots/quality capability), Q-graders, admins."""
    if is_admin(user) or getattr(user, "role", "") == "qgrader":
        return True
    return same_team(user, lot.exporter_id) and (can(user, "manage_lots") or can(user, "manage_supply"))


def contract_sample_party(user, contract_sample):
    from bunna_bridge.trade.services import party

    return party(user, contract_sample.contract)


# ── Lot score from any confirmed assessment ──────────────────────────────────

def latest_confirmed(lot):
    """Most recent confirmed score across the 2004 form, CVA and published panel results."""
    candidates = []
    for s in lot.cupping_scores.all():
        if s.status == "confirmed":
            candidates.append((s.cupping_date, s.created_at, Decimal(str(s.total_score)),
                               s.grader.get_full_name() or s.grader.email, "SCA 2004"))
    for a in lot.cva_assessments.filter(status=CvaAssessment.Status.CONFIRMED).select_related("grader"):
        candidates.append((a.assessed_on, a.created_at, a.score, a.grader.get_full_name() or a.grader.email, "CVA"))
    for ss in lot.session_samples.filter(published_score__isnull=False).select_related("session"):
        n = ss.assessments.exclude(status="draft").count()
        candidates.append((ss.session.held_on, ss.session.created_at, ss.published_score,
                           f"Panel of {n} ({ss.session.name})", "CVA panel"))
    if not candidates:
        return None
    day, _, score, who, method = max(candidates, key=lambda c: (c[0], c[1]))
    return {"score": float(score), "grader": who, "method": method, "date": day}


def apply_to_lot(lot, score, grader_name, day, notes="", actor=None):
    lot.sca_score = _d(score).quantize(Decimal("0.1"))
    lot.cupping_date = day
    lot.q_grader_name = grader_name[:200]
    if notes:
        lot.flavor_notes = notes[:500]
    lot.save(actor=actor)


def confirm_cva(user, assessment):
    if assessment.grader_id != user.id and not is_admin(user):
        raise QualityError("Only the grader who cupped it can confirm a score.")
    if getattr(user, "role", "") != "qgrader" and not is_admin(user):
        raise QualityError("Only licensed Q-graders can confirm the score shown on a lot.")
    if assessment.lot_id is None or assessment.session_sample_id:
        raise QualityError("Session scores are published by the session organiser.")
    assessment.status = CvaAssessment.Status.CONFIRMED
    assessment.save()
    apply_to_lot(assessment.lot, assessment.score, user.get_full_name() or user.email, assessment.assessed_on,
                 assessment.descriptors, actor=user)


# ── Cupping sessions ─────────────────────────────────────────────────────────

def sessions_for(user):
    if is_admin(user):
        return CuppingSession.objects.all()
    return CuppingSession.objects.filter(Q(owner_id__in=team_ids(user)) | Q(graders__user=user)).distinct()


def is_organiser(user, session):
    return is_admin(user) or same_team(user, session.owner_id)


def is_grader(user, session):
    return session.graders.filter(user=user).exists()


def can_see_identity(user, session):
    """Blind sessions hide lot identity from graders until results are revealed."""
    return not session.blind or session.status == CuppingSession.Status.REVEALED or is_organiser(user, session)


def results(session):
    """Per-sample panel statistics and per-grader calibration."""
    samples = list(session.samples.select_related("lot", "contract_sample__contract").prefetch_related(
        "assessments__grader"))
    sample_rows = []
    panel_mean = {}
    for s in samples:
        scores = [a for a in s.assessments.all() if a.status != "draft"]
        vals = [float(a.score) for a in scores]
        row = {
            "id": s.pk, "code": s.code, "name": s.display_name, "lot": str(s.lot_id) if s.lot_id else None,
            "n": len(vals), "mean": round(statistics.fmean(vals), 2) if vals else None,
            "sd": round(statistics.stdev(vals), 2) if len(vals) > 1 else None,
            "min": min(vals) if vals else None, "max": max(vals) if vals else None,
            "published_score": float(s.published_score) if s.published_score is not None else None,
            "attributes": {},
            "descriptors": sorted({d.strip() for a in scores for d in a.descriptors.split(",") if d.strip()})[:12],
        }
        for attr in CVA_AFFECTIVE:
            av = [getattr(a, attr) for a in scores]
            row["attributes"][attr] = round(statistics.fmean(av), 2) if av else None
        panel_mean[s.pk] = row["mean"]
        sample_rows.append(row)

    graders = {}
    for s in samples:
        mean = panel_mean.get(s.pk)
        for a in s.assessments.all():
            if a.status == "draft" or mean is None:
                continue
            g = graders.setdefault(a.grader_id, {"grader": a.grader.get_full_name() or a.grader.email,
                                                 "diffs": [], "count": 0})
            g["diffs"].append(float(a.score) - mean)
            g["count"] += 1
    grader_rows = []
    for g in graders.values():
        bias = statistics.fmean(g["diffs"]) if g["diffs"] else 0.0
        mad = statistics.fmean(abs(x) for x in g["diffs"]) if g["diffs"] else 0.0
        grader_rows.append({
            "grader": g["grader"], "cups": g["count"], "bias": round(bias, 2), "mean_abs_deviation": round(mad, 2),
            "calibrated": abs(bias) <= 1.5 and mad <= 2.0,  # noqa: PLR2004
        })
    grader_rows.sort(key=lambda r: -r["mean_abs_deviation"])
    expected = session.graders.count() * len(samples)
    done = sum(r["n"] for r in sample_rows)
    return {"samples": sample_rows, "graders": grader_rows, "progress": {"done": done, "expected": expected}}


def publish(user, session, sample):
    if not is_organiser(user, session):
        raise QualityError("Only the organiser publishes results.")
    if session.status != CuppingSession.Status.REVEALED:
        raise QualityError("Reveal the results first.")
    if sample.lot_id is None or not (is_admin(user) or same_team(user, sample.lot.exporter_id)):
        raise QualityError("Panel scores can only be published to your own lots.")
    vals = [float(a.score) for a in sample.assessments.exclude(status="draft")]
    if len(vals) < 2:  # noqa: PLR2004
        raise QualityError("A panel score needs at least two graders.")
    mean = _d(statistics.fmean(vals))
    sample.published_score = mean
    sample.save(update_fields=["published_score"])
    apply_to_lot(sample.lot, mean, f"Panel of {len(vals)} ({session.name})", session.held_on, actor=user)
    return mean


# ── Q-4: pre-shipment vs arrival ─────────────────────────────────────────────

def _sample_metrics(sample):
    if sample is None:
        return None
    cva = [float(a.score) for a in sample.cva_assessments.exclude(status="draft")]
    phys = sample.physical_analyses.first()
    cup = float(sample.cup_score) if sample.cup_score is not None else (round(statistics.fmean(cva), 2) if cva else None)
    moisture = sample.moisture_pct if sample.moisture_pct is not None else (phys.moisture_pct if phys else None)
    return {
        "id": sample.pk, "kind": sample.kind, "status": sample.status, "date": sample.sent_on,
        "cup_score": cup,
        "moisture_pct": float(moisture) if moisture is not None else None,
        "water_activity": float(phys.water_activity) if phys and phys.water_activity is not None else None,
        "density_g_l": float(phys.density_g_l) if phys and phys.density_g_l is not None else None,
        "screen_18_plus": float(phys.screen_18_plus) if phys and phys.screens else None,
        "full_defects": (phys.primary_full_defects + phys.secondary_full_defects) if phys else None,
    }


def comparison(contract):
    pss = contract.samples.filter(kind="pss").order_by("-created_at").first()
    arrival = contract.samples.filter(kind="arrival").order_by("-created_at").first()
    a, b = _sample_metrics(pss), _sample_metrics(arrival)
    limits = {"cup_score": -2.0, "moisture_pct": 1.0, "water_activity": 0.05, "density_g_l": -30.0,
              "screen_18_plus": -10.0, "full_defects": 3}
    rows = []
    flags = []
    for key, label in [("cup_score", "Cup score"), ("moisture_pct", "Moisture %"), ("water_activity", "Water activity"),
                       ("density_g_l", "Density g/L"), ("screen_18_plus", "Screen 18+ %"),
                       ("full_defects", "Full defects")]:
        x = a.get(key) if a else None
        y = b.get(key) if b else None
        delta = round(y - x, 3) if x is not None and y is not None else None
        limit = limits[key]
        off = delta is not None and ((limit < 0 and delta < limit) or (limit > 0 and abs(delta) > limit))
        if off:
            flags.append(f"{label} changed by {delta:+g} between pre-shipment and arrival.")
        rows.append({"key": key, "label": label, "pss": x, "arrival": y, "delta": delta, "flag": off})
    return {"pss": a, "arrival": b, "rows": rows, "flags": flags, "consistent": bool(a and b) and not flags}


# ── Exporter reliability record (feeds M-6) ──────────────────────────────────

def reliability(exporter):
    from bunna_bridge.trade.models import Claim
    from bunna_bridge.trade.models import Contract
    from bunna_bridge.trade.models import ShipmentEvent

    ids = team_ids(exporter) if exporter.is_authenticated else [exporter.pk]
    contracts = Contract.objects.filter(seller_id__in=ids).exclude(status__in=["draft", "cancelled"])
    total = contracts.count()
    shipped = contracts.filter(status__in=["shipped", "completed"])
    on_time = late = 0
    for c in shipped:
        departed = ShipmentEvent.objects.filter(shipment__contract=c, kind="departed").order_by("happened_at").first()
        if departed and c.shipment_to:
            if timezone.localtime(departed.happened_at).date() <= c.shipment_to:
                on_time += 1
            else:
                late += 1
    claims = Claim.objects.filter(contract__in=contracts)
    accepted = claims.filter(status__in=["accepted", "settled"]).count()
    first_pss = first_ok = 0
    drops = []
    for c in contracts.prefetch_related("samples"):
        pss = sorted([s for s in c.samples.all() if s.kind == "pss"], key=lambda s: s.created_at)
        if pss and pss[0].status in ("approved", "rejected"):
            first_pss += 1
            first_ok += pss[0].status == "approved"
        cmp_ = comparison(c)
        cup = next(r for r in cmp_["rows"] if r["key"] == "cup_score")
        if cup["delta"] is not None:
            drops.append(cup["delta"])
    return {
        "contracts": total,
        "shipped": shipped.count(),
        "on_time_shipments": on_time,
        "late_shipments": late,
        "on_time_rate": round(100 * on_time / (on_time + late)) if on_time + late else None,
        "claims": claims.count(),
        "accepted_claims": accepted,
        "claim_rate": round(100 * claims.count() / shipped.count()) if shipped.count() else None,
        "pss_first_time_approval": round(100 * first_ok / first_pss) if first_pss else None,
        "average_cup_change_pss_to_arrival": round(statistics.fmean(drops), 2) if drops else None,
    }
