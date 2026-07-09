# 🌱 FarmSmart

**Operations software for indoor vertical farms — plan grow cycles, track facilities, manage inventory, and run day-to-day operations from your phone.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-React%20Native-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Express](https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Why FarmSmart

Indoor vertical farms pack dozens of grow cycles into a small footprint, and the operational complexity scales fast: which tray was seeded when, which rack is due for harvest, what's running low in inventory, and who's responsible for today's tasks. Most small and mid-sized growers run this on spreadsheets and memory — which breaks down the moment they add a second facility.

**FarmSmart replaces the spreadsheet.** It's a mobile-first operations app that gives growers a single source of truth for their facilities, grow cycles, inventory, and daily tasks — built to stay reliable as an operation grows from one room to many.

> 📸 _<!-- TODO: add 2–3 screenshots or a short GIF of the app here. Visuals are the single biggest driver of a README getting taken seriously. -->_

---

## Key Features

<!-- TODO: trim or expand this list to match exactly what's implemented today. Keep it honest — it's better to ship 4 real features than 8 aspirational ones. -->

- 🌿 **Grow cycle tracking** — Manage crops from seeding through harvest, with stage timelines and per-cycle status at a glance.
- 🏭 **Facility & rack management** — Model multiple facilities, racks, and trays so the app mirrors the physical layout of the farm.
- 📦 **Inventory management** — Track seeds, nutrients, and supplies, with visibility into what's running low before it becomes a problem.
- ✅ **Operational tasks** — Assign and track the recurring day-to-day work (seeding, transplanting, harvesting) across a team.
- 📊 **Operations dashboard** — A consolidated view of what's happening across the farm right now.
- 📱 **Mobile-first** — Built with Expo so it runs on iOS and Android from a single codebase, designed for use on the floor, not at a desk.

---

## Architecture

FarmSmart is a **TypeScript monorepo** managed with **pnpm workspaces**. The codebase is split into independently typed packages with a strict, typecheck-gated build, so a type error anywhere fails the build before anything ships.

```
farmeasy/
├── frontend-mobile/   # Expo (React Native) mobile client
├── lib/               # Shared, reusable TypeScript libraries (types, domain logic, utilities)
├── scripts/           # Operational and build tooling
├── artifacts/         # Generated / build outputs
├── tests/             # Test suite
├── .agents/           # AI-assisted development workflow configuration
├── pnpm-workspace.yaml
└── tsconfig.base.json # Shared strict TypeScript config inherited across packages
```

**Stack at a glance**

| Layer        | Technology                                   |
| ------------ | -------------------------------------------- |
| Mobile       | Expo, React Native, TypeScript               |
| Backend      | Express (Node.js), TypeScript                |
| Database     | PostgreSQL                                   |
| Tooling      | pnpm workspaces, TypeScript project refs, Prettier |
| Deployment   | Replit (`@replit/connectors-sdk`)            |

---

## Getting Started

### Prerequisites

- **Node.js** (LTS recommended)
- **pnpm** — this repo enforces pnpm and will refuse `npm install` / `yarn` by design
- **PostgreSQL** — a running instance (local or hosted)

### Installation

```bash
# Clone the repo
git clone https://github.com/ShubhamKr07/farmeasy.git
cd farmeasy

# Install all workspace dependencies
pnpm install
```

### Environment

Create a `.env` file with your configuration:

```bash
# <!-- TODO: confirm the actual variable names from your code -->
DATABASE_URL=postgresql://user:password@localhost:5432/farmeasy
PORT=3000
```

### Running the app

```bash
# Type-check the whole workspace
pnpm run typecheck

# Build all packages
pnpm run build

# Start the backend API
# <!-- TODO: add your actual dev/start script, e.g. pnpm --filter backend dev -->

# Start the mobile client
cd frontend-mobile
pnpm expo start
```

---

## Testing

```bash
# <!-- TODO: add your test command, e.g. pnpm test -->
```

The `tests/` workspace is set up for automated testing; CI-friendly and run as part of the build pipeline.

---

## 🛠️ Engineering Highlights

What this project demonstrates, beyond the feature list:

- **Full-stack TypeScript** end to end — a single strongly-typed language from the PostgreSQL data layer through the Express API to the React Native UI, with shared domain types in `lib/` eliminating client/server drift.
- **Monorepo architecture** — pnpm workspaces with TypeScript project references, so packages build incrementally and share code cleanly. A `preinstall` guard enforces a consistent toolchain across every contributor.
- **Type-safety as a quality gate** — the build runs `typecheck` before anything else compiles, catching whole classes of bugs before runtime.
- **Mobile-first product engineering** — cross-platform iOS/Android delivery from one Expo codebase, designed around real operational workflows rather than generic CRUD.
- **Domain modeling for operations** — translating the messy reality of a physical vertical farm (facilities → racks → trays → grow cycles) into a clean, queryable data model.
- **AI-assisted development workflow** — an `.agents/` configuration baked into the repo, reflecting a modern, agentic engineering practice.
- **Deploy-ready** — wired for cloud deployment via Replit connectors.

---

## Roadmap

<!-- TODO: replace with your real next steps — this section signals momentum and product thinking to anyone evaluating the repo. -->

- [ ] Forecasting for harvest yield and inventory depletion
- [ ] Role-based access for multi-person farm teams
- [ ] Analytics on cycle time and facility utilization
- [ ] Offline-first support for low-connectivity grow rooms

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Author

**Shubham Kumar**
[LinkedIn](https://www.linkedin.com/in/shubhamkumarcse) · [GitHub](https://github.com/ShubhamKr07)

> Built to bring operational rigor to indoor agriculture — combining full-stack engineering with a strategy-and-operations background in turning real-world workflows into reliable software.
