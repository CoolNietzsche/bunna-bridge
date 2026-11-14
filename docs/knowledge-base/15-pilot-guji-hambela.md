# 15 — Pilot: registering farmers in Hambela (Guji)

Plan written 2026-11-14. First real farmer registration, following the readiness plan in
[13-farmer-registration-readiness.md](13-farmer-registration-readiness.md).
Items marked *(confirm)* must be checked locally before relying on them.

## Hambela at a glance: what matters for the pilot

| Topic | What it means for us |
|---|---|
| **Place** | Hambela Wamena woreda, Guji Zone, Oromia. High-grown smallholder coffee (around 1,900–2,300 m), natural and washed, delivered to washing stations. |
| **Language** | Afaan Oromo (Guji). Field agents, consent forms and the app must work in Afaan Oromo; a Guji speaker should review the wording. |
| **Season** | Main harvest runs roughly November to January *(confirm locally)*. Farmers come to the washing station almost every day. Best time to register them: at the station, when they deliver. |
| **Access** | A long drive from Addis Ababa (through Hawassa and Dilla, most of a day) *(confirm route)*. Network is patchy outside towns, so the field app must work offline all day. |
| **Security** | Parts of Guji have had insecurity in recent years. Check the current situation with the partner and the woreda before every trip *(confirm)*. |
| **Forest** | Much Hambela coffee grows under shade trees or semi-forest. Expect many plots to fall inside the EU 2020 forest map. **That is not a violation**: the EU rule is about forest *cleared after 2020*. The system marks it as a medium risk to explain, not a failure. Thinning of shade trees can also look like forest loss on satellite data, so some plots will need a field check. |
| **Land** | Most plots are small (under 2 ha), often family land without certificates, sometimes registered under the husband while the wife farms. Record the actual farmer, the tenure honestly ("communal / customary", "other"), and gender. |

## Pilot shape

- **Partner:** one washing station in Hambela, and the exporter or cooperative that buys its coffee,
  so the mapped farms turn into a real EUDR-ready lot at the end.
- **Area:** the two kebeles that deliver most cherry to that station.
- **Size:** 60–100 farmers, every plot mapped as a boundary where it can be walked.
- **Team:** three field agents, one supervisor, one coordinator (Beersheba).
- **Length:** about 10 field days, plus one training day.
- **Capacity check:** walking a boundary takes 15–40 minutes, plus travel between farms. Six to ten
  farmers per agent per day is realistic, so three agents for ten days can handle about 200 farmers.
  That leaves room for re-visits.

## Permissions and relationships (before anyone goes to the field)

1. **Partner agreement**: the station owner or exporter agrees to the pilot, gives access at the station
   and names a contact person.
2. **Woreda administration and the woreda agriculture / coffee office**: a letter introducing the pilot.
   Ask for the **official list of kebeles and their codes** (needed for the place-name list).
3. **Kebele chairs**: a short visit before field work starts.
4. **Community meeting** at the station: why the EU asks for this, what is collected, who sees it, that
   joining is voluntary, and that it helps the coffee reach better buyers. No payment for consent (it
   must be freely given); farmers get a receipt or farmer card instead.
5. **ECTA**: tell the regional ECTA office about the pilot and offer to share the data with ECTMS. This
   is the start of the relationship described in the regulatory review.

## People

| Role | Number | Skills | Tasks |
|---|---|---|---|
| Field agent | 3 | Local, speaks Guji Afaan Oromo, reads and writes, comfortable with a smartphone, ideally knows the kebeles | Register farmers, explain and record consent, walk plot boundaries, take photos |
| Supervisor | 1 | Coffee or agriculture background, respected locally | Plans each day, reviews every record in the app, re-visits doubtful plots, handles questions |
| Coordinator | 1 (founder or delegate) | Knows the platform | Training, daily check-in, solves system issues with Claude, reports |
| Station contact | 1 (partner's staff) | Knows the farmers | Introduces farmers at delivery time, confirms names and deliveries |

## Equipment

| Item | Number | Note |
|---|---|---|
| Android phones (Android 10 or newer, good GPS, 3 GB RAM or more) | 4 (+1 spare) | Test GPS accuracy under trees before buying |
| SIM cards with data, both networks | 4 | Signal differs by area |
| Power banks (20,000 mAh) and one solar charger | 4 + 1 | Long days away from power |
| Printed consent forms (Afaan Oromo), clipboards, pens | 150 forms | Each form numbered |
| ID badges and a letter from the woreda | 5 | Builds trust at the door |
| Optional: external GPS receivers | 2 | Better accuracy under canopy; try on the pilot, decide later |
| Transport: vehicle hire or motorbikes, fuel | — | Farms are spread out |

Budget lines to fill in: agent day rate × 3 × 11 days, supervisor, transport and fuel, accommodation and
meals, phones and accessories, printing, community meeting, contingency (10%).

## System preparation (before day one)

| # | Item | Plan ref | Who |
|---|---|---|---|
| S-1 | **Forest data for Hambela**: download the forest-loss data (Hansen, 2001–2024) and the EU 2020 forest map (JRC GFC2020) for the area, cut them to the Hambela woreda boundary, turn them into map shapes and load them. Processing happens off the server, so only a few megabytes reach it. The preparation script and guide are missing from the repo and get written now. | R-1 | Claude builds and prepares the files; founder runs two load commands |
| S-2 | **Place list**: Guji Zone → Hambela Wamena → its kebeles (official names and codes from the woreda office) as choices in the app. | G-6 | Claude, with the woreda list |
| S-3 | **GPS accuracy stored** for every point and boundary corner; several readings averaged for a point; a warning when the measured area is far from the declared area. | G-4 | Claude |
| S-4 | **Supervisor review**: new records wait for the supervisor; approve or send back with a reason. | G-5 | Claude |
| S-5 | **Consent forms in Afaan Oromo** (and Amharic, English) with version numbers, printable; the version is recorded with each consent. | R-3 | Claude writes, Guji speaker reviews |
| S-6 | **App text review** by a Guji Afaan Oromo speaker. | R-4 | Founder arranges |
| S-7 | **Workspace and accounts**: an organisation for the partner, accounts for the three agents (field-agent role) and the supervisor. Real data stays separate from the demo accounts. | — | Founder, in the app |
| S-8 | **Backups switched on**: nightly backups are required once real farmer data exists. | OPS | Founder runs one command |
| S-9 | **Data protection minimum**: privacy notice in Afaan Oromo; the lawyer's view on hosting; ECA registration started. | R-2 | Founder + lawyer |
| S-10 | **Rehearsal**: a full day with the app in flight mode on a farm near Addis, then sync, then review. | R-6 | Coordinator + one agent |

Duplicate farmers (G-1) and overlapping plots (G-3) can follow during or after the pilot. With 100
farmers the supervisor can catch them by eye, and the pilot data shows how often they happen.

## Operations

**Training day (in Hambela town or at the station):**
- why the EU asks for this;
- how to explain consent;
- the app, step by step;
- walking a boundary;
- photos;
- what to do when there is no signal;
- practice on two real farms;
- each agent registers one farmer while the supervisor watches.

**Each field day:**
1. **Morning (at the station or in town):** phones charged, app opened while there is signal, the day's
   farmers and route agreed with the supervisor.
2. **At the station during deliveries:** register farmers as they arrive (identity, phone, consent with
   the signed form photographed), and agree a time to visit their farm.
3. **On the farms:** walk the boundary (or take an averaged point for very small plots), photo of the
   plot, note shade cover and tenure.
4. **Evening:** sync where there is signal; the supervisor reviews every record the same day and
   flags re-visits; the coordinator checks numbers and problems with the agents.

**Data quality rules:**
- GPS accuracy of 15 m or better for every reading.
- A boundary for every plot that can be walked.
- Consent recorded with a photo of the signed form for 100% of farmers.
- Gender and tenure recorded.
- The farmer's name as they use it, checked with the station's delivery records.

**Weekly:** a short report covering farmers registered, plots mapped, plots clear or flagged by the
forest checks, re-visits and problems.

## Risks and how we handle them

| Risk | Response |
|---|---|
| Farmers distrust data collection (tax, land) | Woreda letter, kebele chair present, community meeting, clear consent, data stays with the farmer's buyer and ECTA |
| Poor GPS under canopy | Averaged points, accuracy stored, external receiver on trial, re-visit if over 15 m |
| No signal for days | Offline app; sync in town; supervisor carries a phone on the other network |
| Phones run out of power | Power banks, solar charger, data saving mode |
| Same farmer sells to several stations | Record all stations they deliver to; duplicate check later (G-1) |
| Plots inside the 2020 forest map | Expected; marked medium risk; note shade cover and that no clearing happened; field photo as evidence |
| Security incidents | Check with the partner and woreda daily; stop field work if advised |
| Harvest pressure (farmers busy) | Register at the station when they come anyway; short farm visits |

## Timeline

| Week | Work |
|---|---|
| 1–2 | Partner and woreda agreements; hire and brief agents; S-1 to S-5 built and tested; consent forms printed; phones bought |
| 3 | S-6 to S-10; training day; first two field days with close supervision |
| 4–5 | Field work (about 10 days) |
| 6 | Review: data quality, cost per farmer, problems; fix list for scaling |

The harvest makes timing matter: starting field work by early December keeps registration at the station
possible while farmers are delivering.

## What we have at the end

- 60–100 farmers with consent, every plot mapped and checked against both forest datasets.
- A list of plots needing explanation (inside the 2020 forest map, or flagged for loss), with field notes.
- A first EUDR-ready lot built from those plots, with its evidence package and public story page.
- Cost and time per farmer, which sets the price of registration for the subscription plans.
- A dataset to share with ECTA's ECTMS.

## Decisions for the founder

1. Which washing station and buyer in Hambela?
2. Field team: hire agents through the partner, or recruit directly?
3. Budget approval for the lines above.
4. Hosting decision for real farmer data (Germany with legal sign-off, or Ethiopia).
5. Start date, given the harvest.
