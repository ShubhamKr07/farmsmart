# FarmSmart — Selectable Metrics Dashboard: Design Plan

Companion to `metrics-data-dictionary.md`. No code changes — design only.

> **Rev 3 (2026-07-03):** Reconciliation pass. Added `topN`/`resourceLink` to
> the registry to separate top-N `table` aggregates (served by `/api/metrics`
> with LIMIT) from full paginated lists (resource endpoints, M4); stated the
> dashboard sensor snapshot sources from `sensor_readings` (dictionary rule 5);
> flagged `FACILITY_TIMEZONE` env as an M2 prerequisite (dictionary rule 1).

> **Rev 2 (2026-07-03):** BI review pass. Tier A declared transitional (drift
> risk), global time-range selector + CSV export added as core (not polish),
> `requires` gating specified via an availability endpoint, metric-definition
> tooltips added, registry extended with unit/window/template fields.

## 1. Goals
- Per-tab dropdown (multi-select) listing every metric in that tab's catalog, grouped by category.
- Toggling a metric adds/removes its card from the tab dashboard immediately.
- Selections persist per user across sessions.
- No N+1 requests; the server computes only selected metrics.
- First render identical to today (defaults match current widgets).
- **One compute path per number.** A KPI and the chart it summarizes must come
  from the same query path — never client JS for one and server SQL for the
  other (see §3 end-state).
- **Global time-range selector per tab** (7d / 30d / 90d / custom) applied to
  every windowed metric — a BI dashboard without a date control is a fixed
  report. Ships with the endpoint (M2), not as polish.
- **CSV export per card** (and per tab). SMB owners live in spreadsheets;
  the data is already in card shape — export is a serializer, not a feature.

## 2. Metric registry (source of truth)

A single shared TS module `lib/metrics/registry.ts` (consumed by both API and
dashboard) defines every metric:

```ts
interface MetricDef {
  id: string;                 // e.g. "ov.yield.byWeek"
  tab: "overview" | "shipments" | "inventory";
  label: string;
  category: string;           // for dropdown grouping
  description: string;        // shown as ⓘ tooltip on the card — the user
                              // must be able to see the formula/window
  unit: string;               // "kg" | "g" | "USD" | "days" | "%" | "count"
                              // (dictionary rule 3 — no unitless numbers)
  window?: "7d" | "30d" | "90d" | "range" | "all";
                              // respects the tab time-range selector
  render: "kpi" | "stat" | "area" | "bar" | "hbar" | "line" | "donut"
        | "stacked" | "table" | "list" | "gauge" | "scatter" | "heatmap";
  dataKey: string;            // server metric key returned by /api/metrics
  template: "scalarAgg" | "groupBy" | "timeBucket" | "ratio" | "table";
  templateParams: Record<string, string | number>;
                              // template + params replace one-file-per-metric
                              // query modules (see implementation plan M2)
  defaultSelected: boolean;
  requires?: string[];        // availability gates, resolved server-side
                              // (e.g. "revenue", "sensor_readings", "cost")
  topN?: number;              // for `template:"table"` metrics served by
                              // /api/metrics — returns at most N rows (LIMIT,
                              // no cursor). Full paginated lists are NOT
                              // metrics; they live on resource endpoints (M4).
  resourceLink?: string;      // for list/table cards: href to the paginated
                              // resource view (e.g. "/shipments?trace=…").
                              // Presence means /api/metrics returns top-N only
                              // and the card links out for the full list.
}
```

The registry is both the dropdown's data source and the API's allowed-key list.

## 3. Data strategy

Two tiers:

- **Tier A — already available.** Metrics derivable from existing endpoints
  (`/api/dashboard`, `/api/shipments`, `/api/inventory`) computed client-side
  (today's KPIs). Kept as-is.
- **Tier B — new aggregations.** Served by a new
  `GET /api/metrics?tab=overview&keys=ov.yield.byMonth,ov.cycles.byStatus,…`
  that runs only the requested SQL aggregations server-side and returns
  `{ "<key>": <data> }`. Reuses the Phase 3 `date_trunc` + `generate_series`
  pattern (now quote-fixed). Auth-gated via existing `requireSignedIn`.

Rationale: avoids shipping all rows client-side (R4 still pending), reuses the
SQL-aggregation pattern, and scales as the catalog grows.

**Tier A is transitional, not permanent.** Two compute paths for one dashboard
= drift: client JS date bucketing and Postgres `date_trunc` disagree at
timezone boundaries, and a weekly-yield KPI (Tier A) contradicting the
yield-by-week chart (Tier B) kills trust in the whole dashboard instantly.
End-state: **every metric served by `/api/metrics`** under the dictionary's
§1.5 global rules (single timezone, week-start, soft-delete filter). Tier A
exists only to avoid a flag-day rewrite in M1; each Tier-A metric migrates in
M2/M3 and `GET /api/dashboard` shrinks to the non-metric payload
(actionRequired list, sensor snapshot). The sensor snapshot is sourced from
the latest `sensor_readings` per sensor (dictionary rule 5), not the
deprecated `sensor_status` row, so the whole dashboard follows one source.

**Availability gating (`requires`).** "Column entirely null" is itself a
query — never probe per metric per render. One
`GET /api/metrics/availability` returns `{ revenue: bool, sensor_readings:
bool, cost: bool, … }`, computed by cheap `EXISTS` checks, cached server-side
(5 min TTL). The picker fetches it once per mount and disables gated entries
with a reason string.

## 4. Frontend architecture

- `MetricPicker` — popover + command list, grouped by `category`, with
  checkboxes + search. One per tab, in the tab header. Built on existing
  `dropdown-menu` / `command` / `popover` UI primitives.
- `MetricCard` — wrapper that renders KPI/stat/chart per `render` type, using
  the existing `chart.tsx` primitives (ChartContainer / ChartTooltip /
  ChartLegend) instead of raw Recharts, to unify styling. Card header carries:
  unit in the label, an **ⓘ definition tooltip** (registry `description` —
  formula + window; a number the user can't interrogate is a number they
  won't trust), a **CSV export** action, and the staleness badge for
  sensor-sourced metrics (dictionary rule 5).
- `TimeRangeSelector` — one per tab header (7d / 30d / 90d / custom), feeds
  `range` param to `/api/metrics`; metrics with `window: "range"` re-bucket,
  fixed-window metrics ignore it and say so in the tooltip.
- `MetricGrid` — responsive CSS grid; cards laid out by selection order.
  Optional drag-reorder (dnd-kit) in a later phase.
- Per-tab container (`Overview` / `Shipments` / `Inventory`) reads selection
  from a `useMetricSelection(tab)` hook and renders `<MetricCard>` for each
  selected id.

## 5. Persistence

- **Now (no schema change):** `localStorage` keyed
  `farmsmart.metrics.<tab>` per Clerk user id. Zero backend work, ships
  immediately.
- **Later (persistent across devices):** add a `user_settings` table
  (`clerk_user_id`, `key`, `value jsonb`, `updated_at`) +
  `GET/PUT /api/users/me/settings`. The hook interface stays identical, so
  swapping storage is a one-file change. Flagged for Phase 4 hardening
  alongside I6's shadow-users table — same Clerk-user concept.

## 6. Backwards compatibility

- Defaults reproduce the current widgets exactly (same KPIs/charts), so users
  who never touch the dropdown see today's dashboard.
- Existing `GET /api/dashboard` stays; Tier-A metrics keep using it.
  `/api/metrics` is additive.

## 7. Edge cases

- Metric whose data is empty → card shows the existing `empty.tsx` empty
  state, not an error.
- Metric requiring unavailable data (e.g. `revenue_usd` all null, or
  `sensor_readings` empty) → registry `requires` gate → card shows "no data
  yet" or the picker entry is auto-disabled.
- Toggling mid-load → React Query keys are scoped per metric; adding/removing
  one card does not refetch the others.
