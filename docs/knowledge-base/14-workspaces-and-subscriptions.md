# 14 — Workspaces for each client, and subscriptions

Plan written 2026-11-14. Goal: every client (an exporter, cooperative union, importer, roaster or a
partner such as a hotel) gets its own workspace: its own private data, team, settings, branding and
plan. The marketplace stays shared, so clients can still find and trade with each other.

## Recommendation in one paragraph

Use **one database shared by all workspaces, with every record tagged by the workspace that owns it**,
and one central place in the code that filters by workspace. Do not give each client its own database
or server: Beersheba's value is the marketplace *between* clients (offers, contracts, supply transfers,
evidence for importers), the team is small, and one server is easier to keep safe and backed up. This
is how most business software of this kind works.

## Where we are today

- An **Organisation** exists for every business account, with team roles (owner, admin, sales,
  quality, logistics, field agent, viewer) and invitations. This is the starting point for a workspace.
- Records belong to the **user** who created them, not to the organisation. Teams share them through a
  list of teammates' user IDs (`orgs/access.py` → `team_ids()`, used in 23 files).
- A user can belong to **one** organisation only.
- There are no plans, limits or billing.

What this means: the separation already works for teams, but it rests on user IDs. If someone leaves a
company, or a user needs two workspaces (a consultant, a field agent for two cooperatives, Beersheba
support staff), the model does not fit.

## Target design

### 1. The workspace owns the data

- Rename Organisation to **Workspace** on screen. It gets a short name used in links (`slug`), a logo
  and colours, settings, a plan and a status (trial, active, read-only, closed).
- Add a `workspace` field to every record a client owns: producers (plots follow them), lots, washing
  stations, cherry deliveries, supply transfers (seller and buyer side), offers (buyer side), contracts
  (seller and buyer), cupping sessions, story pages, EU stock and orders, certifications, documents.
- Fill it in automatically from the creator's current organisation (a one-off migration), and keep
  `owner` / `created_by` as "who did it" for the audit trail.

### 2. One gatekeeper in the code

- A single helper decides what a request may see: `for_workspace(request)`. Every list and detail
  view uses it, replacing the 59 calls to `team_ids()` / `same_team()` step by step.
- The current workspace comes from the signed-in user's choice and is checked on every request.
- **Automated isolation tests**: for every API endpoint, a test creates two workspaces and proves that
  one cannot read or change the other's records. This test suite is the real safety net.

### 3. Shared things are shared on purpose

These cross workspaces by design, and each gets an explicit rule:

| Shared item | Who sees it |
|---|---|
| Listed lots, public story pages, Learn | Everyone |
| Offers and contracts | The two parties |
| Supply transfers (cooperative → exporter) | Seller and buyer; plots become usable by the buyer |
| Evidence packages and DDS references | The exporter and the importer who bought the lot |
| Cupping sessions | The organiser and invited graders |
| Select auctions | Participants; results public |

### 4. People in more than one workspace

- A user can belong to several workspaces, with a different role in each. A **workspace switcher**
  sits in the top bar.
- Beersheba staff get **support access**: they enter a client workspace only with a written reason,
  and every visit is logged and visible to the client's owner.

### 5. Branding and links

- Phase 1: `bunnabridge.pro.et/w/<slug>` for workspace pages; the client's logo and colours on their
  story pages, PDFs (contracts, evidence packages, spec sheets) and emails.
- Later, if clients ask: their own subdomain (`highland.bunnabridge.pro.et`), which needs a wildcard
  certificate.

### 6. Leaving and data rights

- **Export everything**: a workspace owner downloads all their data (spreadsheets, GeoJSON, documents).
- **Closing a workspace**: it goes read-only, not deleted. EUDR requires records to be kept for five
  years, so compliance records stay available to the client (and only to the client) for that time.

## Subscriptions

### Plans (names and prices are placeholders for the founder to set)

| Plan | For | Includes | Price |
|---|---|---|---|
| **Cooperative** | Unions and cooperatives | Farmer registration, plots, consent, field app, intake, sales to exporters | [free or low, to bring farmers in] |
| **Exporter Starter** | Small exporters | Up to [N] farmers, [N] lots a year, [N] users, evidence packages, marketplace listing | [ETB / month] |
| **Exporter Pro** | Growing exporters | Higher limits, contracts and shipments, story pages, Select nominations, branding | [ETB / month] |
| **Enterprise** | Large exporters, unions | No limits, own subdomain, API access, priority support | [quote] |
| **Buyer / Importer** | EU buyers | Marketplace and offers free; EUDR evidence access, EU stock listing and alerts in a paid tier | [EUR / month] |
| **Story page add-on** | Hotels, roasters, retailers | Branded QR story pages and order requests | [per page or per month] |

Marketplace commission (roadmap F-2) is separate from subscriptions and needs the regulatory checks
noted in the 2026-11-12 review (licensing, foreign-currency rules).

### How limits work

- Each plan lists **features** (on/off) and **limits** (how many farmers, lots, users, story pages).
- Limits are checked where things are created (new producer, new lot, new team member).
- Warnings start at 80%; at the limit, new records are blocked with a clear message and an "upgrade"
  button. **Existing data is never hidden or deleted** because of a plan, and compliance records stay
  readable even when a subscription lapses (read-only mode).
- Trials: 30 days on a paid plan, then the free tier or read-only.

### Payments

- **Ethiopian clients (ETB)**: start with invoices and bank transfer or Telebirr, confirmed by the admin
  in the console. Later, an Ethiopian payment gateway such as Chapa for card and mobile money.
- **Foreign clients (EUR/USD)**: invoice first. Card payments through an international provider need a
  company or account that can receive them, and foreign-currency income must follow National Bank rules.
- Invoices with 15% VAT and the TIN; check the e-invoicing rules that apply.

### Admin console

- All workspaces: plan, status, usage against limits, last activity.
- Change plan, extend a trial, mark an invoice paid, set read-only, close.
- Revenue view: active plans, trials ending, overdue invoices.

## Build order

| Phase | Work | Size |
|---|---|---|
| W-1 | Workspace fields (slug, logo, colours, status); `workspace` field on all owned records, filled from existing data; isolation test suite started | L |
| W-2 | Central `for_workspace` filter; move views over app by app (traceability → lots → trade → quality → market), each with isolation tests | L |
| W-3 | Several workspaces per user, switcher, support access with audit log | M |
| W-4 | Plans, features and limits; checks where records are created; usage shown to the owner | M |
| W-5 | Billing: invoices, manual payment confirmation, admin console; read-only mode | M |
| W-6 | Branding on story pages, PDFs and emails; workspace links | M |
| W-7 | Data export and closing a workspace | S |
| Later | Own subdomains, payment gateway, API keys per workspace | M |

W-1 and W-2 change how every page finds its data. They come first and are done with tests at each
step, so nothing leaks between clients. W-4 and W-5 can then switch subscriptions on.

## Decisions for the founder

1. Plan names, prices and limits (the table above has placeholders).
2. Is the Cooperative plan free? (A free tier brings farmers and their plots onto the platform, which
   makes the paid exporter and importer plans more valuable.)
3. Billing currency and method for each type of client, and which company issues the invoices.
4. Should Beersheba staff have support access to client workspaces, and how is that explained to clients?
5. Is branding (client logos on story pages and PDFs) part of Pro or a separate add-on?
