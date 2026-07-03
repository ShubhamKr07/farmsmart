# Database Evaluation — FarmSmart

> DBA + vertical-farming expert review of the shared Postgres/Drizzle schema that
> backs **both** the web portal (`admin-dashboard`) and the mobile app (`farmeasy`).
> Source reviewed: `lib/db/src/schema/index.ts`, the heaviest routes
> (`artifacts/api-server/src/routes/{dashboard,badTrays,cycles}.ts`), and the
> Drizzle migration setup. No changes made — evaluation only.
>
> **Rev 2 (2026-07-03):** second-pass review with claims re-verified against schema and
> routes. Added: Security section (§S — unauthenticated dashboard write), gaps
> G11–G14 (fabricated sensor defaults, orphaned shipments, no inventory ledger,
> text metrics on seed lots), R9 (hardcoded channel count), SMB sizing guidance for
> the sensor time-series, and corrections (12 tables, E4 caveat).

## What's there (foundation)

12 tables: `growth_profiles`, `seed_lots`, `cycles`, `manual_checks`, `alerts`,
`inventory_items`, `shipments`, the facility hierarchy
`rooms → channels → racks → trays`, and a single-row `sensor_status`. Enums for
cycle status, alert severity/status, shipment status, room names. Cascade deletes
on the layout hierarchy. `seed_lots.qrCode` unique, `cycles.shortId` unique,
`cycles.status` indexed, `manual_checks.createdAt` indexed. Drizzle ORM + Postgres.
The core grow-cycle lifecycle (germination → fertigation → harvest → completed) is
modeled with stage timestamps — a sound backbone.

## Strengths to keep

- The cycle stage-timestamp model (`germinationStartedAt`, `fertigationStartedAt`,
  `harvestStartedAt`, `closedAt`) is exactly what's needed for overdue/SLA logic.
- Cascade deletes on `rooms → channels → racks → trays` are correct.
- Enums + zod validation at the API boundary give reasonable input integrity.
- `seed_lots` carries rich lot metadata (supplier, item #, grow time, success) —
  good raw material.

---

## A. Schema gaps (domain modeling)

| # | Gap | Why it matters for a vertical farm |
|---|---|---|
| **G1** | **No sensor time-series.** `sensor_status` is one current-row, overwritten on each update. | Biggest domain gap. Can't answer "what was channel 3's temp last Tuesday" or correlate a bad-tray incident with a pH/temperature spike. The entire value of CEA is *trend* data — anomaly detection, yield correlation, food-safety logs. |
| **G2** | **Sensors are URL strings on channels** (`monitoringApiTemp/WaterLevel/Ph` as text), not entities. | No sensor identity, placement per rack/tray, calibration, unit, or last-seen. Real farms have dozens of sensors per rack. |
| **G3** | **No cycle↔seed-lot relation.** `cycles.seedLotQrCodes` is a `text[]` — no FK. | Can't efficiently query "which cycles used lot X" (full scan), no referential integrity, QR typos silently accepted. `cycles.seedName` is duplicated free-text that can drift from `seed_lots.seedName`. |
| **G4** | **Cycles don't link to the tray hierarchy.** `cycles.trayPosition` is free-text, not a FK to `trays`/`racks`. | Trays are managed in the Layout page but cycles don't reference them — so real rack/channel occupancy can't be computed, the "scan rack QR → rack status + current cycle" benchmark task can't be powered, and capacity planning is impossible. |
| **G5** | **No crop/seed catalog.** `growth_profiles` has only germination/fertigation days. `seedName` is free-text everywhere. | Real profiles carry light (PPFD/DL), temp/RH setpoints per stage, nutrient EC/pH targets, expected yield, seed density, tray type. No canonical crop entity → naming drift, no integrity. |
| **G6** | **No tasks/operations table.** "Action required" is *derived* on each dashboard load, not stored. | Can't assign, schedule, or history-track work (seeding/transplant/harvest tasks). The roadmap's "operational tasks" feature has no schema home. |
| **G7** | **Bad trays are a flag on `manual_checks`, not a first-class entity.** Loss is a hardcoded `LOSS_PER_TRAY=500` in the route. | No per-tray traceability (trays table isn't referenced), loss can't vary by crop, and the "bad trays" analysis is a JS aggregation over all manual checks. |
| **G8** | **No facility/site or tenancy model.** `rooms` is the top level. | Roadmap explicitly mentions a "second facility." The schema can't represent multiple facilities or ownership. |
| **G9** | **Dates stored as `text`** (`seedingDate`, `arrivalDate`, `shippingDate`). | Loses type safety, validation, timezone handling, and native date indexing/functions. |
| **G10** | **No audit / soft-delete.** No `updatedAt` on cycles; inventory/shipments deletes are hard-delete. | The "Recover: a data-entry mistake can always be corrected" benchmark has no safety net. No who-changed-what-when. |
| **G11** | **The schema fabricates sensor data.** `sensor_status` columns have invented defaults (`sensorsOnline: 24`, `tempCelsius: 30`, `acidityPh: 6.0`, `humidityPct: 65`), and `dashboard.ts` substitutes a *different* hardcoded set (temp 22.5, 4 sensors) when the table is empty. | A missing reading rendered as a plausible temperature is actively dangerous: a manager sees 22.5°C and doesn't walk to the room. Violates the "truthful data" principle (DESIGN.md §0) at the schema level. Sensor columns must be nullable with no invented defaults — absence must be representable. |
| **G12** | **Shipments are orphaned.** `shipments` has no FK to anything; `yieldSoldKg` and `client` float free of cycles/harvests. | Food-safety recall readiness requires **one-up/one-down** traceability: supplier lot → cycle → harvest → shipment → client. Without cycle↔shipment linkage you can trace an incident back to a lot but cannot answer "which clients received product from that lot" — the half that matters in a recall. Same tier as G3. |
| **G13** | **No inventory movement ledger.** `inventory_items.currentQty` is mutated in place; no `stock_movements` table. | Nutrient/media consumption per cycle *is* the COGS story for an SMB farm. An overwritten quantity can't be audited or correlated with cycles ("did the pH crash coincide with switching nutrient lots?"). Distinct from G10's generic audit gap. |
| **G14** | **Seed-lot performance metrics stored as `text`.** `seed_lots.success` and `seed_lots.growTime` are text columns. | You cannot aggregate text. This blocks opportunity E4 (lot performance modeling) until both become numeric — belongs alongside G9's date-typing fix. |

## B. Performance & indexing risks

| # | Risk | Evidence |
|---|---|---|
| **R1** | **`alerts.status` has no index** but is filtered on every dashboard load, the TopBar bell, and the right rail. | `dashboard.ts` does `where status='current'` repeatedly. Scans as alerts accumulate. |
| **R2** | **`manual_checks.cycleId` and `isBadTrays` unindexed.** | `GET /cycles/:id/manual-checks` filters by `cycleId`; bad-trays analysis filters `isBadTrays=true`. Both scan. |
| **R3** | **`cycles.closedAt` / `createdAt` unindexed** though dashboard time-buckets on them. | The route loads *all* cycles and filters time windows in JS. |
| **R4** | **No server-side pagination.** cycles/shipments/inventory return *all* rows; the DataTable paginates client-side. | Won't scale past a few thousand rows; mobile app will feel it first. |
| **R5** | **Dashboard is 6–7 sequential queries + full scans + JS aggregation**, polled every 2–5 min by the dashboard and bell. | Loads all cycles twice, all manual_checks, all alerts, all seed_lots, then computes 7-day/4-week buckets in JS. O(n) per poll. |
| **R6** | **Write-on-read side effect:** `GET /dashboard` auto-creates alerts in a loop (SELECT-then-INSERT per item). | Concurrency hazard: two simultaneous loads race to create duplicate alerts; the idempotency check isn't atomic. A GET that writes is a smell — and this GET is **unauthenticated** (see S1), which upgrades it from smell to vulnerability. |
| **R7** | **`shortId` generation is a generate-then-check loop** for cycles and shipments. | Under concurrency two requests can pick the same id; the second insert fails on the unique constraint. |
| **R8** | **`shipments.status/client/shippingDate` and `inventory.category` unindexed** but filtered/sorted/grouped. | Grows linearly. |
| **R9** | **Channel utilization computed against a hardcoded constant.** `TOTAL_CHANNELS = 20` in `dashboard.ts:15`, while a real `channels` table exists. | A headline KPI goes stale the day the farm adds or removes a channel. The denominator should be `count(channels)` (or per-room occupancy once G4 lands). Same "truthful data" family as G11. |

## C. Data-integrity & transaction risks

| # | Risk | Fix |
|---|---|---|
| **I1** | **No transactions on multi-step writes.** `complete-harvest` updates the cycle *and* inserts a manual_check as separate statements. | If the second fails, you get a completed cycle with no bad-tray record. Wrap in `db.transaction`. |
| **I2** | **Stage transitions are read-then-write** (check `status`, then update). | Concurrent "move to fertigation" calls can both pass the check. Use a conditional update `WHERE status='germination'` and check `rowCount`, or add a version column. |
| **I3** | **Alert idempotency is app-level only.** | Add a partial unique index on `(title, location) WHERE status='current'` + `ON CONFLICT DO NOTHING`. |
| **I4** | **`manual_checks.cycleId` FK has no ON DELETE rule** (defaults NO ACTION). | Decide cascade vs restrict deliberately; today it's accidental. |
| **I5** | **No CHECK constraints** beyond enums. `currentQty ≤ maxQty`, `fullTrays/halfTrays ≥ 0` are enforced only in zod (app). | Add DB-level CHECKs for defense in depth (mobile client or direct SQL could bypass app validation). |
| **I6** | **Roles live in Clerk session claims, not the DB.** `createdBy` is a free-text Clerk userId with no users table. | No role history or audit is possible. Consider a shadow `users` table synced from Clerk for audit + persistent role assignment. |

## S. Security & access control

| # | Finding | Detail |
|---|---|---|
| **S1** | **`GET /dashboard` is unauthenticated and writes to the database.** | `enforceAuth` is *defined* in `dashboard.ts:20` but never applied to the route (`dashboard.ts:29`), while cycles routes apply it consistently (`cycles.ts:208` etc.). Combined with R6's alert auto-creation, an anonymous caller can trigger DB writes and enumerate operational data (yield, alerts, seed lots). Apply `enforceAuth` before public hosting — this is a one-line fix and belongs at the top of P0. |
| **S2** | **No route-level auth audit exists.** | Auth is applied per-route by hand, so gaps like S1 are silent. Sweep every router for unauthenticated handlers; prefer mounting auth middleware once at the router level and opting *out* (health check) rather than opting in per route. |
| **S3** | **DB user privileges unexamined.** | The app connects as a single (likely superuser-ish) role. Before external hosting: a dedicated app role with least privilege (no DDL, no superuser), separate from the migration role. |
| **S4** | **Roles live in Clerk session claims only** (see I6). | No server-side role enforcement is possible against the DB; any authenticated user is effectively equal at the data layer. |

## D. Ops & deployment risks

- **No migrations — `drizzle-kit push` only.** Push is dev-only; it can't safely evolve a live schema (no reviewable files, no rollback). Before public hosting: switch to `drizzle-kit generate` + `migrate` with versioned migration files.
- **Single Replit Postgres, no SSL, internal-only host** (`postgres:password@helium/heliumdb`). Fine inside Replit; unreachable from any other host. For production/external hosting, move to managed Postgres (Neon/Supabase/RDS) with `sslmode=require`, backups, and a connection pooler.
- **No backup/restore strategy visible** — a farm's operational history is the irreplaceable asset.

## E. Vertical-farming opportunities (the upside)

Where the schema, once extended, becomes a competitive moat rather than a CRUD backend:

1. **Yield traceability & forecasting.** With a crop catalog + richer growth profiles + sensor history + per-tray outcomes, you can track yield per m², forecast harvests, and do full one-up/one-down traceability — supplier lot → cycle → harvest → shipment → client (requires G12's cycle↔shipment link, not just G3). Today yield is one `harvestedQty` number with no per-tray/variety breakdown.
   **SMB sizing note:** a few dozen sensors at 1-minute cadence is ~15–30M rows/year — comfortably vanilla Postgres with a BRIN index on the timestamp and a retention policy (raw for ~90 days, hourly rollups kept forever). Do **not** reach for TimescaleDB or a second datastore on day one.
2. **Bad-tray root-cause.** Correlate bad-tray incidents with sensor-history windows (temp/pH/humidity spikes) on the responsible channel/rack. Currently impossible — and this is where crop-loss reduction lives.
3. **Live facility map & capacity planning.** Linking `cycles → trays` (FK) unlocks a real occupancy view, capacity planning, and the "scan rack QR → rack status + current cycle" benchmark. Right now `trayPosition` is text.
4. **Seed-lot performance.** `seed_lots` already carries `success`/`growTime`, **but both are `text` columns (G14) — they must be converted to numeric before any of this is computable.** Once typed: model germination rate, seed age, and lot performance over time to auto-flag underperforming lots.
5. **Tasks & scheduling.** Persist the "action required" as assignable tasks; plan seeding/harvest cadence per channel and balance workload. (The retired Discord-notification track could fire off this.)
6. **Compliance/audit.** Immutable audit trail + sensor logs + seed-lot traceability get you toward GAP/food-safety readiness — a real sales point for B2B.

## Prioritized recommendations

**Must-do before public hosting (P0):**
- **Apply `enforceAuth` to `GET /dashboard` and sweep every router for unauthenticated handlers (S1, S2)** — one-line fix for a live vulnerability; do this first.
- **Stop fabricating sensor data (G11):** make `sensor_status` reading columns nullable, drop the invented defaults, and remove the hardcoded fallback object in `dashboard.ts` — absent readings must render as absent.
- Add indexes: `alerts(status)`, `manual_checks(cycleId)`, `manual_checks(isBadTrays)` partial, `cycles(closedAt)`, `cycles(createdAt)`, `shipments(status, shippingDate)`.
- Switch from `push` to versioned `drizzle-kit generate` + `migrate`.
- Move the alert auto-creation out of `GET /dashboard` into a scheduled job or `ON CONFLICT DO NOTHING` with a partial unique index (R6, I3).
- Wrap `complete-harvest` (and any multi-write) in a transaction (I1).
- External managed Postgres with SSL + backups (D); dedicated least-privilege app role (S3).
- Replace `TOTAL_CHANNELS = 20` with `count(channels)` (R9) — cheap truthfulness win.

**High-value schema work (P1):**
- `sensor_readings` time-series table + first-class `sensors` entity (G1, G2) — the single biggest domain win. Vanilla Postgres + BRIN + retention policy is sufficient at SMB scale (see E1 sizing note).
- Link `cycles → trays` via FK; retire free-text `trayPosition` (G4).
- Junction table `cycle_seed_lots` with FKs; stop storing QR codes as a `text[]` (G3).
- **Link shipments to cycles/harvests (G12)** — completes one-up/one-down traceability.
- `tasks` table (G6); `bad_tray_entries` first-class (G7).
- **`stock_movements` ledger for inventory (G13)** — consumption per cycle is the COGS story.
- Convert `text` dates to `date`/`timestamptz` (G9) and `seed_lots.success`/`growTime` to numeric (G14); add `updatedAt`/soft-delete + audit (G10).

**Scale & integrity hardening (P1–P2):**
- Server-side pagination + keyset on list endpoints (R4).
- Materialize the dashboard aggregations (SQL `date_trunc` + `generate_series`, or a summary/materialized view) instead of JS over full tables (R5).
- Conditional-update stage transitions + CHECK constraints (I2, I5).
- `shortId` from a sequence or `ON CONFLICT` retry (R7).
- Crop catalog + richer growth profiles + `facilities` tenancy (G5, G8). **Tenancy stays last deliberately** — adding `facility_id` everywhere before a second facility exists is the classic SMB over-engineering trap; a nullable column + backfill migration later is fine.
