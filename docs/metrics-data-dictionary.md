# FarmSmart — Metrics Data Dictionary

Source of truth for the selectable-metrics dashboard. Based on the current
Postgres/Drizzle schema (`lib/db/src/schema/index.ts`, **20 tables** —
`grep -c pgTable` verified) and the existing Overview/Shipments/Inventory tabs.

No code changes — document only.

> **Rev 3 (2026-07-03):** Reconciliation pass. Pinned `FACILITY_TIMEZONE` env
> + zoneless-`timestamp` caveat (rule 1), pinned `BAD_TRAYS_CUTOVER_DATE` to
> migration `0003` (rule 4), stated the dashboard sensor snapshot also uses
> `sensor_readings` (rule 5), and clarified `marginByCrop` is schema-blocked
> (caveats). Distinguished top-N `table` metrics (in `/api/metrics`, LIMIT)
> from full paginated lists (resource endpoints, M4) — see registry
> `topN`/`resourceLink` markers.

> **Rev 2 (2026-07-03):** BI review pass. Added §1.5 Global metric rules
> (timezone, soft-delete, units, dual-source cutover, staleness, rate
> denominators), corrected table count (20, not 16), fixed unit ambiguities
> (`loss_estimate`, seeding weight), switched crop grouping to `crop_id`, and
> added the missing decision metrics (margin per crop, $/kg by client, waste %,
> stage-level durations, yield per rack).

## 1. Schema (20 tables)

| Table | Key fields | Type notes |
|---|---|---|
| `crops` | id, name (uniq), scientific_name, category(enum: leafy/herb/brassica/legume/cereal/other) | Phase 3 catalog |
| `growth_profiles` | id, name, seed_name, germination_days, fertigation_days, crop_id→crops, light_ppfd, light_hours, germ/fert temp_c+rh_pct, ec_target, ph_target_min/max, expected_yield_per_tray_kg, seed_density_grams_per_tray, tray_type | Phase 3 enriched |
| `seed_lots` | id, qr_code(uniq), seed_name, supplier, product_link, item_number, vendor_short, gpc_code, type, **success(numeric)**, **grow_time(numeric)**, used_in, currently_grown(bool) | success/growTime numeric since Phase 2b |
| `cycles` | id, short_id(uniq), seed_lot_qr_codes[], seed_name, full_trays, half_trays, seed_weight_tray, growth_profile_id→, seeding_date(date), status(enum: germination/fertigation/harvest/completed), tray_position, germ/fert/harvest_started_at, harvested_qty, closed_at, tray_id→trays, created_by, created_at, updated_at, **deleted_at** | core lifecycle |
| `manual_checks` | id, cycle_id→, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls[], created_by, created_at | bad-tray legacy flag |
| `alerts` | id, title, description, location, severity(enum: critical/warning), status(enum: current/resolved/dismissed), action_type, action_notes, created_at, resolved_at | unique(title,location) where current |
| `inventory_items` | id, name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date(date), created_at, updated_at, **deleted_at** | CHECK current≤max |
| `shipments` | id, short_id(uniq), client, product_description, yield_sold_kg, **revenue_usd**, shipping_date(date), status(enum: in_progress/complete/pending), cycle_id→cycles, created_at, updated_at, deleted_at | cycle link since Phase 2a |
| `facilities`→`rooms`→`channels`→`racks`→`trays` | hierarchy; rooms.name enum(seeding/fertigation/harvesting), rooms.facility_id, channels.monitoring_api_* (text URLs) | cascade layout |
| `sensor_status` | one-row snapshot: sensors_online/total, acidity_ph, water_level_pct, temp_celsius, humidity_pct, nutrient_mix | current only |
| `sensors` | id, channel_id/rack_id (≥1), type(enum: temp/ph/water/humidity/ec), label, unit, last_value, last_read_at | Phase 2a |
| `sensor_readings` | id, sensor_id→, metric, value, read_at | BRIN on read_at; time-series |
| `cycle_seed_lots` | cycle_id, seed_lot_id, qty (PK pair) | junction, replaces text[] |
| `tasks` | id, cycle_id→, type(enum: seed/transplant/harvest/inspect), status(enum: pending/in_progress/done), assignee, due_at, completed_at, created_by, created_at | Phase 2a |
| `bad_tray_entries` | id, cycle_id→, tray_id→, issue, severity(enum: low/medium/high), full_trays, half_trays, photo_urls[], loss_estimate, created_at | Phase 2a first-class |
| `stock_movements` | id, inventory_item_id→, cycle_id→, delta, reason(enum: purchase/consume/adjust), created_at | Phase 2a ledger |

### Derived cross-table paths
- `cycles.tray_id → trays.rack_id → channels → rooms` (capacity/occupancy)
- `cycles ↔ seed_lots` via `cycle_seed_lots`
- `shipments.cycle_id → cycles → cycle_seed_lots → seed_lots` (one-up/one-down traceability)
- `stock_movements.inventory_item_id → inventory_items` and `.cycle_id → cycles` (COGS)
- `sensor_readings.sensor_id → sensors.channel_id/rack_id`

## 1.5 Global metric rules (apply to every metric unless a row overrides)

These rules are what make two people reading the same KPI get the same number.
Every Tier-B query and every Tier-A client computation must follow them.

1. **Timezone & week start.** All `date_trunc` bucketing and window boundaries
   (`weekStart`, `monthStart`) use the **facility-local timezone**, read from
   the `FACILITY_TIMEZONE` env var (default `America/New_York`), passed
   explicitly to Postgres (`date_trunc('week', ts AT TIME ZONE :tz)`). Weeks
   start **Monday** (ISO). Client-side JS must use the same tz + week rule,
   never the browser default.
   **Zoneless-column note:** `cycles.closed_at`, `seeding_date`, etc. are
   `timestamp` (not `timestamptz`). `ts AT TIME ZONE :tz` therefore means
   "interpret the stored value as facility-local" — correct only if every
   write is facility-local. Do not introduce UTC writes without migrating
   these columns to `timestamptz`.
2. **Soft deletes.** Every metric over `cycles`, `shipments`, or
   `inventory_items` excludes `deleted_at IS NOT NULL` rows. No exceptions
   without an explicit row note.
3. **Units.** Every metric declares a unit in its label and registry entry.
   Canonical units: yield/sold **kg**, seeding weight **g** (label must say
   g — do not silently convert), revenue **USD**, durations **days**,
   loss estimates **USD** (see bad-trays note below).
4. **Bad-trays cutover.** `bad_tray_entries` is the source of truth for rows
   created after the Phase 2a migration date; `manual_checks.is_bad_trays`
   rows are legacy history *before* that date. Metrics spanning the cutover
   UNION the two ranges — never both tables over the same range (double
   count). The cutover date is the named constant `BAD_TRAYS_CUTOVER_DATE`,
   pinned to migration `0003`'s timestamp (read from `lib/db/drizzle` meta;
   do not re-derive per query). `loss_estimate` is **USD** (successor of
   `LOSS_PER_TRAY = 500`); the schema column is bare `numeric` — treat as
   dollars, verify existing rows before first render.
5. **Sensor "current" values.** Source of truth is the latest
   `sensor_readings` row per sensor (`sensors.last_value` acceptable
   denormalized copy). The one-row `sensor_status` snapshot is deprecated for
   metrics. Every "current" metric returns `{value, read_at}` and the card
   applies the staleness contract (DESIGN.md §8: sensor data stale past
   2 min) — a dead sensor's last reading must never render as live. The
   non-metric dashboard "sensor snapshot" payload (design §3) also sources
   from latest `sensor_readings`, not the `sensor_status` row, so the whole
   dashboard follows one source.
6. **Rate denominators.** Every ratio metric states denominator *and* window
   explicitly. Numerator and denominator always share the same window and
   cohort. No mixing all-time denominators with windowed numerators.
7. **Crop grouping.** Group by `crops.id` via
   `cycles.growth_profile_id → growth_profiles.crop_id` wherever the link
   exists; fall back to `cycles.seed_name` only for unlinked rows, bucketed
   as "(unlinked: <seed_name>)". Free-text `seed_name` grouping splits series
   on naming drift ("Basil" vs "basil").

## 2. Metrics catalog (exhaustive, per tab)

Notation: **ID** | Metric | Source (tables/fields) | Compute | Chart | Default (✓ = on by default)

### Overview tab (`ov.*`)

**Yield / production**
- `ov.yield.week` | Total yield this week (kg) | cycles.harvested_qty, closed_at | SUM where closed_at≥weekStart | KPI stat | ✓
- `ov.yield.month` | Total yield this month (kg) | same, ≥monthStart | SUM | KPI stat |
- `ov.yield.alltime` | Total yield all-time (kg) | cycles.harvested_qty | SUM where status=completed | KPI stat |
- `ov.yield.byDay` | Yield last 7d | cycles | date_trunc('day',closed_at) SUM | Area | ✓
- `ov.yield.byWeek` | Yield last 4w | cycles | date_trunc('week') SUM | Area | ✓
- `ov.yield.byMonth` | Yield by month | cycles | date_trunc('month') SUM | Bar |
- `ov.yield.byCrop` | Yield by crop (kg) | cycles→growth_profiles.crop_id→crops, harvested_qty | GROUP BY crop_id (rule 7) SUM | Horizontal Bar |
- `ov.yield.byRack` | Yield per rack (kg) | cycles.tray_id→trays→racks | GROUP BY rack SUM harvested_qty | Bar |
- `ov.yield.avgPerCycle` | Avg yield per cycle (kg) | cycles | SUM harvested_qty / COUNT completed | KPI |
- `ov.yield.avgPerTray` | Avg yield per tray (kg) | cycles | SUM harvested_qty / SUM(full+half*0.5) | KPI |
- `ov.yield.expectedVsActual` | Expected vs actual yield | cycles + growth_profiles.expected_yield_per_tray_kg | expected=profile*trays vs harvested_qty | Grouped Bar |
- `ov.yield.forecast` | Upcoming harvest est (kg) | cycles (fertigation/harvest) + profile.expected_yield_per_tray_kg | SUM expected for non-completed | KPI/list |
- `ov.yield.byChannel` | Yield by channel (kg) | cycles.tray_id→trays→racks→channels | GROUP BY channel | Bar |

**Cycles / activity**
- `ov.cycles.active` | Active cycles | cycles.status≠completed | COUNT | KPI | ✓
- `ov.cycles.byStatus` | Cycles by status | cycles.status | COUNT per status | Donut |
- `ov.cycles.actionNeeded` | Cycles needing action | dashboard.actionRequired | daysOverdue>0 | KPI/list | ✓
- `ov.cycles.seededByDay` | Seeding weight by day (g) | cycles.seed_weight_tray*(full+half*0.5) | date_trunc('day',seeding_date) SUM | Bar | ✓
- `ov.cycles.seededByWeek` | Seeding weight by week (g) | same | date_trunc('week') SUM | Bar | ✓
- `ov.cycles.avgDuration` | Avg cycle duration (days) | cycles.closed_at−seeding_date (completed) | AVG | KPI |
- `ov.cycles.durationByCrop` | Duration by crop (days) | same GROUP BY crop_id (rule 7) | AVG | Bar |
- `ov.cycles.stageDuration` | Stage duration vs profile (days) | germ: fertigation_started_at−germination_started_at vs profile.germination_days; fert: harvest_started_at−fertigation_started_at vs profile.fertigation_days | AVG actual vs target per stage | Grouped Bar |
- `ov.cycles.stageSlip` | Cycles slipping stage target | same, actual>target | COUNT/list | KPI/list |
- `ov.cycles.overdue` | Overdue cycles | actionRequired daysOverdue>0 | COUNT | KPI |
- `ov.cycles.throughput` | Completed cycles / week | cycles.status=completed | date_trunc('week',closed_at) COUNT | Line |
- `ov.cycles.completionRate` | Completion rate (90d cohort) | cycles seeded in last 90d, seeding_date+profile duration elapsed | completed / cohort size (rule 6) | KPI |

**Capacity / trays**
- `ov.cap.utilization` | Channel utilization % | running trays / total channels | ratio | Progress | ✓
- `ov.cap.utilByRoom` | Utilization by room | cycles→trays→racks→channels→rooms | per-room ratio | Bar |
- `ov.cap.rackOccupancy` | Rack occupancy | trays occupied / capacity per rack | ratio | Heatmap/Bar |
- `ov.cap.trayMix` | Full vs half trays | cycles.full_trays, half_trays | SUM stacked | Stacked Bar |
- `ov.cap.activeTrays` | Active trays | sum(full+half*0.5) running | SUM | KPI |

**Bad trays / loss** (source per rule 4: `bad_tray_entries` after cutover, `manual_checks` legacy before)
- `ov.bad.count7d` | Bad trays (7d) | bad_tray_entries (rule 4) | COUNT last 7d | KPI | ✓
- `ov.bad.weightByDay` | Bad-tray weight by day (g) | existing badTrayByDay | SUM | Area | ✓
- `ov.bad.weightByWeek` | Bad-tray weight by week (g) | existing badTrayByWeek | SUM | Area | ✓
- `ov.bad.lossEstimate` | Loss estimate (USD) | bad_tray_entries.loss_estimate (rule 4: dollars, not kg) | SUM | KPI |
- `ov.bad.byIssue` | Bad trays by issue | bad_tray_entries.issue | COUNT | Bar/Pie |
- `ov.bad.bySeverity` | Bad trays by severity | bad_tray_entries.severity | COUNT | Donut |
- `ov.bad.byCrop` | Bad trays by crop | bad_tray_entries→cycles→crop_id (rule 7) | COUNT | Bar |
- `ov.bad.rate` | Bad-tray rate % (30d) | bad trays last 30d / trays seeded last 30d (rule 6: same window) | ratio | KPI |
- `ov.bad.byChannel` | Bad trays by channel | bad_tray_entries.tray_id→…→channels | COUNT | Bar |

**Sensors / environment** (source per rule 5: latest `sensor_readings`; `sensor_status` deprecated; all "current" values carry `read_at` + staleness state)
- `ov.sensor.onlineRatio` | Sensors online % | sensors.last_read_at within threshold | online/total | Gauge/Progress | ✓
- `ov.sensor.currentTemp` | Current temp (°C) | latest sensor_readings (type=temp) | latest + read_at (rule 5) | KPI | ✓
- `ov.sensor.currentPh` | Current pH | latest sensor_readings (type=ph) | latest + read_at (rule 5) | KPI | ✓
- `ov.sensor.currentHumidity` | Current humidity % | latest sensor_readings (type=humidity) | latest + read_at (rule 5) | KPI |
- `ov.sensor.currentWater` | Water level % | latest sensor_readings (type=water) | latest + read_at (rule 5) | KPI |
- `ov.sensor.tempTrend` | Temp trend | sensor_readings (type=temp) | time-series | Line |
- `ov.sensor.phTrend` | pH trend | sensor_readings (type=ph) | time-series | Line |
- `ov.sensor.humidityTrend` | Humidity trend | sensor_readings | time-series | Line |
- `ov.sensor.waterTrend` | Water level trend | sensor_readings | time-series | Area |
- `ov.sensor.ecTrend` | EC trend | sensor_readings (type=ec) | time-series | Line |
- `ov.sensor.setpointVsActual` | Setpoint vs actual (temp/pH) | growth_profiles setpoints vs sensor_readings | overlay w/ ref line | Line+Reference |
- `ov.sensor.outOfRange` | Out-of-range events | sensor_readings vs growth_profiles ph/temp bounds | COUNT/list | KPI/list |
- `ov.sensor.uptime` | Sensor uptime | sensors.last_read_at freshness | % recent | KPI |

**Alerts**
- `ov.alerts.active` | Active alerts | alerts.status=current | COUNT | KPI | ✓
- `ov.alerts.critical` | Critical alerts | severity=critical | COUNT | KPI | ✓
- `ov.alerts.bySeverity` | Alerts by severity | alerts.severity | COUNT | Donut |
- `ov.alerts.byStatus` | Alerts by status | alerts.status | COUNT | Bar |
- `ov.alerts.overTime` | Alerts over time | alerts.created_at | date_trunc COUNT | Line |
- `ov.alerts.byLocation` | Alerts by location | alerts.location | COUNT | Bar |
- `ov.alerts.mttr` | Mean time to resolve | resolved_at−created_at | AVG (resolved) | KPI |
- `ov.alerts.resolved7d` | Resolved (7d) | status=resolved, resolved_at | COUNT | KPI |

**Tasks**
- `ov.tasks.open` | Open tasks | tasks.status≠done | COUNT | KPI |
- `ov.tasks.byStatus` | Tasks by status | tasks.status | COUNT | Donut |
- `ov.tasks.byType` | Tasks by type | tasks.type | COUNT | Bar |
- `ov.tasks.overdue` | Overdue tasks | due_at<now, status≠done | COUNT | KPI |
- `ov.tasks.completionRate` | Task completion rate | done/total | ratio | KPI |
- `ov.tasks.byAssignee` | Tasks by assignee | tasks.assignee | COUNT | Bar |
- `ov.tasks.throughput` | Tasks completed / week | completed_at | date_trunc COUNT | Line |

**Seed lots / crops**
- `ov.seedlots.active` | Active seed lots | seed_lots.currently_grown=true | COUNT | KPI | ✓
- `ov.seedlots.successRate` | Lot success % | seed_lots.success | AVG per lot | Bar |
- `ov.seedlots.successTrend` | Lot success over time | seed_lots.success joined to cycle_seed_lots→cycles.closed_at | AVG per month per lot — degrading lot flags early | Line |
- `ov.seedlots.growTime` | Lot grow time (days) | seed_lots.grow_time | AVG per lot | Bar |
- `ov.seedlots.usage` | Lot usage count | cycle_seed_lots | COUNT cycles per lot | Bar |
- `ov.crops.activeTypes` | Active crop types | distinct crop_id running (rule 7) | COUNT | KPI | ✓
- `ov.crops.byCategory` | Crops by category | crops.category | COUNT | Donut |
- `ov.crops.yieldCompare` | Yield by crop (kg) | cycles + crops (rule 7) | SUM per crop | Bar |

### Shipments tab (`sh.*`)

**Sales / revenue**
- `sh.sold.total` | Total yield sold (kg) | shipments.yield_sold_kg | SUM | KPI | ✓
- `sh.rev.total` | Total revenue (USD) | shipments.revenue_usd | SUM | KPI | ✓
- `sh.rev.avgPerShip` | Avg revenue / shipment | revenue_usd / COUNT | AVG | KPI |
- `sh.sold.avgPerShip` | Avg yield / shipment | yield_sold_kg / COUNT | AVG | KPI |
- `sh.rev.byMonth` | Revenue by month | date_trunc('month',shipping_date) | SUM | Bar/Line |
- `sh.rev.byClient` | Revenue by client | GROUP BY client | SUM | Horizontal Bar |
- `sh.sold.byMonth` | Yield sold by month | date_trunc('month') | SUM | Bar |
- `sh.sold.byClient` | Yield sold by client | GROUP BY client | SUM | Horizontal Bar |
- `sh.revVsSold.scatter` | Revenue vs yield sold | revenue_usd vs yield_sold_kg per shipment | scatter | Scatter |
- `sh.rev.thisMonth` | Revenue this month | shipping_date≥monthStart | SUM | KPI |
- `sh.rev.growth` | Revenue growth % WoW/MoM | current vs prior period | ratio | KPI |
- `sh.rev.topClients` | Top clients by revenue | GROUP BY client ORDER BY SUM DESC LIMIT 5 | Bar/list |
- `sh.clients.count` | Distinct clients | COUNT DISTINCT client | KPI |
- `sh.aov` | Avg order value (USD) | revenue / shipment COUNT | KPI |

**Economics / decision (new in Rev 2 — the numbers the owner runs the farm on)**
- `sh.econ.pricePerKg` | Price per kg (USD/kg) | SUM revenue_usd / SUM yield_sold_kg per period | ratio | KPI |
- `sh.econ.pricePerKgByClient` | $/kg by client | same GROUP BY client — shows who underpays | Horizontal Bar |
- `sh.econ.marginByCrop` | Contribution margin per crop (USD) | revenue: shipments→cycles→crop_id; COGS: stock_movements (reason=consume)→cycles→crop_id | SUM revenue − SUM consumed cost per crop — decides what to grow | Bar |
- `sh.econ.wasteRate` | Waste/shrink % | (SUM harvested_qty − SUM yield_sold_kg) / SUM harvested_qty over period (linked cycles, rule 6) | ratio | KPI |

**Status / operations**
- `sh.status.complete` | Completed shipments | status=complete | COUNT | KPI | ✓
- `sh.status.pending` | Pending shipments | status=pending | COUNT | KPI | ✓
- `sh.status.inProgress` | In-progress | status=in_progress | COUNT | KPI |
- `sh.byStatus` | Shipments by status | GROUP BY status | COUNT | Donut |
- `sh.overTime` | Shipments over time | date_trunc('week',shipping_date) | COUNT | Line/Bar |
- `sh.cycleTime` | Ship cycle time (days) | shipping_date − cycle.closed_at (linked) | AVG | KPI |

**Traceability**
- `sh.linkedCycles` | Shipments linked to cycles | cycle_id NOT NULL | COUNT | KPI |
- `sh.unlinked` | Unlinked shipments | cycle_id IS NULL | COUNT/list | KPI/list |
- `sh.soldVsHarvested` | Sold vs harvested (reconciliation) | SUM yield_sold_kg vs SUM harvested_qty over period | Grouped Bar |
- `sh.trace.oneUpDown` | Client↔cycle↔lot trace | shipments→cycles→cycle_seed_lots→seed_lots | table | Table |
- `sh.recall.exposure` | Clients exposed per seed lot | cycle_seed_lots→cycles→shipments.client | list | Table |

### Inventory tab (`inv.*`)

**Stock levels**
- `inv.items.total` | Total supply items | inventory_items (not deleted) | COUNT | KPI | ✓
- `inv.lowStock.count` | Low-stock alerts | current_qty/max_qty<0.2 | COUNT | KPI | ✓
- `inv.lowStock.list` | Low-stock items | same | list | List | ✓
- `inv.byCategory.count` | Items by category | GROUP BY category | COUNT | Donut | ✓
- `inv.byCategory.qty` | Qty by category | SUM current_qty per category | SUM | Bar |
- `inv.byItem.qty` | Qty by item | current_qty per item | Bar | Horizontal Bar |
- `inv.fillRate` | Stock fill rate | SUM current_qty / SUM max_qty | ratio | Gauge/Progress |
- `inv.outOfStock` | Items out of stock | current_qty=0 | COUNT/list | KPI/list |
- `inv.itemAge` | Stock age by arrival | arrival_date age | AVG/list | List |
- `inv.newestArrivals` | Newest arrivals | ORDER BY arrival_date DESC | list | List |

**Stock movements (ledger)**
- `inv.mov.overTime` | Movements over time | stock_movements.created_at | date_trunc COUNT | Line/Bar |
- `inv.mov.netByMonth` | Net stock change / month | SUM delta by month | Bar |
- `inv.mov.byReason` | Movements by reason | reason (purchase/consume/adjust) | COUNT | Donut |
- `inv.mov.consumeByCycle` | Consumption per cycle | SUM delta where reason=consume GROUP BY cycle_id | Bar |
- `inv.mov.topConsumed` | Top consumed items | SUM |delta| where reason=consume per item | Bar |
- `inv.mov.purchases` | Restocks by month | SUM delta where reason=purchase | Bar |
- `inv.mov.adjustments` | Adjustments count | reason=adjust | COUNT | KPI |
- `inv.mov.turnover` | Inventory turnover | consume qty / avg stock | ratio | KPI |
- `inv.mov.daysRemaining` | Days of stock remaining | current_qty / avg consume rate (from movements) | KPI |
- `inv.mov.cogsByCycle` | Consumption per cycle (qty) | SUM delta where reason=consume GROUP BY cycle_id | Bar |

**Seed lots / crops (inventory-related)**
- `inv.seedlots.active` | Active seed lots | seed_lots.currently_grown | COUNT | KPI | ✓
- `inv.seedlots.details` | Active seed lot details | dashboard.activeSeedLotDetails | table | Table | ✓
- `inv.crops.activeTypes` | Active crop types | distinct running cycles.seed_name | COUNT | KPI | ✓
- `inv.seedlots.bySupplier` | Seed lots by supplier | GROUP BY seed_lots.supplier | COUNT | Bar |
- `inv.seedlots.currentVsRetired` | Currently grown vs not | currently_grown bool | COUNT | Donut |

### Default-on summary
- Overview: ~13 (matches current widgets)
- Shipments: ~4
- Inventory: ~6
First render is identical to today.

### Known data caveats (verify before first render)
- `bad_tray_entries.loss_estimate`: bare `numeric`, no unit in schema — Rev 2
  declares USD; audit existing rows for kg-entered values before trusting SUMs.
- `sh.econ.marginByCrop` needs `stock_movements` rows carrying cost — the
  ledger stores only `delta` (quantity), no unit-cost/price field. Margin is
  therefore **blocked until a schema change adds a cost field (or a price
  list)** — not merely "until data exists." It is gated (`requires: ["cost"]`)
  and stays disabled in the picker until that field lands.
- Crop grouping (rule 7) depends on `growth_profiles.crop_id` backfill;
  unlinked cycles bucket separately and are visible as "(unlinked)" — treat a
  large unlinked bucket as a data-quality task, not a display bug.
