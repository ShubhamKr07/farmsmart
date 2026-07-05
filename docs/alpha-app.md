# Alpha App — Mobile Design/Build Parity Plan

Status: **planning only, nothing built yet**. All three open decisions from the previous revision are now resolved (see below) — this revision is ready to build once approved.

## Scope confirmed by the user

1. **Ask Me** on mobile = a floating action button, bottom-left, positioned above the tab bar (not a 4th tab, not a header icon).
2. **Dark mode** ships enabled (not built-but-deferred) — mobile currently has no `dark` key in `constants/colors.ts` at all.
3. **Data Log feature**, adapted from a reference project (Replit link provided, "History" tab / `/logs` route). Only the **log-type list → entry form** pattern and its information architecture are ported. Nothing else from that reference (its Home tab, its Handbook tab, its specific field like "GPC Point of Contact") is copied — those are noted below only to flag what NOT to bring over.
4. A **hamburger menu** is introduced to the mobile app for the first time. It houses Data Logs *and* the existing account/sign-out actions currently stuck in Home's header (see "Hamburger scope" below).

## What exists today (`artifacts/farmeasy`)

- Expo Router app, 3 bottom tabs: Home, Cycles, Scan (QR). Modal-presented screens already exist for fertigation/harvest/manual-check/seeding — this is the app's established "fill out a form and save" pattern.
- Same backend/API client as the web dashboard (`@workspace/api-client-react`, Clerk auth) — this is a companion app to FarmSmart web, not a separate product.
- `constants/colors.ts` — light palette only, primary `#1A6B3C` (same green as the web logo — already brand-aligned there).
- `hooks/useColors.ts` — already written to auto-switch to a `dark` key the moment one exists in `colors.ts`. Built for exactly this task, unused until now.
- Installed already (no new deps needed for anything below): `expo-router` 6, `react-native-reanimated`, `react-native-gesture-handler`, `@expo/vector-icons`, `react-native-svg`, `expo-blur`, `expo-glass-effect`.

## Reference reviewed (Replit link, `/logs` → "History" tab)

Design pattern observed, for the record:
- Bottom tab labeled "History" (clock icon) is the log entry point.
- A top search bar ("Search or scan for Levels") plus a hamburger icon and a QR-scan icon — **not porting the search/scan bar**, only noting the hamburger placement precedent.
- "Select Log Type" — a vertical list of cards, each: icon in a soft-colored rounded square, title, one-line category subtitle, trailing chevron. Six types seen: Maintenance Log (Building & Equipment), Compost Pickup (Waste Management), Temperature & Humidity (Cooler Monitoring), Cleaning Log (Environmental Sanitation), Packaging Receiving (Incoming Materials), Visitor Log (Access Tracking).
- Tapping a type opens a **create-entry form**, not a browsable history list. Two examples inspected in detail:
  - **Maintenance**: Area & Item (dropdown), Frequency (auto-set, read-only), Year (number), a Jan–Dec monthly-completion checklist (radio-style circles), Notes (textarea).
  - **Visitor Log**: Date, Time In, Time Out, First Name, Last Name, Organization, Contact Information, "GPC Point of Contact" (dropdown — org-specific field, **replaced** — see below).
  - Both end in the same footer pattern: outlined "Cancel" + filled green "Save Log" button.

This maps cleanly onto real CEA (controlled-environment ag) compliance record-keeping — maintenance logs, cleaning/sanitation logs, receiving logs, and visitor/biosecurity logs are standard GFSI/SQF audit requirements, so adapting the categories (not just the UI shell) is legitimate, not cosmetic copying.

**Important distinction to keep straight**: FarmSmart already has *live sensor* temperature/humidity/pH data (`sensor_readings` table, shown in the web dashboard's RightSidebar). A "Temperature & Humidity" **log** here is a distinct thing — a manual spot-check/compliance record a technician fills in by hand, not a duplicate of the automated sensor feed. Naming needs to make that difference obvious in the UI (e.g. "Manual Temp Check" not "Temperature & Humidity") so it doesn't read as a second, competing data source.

## Proposed FarmSmart log categories

Adapted, not copy-pasted:

| Category | Subtitle | Notes |
|---|---|---|
| Equipment Maintenance | Racks, pumps, lighting, HVAC | Same shape as reference's Maintenance Log (area/item, frequency, year, monthly checklist, notes) |
| Waste & Compost | Spent media, plant waste | Renamed from "Compost Pickup" — broader to cover grow-media disposal, not just compost |
| Manual Environmental Check | Temp/RH/pH spot-check | Explicitly distinct from live sensor data (see above) |
| Cleaning & Sanitation | Room/rack sanitation | Direct port of "Cleaning Log" concept |
| Receiving Log | Seed lots, nutrients, supplies | Renamed from "Packaging Receiving" — ties into existing `seed_lots` vocabulary already in FarmSmart |
| Visitor / Access Log | Facility access tracking | "GPC Point of Contact" dropdown replaced with a generic free-text "Facility Contact" field — no such concept exists in FarmSmart today, so it's plain text rather than a dropdown tied to a contact list that doesn't exist |

## Data model (new — this is genuinely new data, nothing existing to reuse)

Field shapes differ a lot per type (annual checklist vs. per-visit record), so:

```sql
CREATE TABLE facility_logs (
  id serial PRIMARY KEY,
  log_type text NOT NULL,          -- 'maintenance' | 'waste' | 'env_check' | 'cleaning' | 'receiving' | 'visitor'
  clerk_user_id text NOT NULL,      -- who submitted it
  data jsonb NOT NULL,              -- type-specific fields, validated per-type via Zod on the API
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON facility_logs (log_type, created_at DESC);
```

One shared table + `jsonb` payload (matches the existing pattern already used for `recommender_queries.sources`/`farm_context_used`) rather than six separate tables — faster to ship, and per-type Zod schemas on the API give the same type safety without a schema migration every time a field changes.

## API surface (new routes, `artifacts/api-server`)

- `POST /api/facility-logs` — body `{ log_type, data, notes? }`, validated against a per-type Zod schema (registry pattern, same idea as `lib/metrics`'s per-tab registries).

No list/history/detail-view endpoints for phase one — history browsing is explicitly out of scope (see below). `POST` is the only route needed to ship this.

## Mobile UI plan

**Hamburger + navigation:**
- Add a hamburger icon to the existing Home tab header (only entry point requested — not duplicating it across every tab).
- Tapping it opens a left-side slide-in panel, built with `react-native-reanimated` + `react-native-gesture-handler` (both already installed) rather than adding `@react-navigation/drawer` as a new dependency — same "don't add a library the app doesn't already need" call made elsewhere in this codebase (e.g. drag-reorder on web used native HTML5 DnD over `dnd-kit`).
- Panel contents for this phase, top to bottom:
  1. **Account header** — user name + role badge (currently shown in Home's header text; moves here).
  2. **Data Logs** — opens the logs list screen.
  3. **Sign Out** — currently a direct tap-the-avatar action in Home's header (`onPress={signOut}`, no confirmation); becomes an explicit menu row instead. Home's header loses the avatar-as-signout-button; a plain avatar/name display (no tap action) can remain, or be dropped in favor of the hamburger being the single account-info surface — pick one during build, not a design fork worth planning further here.

**Logs list screen** (after tapping "Data Logs" in the hamburger):
- Reuses FarmSmart's own existing list-item visual language (icon-in-rounded-square + title + subtitle + chevron — same shape already used in `CycleCard`/`ChannelMonitoringCard`), not the reference's literal styling. This is the "design-compliant with current app" requirement in practice: same information architecture as the reference, same component idioms as FarmSmart.
- Six category rows (table above).

**Per-category entry form:**
- Presented as a **modal** (matches the app's existing fertigation/harvest/manual-check modal convention) rather than the reference's push-with-back-arrow pattern — again, adopt FarmSmart's own existing navigation idiom for "fill out and save," not the source's.
- Same Cancel (outline) / Save (filled, `colors.primary`) footer already used elsewhere in the app — no new button style needed.
- Field sets per category as scoped in the table above.
- **No history/browse view in this phase** — create-only. Confirmed out of scope; the shared `facility_logs` table still keeps every submission, so a browse view is a pure additive follow-up whenever it's wanted, not a migration later.

## Ask Me — floating action button (confirms open question #1 from prior turn)

- Circular FAB, bottom-left, positioned above the tab bar (respecting safe-area insets — same pattern the tab bar itself already uses via `useSafeAreaInsets`/`SafeAreaView`).
- Tapping opens a full-screen modal (matches the app's existing modal presentation for fertigation/harvest/etc.) with a question input + answer view.
- Backend: zero changes — reuses `POST /api/recommend` exactly as built for web.

## Dark mode (confirms open question #2 from prior turn)

- Add a `dark` key to `constants/colors.ts` mirroring the web dashboard's dark palette (same primary green, same success/warning/destructive mapping as web's semantic tokens).
- Ships **enabled** — `useColors()` already auto-detects `useColorScheme()` and will pick it up with no other code changes.
- Verify: toggle device appearance, confirm the whole app (tabs, cards, modals, the new hamburger panel and log forms) follows it — this needs checking screen-by-screen since several screens currently hardcode `colors.light.primary` directly (seen in `_layout.tsx`'s `headerTintColor`) instead of going through `useColors()`; those hardcoded references need switching to the hook so dark mode actually reaches them.

## Brand assets

- Replace `assets/images/icon.png` (app icon) and splash image with the real logo mark already applied to web (`logo-mark.svg` equivalent, exported to the PNG sizes Expo needs) — currently a generic placeholder per `app.json`.

## Decisions (resolved)

1. **Visitor Log's contact field** — "GPC Point of Contact" dropdown replaced with a generic free-text "Facility Contact" field.
2. **History list view** — skipped for this phase. Create-only; the data isn't lost (shared table), just not browsable yet.
3. **Hamburger scope** — houses Data Logs *and* the account/sign-out actions currently living in Home's header avatar-tap.

## Suggested build order (Phases 1-3 shipped; superseded for Phase 4 — see below)

1. ~~Dark mode + brand assets~~ — shipped.
2. ~~Ask Me FAB~~ — shipped.
3. ~~Hamburger panel~~ — shipped (found and fixed a real z-order bug during verification: the panel painted under the tab bar/FABs since `zIndex` can't escape its own nesting parent; fixed with a `Modal` wrapper).
4. Facility logs — **superseded**, folded into the Phase 4 rebuild plan below.

A post-Phase-3 design/UX audit (comparing every token, chart, badge color, and navigation pattern against the web admin dashboard) found the mobile app's palette and IA had drifted from web in specific, fixable ways. Phase 4 below fixes those first, then builds facility logs on the corrected foundation instead of building it once and retrofitting later.

---

# Phase 4 — Design/UX Parity Rebuild + Facility Logs

Status: **planning only, nothing built**. Supersedes the old single-bullet "Facility logs" Phase 4 above — same feature, folded into a larger sequence so it's built on a design system that actually matches web, not on top of unreconciled tokens.

## Why this exists

Two audits (design-token diff, UX/IA diff) against the web admin dashboard found:

- Mobile's **light-mode palette** was never derived from web's tokens — it's an older, independent palette with a consistent green-tinted-vs-neutral hue-cast difference on nearly every neutral token (background, foreground, secondary, muted, border).
- Mobile's **dark-mode palette** (built in Phase 1) is 9/11 tokens pixel-exact vs web, but 2 are wrong: `accent` was set to a vivid brand green when web's `accent` is actually a neutral hover-surface (same value as `secondary`/`muted`); `destructive` was accidentally sourced from web's `--status-critical` instead of web's actual `--destructive`.
- Mobile's **chart** (`YieldLineChart`) uses green/blue/red (`primary`/`info`/`destructive`) where web's equivalent chart uses a monochromatic green scale (`primary`/`chart-2`) plus red only for the bad-trays series — mobile's blue has no counterpart anywhere in web's chart language.
- Mobile's **cycle-stage badges** (`CycleCard`) color "Fertigation" blue; web colors it green (`primary`). Same semantic stage, different hue family.
- Mobile's **radius** (10) doesn't match web's (`.5rem` = 8px); mobile has no shared **elevation/shadow scale** (web's `hover-elevate`/`elevate-1`/`elevate-2` utilities) — shadows are hand-rolled per component (`(tabs)/index.tsx`, `AskMeFab.tsx`, `ErrorFallback.tsx`, `HamburgerMenu.tsx`).
- Mobile's **hamburger is Home-only** — web's own responsive layout (`TopBar.tsx` + `MobileNav.tsx`) puts the nav trigger in a header rendered on every route via the shared layout, so a web user can always reach nav/account. A mobile user on Cycles or Scan currently cannot reach Sign Out without navigating back to Home first — a real dead end, not cosmetic.
- Mobile has **no persistent alerts affordance, no connectivity/health indicator, no manual theme toggle, no search**, and **no dashboard customization** (web's `MetricPicker` + `TimeRangeSelector`) — all present on every page of web's `TopBar`/`Overview`, absent everywhere on mobile.

## Phase 4.0 — Design token rebuild (foundation; blocks 4.1–4.3 visually)

File: `constants/colors.ts`.

Rebuild `light` from web's actual light HSL tokens (`artifacts/admin-dashboard/src/index.css`), converted to hex:

```ts
light: {
  background: "#F6F6F9",
  foreground: "#16181D",
  card: "#FFFFFF",
  cardForeground: "#16181D",
  primary: "#2E6B44",
  primaryForeground: "#FFFFFF",
  secondary: "#F3F4F6",
  secondaryForeground: "#2E3140",       // web --secondary-foreground: 220 15% 20%
  muted: "#F3F4F6",
  mutedForeground: "#5C6370",
  accent: "#F3F4F6",                    // was vivid green — web's accent is a neutral hover-surface, = secondary/muted
  accentForeground: "#2E3140",
  destructive: "#EF4343",               // was #C62828 (actually web's status-critical, not destructive)
  destructiveForeground: "#FFFFFF",
  border: "#E5E7EB",
  input: "#E5E7EB",
  statusOk: "#2D7648",
  statusOkForeground: "#FFFFFF",
  statusWarn: "#C68310",
  statusWarnForeground: "#FFFFFF",
  statusCritical: "#C52020",
  statusCriticalForeground: "#FFFFFF",
  chart1: "#2E6B44",
  chart2: "#59A675",
  chart3: "#A3C2AE",
  chart4: "#576175",
  chart5: "#8A94A8",
  highlight: "#2ECC71",                 // the old vivid green, kept as a distinct, intentional brand pop-color — not the same slot as accent anymore
},
```

Dark: keep the 9 already-exact tokens (`background`/`foreground`/`card`/`primary`/`secondary`/`muted`/`mutedForeground`/`border`/`input`), fix the 2 wrong ones, add the same new keys:

```ts
dark: {
  // ...9 unchanged tokens...
  accent: "#272C35",          // was "#2ECC71"
  destructive: "#DD3C3C",     // stays — this value was actually correct for statusCritical, now correctly labeled
  destructiveActual: "#7C1D1D", // web's real dark --destructive; reconcile naming below
  statusOk: "#45A167",
  statusWarn: "#E8A530",
  statusCritical: "#DD3C3C",
  chart1: "#3D8F5B",
  chart2: "#7AB891",
  chart3: "#C2D6C9",
  chart4: "#8A94A8",
  chart5: "#C4C9D4",
  highlight: "#2ECC71",
},
radius: 8,  // was 10, matches web's .5rem
```

(The dark `destructive` line above needs one build-time decision, not a design fork: either keep `#DD3C3C` as `destructive` for continuity with what's shipped in Phases 1-3's already-fixed error banners — meaning mobile's "destructive" intentionally tracks web's status-critical brightness rather than web's actual dimmer `#7C1D1D` button-destructive — or switch to the true `#7C1D1D` and re-verify every destructive-colored surface still reads clearly on mobile's smaller touch targets. Recommend keeping `#DD3C3C`: it's already shipped and verified legible; web's dimmer `#7C1D1D` was tuned for button contexts sitting on `--card`, not verified against mobile's usage on the FAB/banner/badge surfaces added in Phases 1-3.)

**Migration (mechanical, exact files, from a live grep of current usage):**
- `colors.success` → `colors.statusOk` in `app/seed-lot/[qrCode].tsx`, `app/seeding.tsx`, `components/CycleCard.tsx`.
- `colors.warning` → `colors.statusWarn` in `app/(tabs)/index.tsx`, `app/cycle/[id].tsx`, `app/fertigation/[id].tsx`, `app/seed-lot/[qrCode].tsx`, `components/CycleCard.tsx`.
- `colors.info` → `colors.chart2` in `app/(tabs)/index.tsx` (the one `YieldLineChart` usage — see 4.2).
- `colors.accent`: zero current usages (confirmed via grep) — safe to redefine with no migration needed.

**Elevation**: new `constants/elevation.ts` exporting `elevation(level: 1 | 2, colors)` returning `{ shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation }`, mirroring web's `--elevate-1`/`--elevate-2` alpha values (`rgba(0,0,0,.03)`/`.08` light, `rgba(255,255,255,.04)`/`.09` dark). Replace the 4 files with hand-rolled shadow values (`(tabs)/index.tsx`, `AskMeFab.tsx`, `ErrorFallback.tsx`, `HamburgerMenu.tsx`) with calls to this helper.

## Phase 4.1 — Global shell: header, nav reach, alerts, health, theme, search

New `components/AppHeader.tsx`, mounted at the top of all three tab screens (`(tabs)/index.tsx`, `cycles.tsx`, `scan.tsx`) instead of Home's bespoke header row. Contains, left to right: hamburger button, small `LogoMark`, spacer, alerts bell, connectivity dot, theme-toggle button.

**Hamburger reach**: lift `menuOpen` state out of `(tabs)/index.tsx` into a new `context/AppShellContext.tsx` (`{ menuOpen, openMenu, closeMenu }`), provided at `(tabs)/_layout.tsx` (same level `AskMeFab` already safely lives at — proven pattern from the Phase 3 z-order fix). `<HamburgerMenu>` moves to mount there too, alongside `AskMeFab`; each tab screen's `AppHeader` calls `openMenu()` from context instead of local state. Fixes the Home-only dead-end found in the UX audit.

**Alerts**: new `components/AlertsBell.tsx` using `useListAlerts({ status: "current", limit: 50 })` (already generated in `@workspace/api-client-react`, same hook web's `TopBar` uses) — badge count, `colors.destructive` if any `severity === "critical"` else `colors.primary`, matching web's exact logic. Tap opens new `app/alerts.tsx` (modal, reuses the list-row idiom already established in `CycleCard`/logs list).

**Connectivity**: small inline icon in `AppHeader` using `useHealthCheck` (already generated), Wifi/WifiOff swap, no tap action — glance-only, matches web.

**Theme toggle**: new `hooks/useThemeOverride.ts` — `AsyncStorage` key `farmeasy.themeOverride` (`"light" | "dark" | "system"`), defaults to `"system"`. `useColors()` checks this before falling back to `useColorScheme()`. `AppHeader`'s toggle button cycles it. This is additive — Phases 1-3's automatic OS-driven dark mode keeps working as the default, this just adds an explicit override on top.

**Search**: new `app/search.tsx` (modal) — single field, hits existing lookup endpoints (`useLookupSeedLot`, cycle-by-id) rather than a full command-palette (⌘K doesn't map to touch). Triggered from a search icon in `AppHeader` if there's room, otherwise from the hamburger panel as a menu row — decide placement during build based on how `AppHeader` looks with 4 icons already in it on a narrow screen.

## Phase 4.2 — Status & chart color correctness

- `components/CycleCard.tsx`: `STATUS_COLOR` map → `germination: colors.statusOk, fertigation: colors.primary, harvest: colors.statusWarn` (was `#10B981`/`#3B82F6`/`#F59E0B` Tailwind hex) — matches web's `Cycles.tsx` stage-badge mapping exactly, fixes the green-vs-blue fertigation mismatch.
- `app/(tabs)/index.tsx` `YieldLineChart`: seeding line `colors.info` → `colors.chart2` (lighter green, matches web's monochromatic chart convention); yield stays `colors.primary`; badTrays stays `colors.destructive` (now correct hex from 4.0).
- Home's "Action Required" badge: check whether `ActionRequiredItem` (from `@workspace/api-client-react`) carries a severity field. If yes, color the count badge the same way `AlertsBell` does (4.1). If no, note this as a small API-shape addition needed on `artifacts/api-server`'s dashboard route, not assumed free.
- Sweep remaining categorical hex (`seed-lot` type-tint badges, `RackReadingsCard`/`ChannelMonitoringCard` sensor-type accents, `cycle/[id].tsx`'s harvest-ready button) — these are legitimately categorical (not light/dark-theme-dependent), decide case by case whether to map onto `chart1-5` for consistency or leave as intentional fixed accents; don't blanket-convert without checking each reads fine against both `card` backgrounds.

## Phase 4.3 — Facility logs (original Phase 4 scope, unchanged, built on the corrected tokens)

Everything already specified above under "Data model," "API surface," and "Mobile UI plan" — carried forward as-is. Only two changes from sequencing this after 4.0-4.2 instead of standalone:

1. Built with `colors.statusOk`/`statusWarn`/`chart1-5`/`radius: 8`/the new `elevation()` helper from day one — no retrofit pass needed afterward.
2. The hamburger's existing "Data Logs" row (already built in Phase 3, already navigates to `/logs`) gets its real destination: new `app/logs/index.tsx`, a **category-picker landing screen** — 6 tiles (icon-in-rounded-square + title + subtitle + chevron, the same row idiom already used by `CycleCard`), one per log type, each opening its entry-form modal. This is a picker, not a history/browse list — the "no history view" decision from the original Phase 4 stands unchanged.

## Phase 4.4 — Dashboard parity (optional / lower priority)

Port a lightweight equivalent of web's `MetricPicker` + `TimeRangeSelector` to mobile Home, replacing the local Week/Month toggle currently scoped to just the yield chart. Reuse `@workspace/metrics`'s registry if its shape fits a mobile card list without a rewrite. Flagged optional: least load-bearing of the audit's findings, and the one with the most net-new scope (persisted per-user selection storage, more card variants to build). Suggest revisiting only after 4.0-4.3 ship and there's appetite for more.

## Build order

1. **4.0** — token rebuild + migration (foundation, nothing else looks right until this lands). **Shipped.**
2. **4.1** — global shell (header, hamburger-reach fix, alerts, health, theme toggle, search). **Shipped.**
3. **4.2** — status/chart color fixes (quick, mechanical, depends on 4.0's new token names existing). **Shipped.**
4. **4.3** — facility logs (the original Phase 4 feature, now on solid ground). **Shipped** — migration applied to the live DB, api-server deployed (Render autoDeploy), verified end-to-end on the Android emulator (category picker, form validation, live 401-not-404 confirming the deployed route).
5. **4.4** — dashboard parity, optional. **Not built** — descoped by explicit user decision; Phase 4 is considered complete without it.

## Status: Phase 4 complete (4.0-4.3)

Verified on the Android emulator throughout: new light/dark palettes, AppHeader (hamburger/logo/alerts/health/theme-toggle) on all 3 tabs, hamburger panel's Search + Data Logs rows, Search modal, theme-toggle cycling, chart/cycle-stage colors matching web, and the full facility-logs flow (category picker → form → validated submit against the live, deployed API). Repo-wide typecheck clean throughout (only the 6 pre-existing baseline errors, unrelated to this work, survive).
