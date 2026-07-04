# FarmSmart — Selectable Metrics Dashboard: Implementation Plan

Companion to `metrics-data-dictionary.md` and `metrics-design.md`.
Phased, smallest-merge-first. No phase breaks the current dashboard.

> **Rev 3 (2026-07-03):** Reconciliation pass. `FACILITY_TIMEZONE` env is an
> M2 prereq (templates read it); `BAD_TRAYS_CUTOVER_DATE` pinned to migration
> `0003`; `table`-template metrics in `/api/metrics` are top-N (LIMIT) with
> `resourceLink` to paginated resource endpoints (M4); `marginByCrop` stays
> gated until a `stock_movements` cost field is added (schema change).

> **Rev 2 (2026-07-03):** BI review pass. Query templates replace
> one-file-per-metric (M2), golden-fixture correctness tests made a gate for
> M3, time-range selector moved up to M2, CSV export added (M3), list-type
> payloads moved out of `/api/metrics` (M4), `Promise.all` on dispatch.

## Phase M1 — Registry + picker shell (no new data)

1. Create `artifacts/admin-dashboard/src/lib/metrics/registry.ts` with all
   metric defs (IDs / labels / categories / render / defaultSelected). Split
   into three per-tab sub-modules for size.
2. `useMetricSelection(tab)` hook — reads/writes `localStorage`, seeded from
   registry defaults.
3. `MetricPicker` (popover + command list, grouped, checkbox toggle, search,
   "Reset to defaults" action). Mount in Overview / Shipments / Inventory
   headers.
4. `MetricCard` wrapper + `MetricGrid`.
5. Refactor existing Overview / Shipments / Inventory widgets into
   `<MetricCard>` instances backed by Tier-A data (same endpoints). No visual
   change.
6. Wire the picker to add/remove cards from the grid.

**Verify:** defaults render identically; toggling hides/shows cards;
selection persists on reload.

## Phase M2 — `/api/metrics` endpoint + Tier-B wiring

1. `artifacts/api-server/src/routes/metrics.ts`:
   `GET /api/metrics?tab=&keys=&range=`. Validate `keys` against the registry
   allowlist. **Dispatch via query templates, not one file per metric:** the
   catalog is 100+ entries but ~5 SQL shapes — build
   `lib/metrics/templates/{scalarAgg,groupBy,timeBucket,ratio,table}.ts`;
   each registry entry declares `template` + `templateParams` (table, measure,
   dimension, window). Catalog then grows by registry data, not by code.
   All templates take the facility timezone (`FACILITY_TIMEZONE` env, M2
   prereq) + apply the dictionary §1.5 global rules (soft-delete filter,
   Monday weeks, `BAD_TRAYS_CUTOVER_DATE` for bad-trays union) centrally —
   one place, impossible to forget per-metric. Run requested keys with
   `Promise.all`, not sequentially. `table`-template metrics return top-N
   (LIMIT, no cursor); full paginated lists stay on resource endpoints (M4).
2. Register the route in `app.ts` behind `requireSignedIn`. Add
   `GET /api/metrics/availability` (cheap EXISTS checks, 5-min cache) for
   `requires` gating. Add OpenAPI/orval codegen (`useListMetrics`).
3. `TimeRangeSelector` per tab wired to the `range` param (moved up from M4 —
   a metrics dashboard without a date control is a fixed report).
4. Implement Tier-B metrics in priority order (registry entries + any params
   the templates don't cover yet):
   `ov.yield.byMonth`, `ov.cycles.byStatus`, `ov.bad.byIssue`,
   `ov.bad.bySeverity`, `ov.alerts.bySeverity`, `ov.tasks.byStatus`,
   `ov.sensor.*Trend` (sensor_readings), `sh.rev.byClient`, `sh.rev.byMonth`,
   **`sh.econ.pricePerKg` + `sh.econ.pricePerKgByClient` + `sh.econ.wasteRate`
   (Rev 2 decision metrics — higher business value than most of the long
   tail)**, `sh.byStatus`, `sh.overTime`, `inv.mov.*` (stock_movements),
   `inv.byCategory.qty`.
5. Dashboard: swap those cards from Tier-A stub to `/api/metrics` data.
   Track remaining Tier-A metrics — each one migrated here or in M3;
   none survive to M4 (design §3: Tier A is transitional).

**Verify — golden-fixture tests, not manual checks:** seeded fixture DB with
known rows + expected value per metric ID, run in CI. Wrong BI numbers are
worse than none; "manual SQL check" doesn't survive refactors. Templates make
this cheap: exhaustive tests per template × spot-checks per registry entry.
Plus: empty-data case shows the empty state; JS-vs-SQL parity check for every
migrated Tier-A metric (same number before/after swap, same timezone rules).

## Phase M3 — Remaining catalog + chart variety

**Gate: golden-fixture test suite from M2 green in CI before M3 starts.**

1. Implement remaining Tier-B queries (forecast, expected-vs-actual,
   setpoint-vs-actual, stage-duration vs profile, `sh.econ.marginByCrop`
   (gated on `cost` availability), traceability tables, recall-exposure,
   turnover / days-remaining). Finish migrating all Tier-A metrics.
2. Add `render` types not yet present: `scatter`, `heatmap`, `gauge`, `table`
   (traceability) — using Recharts Scatter / CustomCell + existing
   `table.tsx`.
3. Wire `requires` gating to `/api/metrics/availability` (from M2) — picker
   disables gated entries with a reason string; no per-metric null probing.
4. **CSV export per card** (serialize the card's already-fetched data) + ⓘ
   definition tooltips from registry `description`.

**Verify:** full catalog selectable; gated metrics show a disabled state with
a reason; export round-trips into a spreadsheet with unit-labeled headers.

## Phase M4 — Persistence + polish (aligns with DB Phase 4)

1. `user_settings` table migration (alongside I6 shadow-users) +
   `GET/PUT /api/users/me/settings`.
2. Swap `useMetricSelection` storage backend → API (localStorage becomes
   fallback/cache).
3. Drag-to-reorder (dnd-kit) + per-card time-range override where relevant
   (tab-level selector already shipped in M2).
4. Server-side keyset pagination (R4) for list-type payloads — **on their
   resource endpoints, not inside `/api/metrics`**: lists (`actionRequired`,
   `lowStock.list`, traceability tables) are resources, not aggregates;
   mixing pagination into a batched metrics contract muddles both.
   `/api/metrics` returns aggregates and at most top-N rows (LIMIT, no
   cursor); list cards link to the paginated resource view.

**Verify:** selection persists across devices; reorder persists.

## Files touched (M1–M3, no schema change)

- New (dashboard): `src/lib/metrics/registry.ts` (+ per-tab splits),
  `useMetricSelection.ts`, `MetricPicker.tsx`, `MetricCard.tsx`,
  `MetricGrid.tsx`, `TimeRangeSelector.tsx`.
- New (API): `src/routes/metrics.ts`,
  `src/lib/metrics/templates/{scalarAgg,groupBy,timeBucket,ratio,table}.ts`
  (~5 files, not one per metric), availability route, shared registry module,
  golden-fixture test suite (`tests/metrics/`).
- Edit: `app.ts` (mount metrics + availability routes), the three page files
  (refactor to MetricCard grid), OpenAPI spec, orval codegen.
- No DB migration until M4.

## Risks / notes

- `/api/metrics` must guard against arbitrary `keys` — strict allowlist from
  the registry; never accept raw SQL. Template params are typed enums/columns
  from the registry, never user input interpolated into SQL.
- Keep `GET /api/dashboard` intact during M1 (Tier-A still reads it) to avoid
  a flag-day rewrite — but Tier A must be fully migrated by end of M3
  (design §3); a KPI and its chart disagreeing (JS vs SQL bucketing) is the
  fastest way to lose user trust in every number on the page.
- `date_trunc` quoting bug pattern — all new queries use the quoted-literal
  helper, never raw `sql.raw(unit)`. Timezone + Monday-week rules live in the
  templates (dictionary §1.5), not per query.
- Chart perf: cap time-series to the last N points server-side (e.g. 90 days
  raw, then hourly rollup) per the E1 sizing note.
- `loss_estimate` unit audit (dictionary caveats) before any loss KPI ships —
  dollars rendered as kg is a credibility bug, not a typo.
- Bad-trays cutover date (dictionary rule 4) must be a named constant in the
  templates module — not re-derived per query.
