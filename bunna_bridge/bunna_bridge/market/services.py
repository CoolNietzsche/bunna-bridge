"""Business rules for Phase 5: Beersheba Select, EU stock orders, saved-search alerts."""

import statistics
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.models import Offer
from bunna_bridge.lots.views import is_admin
from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids

from .models import Bid
from .models import SavedSearch
from .models import SelectEntry
from .models import SelectProgramme
from .models import StockOrder
from .models import WarehouseStock

BUYER_ROLES = ("buyer", "importer", "roaster")


class MarketError(Exception):
    pass


def notify(user, title, message, link, kind="offer"):
    if user is not None:
        Notification.objects.create(recipient=user, notification_type=kind, title=title[:200], message=message,
                                    link=link)


# ── M-1 Beersheba Select ─────────────────────────────────────────────────────

def eligibility(lot):
    """Reasons a lot cannot enter Select (empty list = eligible)."""
    problems = []
    if lot.status != "listed":
        problems.append("The lot must be listed on the marketplace.")
    if not lot.eudr_dds_ready:
        problems.append("The importer's EUDR evidence package must be ready.")
    if not lot.ecta_license_active:
        problems.append("The exporter's ECTA licence must be verified and in date.")
    return problems


@transaction.atomic
def nominate(user, programme, lot, quantity_kg, starting_price, reserve_price=None):
    if programme.status != SelectProgramme.Status.NOMINATIONS or programme.nominations_close < timezone.localdate():
        raise MarketError("Nominations are closed for this programme.")
    if not (is_admin(user) or same_team(user, lot.exporter_id)):
        raise MarketError("Only the lot's exporter can nominate it.")
    if quantity_kg <= 0 or quantity_kg > (lot.available_qty_kg or 0):
        raise MarketError(f"Quantity must be between 1 and {lot.available_qty_kg} kg (what is still available).")
    if starting_price <= 0:
        raise MarketError("Set a starting price.")
    if reserve_price is not None and reserve_price < starting_price:
        raise MarketError("The reserve cannot be below the starting price.")
    if SelectEntry.objects.filter(programme=programme, lot=lot).exists():
        raise MarketError("This lot is already nominated.")
    problems = eligibility(lot)
    return SelectEntry.objects.create(
        programme=programme, lot=lot, nominated_by=user, quantity_kg=quantity_kg, starting_price_usd=starting_price,
        reserve_price_usd=reserve_price, status=SelectEntry.Status.INELIGIBLE if problems else SelectEntry.Status.NOMINATED,
        eligibility_notes=" ".join(problems),
    )


@transaction.atomic
def start_jury(admin, programme):
    from bunna_bridge.quality.models import CuppingSession
    from bunna_bridge.quality.models import SessionSample

    if programme.status != SelectProgramme.Status.NOMINATIONS:
        raise MarketError("The jury starts after nominations.")
    entries = list(programme.entries.filter(status=SelectEntry.Status.NOMINATED).select_related("lot"))
    if not entries:
        raise MarketError("No eligible nominations.")
    session = CuppingSession.objects.create(
        owner=admin, name=f"{programme.name} {programme.season} — jury", held_on=timezone.localdate(), blind=True,
        notes="Beersheba Select jury. Lots are coded; identities are revealed after scoring.",
    )
    for i, e in enumerate(entries, start=1):
        SessionSample.objects.create(session=session, code=session.new_code(), position=i, lot=e.lot)
        e.status = SelectEntry.Status.IN_JURY
        e.save(update_fields=["status"])
    programme.jury_session = session
    programme.status = SelectProgramme.Status.JURY
    programme.save(update_fields=["jury_session", "status"])
    return session


@transaction.atomic
def publish_catalogue(admin, programme):
    if programme.status != SelectProgramme.Status.JURY or programme.jury_session is None:
        raise MarketError("Run the jury first.")
    session = programme.jury_session
    if session.status != "revealed":
        raise MarketError("Reveal the jury session results first.")
    scored = []
    for e in programme.entries.filter(status=SelectEntry.Status.IN_JURY):
        sample = session.samples.filter(lot=e.lot).first()
        vals = [float(a.score) for a in sample.assessments.exclude(status="draft")] if sample else []
        e.jury_score = Decimal(str(round(statistics.fmean(vals), 2))) if vals else None
        e.status = (SelectEntry.Status.SELECTED if e.jury_score is not None and e.jury_score >= programme.min_jury_score
                    else SelectEntry.Status.NOT_SELECTED)
        e.save(update_fields=["jury_score", "status"])
        if e.status == SelectEntry.Status.SELECTED:
            scored.append(e)
    for rank, e in enumerate(sorted(scored, key=lambda x: -x.jury_score), start=1):
        e.rank = rank
        e.save(update_fields=["rank"])
    programme.status = SelectProgramme.Status.CATALOGUE
    programme.save(update_fields=["status"])
    for e in programme.entries.select_related("lot__exporter"):
        notify(e.lot.exporter, f"Beersheba Select: {e.lot.lot_id} {'selected' if e.status == 'selected' else 'not selected'}",
               f"Jury score {e.jury_score if e.jury_score is not None else '—'} (minimum {programme.min_jury_score}).",
               f"/select/{programme.pk}")
    return scored


@transaction.atomic
def start_auction(admin, programme, ends_at):
    if programme.status != SelectProgramme.Status.CATALOGUE:
        raise MarketError("Publish the catalogue first.")
    if not programme.auction:
        raise MarketError("This programme sells at fixed prices, not by auction.")
    now = timezone.now()
    if ends_at <= now:
        raise MarketError("The auction must end in the future.")
    programme.auction_starts = now
    programme.auction_ends = ends_at
    programme.status = SelectProgramme.Status.AUCTION
    programme.save(update_fields=["auction_starts", "auction_ends", "status"])
    programme.entries.filter(status=SelectEntry.Status.SELECTED).update(closes_at=ends_at)


def minimum_next_bid(entry):
    high = entry.high_bid
    if high is None:
        return entry.starting_price_usd
    return high.price_usd_per_kg + entry.programme.min_increment_usd


@transaction.atomic
def place_bid(user, entry_id, price):
    entry = SelectEntry.objects.select_for_update().select_related("programme", "lot").get(pk=entry_id)
    programme = entry.programme
    now = timezone.now()
    if getattr(user, "role", "") not in BUYER_ROLES:
        raise MarketError("Only buyer, importer and roaster accounts can bid.")
    if same_team(user, entry.lot.exporter_id):
        raise MarketError("You cannot bid on your own lot.")
    if programme.status != SelectProgramme.Status.AUCTION or entry.status != SelectEntry.Status.SELECTED:
        raise MarketError("This lot is not open for bidding.")
    if entry.closes_at is None or now >= entry.closes_at:
        raise MarketError("Bidding on this lot has closed.")
    need = minimum_next_bid(entry)
    if price < need:
        raise MarketError(f"Bid at least ${need}/kg.")
    previous = entry.high_bid
    bid = Bid.objects.create(entry=entry, bidder=user, price_usd_per_kg=price, created_at=now)
    window = timedelta(minutes=programme.extension_minutes)
    if entry.closes_at - now < window:
        entry.closes_at = now + window
        entry.save(update_fields=["closes_at"])
    if previous is not None and previous.bidder_id != user.id:
        notify(previous.bidder, f"Outbid on {entry.lot.lot_id}",
               f"A higher bid of ${price}/kg was placed. Bidding closes {timezone.localtime(entry.closes_at):%d %b %H:%M}.",
               f"/select/{programme.pk}")
    return bid


def close_due(now=None):
    """Close every auction lot whose time has passed. Safe to call often (views and a periodic task)."""
    from bunna_bridge.lots.offer_views import _accept

    now = now or timezone.now()
    closed = 0
    due = SelectEntry.objects.filter(status=SelectEntry.Status.SELECTED, closes_at__lte=now,
                                     programme__status=SelectProgramme.Status.AUCTION).values_list("pk", flat=True)
    for pk in list(due):
        with transaction.atomic():
            entry = SelectEntry.objects.select_for_update().select_related("lot__exporter", "programme").get(pk=pk)
            if entry.status != SelectEntry.Status.SELECTED:
                continue
            high = entry.high_bid
            reserve_ok = high is not None and (entry.reserve_price_usd is None or high.price_usd_per_kg >= entry.reserve_price_usd)
            if reserve_ok:
                offer = Offer.objects.create(lot=entry.lot, buyer=high.bidder, quantity_kg=entry.quantity_kg,
                                             price_per_kg_usd=high.price_usd_per_kg,
                                             notes=f"Won at auction — {entry.programme.name} {entry.programme.season}.")
                error = _accept(offer, offer.quantity_kg, offer.price_per_kg_usd)
                if error:
                    offer.status = "rejected"
                    offer.exporter_notes = error
                    offer.save()
                    entry.status = SelectEntry.Status.UNSOLD
                else:
                    entry.status = SelectEntry.Status.SOLD
                    entry.winning_bid = high
                    notify(high.bidder, f"You won {entry.lot.lot_id}",
                           f"${high.price_usd_per_kg}/kg for {entry.quantity_kg} kg. A contract has been drafted.",
                           "/contracts")
                    notify(entry.lot.exporter, f"{entry.lot.lot_id} sold at auction",
                           f"${high.price_usd_per_kg}/kg to {high.bidder.company_name or high.bidder.email}.", "/contracts")
            else:
                entry.status = SelectEntry.Status.UNSOLD
                notify(entry.lot.exporter, f"{entry.lot.lot_id} did not sell",
                       "No bid reached the reserve." if high else "No bids were placed.", f"/select/{entry.programme_id}")
            entry.save(update_fields=["status", "winning_bid"])
            closed += 1
    for programme in SelectProgramme.objects.filter(status=SelectProgramme.Status.AUCTION, auction_ends__lte=now):
        if not programme.entries.filter(status=SelectEntry.Status.SELECTED).exists():
            programme.status = SelectProgramme.Status.CLOSED
            programme.save(update_fields=["status"])
    return closed


# ── M-3 EU warehouse stock ───────────────────────────────────────────────────

def can_list_stock(user, lot):
    if is_admin(user):
        return True
    if getattr(user, "role", "") != "importer":
        return False
    return lot.offers.filter(buyer_id__in=team_ids(user), status="accepted").exists()


@transaction.atomic
def place_order(user, lines, delivery, notes=""):
    """lines: [(stock_id, bags)]. All lines must be from the same partner and warehouse (one consolidated release)."""
    if getattr(user, "role", "") not in BUYER_ROLES:
        raise MarketError("Only buyer, importer and roaster accounts can order.")
    if not lines:
        raise MarketError("Add at least one coffee.")
    stocks = {str(s.pk): s for s in WarehouseStock.objects.select_related("lot").filter(pk__in=[sid for sid, _ in lines])}
    if len(stocks) != len({sid for sid, _ in lines}):
        raise MarketError("Stock not found.")
    partners = {s.partner_id for s in stocks.values()}
    warehouses = {s.warehouse for s in stocks.values()}
    if len(partners) > 1 or len(warehouses) > 1:
        raise MarketError("One order is released from one warehouse. Split coffees from different warehouses into separate orders.")
    for sid, bags in lines:
        s = stocks[sid]
        if not s.active:
            raise MarketError(f"{s.lot.lot_id} is no longer offered.")
        if bags < s.min_bags:
            raise MarketError(f"{s.lot.lot_id}: minimum {s.min_bags} bag(s).")
        if bags > s.bags_available:
            raise MarketError(f"{s.lot.lot_id}: only {s.bags_available} bag(s) left.")
    first = next(iter(stocks.values()))
    order = StockOrder.objects.create(buyer=user, partner=first.partner, warehouse=first.warehouse,
                                      delivery=delivery[:300], notes=notes[:300])
    for sid, bags in lines:
        order.lines.create(stock=stocks[sid], bags=bags, price_eur_per_kg=stocks[sid].price_eur_per_kg)
    notify(first.partner, "New EU stock order",
           f"{user.company_name or user.email} ordered {sum(b for _, b in lines)} bag(s) from {first.get_warehouse_display()}.",
           "/eu-stock?tab=orders")
    return order


@transaction.atomic
def update_order(user, order, action):
    order = StockOrder.objects.select_for_update().get(pk=order.pk)
    partner_side = same_team(user, order.partner_id) or is_admin(user)
    buyer_side = same_team(user, order.buyer_id)
    if action == "confirm" and partner_side and order.status == StockOrder.Status.REQUESTED:
        for line in order.lines.select_related("stock"):
            stock = WarehouseStock.objects.select_for_update().get(pk=line.stock_id)
            if line.bags > stock.bags_available:
                raise MarketError(f"Only {stock.bags_available} bag(s) of {stock.lot.lot_id} left.")
            stock.bags_available -= line.bags
            stock.save(update_fields=["bags_available"])
        order.status = StockOrder.Status.CONFIRMED
        notify(order.buyer, "EU stock order confirmed", f"{order.total_kg} kg reserved in {order.get_warehouse_display()}.",
               "/eu-stock?tab=orders")
    elif action == "release" and partner_side and order.status == StockOrder.Status.CONFIRMED:
        order.status = StockOrder.Status.RELEASED
        notify(order.buyer, "EU stock released", "Your coffee has been released from the warehouse.", "/eu-stock?tab=orders")
    elif action == "cancel" and (partner_side or buyer_side) and order.status in ("requested", "confirmed"):
        if order.status == StockOrder.Status.CONFIRMED:
            if not partner_side:
                raise MarketError("A confirmed order can only be cancelled by the importer.")
            for line in order.lines.all():
                WarehouseStock.objects.filter(pk=line.stock_id).update(bags_available=F("bags_available") + line.bags)
        order.status = StockOrder.Status.CANCELLED
    else:
        raise MarketError("That change is not possible for this order.")
    order.save(update_fields=["status", "updated_at"])
    return order


# ── M-4 saved searches ───────────────────────────────────────────────────────

def matches(filters, lot):
    """Server-side version of the marketplace filters (frontend lib/catalog.ts)."""
    f = filters or {}
    q = (f.get("q") or "").strip().lower()
    if q and q not in f"{lot.name} {lot.lot_id} {lot.region} {lot.washing_station} {lot.flavor_notes}".lower():
        return False
    checks = [
        (f.get("origin"), lambda v: (lot.region or "").lower() == v.lower()),
        (f.get("process"), lambda v: lot.processing == v),
        (f.get("grade"), lambda v: lot.grade == v),
        (f.get("availability"), lambda v: lot.availability == v),
    ]
    for value, ok in checks:
        if value and not ok(value):
            return False
    cert = f.get("cert")
    if cert == "organic" and not lot.is_organic:
        return False
    if cert == "fairtrade" and not lot.is_fair_trade:
        return False
    if cert == "rainforest" and not lot.is_rainforest_alliance:
        return False
    comp = f.get("compliance")
    if comp == "eudr" and not lot.eudr_dds_ready:
        return False
    if comp == "export" and not lot.export_ready:
        return False
    if comp == "passport" and not lot.green_passport_ready:
        return False
    if f.get("minAltitude") and (lot.altitude_m or 0) < int(f["minAltitude"]):
        return False
    if f.get("minScore") and float(lot.sca_score or 0) < float(f["minScore"]):
        return False
    if f.get("maxPrice") and lot.fob_price_usd is not None and float(lot.fob_price_usd) > float(f["maxPrice"]):
        return False
    return True


def alert_for_new_listing(lot):
    sent = 0
    for search in SavedSearch.objects.filter(alert=True).select_related("user"):
        if same_team(search.user, lot.exporter_id):
            continue
        if matches(search.filters, lot):
            notify(search.user, f"New lot for “{search.name}”",
                   f"{lot.lot_id} — {lot.name} ({lot.get_region_display()}, {lot.get_processing_display()}).",
                   f"/marketplace/{lot.pk}")
            search.last_alerted_at = timezone.now()
            search.save(update_fields=["last_alerted_at"])
            sent += 1
    return sent

