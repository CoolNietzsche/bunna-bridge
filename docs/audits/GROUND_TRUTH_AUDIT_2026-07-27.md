# Beersheba Ground-Truth Audit
_Date: 2026-07-27_
_Method: read the actual source files, ran real queries against the live production database, and made real authenticated HTTP requests against the live API (bunnabridge.pro.et) to verify claims empirically rather than infer them from code. Every claim below states how it was checked. Two test mutations were made against real lot data during PATCH-permission testing (see §2) and were reverted immediately after confirming the result — verified reverted._

---

## 1. What's Actually Built and Fully Working

| Feature | Status | How verified |
|---|---|---|
| Auth (register/login/JWT) | **Working end-to-end** | Read `RegisterSerializer`, `EmailTokenObtainPairSerializer`, `MeView`. Logged in live as 4 different real accounts (admin, exporter, buyer, farmer) via `/api/auth/token/` during this audit — all succeeded. |
| Role system (5 roles) | **Working** | `User.Role` choices in `users/models.py`; confirmed live DB has all 5 roles populated (admin:1, exporter:1, buyer:1, farmer:2, qgrader:1). |
| Lot CRUD | **Working end-to-end** | `CoffeeLotViewSet` (full `ModelViewSet`), scoped `get_queryset()` per role. Confirmed live: 7 real lots in DB across draft/listed/contracted/exported statuses. |
| 7 compliance gates | **Partially working — see §2, this is the critical finding** | Full trace below. Two gates are genuinely automated and protected; five are manually-set booleans directly writable by the lot's own exporter with no server-side check that anything real happened. |
| Marketplace browse | **Working** | `CoffeeLotViewSet.get_queryset()` filters buyers to `status__in=["listed","contracted","exported"]`. `Marketplace.tsx` fetches and renders this correctly. |
| Offers (buyer↔exporter) | **Working end-to-end** | `offer_views.py`: create, respond (accept/reject/counter), withdraw, accept-counter. All state transitions confirmed via code read; DB has 6 real Offer rows (all currently status=`accepted`, so pending/countered/rejected/withdrawn paths exist in code but are unexercised by current data). |
| Sample requests | **Working** | `SampleRequestViewSet`, role-scoped queryset, `respond` action. 9 real rows in DB. |
| Watchlist | **Working, client-only by design** | `useWatchlist.ts` — pure `localStorage`, zero backend model. This matches what was described; not a gap. |
| Exporter storefronts | **Working** | `ExporterProfileView` / `ExporterLotsView` in `users/views.py`, public-facing at `/exporters/:id`. |
| Spec sheet PDF | **Working now — was broken until this session** | `LotSpecSheetView` (backend) is fine and always was. The frontend `downloadSpecSheet()` call was missing the `/v1` prefix (`/lots/.../spec-sheet/` instead of `/v1/lots/.../spec-sheet/`), so the button 404'd on every click. Fixed and deployed earlier in this working session — confirmed both the bug (via curl: 404 on old path, 200 on `/v1/` path) and the fix are real, not aspirational. |
| Cupping scores | **Present, code-correct, but effectively unused in practice** | `CuppingScoreViewSet`, `cupping_scores` action on `CoffeeLotViewSet`, confirm-and-lock flow, write-protection on confirmed scores (`CuppingScore.save()` raises if you try to edit a confirmed score). **Live DB has 0 CuppingScore rows.** The feature has never actually been exercised on this instance — every lot's displayed SCA score is currently the manually-entered `CoffeeLot.sca_score` field, not a real Q-grader submission. |

---

## 2. The 7 Compliance Gates — Gate by Gate Reality Check

This is the single most important section. Short version: **5 of the 7 gates can be set to `True` directly by the exporter who owns the lot, via a plain `PATCH /api/v1/lots/{id}/`, with nothing on the server checking that the real underlying condition is true.** I proved this empirically, not just by reading code — see below.

### DeforestationZone table — real data check

```
Total rows: 72,530
Distinct source values: 'Hansen GFC v1.12 (2024)' — 72,530 rows (100%, no leftover sample/test zones)
Year range: 2021–2024
By year: 2021→14,830 · 2022→16,543 · 2023→21,201 · 2024→19,956
Total area: 24,838.8 hectares
Region field: 100% generic 'Ethiopia' (not broken down by zone/woreda)
```

**This is real.** The claim that Hansen GFC v1.12 (2024) was loaded is confirmed — it's genuinely 72,530 polygons of actual detected forest-loss, not sample/placeholder data, and it spans the correct EUDR-relevant years. The `region` field is populated but only ever says "Ethiopia" — that field exists on the model but wasn't populated at the woreda/zone level, so you can't currently query "how much deforestation near Yirgacheffe" — only "does this exact polygon intersect."

### Gate-by-gate

| Gate | Model field | Auto or manual? | Evidence |
|---|---|---|---|
| 1. Deforestation-free | `deforestation_free` | **Automated when triggered, but the boolean itself is directly writable and NOT re-validated on save** | `eudr_spatial.py::check_deforestation_overlap()` does a real PostGIS `ST_Intersects` query against `DeforestationZone` filtered to `year__gt=2020`. It's genuinely well-built. But it only runs when explicitly called — from `LotBoundaryView.patch()`, `LotBoundaryInheritView.post()`, or the `compliance-check` action. **It is never called from `CoffeeLot.save()`.** So there is no server-side guarantee this field reflects a real check having run. |
| 2. GPS verified | `gps_verified` | **Fully manual.** Nothing computes this automatically anywhere in the codebase. It's just a boolean the exporter sets. |
| 3. EUDR DDS ready | `eudr_dds_ready` | **Fully manual.** `EudrDdsView` *checks* this flag before letting you generate the PDF (`gps_verified` too), but nothing sets `eudr_dds_ready` automatically after a real DDS document is generated — it's set independently, by hand. |
| 4. Phytosanitary cert uploaded | `phyto_cert_uploaded` | **Genuinely automatic and protected.** `CoffeeLot.save()` unconditionally does `self.phyto_cert_uploaded = bool(self.phyto_cert_file)` before every save — so whatever you PATCH this field to, it gets silently overwritten to match whether a real file is actually attached. **Confirmed empirically** (see below). |
| 5. ECTA license active | `ecta_license_active` | **Fully manual.** No code anywhere derives this from the exporter's actual `ecta_license_expiry` date or file presence. It's just a boolean. |
| 6. NBE FX declared | `nbe_fx_declared` | **Genuinely automatic and protected.** Same mechanism as gate 4: `save()` does `self.nbe_fx_declared = bool(self.nbe_fx_declaration_file)`. **Confirmed empirically.** |
| 7. CTA floor price met | `cta_floor_met` | **Fully manual.** There's no `CTA_FLOOR_PRICE` setting or comparison against `price_per_kg` anywhere in the code. It's just a boolean, despite the name implying an automatic price check. |

### The PATCH question — resolved definitively, with a live test

**File/line evidence for *why* this is possible:**

- `bunna_bridge/lots/views.py:34-58` — `CoffeeLotViewSet.get_serializer_class()`: uses `CoffeeLotDetailSerializer` only for the `retrieve` action; every other action (including `update`/`partial_update`, i.e. PATCH) uses `CoffeeLotListSerializer`.
- `bunna_bridge/lots/serializers.py:37-72` — `CoffeeLotListSerializer.Meta.fields` includes `"deforestation_free", "eudr_dds_ready", "gps_verified", "phyto_cert_uploaded", "ecta_license_active", "nbe_fx_declared", "cta_floor_met"` as plain fields. **There is no `read_only_fields` on this serializer class at all** — contrast with `CuppingScoreSerializer` (line 24) and `SampleRequestSerializer` (line 196), which both explicitly declare `read_only_fields`. This omission is the actual bug.
- `bunna_bridge/lots/views.py:21-30` — `IsExporterOrReadOnly.has_permission()` only checks `request.user.role in ("exporter", "admin")` for write methods — a *view-level* check, not object-level. Object-level scoping (an exporter can only reach *their own* lots) is separately enforced correctly via `get_queryset()` filtering to `exporter=user` — so this is **not** an IDOR issue (exporter A genuinely cannot touch exporter B's lot), but it does nothing to restrict *which fields* an exporter can set on *their own* lot.

**Empirical proof** (performed against a real live lot owned by a real exporter account, reverted immediately after):

```
Before: deforestation_free=True, gps_verified=True, eudr_dds_ready=True,
        phyto_cert_uploaded=False, ecta_license_active=True,
        nbe_fx_declared=False, cta_floor_met=True

PATCH {"deforestation_free": false}                → deforestation_free became False ✓ writable
PATCH {"phyto_cert_uploaded": true}  (no file attached) → stayed False ✗ protected by save() override
PATCH {"cta_floor_met": false, "ecta_license_active": false,
       "eudr_dds_ready": false, "gps_verified": false}  → all four flipped to False ✓ writable

Reverted all five back to original values, confirmed via GET.
```

**Bottom line:** an exporter can today set `deforestation_free = True`, `gps_verified = True`, `eudr_dds_ready = True`, `ecta_license_active = True`, and `cta_floor_met = True` on their own lot with one PATCH call, and the platform's own `export_ready` property (which gates whether a lot can move to `exported` status) would then read `True` — with zero evidence that a real deforestation check, GPS capture, DDS generation, license check, or price comparison ever happened. This is exactly the risk you flagged, and it is real, current, and exploitable today. It is the highest-priority fix in this report.

---

## 3. Known Bugs — Status Check

| # | Bug | Status | Evidence |
|---|---|---|---|
| 1 | Route registered in `users/urls.py` instead of the real mount point `users/api_urls.py` | **No longer causing a missing route** | `users/urls.py` (mounted at `/users/`, app_name `users`) and `users/api_urls.py` (mounted at `/api/v1/auth/`) both currently exist. Every route the frontend actually needs is present in `api_urls.py`. `users/urls.py` is now **dead code** — it duplicates 3 of the same routes at a URL prefix (`/users/...`) the frontend's axios client (`baseURL: "/api"`) never calls. Not broken, but worth deleting for clarity — it looks like it matters and doesn't. |
| 2 | Wrong `related_name` (`coffeelot_set`, `.cuppingscores`) instead of `cupping_scores` | **Fixed.** | Grepped the entire codebase (excluding migrations): zero occurrences of `coffeelot_set` or `.cuppingscores` anywhere. Current code consistently uses `CoffeeLot.objects.filter(exporter=obj)` (explicit query, `users/serializers.py:115,119,124`) instead of the reverse accessor, and `.cupping_scores` (correct related_name) everywhere else. |
| 3 | DRF returns Decimals as strings; a frontend `number`-typed field crashed on `.toFixed()` | **The one known spot is fixed. The underlying type-lie is still present in the type system and I found one more live instance of the same pattern (see §4).** | Full sweep below. |
| 4 | Frontend call missing required args after a refactor, caught by `tsc -b` — confirm build order | **Confirmed safe, with one caveat.** | `package.json`: `"build": "tsc -b && vite build"` — `&&` means a `tsc` failure blocks the build entirely; it can't silently ship broken JS. I personally ran this exact command to deploy multiple times this session and confirmed it fails loud on type errors. **Caveat:** there is no CI workflow that runs the frontend build at all (`.github/workflows/ci.yml` only tests the Django backend) — the correct build order only protects you if whoever deploys always runs `npm run build`, never `vite build` directly. |
| 5 | Docker dev server not reliably hot-reloading, needed `down && up -d` | **Can't confirm from code — operational, not a code bug.** | The Django container runs `runserver_plus` with Django's `StatReloader`, bind-mounted via `.:/app:z`. Flaky autoreload under bind-mounts (especially with `:z` SELinux relabeling) is a known category of Docker+Django friction; there's no code-level fix for it. Not something reading the source can confirm or deny — you'd need to reproduce it live. |

### The 4 other stale-code items

| Item | Status | Evidence |
|---|---|---|
| `lot.farm_polygon` reference in `EudrDdsView` | **Fixed.** | Zero occurrences of `farm_polygon` anywhere in current code. Confirmed at the DB level too: migration `0004_remove_coffeelot_farm_polygon_coffeelot_boundary` is applied. |
| `LotBoundaryInheritView` importing nonexistent `FarmerProfile` | **Fixed.** | Zero occurrences of `FarmerProfile` import anywhere in `lots/*.py`. |
| Missing `parser_classes` on `CoffeeLotViewSet` | **Fixed.** | `bunna_bridge/lots/views.py:35`: `parser_classes = [MultiPartParser, FormParser, JSONParser]` — all three present, so combined multipart/JSON PATCH requests work without 415s. |
| Hardcoded NBE exchange rate in `settlement.py` | **Fixed on the backend, but re-introduced on the frontend — see below.** | The backend rate is *not* hardcoded in `settlement.py` itself; it's `NBE_DEFAULT_FX_RATE` (`config/settings/base.py:278`), an env var with a documented comment: *"do not hardcode this value in views/serializers."* That's a real, correct fix. **But** `bunna-bridge-frontend/src/components/SettlementWidget.tsx` has a fully interactive "NBE RATE (ETB/USD)" input field (line 108-118, with `onChange`) that the user can type a new rate into — except the actual API call, `mutationFn: () => calculateSettlement(lotId, parseFloat(inputUsd))` (line 19), never passes the `nbeRate` state variable at all. Whatever the user types is silently discarded; every settlement calculation always uses the hardcoded frontend default of `59.85` (`api/settlement.ts:19`, `nbeRate: number = 59.85`). This is worse than a plain hardcode — it *looks* editable and isn't. Full financial-impact framing is in §4 and §8. |

### Full sweep for the string/number decimal pattern (#3), not a sample

Every DRF `DecimalField` on every model that's exposed via the API, checked against every matching-name frontend TypeScript field, then every call site of each grepped by hand:

**Confirmed: DRF really does serialize `DecimalField`s as JSON strings.** Verified directly, not assumed — I rendered `CoffeeLotListSerializer(lot).data` through the real `JSONRenderer` in a shell and inspected the raw bytes:
```
raw sca_score field value: Decimal('82.0')  (Python type: Decimal)
serialized JSON:           "sca_score":"82.0"     ← string, quoted
serialized JSON:           "volume_kg":"3800.00"  ← string, quoted
```

**Fields affected (all `DecimalField`s exposed via the API):** `sca_score`, `volume_kg`, `price_per_kg`, `available_qty_kg`, `fob_price_usd`, `min_order_kg`, `farm_size_ha`, `gps_lat`/`gps_lng` (on `User`), `quantity_kg`, `price_per_kg_usd`, `counter_price`, `counter_qty` (on `Offer`), and the 10 SCA cupping component fields (`fragrance_aroma`, `flavor`, `aftertaste`, `acidity`, `body`, `balance`, `uniformity`, `clean_cup`, `sweetness`, `overall`, `defects`).

**One important correction to my own reasoning, caught by testing rather than assuming:** `CuppingScore.total_score` and `PublicLotStorySerializer.latest_sca_score` (when it falls back to `obj.sca_score`) *look* like the same string-coercion risk, but they're not — `total_score` is a Python `@property` that does `round(float(...) - float(...), 2)`, returning a genuine `float`, not a `Decimal`. And when DRF's `SerializerMethodField` returns a raw `Decimal` directly (bypassing normal field serialization), DRF's `JSONEncoder.default()` converts it to a `float`, not a string (verified by reading `rest_framework/utils/encoders.py` directly, then confirming live: `"latest_sca_score":90.0`, unquoted). So `total_score`/`latest_sca_score` are safe number fields; only the *direct* model-field decimals (like plain `sca_score`) are stringified. This inconsistency — two fields that both represent "the SCA score" serializing with different JSON types depending on which code path computed them — is itself worth knowing about even though it isn't currently crashing anything.

**Frontend type declarations, checked against the above:**
- `CoffeeLot.sca_score: number | null` — **wrong**, should be `string | null`. (`api/lots.ts:16`)
- `CuppingScore.fragrance_aroma/flavor/aftertaste/.../defects: number` (10 fields) — **wrong**, should be `string`. (`api/lots.ts:97-107`)
- `volume_kg`, `price_per_kg`, `available_qty_kg`, `fob_price_usd`, `min_order_kg` — **correctly** typed `string`.
- `FarmerProfile.farm_size_ha/gps_lat/gps_lng` — **correctly** typed `string | null`.
- `Offer.quantity_kg/price_per_kg_usd/counter_price/counter_qty` — **correctly** typed `string`/`string | null`.
- `CuppingScore.total_score` / `latest_sca_score` — **correctly** typed `number` (per the correction above).

**Every call site of the two mistyped field groups, checked one by one:**

All 24 usages of `.sca_score` across `MyFarm.tsx`, `FarmerLotsMap.tsx`, `LotPipeline.tsx`, `Dashboard.tsx`, `EditLot.tsx`, `Lots.tsx`, `LotDetail.tsx`, `CreateLot.tsx` are either (a) direct text rendering — safe regardless of type, since React renders strings and numbers identically — or (b) explicitly wrapped in `Number(...)` or `parseFloat(String(...))`. **One exception, not a crash but worth fixing for correctness:** `Lots.tsx:163` — `lot.sca_score && lot.sca_score >= 85` compares a string directly against a number with no explicit conversion. This *happens to work* because JavaScript's `>=` operator coerces a string operand to a number when compared against a number — but it's fragile and relies on an accident of the language rather than an explicit choice, and it's exactly the pattern that already caused the one confirmed historical crash.

All usages of the 10 cupping-component fields (`components/CuppingHistory.tsx:86`, `pages/LotDetail.tsx:141-147`, `pages/MarketplaceLotDetail.tsx:276-282`) are explicitly wrapped in `parseFloat(String(...))` — safe.

**Conclusion on #3:** the one specific crash that was fixed stays fixed, and every other current call site of the same mistyped fields happens to be safe (mostly through explicit conversion, one through accidental JS coercion). But the *type declarations themselves* are still wrong, so this isn't actually closed — it's a landmine waiting for the next person (human or AI) who trusts the `CoffeeLot`/`CuppingScore` TypeScript interfaces and writes `lot.sca_score.toFixed(1)` or `score.flavor * 2` without checking DRF's actual wire format first.

---

## 4. New Bugs or Gaps You Find

1. **Compliance document uploads have zero file-type or size validation** (see §5 for severity). `phyto_cert_file`, `ecex_permit_file`, `nbe_fx_declaration_file`, `customs_declaration_file`, `eudr_dds_file` (on `CoffeeLot`) and `ecta_license_file` (on `User`) are all plain `models.FileField(upload_to=..., null=True, blank=True)` with **no `validators=[]` argument at all** — no extension allowlist, no size cap, nothing. Any authenticated exporter can upload literally any file type of any size to what's presented as a "phytosanitary certificate." This is the exact area a regulator or auditor would scrutinize first, and it's currently the least protected upload path in the app — contrast with the farm-photo upload feature built this session, which does have both.

2. **Compliance documents and the exporter's ECTA license are visible to any buyer, and the underlying files are fetchable by literally anyone once the URL is known — confirmed live.** `CoffeeLotDetailSerializer` uses `fields = "__all__"` (`serializers.py:107-110`), which includes every document `FileField` plus `exporter_ecta_file`. Any buyer role can `GET` a listed lot's detail and receive the real file URLs. I confirmed this against production: a real buyer login returned a working URL for the exporter's ECTA license file, and — because Django's `static()` media serving (wired in `config/urls.py`) does no per-request authorization — I was able to download that exact file with **zero authentication at all** (`curl` with no token, 200 OK, 660KB PDF). The filename pattern strongly suggests it's a personal résumé, not a license document, meaning this isn't just a design gap — it may currently be exposing a real person's private document to the public internet. I did not open the file's contents. **Note on timing:** this exposure existed at the API-response level before this session, but was not actually *reachable* until earlier in this session, when I fixed a separate nginx bug that had been silently serving the SPA shell instead of real files for every `/media/` request. Fixing that infra bug (needed for the farm-photo feature) made this pre-existing serializer-level exposure into a live, working information leak. I'm flagging it prominently because of that.

3. **`FarmerLotsMap.tsx` silently fails to show point-only farm locations.** It fetches lots via `getLots()` (the list endpoint, `CoffeeLotListSerializer`), whose `fields` list does not include `gps_lat`/`gps_lng`/`farm_location` at all — only `boundary`. The component's fallback rendering path (`else if (lot.gps_lat && lot.gps_lng)`, `FarmerLotsMap.tsx:71-72`) can therefore never fire; `lot.gps_lat` is always `undefined` from this data source. Any lot that only has a GPS point (not a full boundary polygon) — which is the expected case for small farms under 4 hectares, per the data model's own documented design — silently doesn't appear on the farmer map. No error, just missing pins.

4. **The frontend NBE rate input is non-functional** — already covered in §3, repeated here because it's a new finding, not a re-confirmation of the original claim. It's worth restating the practical impact: a real exporter using the live settlement calculator today, entering a genuine updated NBE rate before finalizing a contract, will get a dollar figure calculated at 59.85 regardless of what they typed, with no error or warning.

5. **No rate limiting anywhere in the API**, including the login endpoint. Grepped `REST_FRAMEWORK` settings and every view file — no `DEFAULT_THROTTLE_CLASSES`, no `@throttle_classes`, nothing. `/api/auth/token/` uses the stock `simplejwt` `TokenObtainPairView` unwrapped. This was flagged as unchecked in the audit-prompt templates and is now confirmed: there is genuinely no brute-force protection on login.

6. **No server-side token revocation on logout.** `rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`. Combined with `ROTATE_REFRESH_TOKENS = True` but no blacklist app, "logging out" only clears the token client-side — a captured refresh token stays valid for its full 7-day lifetime regardless of logout.

7. **Django admin still says "Bunna Bridge"** (`JAZZMIN_SETTINGS`, `config/settings/base.py:381-383`: `site_title`, `site_header`, `welcome_sign` all read "Bunna Bridge"). Low priority — internal-only surface — but noted since the rebrand is explicitly in scope this session.

8. **Registration doesn't run Django's password validators.** `RegisterSerializer` enforces `min_length=8` at the DRF level but never calls `django.contrib.auth.password_validation.validate_password()`, so Django's `AUTH_PASSWORD_VALIDATORS` (common-password check, similarity-to-username check, etc.) are configured but never actually invoked for new accounts. A password like `"aaaaaaaa"` currently passes.

---

## 5. Security Basics

| Area | Finding | Severity |
|---|---|---|
| IDOR — lots | **Protected.** Exporter/buyer/farmer querysets are all correctly scoped (`get_queryset()` filters), and DRF's generic `get_object()` respects that scoping — an exporter genuinely cannot fetch or edit another exporter's lot, even by guessing the UUID. Confirmed by reading `CoffeeLotViewSet.get_queryset()` and how `ModelViewSet` uses it. | — |
| IDOR — offers | **Protected.** `OfferDetailView`/`OfferRespondView`/`OfferWithdrawView` all scope by `buyer=request.user` or `lot__exporter=request.user` directly in the DB lookup — a 404, not a 403, for anything outside your scope, which is the correct pattern. | — |
| IDOR — samples | **Protected.** Same pattern in `SampleRequestViewSet.get_queryset()`. | — |
| Compliance gate fields | **Not protected — see §2.** 5 of 7 gates directly writable by any exporter on their own lot. | **Critical** |
| Compliance document files | **Not protected.** No type/size validation on upload (finding #1 above); visible to any buyer and fetchable by anyone once uploaded, with a confirmed live proof of an unauthenticated download (finding #2 above). | **Critical** |
| Farm photo uploads (new feature, this session) | **Protected.** Content-type allowlist (jpeg/png/webp), 5MB cap, 8-photo cap, owner-only write. For contrast — this is what the document uploads above don't have. | — |
| Password storage | Standard Django hashing (`AbstractUser`), never serialized back (`UserSerializer` fields list excludes `password`). | — |
| Registration password strength | `min_length=8` only; Django's configured validators aren't actually invoked. | Low |
| CORS | Explicit allowlist (`localhost:5173`, `localhost:3000`, `https://bunnabridge.pro.et`), not a wildcard. Correct. | — |
| JWT | 2h access / 7-day refresh, rotation on, **no blacklist app installed** — logout doesn't actually revoke a refresh token server-side. | Medium |
| Rate limiting | **None, anywhere**, including login. | High |
| SQL injection | No raw SQL anywhere in `lots`/`users` apps — everything goes through the ORM/QuerySet API. | — |

---

## 6. Rebrand Completion

**Direct answer to "which pages still have old Dark Roast values":** only two files contain genuinely *wrong* (old-palette) hex values:

- `components/PolygonCaptureWidget.tsx:356` — `#4A7C59` (old sage green) used for a button border. Should be the current sage, `#2D7A52`.
- `components/TopBar.tsx:95` — `#C9952A` (old gold/amber) used for the `offer` notification icon color. **This one was introduced this session** (I added the `offer` notification type's icon earlier and picked a leftover-palette color by mistake) — flagging it on myself rather than letting it look like older debt.

**The more useful finding, since it changes how you should think about "rebrand completion":** color *values* are almost entirely correct across the app — spot-checking `Marketplace.tsx`'s raw hex values found `#1B4D35` (forest), `#E8F2EC` (forest-light), `#1C1C1A` (ink), `#4A4A45` (slate), `#F0EDE6` (stone) — all genuinely current Beersheba tokens. The actual gap isn't wrong colors, it's *how* they're implemented: only **3 of ~31 page/component files** (`Dashboard.tsx`, `Lots.tsx`, and `LotStory.tsx`, the last built fresh this session) use the Tailwind v4 token classes (`bg-forest`, `text-ink`, etc.) that `index.css`'s `@theme` block defines. Every other file — `LotDetail.tsx`, `MarketplaceLotDetail.tsx`, `Marketplace.tsx`, `CreateLot.tsx`, `EditLot.tsx`, `Login.tsx`, `MyFarm.tsx`, `SettlementWidget.tsx`, `TopBar.tsx`, and roughly 20 more — is still 100% raw inline hex, one style object per element. Visually this mostly doesn't matter (the colors are right), but it means the "one page per session" migration you described was really a *color-value* fix, not the token-system migration the file structure suggests it was, and a future rebrand (or dark-mode support, or any systematic color change) will require touching every one of those ~28 files individually rather than editing `index.css` once.

---

## 7. Plain-Language Explainers

### What Hansen Global Forest Change is, and why we use it

The Hansen Global Forest Change dataset is a satellite-based map of the world's tree cover, and — critically — where and when that tree cover disappeared. It's built and maintained by researchers at the University of Maryland, using imagery from NASA and the US Geological Survey's Landsat satellites, and it's freely published through Google's Global Forest Watch program. It's not a commercial or promotional dataset — it's the same data academic researchers, conservation groups, and increasingly EU regulators themselves reference, because it's produced independently of any single country or company and the methodology is published and peer-reviewed. For our purposes, it lets us take a farm's GPS boundary and ask a precise question: was any part of this exact plot of land forested before, and cleared after, December 31, 2020 — the EUDR's legal cutoff date? The satellite resolution is about 30 meters per pixel, updated on an annual cycle, so it can't tell you about a single tree, but it's more than precise enough to catch a farm carved out of forest in the last few years — which is exactly what the regulation cares about.

### What the 7-gate compliance engine actually does today

The idea is that a coffee lot can't be marked ready for export until seven separate checks all pass — deforestation-free land, verified GPS location, a completed EU due-diligence statement, a valid phytosanitary certificate, an active export license, a filed foreign-exchange declaration, and a price that clears the government floor. Two of those seven are genuinely automatic today: whether a certificate has actually been uploaded is computed from the real file, not a checkbox, so that can't be faked. And when an exporter maps a farm's boundary, the system runs a real satellite check against actual deforestation data covering all of Ethiopia — that part is real and it works. The honest gap, and the reason this audit exists, is that the other five checks — including the deforestation flag itself, once it's been set — are currently just switches an exporter can flip from their own account, with nothing double-checking that the real work happened first. In its current state, the system is better described as "a structured checklist with one automated, tamper-resistant check and real satellite backing behind it" rather than "an automated compliance engine" end to end. That's a fixable engineering gap, not a fundamental flaw in the design — the hard part (the satellite data and the spatial query) is already built and working; what's missing is locking the other switches so only the system itself, not the exporter, can flip them once the real check has run.

---

## 8. Top 5 Action Items

**1. Lock the compliance gates so exporters can't self-certify.** This is the one thing in this report with direct regulatory and financial exposure — a buyer relying on a green "deforestation-free" badge has no guarantee today that anything real backs it. The fix is straightforward (make those fields read-only on the exporter-facing serializer, only settable by the automated check or an admin), but it needs to happen before you'd want a real buyer transacting real money against these flags.

**2. Restrict who can see compliance documents, and lock down the upload path.** Right now any buyer can see — and, since the media-serving fix earlier in this session made the files actually reachable, anyone can download — an exporter's phytosanitary cert, ECTA license, and other compliance paperwork, with no file-type or size restriction on what gets uploaded in the first place. One of the files currently sitting there looks like it may be a personal document that isn't what the field says it is. This deserves a look today, independent of any code fix.

**3. Fix the settlement calculator's rate input.** It's currently decorative — a user can type a new exchange rate and the app will silently use its hardcoded 59.85 instead. For a tool whose whole purpose is calculating real payment splits, this is the kind of bug that erodes trust the moment someone notices, and for a feature meant to be a differentiator, it should be fixed before more people use it.

**4. Add rate limiting to login, and add token revocation.** Neither exists today. Cheap to add, and exactly the kind of gap a real security review would flag first.

**5. Decide what the 7-gate engine should actually claim to be, then either finish automating it or say so plainly.** Two of seven gates are real; the deforestation satellite check specifically is a genuinely strong, credible piece of infrastructure. But "7-gate automated compliance engine" is currently an overstatement of what's built. Either invest in automating gates 2/3/5/7 (GPS capture triggering a real check, DDS generation flipping its own flag, license expiry driving gate 5, an actual price floor comparison), or be precise with investors and partners about which gates are automated today and which are attestations — the second option is completely fine as an interim honest position, the current silent gap between "looks automated" and "is automated" is not.

---

_Everything above was checked against the live database and live API as they actually exist right now, plus the source files as they actually exist in the repository — not against any existing docs in `docs/`, which were treated as unverified claims throughout. Where I found a discrepancy between what was described to me and what the code actually does, I've said so explicitly rather than reconciling it quietly._
