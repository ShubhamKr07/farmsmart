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

## Suggested build order (once approved)

1. Dark mode + brand assets (small, low-risk, unblocks everything else visually).
2. Ask Me FAB (reuses existing backend, no new data model).
3. Hamburger panel (account header + sign-out + Data Logs entry point) — needed before the logs feature has anywhere to live.
4. Facility logs: backend (migration + `POST` route) → logs list screen → per-category entry forms.
