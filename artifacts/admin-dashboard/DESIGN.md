# FarmSmart — Web Platform Design Spec

> Source of truth for the admin dashboard UI/UX. Supersedes the implicit design previously
> embedded in code. Applies to `artifacts/admin-dashboard/`. Mobile (Expo) client has a
> separate spec but shares the domain model and brand.
>
> **Rev 2 (2026-07-03):** re-centered on the facility manager's operating context (new §0);
> fix tiers re-ranked by user consequence rather than engineering severity. Notable moves:
> alert visibility + data truthfulness + staleness promoted to P0; dark mode and the
> command palette demoted; Cycles promoted to a real page.

**Product name (going forward):** **FarmSmart**.
All user-facing strings must say FarmSmart. The prior in-code brands `HydroFarm` and
`FarmEasy` are retired from the UI (see §2 Branding). Internal code/package/DB identifiers
(`@workspace/farmeasy`, `farmeasy` schema, etc.) are **not** renamed — the rename is
user-facing only.

---

## 0. Operating context (design north star)

The facility manager is usually **standing in a grow room** — gloved, hands often wet,
holding a tablet or phone, under colored LED grow light, on Wi-Fi degraded by metal racking
and humidity. The desk is the *occasional* context, not the default. Every layout,
target-size, and information-priority decision below is made for that person first;
desktop is the admin convenience mode.

Consequences that bind the rest of this spec:

- **Tablet-first, desktop-admin.** Anything safety- or crop-relevant (alerts, sensor
  state, data freshness) must be reachable on **every** viewport. Nothing critical may
  exist only at `xl`.
- **Hours matter.** A failed fertigation pump or temperature drift is measured in hours to
  crop loss. Alert visibility and data freshness outrank visual polish in every tier.
- **Trust is the product.** The dashboard never displays decorative or invented data
  (fake grid positions, ornamental trend arrows). False data is worse than no data.
- **Touch before keyboard.** Minimum 44×44px touch targets and glove-tolerant spacing on
  primary actions. Keyboard a11y is still required (§10) but is the secondary input mode.
- **Assume flaky connectivity.** Stale data must announce itself; the UI must degrade to
  "last known + timestamp," never silently present old readings as live.

### Benchmark tasks

Prioritization is judged against these, not against code hygiene. A change earns its tier
by how much it helps:

1. **Triage:** from opening the app → acknowledged the oldest critical alert, in ≤ 10
   seconds, on a tablet.
2. **Locate:** from scanning a rack QR → that rack's status and current cycle, in ≤ 2 taps.
3. **Trust check:** at any moment the manager can answer "how old is this sensor reading?"
   at a glance.
4. **Recover:** a data-entry mistake in inventory or shipments can always be corrected
   (edit/delete) — never permanent.

---

## 1. Product overview

FarmSmart's web platform is the operations dashboard for an indoor vertical farm: a single
glanceable view of grow cycles, inventory, shipments, facility layout, and live sensor
state, with drill-downs into alerts and cycles needing action.

**Primary user:** the facility manager / grower, **tablet-first while walking the farm**,
with desktop as the admin/planning mode (see §0). Small-to-medium operations: typically an
owner plus a few grower techs sharing one login today. Roles/permissions are out of scope
for v1, but the IA should not assume a single persona forever (e.g. techs may eventually
need Layout without delete rights).

**Information model** (from `lib/db`):
`rooms (seeding / fertigation / harvesting) → channels → racks → trays`, with `cycles`,
`seed_lots`, `inventory_items`, `shipments`, `alerts`, `manual_checks`, and `sensor_status`
on top.

**Stack:** React 19, Vite, Tailwind v4, shadcn/ui (new-york), Recharts, wouter, TanStack
Query, Radix primitives, lucide icons.

---

## 2. Branding

| Token | Value |
|---|---|
| Product name | **FarmSmart** |
| Wordmark | `FarmSmart` (font-bold, tracking-tight, `text-primary`) |
| Tagline (optional) | "Vertical farm operations" |

**Rule:** No `HydroFarm` or `FarmEasy` strings in any user-facing surface (wordmark,
breadcrumbs, QR code labels, page titles, toasts, empty-state copy, HTML `<title>`).
Known locations to update: `Sidebar.tsx` wordmark, `TopBar.tsx` breadcrumb root, QR labels
in `Inventory.tsx` and `Layout.tsx`, `index.html` title.

---

## 3. Layout shell

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (256px) │   TopBar (64px)                            │
│                 ├────────────────────────────┬───────────────┤
│  Operations     │   Main content             │ RightSidebar  │
│   • Dashboard   │   (scroll, max-w-1400)     │  (280px)      │
│   • Cycles      │                            │  System status│
│   • Inventory   │                            │  + alerts     │
│   • Shipments   │                            │               │
│   • Layout      │                            │               │
│  System         │                            │               │
│   • Profile     │                            │               │
│   • Settings    │                            │               │
└─────────────────────────────────────────────────────────────┘
```

- **Breakpoints:** `md` (≥768) shows left Sidebar; below `md` the Sidebar hides and **TopBar
  must surface a menu button that opens a Sheet drawer** with the same nav items (P0 fix —
  currently missing). RightSidebar shows at `xl` (≥1280) and hides below — **but its
  contents do not vanish**: below `xl`, alerts and system status remain reachable via the
  TopBar alert bell (P0-4). Critical information is never viewport-gated (§0).
- **Heights:** shell is `h-[100dvh]`, overflow locked; only `<main>` scrolls.
- **Content container:** one shared container for all pages — `px-6 py-6 mx-auto
  max-w-[1400px]` (Layout page currently uses `max-w-4xl` — normalize, P2).
- **Detail panels** (Alerts, BadTrays, Cycles, SeedLots, ActionRequired) open as right-side
  **Sheets**, width `900px / max-w-[95vw]`; **below `md` they are full-width** and their
  internal layouts must reflow to a single column. Controlled by `PanelContext`. P2: sync
  open state to URL hash so they are deep-linkable and browser-back closes them (Cycles
  gets a real route earlier — P1-1).

### TopBar spec (target state)
A single 64px header containing, left→right: **mobile nav menu button** (below `md` only),
**breadcrumb** (root "FarmSmart" › current page), and on the right: **alert bell with
unread-count badge** (opens the Alerts panel; badge uses `--critical` when any critical
alert is open — P0-4), **DB health pill** (real, from `/api/health` — P0-3), **data
freshness: relative "updated Xs ago" + stale indicator + refresh** (P0-6), **theme toggle**
(P1-3), **user avatar menu** (P1), **global search / ⌘K** (P2 — desktop convenience, not a
core flow). The current TopBar is a placeholder (hardcoded status, no actions) and is
replaced wholesale.

---

## 4. Design tokens

Defined in `src/index.css`. HSL channels stored in `--token`; consumed as
`hsl(var(--token))` via the `@theme inline` map, so Tailwind classes like `bg-primary`,
`text-muted-foreground`, `border-border` work.

### Color — light (`:root`)
| Token | HSL | Use |
|---|---|---|
| `--background` | `248 20% 97%` | app bg |
| `--foreground` | `220 15% 10%` | primary text |
| `--card` | `0 0% 100%` | card bg |
| `--primary` | `142 40% 30%` | brand green; actions, active nav, KPI icons |
| `--secondary` / `--muted` | `220 14% 96%` | subtle fills |
| `--muted-foreground` | `220 10% 40%` | secondary text |
| `--destructive` | `0 84% 60%` | errors, destructive actions |
| `--border` | `220 13% 91%` | dividers |
| `--chart-1..5` | `142 40% 30%` → `220 15% 60%` | chart series **only** |

### Status tokens (new — P1-2)
An operations dashboard lives on a three-state scale. Add semantic status tokens (light +
dark variants) and map all stage/sensor/health states to them:

| Token | Meaning | Example use |
|---|---|---|
| `--status-ok` | healthy / on schedule | sensor nominal, cycle on track |
| `--status-warn` | needs attention soon | drifting reading, stale data, low stock |
| `--status-critical` | act now | failed sensor, overdue cycle, bad trays |

**Rule:** `chart-1..5` are for chart *series* only — they carry no meaning. Status and
stage colors map to the status tokens above (or `--primary`/`--muted` for neutral states),
never to chart tokens and never to raw Tailwind palette colors (`emerald-100`, `blue-500`,
`gray-50`, …) in feature code. Known offenders to refactor (P1-2): `CyclesPanel`
STAGE_META, `RightSidebar` sensor cards, `Layout` room colors.

### Color — dark (`.dark`)
Complete mirror exists (e.g. `--background 220 15% 10%`, `--primary 142 40% 40%`). Dark
mode is wired via `next-themes` in **P1-3** — deliberately *after* the status-token
refactor (P1-2) so it ships without known color defects.

### Typography
Font: `Inter` (`--app-font-sans`). No type-scale tokens today; adopt this minimal scale:
| Role | Class |
|---|---|
| Page title | `text-2xl font-bold tracking-tight` |
| Section/card title | `text-base font-semibold` |
| KPI value | `text-2xl font-bold` |
| Body | `text-sm` |
| Caption / meta | `text-xs text-muted-foreground` |

Note (§0): this UI is read at arm's length on smudged tablets under colored grow-light
spill. WCAG 2.1 AA is the floor; for status text, alert copy, and KPI values, prefer
AAA-level contrast where the palette allows.

### Radius & elevation
- `--radius: .5rem`; `sm/md/lg/xl` derived.
- Elevation system `--elevate-1/2` + `.hover-elevate*` utilities are defined but **unused**
  (P2: adopt for card hover or delete the dead CSS).

---

## 5. Component inventory

**shadcn/ui (new-york)** — full Radix-based set in `src/components/ui/` (button, card,
dialog, sheet, table, tabs, select, badge, progress, tooltip, command, toast, sonner, …).

**Custom / domain components:**
- `AppLayout` — the 3-column shell + `PanelSheets`.
- `Sidebar`, `TopBar`, `RightSidebar`.
- `PanelContext` — controls which detail Sheet is open.
- Page components under `src/pages/...`.
- QR block (inline in `Inventory.tsx`, `Layout.tsx`) using `react-qr-code` with print /
  SVG / PNG export.

**To consolidate (P2):** two toast systems coexist (`use-toast` + `sonner`). Standardize on
**sonner**; remove `use-toast`/`toaster`.

---

## 6. Page inventory

| Route | Page | Contents |
|---|---|---|
| `/` | Overview | 4 primary KPIs + 3 secondary KPIs (clickable → Sheets); Yield-by-week area; Daily yield-vs-seeding bars; Channel utilization meter; Action-required list; 7-day trend area |
| `/cycles` | Cycles **(new — P1-1)** | Full cycles list with stage filters, sortable table, per-cycle detail. The core farming object gets a real page and URL; the existing CyclesPanel Sheet remains as the quick drill-down from Overview. |
| `/inventory` | Inventory | 4 stat cards; active seed-lots table w/ QR; supplies stock table w/ progress bars; by-category donut |
| `/shipments` | Shipments | 4 KPI cards; status + client + this-week filters; shipments table |
| `/layout` | Layout | Rooms → channels → racks → trays tree; inline rename; add/delete; per-channel monitoring-API config; QR per channel/rack |
| `/profile` | Profile | Clerk user info (P0: implement minimal) |
| `/settings` | Settings | API base, sign-out (P0: implement minimal); theme toggle joins with P1-3 |
| (Sheet) | Alerts / BadTrays / Cycles / SeedLots / ActionRequired | drill-down panels opened from Overview KPIs, TopBar alert bell, and RightSidebar |

**Overview hierarchy rule (§0):** among the seven KPIs, **"Action required" is the primary
signal** — it answers "do I need to walk to a room right now?" It gets the strongest visual
weight; the other KPIs are supporting context, not peers.

**Missing CRUD (P1-5):** Inventory and Shipments are create-only (no edit/delete) — a
data-entry mistake is currently permanent to the user (benchmark task 4). Layout has full
CRUD.

**QR destinations:** every channel/rack QR must resolve to a URL that renders usefully on
a phone (benchmark task 2). Route-level pages (`/cycles`, `/layout`) are the scan targets;
Sheets alone are not scannable destinations until P2-1 lands.

---

## 7. Interaction patterns

1. **KPI → detail Sheet.** Clickable KPI cards open the corresponding panel via
   `usePanel().open(name)`. Cards must be keyboard-accessible (`role="button"`, `tabIndex`,
   Enter/Space) — P2 fix; today they are `onClick`-only.
2. **Filter toggles.** Pill-button filters for stage/status (Cycles, Shipments). Use the
   existing `bg-primary text-primary-foreground` active style; keep All + per-stage counts.
   Pills must meet the 44px touch-target minimum (§0, P1-7).
3. **Inline edit.** Layout entities rename in-place (Input + ✓/✗). Reuse this pattern for
   future inline edits.
4. **Create flows.** Dialog + react-hook-form + zod resolver; on success invalidate the
   relevant query key and toast.
5. **Destructive actions.** Confirm Dialog (Layout's `DeleteConfirmDialog` is the reference
   pattern) before any delete.

---

## 8. State contract (every async surface)

Every data-bound component must implement all four states:

| State | Pattern |
|---|---|
| **Loading** | `Skeleton` matching final layout (already good) |
| **Empty** | centered icon + one-line copy (e.g. "All cycles on schedule") |
| **Error** | centered icon + message + **Retry** button (P0 — currently missing everywhere) |
| **Success** | data; mutations toast on success and invalidate query keys |

**Plus a fifth state for live data — Stale (P0-6):** sensor and alert surfaces must show
data age; when a reading exceeds its freshness threshold (**sensor data: 2 minutes**,
alerts: 5 minutes), display a `--status-warn` "stale — last updated X ago" treatment.
Old readings must never present as live (§0).

TopBar's "DB Connected" pill must reflect a real `/api/health` poll (P0-3); on failure show
a `destructive` "DB unreachable" pill with a retry action. Charts must render an
empty-state (not bare axes) when their series is empty.

---

## 9. Theming

- `next-themes` `ThemeProvider` mounted in `main.tsx` with `attribute="class"` and
  `defaultTheme="system"` (**P1-3** — after the status-token refactor P1-2, so dark mode
  ships clean rather than with known color defects).
- Toggle in TopBar (sun/moon) and Settings. `disableTransitionOnChange` to avoid a flash.
- Rationale for the demotion from P0: dark mode is valuable (low-light grow rooms) but no
  crop is lost in light mode; alert visibility, truthful data, and freshness come first
  (§0 benchmark tasks).

---

## 10. Accessibility & ergonomics contract

- **Touch targets ≥ 44×44px** on all primary actions and anything tapped while standing
  (nav items, filter pills, KPI cards, alert rows, table row actions). Glove-tolerant
  spacing between adjacent targets.
- All interactive elements are keyboard reachable; click-to-open cards are real buttons.
- Tables use `<th scope="col">`.
- Icon-only buttons have `aria-label`/`title`.
- Sheet/Dialog titles are visible (not `sr-only` only) for sighted users where reasonable.
- **Color is never the sole status signal** (pair with icon + text) — this is part of the
  done-definition (§11), not an aspiration.
- WCAG 2.1 AA color contrast minimum; prefer AAA for status/alert text and KPI values (§4).

---

## 11. Done-definition for UI work

A UI change is "done" when it:
- uses tokens (no raw palette colors; status via status tokens, not chart tokens),
- implements all state-contract branches (§8, including Stale where live data is shown),
- is keyboard-accessible **and** meets the 44px touch-target minimum,
- never conveys status by color alone,
- **is usable one-handed on a tablet viewport** (no critical info or action gated to `xl`),
- works in light **and** dark,
- uses the FarmSmart brand string,
- and is covered by a `data-testid` where it's asserted in `tests/e2e`.

---

## 12. Fix plan — all tiers

Scoped, file-level, with acceptance criteria and rough effort (ideal hours). **Tiers are
ranked by user consequence against the §0 benchmark tasks, not by engineering severity.**
Sequenced within each tier; tiers are cumulative (do P0 before P1 before P2).

### Tier P0 — The manager can't do their job without it  (~10–12h)

| # | Fix | Files | Acceptance | Effort |
|---|---|---|---|---|
| P0-1 | **Rebrand to FarmSmart.** Replace all user-facing `HydroFarm` and `FarmEasy` strings with `FarmSmart` (wordmark, breadcrumb root, QR labels, HTML title). Do **not** touch code/package/DB identifiers. | `Sidebar.tsx`, `TopBar.tsx`, `Inventory.tsx`, `Layout.tsx`, `index.html` | `grep -ri "HydroFarm\|FarmEasy" src/ index.html` returns no user-facing hits (only internal identifiers, if any). | 0.5h |
| P0-2 | **Mobile/tablet nav drawer.** Add a menu button to TopBar (below `md`) that opens a Sheet listing the same nav items as `Sidebar`. Extract the nav item list so Sidebar and the drawer share it. | `TopBar.tsx`, `Sidebar.tsx` (extract `NAV_ITEMS`), new `MobileNav.tsx` | On a <768px viewport every nav destination is reachable; drawer closes on navigation; nav items meet 44px targets. | 1.5h |
| P0-3 | **Error states + real DB health.** Add a reusable `<QueryError>` (icon + message + Retry) and use it on every data-bound page's `isError` branch. Add a `useHealth` query polling `/api/health`; drive the TopBar pill from it. | new `components/ui/query-error.tsx`; `Overview.tsx`, `Inventory.tsx`, `Shipments.tsx`, `Layout.tsx`, `RightSidebar.tsx`, `Alerts.tsx`, `BadTrays.tsx`, panels; `TopBar.tsx` | Killing the API flips the pill to "DB unreachable" and every page shows a Retry error state instead of blank/skeleton. | 3h |
| P0-4 | **Alerts reachable on every viewport.** Add a TopBar alert bell with unread-count badge (visible at all breakpoints) that opens the Alerts panel; badge uses `--destructive`/`--status-critical` when any critical alert is open. Below `xl`, this is the RightSidebar's stand-in — no alert may be invisible on a tablet. | `TopBar.tsx`, `PanelContext.tsx`, `RightSidebar.tsx` (share alert query/count) | On a 1024px viewport (no RightSidebar) benchmark task 1 passes: open app → oldest critical alert acknowledged in ≤10s. Badge count matches open alerts. | 1.5h |
| P0-5 | **Truthful data.** (a) Fix the Channel Grid: bind to real channel data from `useGetLayout`/dashboard, or relabel as a "Utilization meter" — stop implying positions that don't exist. (b) Remove decorative `ArrowUpRight` trend arrows from KPI cards (real deltas return in P2-4). | `Overview.tsx`, KPI cards in `Inventory.tsx`, `Shipments.tsx` | Grid/meter reflects real `running/total` and labels itself honestly; no ornamental trend indicators remain anywhere. | 1.5h |
| P0-6 | **Data freshness.** Real "updated Xs ago" from `dataUpdatedAt` in TopBar + refresh button; stale-state treatment (§8) on sensor and alert surfaces past threshold; `refetchInterval` for sensor/alert queries. | `TopBar.tsx`, `RightSidebar.tsx`, sensor/alert queries | Benchmark task 3 passes: data age is always visible; readings past threshold show the `--status-warn` stale treatment; refresh refetches. | 1h |
| P0-7 | **Settings & Profile minimal.** Settings: API base URL display, sign-out (theme toggle joins with P1-3). Profile: read-only Clerk user info (name, email, avatar). | `Settings.tsx`, `Profile.tsx` | Both pages render real content (not stubs); sign-out works. | 2h |

**Sequencing:** P0-1 first (cheap, unblocks consistent branding) → P0-2 + P0-3 + P0-4 +
P0-6 as **one coordinated TopBar rebuild pass** (all touch `TopBar.tsx`) → P0-5 → P0-7.

---

### Tier P1 — Meaningful gaps against the benchmark tasks  (~15–19h)

| # | Fix | Files | Acceptance | Effort |
|---|---|---|---|---|
| P1-1 | **Cycles page.** Promote the core farming object to a real route: `/cycles` with stage filters and a sortable list (reuses P1-4's DataTable when it lands); add to Sidebar nav. CyclesPanel Sheet remains as the Overview quick drill-down. | new `pages/Cycles.tsx`, `Sidebar.tsx`, router | `/cycles` is navigable, linkable, and shareable ("send me the failing cycle" has an answer); benchmark task 2's scan targets can point at it. | 2h |
| P1-2 | **Status tokens + token-ize raw colors.** Add `--status-ok/warn/critical` (light + dark). Replace raw Tailwind palette classes; map stage/sensor/health states to status tokens (not `chart-*` — chart tokens are for series only). | `index.css`, `CyclesPanel.tsx` (STAGE_META), `RightSidebar.tsx` (sensor cards), `Layout.tsx` (room colors, `gray-*` borders/fills) | `grep -rE "emerald-\|blue-\|orange-\|cyan-\|slate-\|green-\|amber-\|gray-" src/pages src/components/layout` returns nothing; every status has a semantic token + paired icon/text. | 3.5h |
| P1-3 | **Wire dark mode.** Mount `next-themes` `ThemeProvider` in `main.tsx`; add sun/moon toggle in TopBar and Settings. Lands **after** P1-2 so it ships without color defects. | `main.tsx`, `TopBar.tsx`, `Settings.tsx` | Toggle switches light↔dark with no known color defects; preference persists; `defaultTheme="system"`. | 1h |
| P1-4 | **DataTable for Inventory/Shipments/Cycles.** Column sort, pagination, optional row filter. Reuse one table component. | new `components/data-table.tsx`; `Inventory.tsx`, `Shipments.tsx`, `Cycles.tsx`/`CyclesPanel.tsx` | 100-row fixture sorts on any column and paginates; Inventory has a search box. | 4h |
| P1-5 | **CRUD parity.** Add edit + delete (with confirm dialog) for Inventory items and Shipments. Reuse Layout's confirm pattern. | `Inventory.tsx`, `Shipments.tsx`, api-client hooks | Benchmark task 4 passes: items/shipments can be edited and deleted; deletes confirm; queries invalidate. | 3h |
| P1-6 | **Mixed-unit chart.** "Daily Yield vs Seeding": give yield (kg) and seeding (g) separate Y-axes, or normalize to one unit. | `Overview.tsx` | Both series read correctly against their own axis; legend notes units. | 0.5h |
| P1-7 | **Touch-target & glove-friendliness pass.** Audit nav items, filter pills, KPI cards, alert rows, and table row actions against the 44px minimum; fix spacing between adjacent targets. | `Sidebar.tsx`, filter pills, KPI cards, panels | Every primary action on Overview, Cycles, and Alerts meets 44×44px on a tablet viewport. | 1.5h |

**Sequencing:** P1-2 → P1-3 (tokens unblock clean dark mode) → P1-4 (table foundation) →
P1-1 + P1-5 → P1-6, P1-7 in parallel.

---

### Tier P2 — Polish & consistency  (~10–13h)

| # | Fix | Files | Acceptance | Effort |
|---|---|---|---|---|
| P2-1 | **Sheet deep-linking.** Sync `PanelContext` open state to a URL hash (`#panel=alerts`) so remaining panels are bookmarkable and browser-back closes them. (Cycles already has a real route via P1-1.) | `PanelContext.tsx`, `AppLayout.tsx` | Opening a panel updates the hash; reloading restores it; back closes it. | 1.5h |
| P2-2 | **Elevation system: adopt or delete.** Either use `.hover-elevate` for card hovers (replacing ad-hoc `hover:border-*`) or remove the unused CSS. | `index.css`, card usages across pages | Decision applied consistently; no dead CSS. | 1h |
| P2-3 | **One toast system.** Standardize on `sonner`; remove `use-toast`/`toaster` and migrate call sites. | all `useToast` call sites, `toaster.tsx`, `use-toast.ts` | `grep -r "use-toast\|useToast" src` returns nothing; toasts render via sonner. | 1.5h |
| P2-4 | **Data-driven KPI trends.** Real ↑/↓ delta vs prior period; add sparklines where data exists. (Decorative arrows were already removed in P0-5.) | `Overview.tsx`, `Inventory.tsx`, `Shipments.tsx` KPI cards | Deltas reflect real comparisons; neutral when no prior period. | 2h |
| P2-5 | **Keyboard-accessible KPI cards.** Make click-to-open cards real buttons (`role`, `tabIndex`, focus ring, Enter/Space). | `Overview.tsx`, `RightSidebar.tsx` | Cards are in tab order and open via keyboard; visible focus ring. | 1h |
| P2-6 | **Unified content container.** One shared page container (`max-w-[1400px]`); normalize Layout's `max-w-4xl`. | `Layout.tsx`, shared container | All pages share the same content width. | 0.25h |
| P2-7 | **Global ⌘K command palette + user avatar menu.** Palette jumps to pages and searches cycles/seed lots/inventory/shipments. Demoted from P1: a keyboard-centric power-user pattern — desktop admin convenience, not a core flow for a gloved tablet user (§0). | `TopBar.tsx`, new `CommandPalette.tsx` (uses `command.tsx` + `cmdk`) | ⌘K opens palette; arrow/enter navigates; Esc closes. | 3h |
| P2-8 | **`<th scope="col">` + a11y sweep.** Add scope to all table headers; verify icon-only buttons have `aria-label`. | all tables, icon buttons | Audit passes; no axe violations on key pages. | 1h |

**Sequencing:** independent; pick off as time allows. P2-3 (toasts) and P2-2 (elevation)
are cheap wins; do them early.

---

### Cross-tier notes
- **Prioritization rule:** when a new fix candidate appears, rank it against the §0
  benchmark tasks first, engineering severity second. Truthfulness and alert/freshness
  visibility always outrank polish.
- **TopBar is the hot file.** P0-2, P0-3, P0-4, P0-6 and P1-3, P2-7 all modify
  `TopBar.tsx`. Do the P0 set in one coordinated pass rather than serially to avoid churn.
- **State contract (§8) is the thread running through all tiers:** P0-3 adds the error
  branch, P0-6 adds the stale branch; P1-4 adds loading/empty at scale; P2-4 adds
  success-context (trends). Treat §8 as the acceptance bar for every data-bound change.
- **Total rough effort:** P0 ~10–12h, P1 ~15–19h, P2 ~10–13h → **~35–44h** for the full
  redesign to spec.
- **Suggested delivery order:** P0 in one batch (fundamentals + TopBar rebuild), then
  P1-2 → P1-3 → P1-4 → P1-1/P1-5 → rest of P1, then P2 opportunistically.
