# GCP Implementation Plan

> **Phase name:** GCP Implementation Plan
> **Repo:** `shubhamkr07/farmsmart` · place this file at the repo root as `GCP_IMPLEMENTATION_PLAN.md`
> **Executor:** Claude Code, working through workstreams WS0–WS6 with human checkpoints at every gate
> **Source documents:** Cloud Migration Assessment v1 · Technical Implementation Plan v1 (task IDs `INF-xxx` trace to it)
> **Target:** Render (Oregon) → GCP Cloud Run (asia-south1), Neon retained, dashboard on Firebase Hosting, secrets in Secret Manager
> **Timing rule:** complete before Phased Plan P1.M1 exit. The infra cutover and the tenancy schema migration never share a week.

---

## How Claude Code should use this file

1. Work top-to-bottom. Tasks are `- [ ]` checkboxes — **edit this file and tick them as you complete them**, committing the tick with the work.
2. Every task lists a **Verify** command or condition. A task is not done until Verify passes.
3. **`[HUMAN]` tasks are not yours.** Stop, tell the human exactly what to do and what you need back (a value, a confirmation), then wait.
4. **GATE blocks are hard stops.** Print the gate checklist results and ask for explicit human approval before continuing to the next workstream.
5. Never write a secret value into the repo, this file, a commit, or a log. Secret *names* are fine; values go only into Secret Manager via `gcloud` with the human present, or are set by the human directly.
6. `terraform apply` on **staging** is yours after a clean reviewed plan. `terraform apply` on **prod** always requires the human to say "apply prod" after reading the plan output.
7. If a command fails twice, stop and report — do not improvise around IAM or billing errors.
8. Current live config lives in `render.yaml` and `DEPLOY.md` — treat them as the source of truth for env vars and build commands. Do not modify Render services; they are the rollback until WS6.

### Known repo facts (verified — do not rediscover)

| Fact | Value |
|---|---|
| API build | `pnpm --filter @workspace/api-server run build` → `artifacts/api-server/dist/index.mjs` |
| API start / health | `node --enable-source-maps artifacts/api-server/dist/index.mjs` · `GET /api/healthz` |
| Recommender | `artifacts/recommender-svc`, uv-managed, `uv run uvicorn app.main:app` · `GET /healthz` |
| Dashboard build | `pnpm --filter @workspace/admin-dashboard run build` (Vite; `VITE_*` vars are **build-time**) |
| Package manager | pnpm only — a preinstall guard rejects npm/yarn |
| Migrations | `DATABASE_URL=<direct-neon-url> node lib/db/scripts/migrate.mjs` (journal at 0000–0005) |
| Known live bug | `FACILITY_TIMEZONE=America/New_York` in prod — fixed at cutover step C5 |

---

## Prerequisites — all `[HUMAN]`

- [ ] `[HUMAN]` Google Cloud account with billing enabled; provide the **billing account ID**.
- [ ] `[HUMAN]` Decide project IDs (suggested: `farmsmart-staging`, `farmsmart-prod`) — confirm or supply alternatives.
- [ ] `[HUMAN]` `gcloud` CLI authenticated locally (`gcloud auth login` + `gcloud auth application-default login`).
- [ ] `[HUMAN]` Access to: GitHub repo settings (for WIF + environments), Clerk dashboard, Intuit Developer app, DNS provider for `farmsmart.app`, Neon console, Expo/EAS account, Firebase console.
- [ ] `[HUMAN]` Confirm the Neon target region: check Neon's current region list — **Mumbai if offered, else Singapore** — and report the choice (feeds INF-202).

---

## WS0 — Foundations

- [ ] **INF-001** Create projects + enable APIs.
  ```bash
  for P in farmsmart-staging farmsmart-prod; do
    gcloud projects create $P && gcloud billing projects link $P --billing-account=$BILLING_ID
    gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
      secretmanager.googleapis.com cloudscheduler.googleapis.com \
      iamcredentials.googleapis.com firebasehosting.googleapis.com --project $P
  done
  ```
  **Verify:** `gcloud services list --project farmsmart-prod` shows all six.
- [ ] **INF-002** `[HUMAN]` Create budget alerts ($25/$50/$100) per project in the console (budgets API needs quota-project setup that isn't worth automating for two budgets). Confirm done.
- [ ] **INF-003** Scaffold Terraform under `infra/` exactly as:
  ```
  infra/
    modules/
      project-services/   run-service/   secrets/   photo-bucket/
      scheduler-warmup/   domain/        wif-github/
    envs/staging/  envs/prod/
    backend.tf   # GCS state bucket (create it first, versioning ON, in farmsmart-prod)
  ```
  Write real modules (no placeholders): `run-service` takes image, service-account, secret refs, scaling {min,max,concurrency,cpu,mem}, ingress; `domain` switches on `var.lb_fallback`.
  **Verify:** `terraform -chdir=infra/envs/staging validate` clean; `terraform plan` shows only intended resources.
- [ ] **INF-004** Service accounts + IAM per the matrix (sa-api, sa-recommender, sa-ci): api gets `run.invoker` on recommender, `storage.objectAdmin` on the photo bucket, `secretAccessor` on its own secrets only. No `editor`/`owner` on any SA.
  **Verify:** `gcloud projects get-iam-policy farmsmart-staging` diffed against the matrix in a script `infra/scripts/check-iam.sh` you write; commit the script.
- [ ] **INF-005** Workload Identity Federation for GitHub: pool + OIDC provider conditioned to `repository == "shubhamkr07/farmsmart"`, staging bound to `ref == refs/heads/main`, prod to tag refs. Output the provider resource names into `.github/workflows` env.
  **Verify:** a throwaway workflow authenticates and runs `gcloud artifacts repositories list` — no JSON key anywhere in the repo or GitHub secrets.
- [ ] **INF-006** Artifact Registry docker repo `farmsmart` in asia-south1, cleanup policy: delete untagged > 90 d.
  **Verify:** `docker push` round-trip from local.
- [ ] **INF-013** Domain-mapping spike: attempt a Cloud Run domain mapping for a test hostname in asia-south1 on staging. Record the outcome and set `lb_fallback` in tfvars accordingly. Append the decision to `docs/adr/ADR-004.md`.

> **GATE G0 — STOP.** Report: fresh `terraform apply` in staging builds everything; `terraform destroy` is clean; zero console-created resources (except budgets). Await approval.

---

## WS1 — Containerisation & CI/CD

- [ ] **INF-101** Create `artifacts/api-server/Dockerfile` (multi-stage, pnpm workspace context — build from repo root):
  ```dockerfile
  FROM node:20-slim AS build
  RUN corepack enable
  WORKDIR /app
  COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./
  COPY lib ./lib
  COPY artifacts/api-server ./artifacts/api-server
  RUN pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build

  FROM node:20-slim
  WORKDIR /app
  COPY --from=build /app/artifacts/api-server/dist ./dist
  COPY --from=build /app/node_modules ./node_modules
  ENV NODE_ENV=production
  CMD ["node", "--enable-source-maps", "dist/index.mjs"]
  ```
  Adjust COPY set to what the build actually needs (inspect imports); add `.dockerignore` (node_modules, .git, frontend-mobile, docs, tests).
  **Verify:** `docker run -p 8080:8080 -e PORT=8080 <img>` + staging env → `curl :8080/api/healthz` = 200; image < 350 MB.
- [ ] **INF-102** `artifacts/recommender-svc/Dockerfile`: `python:3.12-slim`, install uv, `uv sync --frozen`, `CMD uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
  **Verify:** `curl :8080/healthz` = 200.
- [ ] **INF-103** Firebase Hosting for the dashboard: `firebase.json` with SPA rewrite (`** → /index.html`), cache headers (`/assets/**` immutable 1y; `index.html` no-cache). Remove nothing from the existing `serve` path yet (Render still uses it until WS6).
  **Verify:** `firebase emulators:start` serves the built SPA; a deep link (e.g. `/cycles/abc`) resolves.
- [ ] **INF-104** `.github/workflows/deploy-staging.yml` — on push to `main`: pnpm typecheck → build & push both images (tag = git SHA) → `gcloud run deploy` staging services → build dashboard with staging `VITE_API_BASE_URL` + `VITE_PUBLIC_CLERK_PUBLISHABLE_KEY` (from GitHub environment vars, **not** Secret Manager — Vite vars are build-time) → deploy Firebase Hosting staging site. Auth via WIF only.
  **Verify:** merge a trivial commit; full staging stack updates with zero manual steps.
- [ ] **INF-105** `.github/workflows/deploy-prod.yml` — on tag `v*`: **promote the staging image digests** (no rebuild) to prod services; GitHub environment `production` with required reviewer = human.
  **Verify:** tag `v0.0.1-migration` → approval prompt → prod deploy; `gcloud run services describe` digests match staging.
- [ ] **INF-106** Populate Secret Manager (staging first). Create the secret *names* via Terraform; values entered by human:
  `neon-database-url-pooled`, `neon-database-url-direct`, `clerk-secret-key`, `clerk-publishable-key`, `qbo-client-id`, `qbo-client-secret`, `qbo-redirect-uri`, `accounting-encryption-key` (**migrate the existing value — never regenerate; stored QBO tokens must keep decrypting**), `recommender-internal-key`, `gemini-api-key`, `tavily-api-key`, `cors-origin`, `sen-vault-key` (create empty — reserved for SEN-002; this closes PRD Q20).
  `[HUMAN]` provide values via `gcloud secrets versions add` prompts you print (or console).
  **Verify:** `gcloud run services describe farmsmart-api` shows `secretKeyRef` for every sensitive var; no plaintext sensitive env remains.
- [ ] **INF-107** CI guard workflow: fail on `onrender\.com` anywhere in the repo (except `render.yaml`, `DEPLOY.md`, this file) and on secret-shaped literals (`sk_live_`, `AKIA`, `-----BEGIN`).
  **Verify:** seeded violation branch fails CI; clean branch passes.

> **GATE G1 — STOP.** A `main` commit stands up the complete staging stack over HTTPS with secrets only from Secret Manager. Show the staging URLs. Await approval.

---

## WS2 — Data layer

- [ ] **INF-201** Write `docs/adr/ADR-002.md`: Neon retained; Databricks acquisition noted as watch item; pooled-vs-direct connection policy.
- [ ] **INF-202** `[HUMAN]`-paired Neon relocation: human creates the new Neon project in the target region and provides both connection strings. You then: `pg_dump` from old (direct URL) → `pg_restore` to new → run `node lib/db/scripts/migrate.mjs` against the new **direct** URL (expect no-op if journal restored) →
  **Verify:** row counts + `md5(string_agg(id::text,','))` checksums match on `cycles`, `growth_profiles`, `inventory_items`, `seed_lots`; Drizzle journal shows 0000–0005.
- [ ] **INF-203** Point staging services at the **pooled** string; migrations keep **direct**.
  **Verify:** `k6 run` smoke at VU=50 on a read+write mix — zero prepared-statement/pooling errors.
- [ ] **INF-204** Photo pipeline: Terraform `photo-bucket` (uniform access, CORS for mobile PUT, lifecycle 30 d → Nearline); add API endpoint `POST /api/uploads/sign` returning a V4 signed PUT URL (sa-api signs); store object path, not bytes.
  **Verify:** scripted PUT via a signed URL lands an object; API DB row holds the path only.
- [ ] **INF-205** PITR drill in staging: restore Neon to T-30 min on a branch, point a temporary staging revision at it, boot, then tear down. Write timings into `docs/runbook.md` (start the runbook file now).
  **Verify:** drill section exists with real timestamps.

> **GATE G2 — STOP.** Staging runs wholly on the relocated Neon via the pooler; PITR rehearsed in writing; photos flow to GCS; **old-region Neon untouched** (it is the data rollback until cutover + 7 d). Await approval.

---

## WS3 — Staging validation

- [ ] **INF-300** Baseline first: run the k6 profiles below against **production Render** once and save results to `docs/perf/baseline-render.json`. Cutover success is measured against this.
- [ ] **INF-301** Scripted E2E pass on staging (write it as `scripts/e2e-smoke.md` checklist): Clerk sign-in (web), dashboard loads, mobile seed→move→harvest via Expo dev build pointed at staging, QBO **sandbox** OAuth round-trip, recommender query through the API. `[HUMAN]` executes the mobile steps; you drive and record.
- [ ] **INF-302** k6 profiles in `scripts/k6/`: `burst.js` (0→50 RPS/60 s on scan endpoints), `soak.js` (10 RPS × 30 min).
  **Verify:** p95 < 400 ms warm; error rate < 0.1%; results saved to `docs/perf/staging-gcp.json`.
- [ ] **INF-303** Cold-start characterisation: scale to zero, 20 timed first-requests per service; record; set `min-instances` in tfvars (expected: API prod = 1, recommender = 0).
- [ ] **INF-304** Failure drills (document each outcome in the runbook): kill instance mid-request; remove recommender invoker binding (API must degrade, not 500-storm); wrong Neon password on a canary revision (crash-loop must alert once WS4 lands).
- [ ] **INF-305** Terraform `scheduler-warmup`: Cloud Scheduler ping to `/api/healthz` 15 min before shift hours (interim fixed IST cron; TODO note: facility-timezone-aware after TEN-005).
  **Verify:** simulated shift-start burst hits a warm instance.

> **GATE G3 — STOP.** Show staging-vs-Render baseline comparison table. Staging must beat baseline on scan-endpoint p95. Await approval.

---

## WS4 — Observability (overlaps WS3)

- [ ] **INF-401** Structured JSON logging in both services (request-id middleware; org/facility fields stubbed for TEN); log-based metrics: 5xx rate, p95, auth-failure count.
- [ ] **INF-402** Terraform: uptime checks (API healthz, dashboard root) from 3 regions; alert policies → email + Slack webhook: 5xx > 1% / 5 min, p95 > 1 s / 10 min, uptime fail ×2, budget thresholds.
  **Verify:** forced failure pages within 5 min.
- [ ] **INF-403** Sentry in API, dashboard, mobile; release = git SHA from CI; upload sourcemaps.
  **Verify:** thrown staging error shows correct release with readable stack.
- [ ] **INF-404** Log audit script `scripts/audit-logs.sh`: scan 24 h of staging logs for any Secret Manager value fingerprint (compare hashes, never print values).
  **Verify:** clean run; wire it as a weekly scheduled CI job.

> **GATE G4 — STOP.** Blind-detection test: human (or a second Claude Code session with only dashboard access) re-runs one WS3 drill unannounced; alerts must identify and locate it. Await approval.

---

## WS5 — Production cutover

**Preconditions (verify all, print the checklist):** G0–G4 approved · prod deployed from staging digests · prod Neon migrated · DNS TTLs at 300 s since T-1 d (`[HUMAN]`) · Intuit app lists old **and** new redirect URIs (`[HUMAN]`) · Clerk lists old **and** new origins (`[HUMAN]`) · EAS Update with new API URL built and held (`[HUMAN]` approves publish) · Render responding · old-region Neon intact.

**Cutover sequence — execute in order, verify each before the next:**

- [ ] **C1** `[HUMAN]` announce maintenance banner (15 min).
- [ ] **C2** `[HUMAN]` flip DNS: `api.farmsmart.app` → Cloud Run mapping/LB; dashboard domain → Firebase Hosting. (You provide the exact records.)
- [ ] **C3** Update `cors-origin` secret to the new dashboard origin; deploy new API revision.
- [ ] **C4** `[HUMAN]` publish the held EAS Update (mobile switches API base OTA).
- [ ] **C5** Set `FACILITY_TIMEZONE=Asia/Kolkata` on the prod API (live-bug fix riding the window; retired later by TEN-005).
- [ ] **C6** `[HUMAN]` live QBO OAuth round-trip against the new redirect URI.

**Verifications V1–V8 (all within 30 min):** V1 dashboard + Clerk sign-in on custom domain · V2 mobile full scan flow on a test cycle · V3 recommender via API · V4 QBO callback (C6) · V5 photo → GCS object · V6 Sentry release, no new error class · V7 uptime green all regions · V8 scan-endpoint p95 ≤ staging G3 + 20%.

**Rollback (trigger: any V fails without a <15 min fix, or 5xx > 2% for 10 min in first 48 h):** revert DNS → `[HUMAN]` republish previous EAS channel → restore Clerk origins → announce. **Data never rolls back** — Neon moved and was validated in WS2, a week before this evening.

> **GATE G5 — STOP.** 48 h error budget clean; rollback assets still warm. Await approval to enter WS6.

---

## WS6 — Post-migration (each on its own delay)

- [ ] **INF-601** Finalise `docs/runbook.md` (deploy, rollback, secret rotation — incl. the ACCOUNTING_ENCRYPTION_KEY re-encrypt script prerequisite — PITR, break-glass). **Verify:** human executes a staging deploy + rollback from the doc alone.
- [ ] **INF-602** *(G5 + 14 d)* `[HUMAN]` decommission Render; you tombstone `render.yaml` (comment header pointing here) and rewrite `DEPLOY.md` for GCP.
- [ ] **INF-603** *(G5 + 7 d)* `[HUMAN]` delete old-region Neon project after a verified prod PITR point.
- [ ] **INF-604** *(G5 + 30 d)* Cost review vs Assessment §4.3; tune min-instances, CDN, log retention; note in `docs/perf/`.
- [ ] **INF-605** Mark `docs/adr/ADR-004.md` **Accepted**; update the Phased Plan: **Q20 closed** via Secret Manager.
- [ ] **INF-214** *(G5 + 30 d)* Retire `INTERNAL_API_KEY` / `RECOMMENDER_INTERNAL_KEY` (IAM-only auth proven); remove from both services and Secret Manager.

---

## Definition of done

- [ ] Prod serves from asia-south1; scan-endpoint p95 beats the Render-Oregon baseline in `docs/perf/`.
- [ ] Zero secrets outside Secret Manager; `sen-vault-key` slot exists (Q20 closed); log audit clean and scheduled.
- [ ] `main` → staging and tag + approval → prod with no manual infra steps.
- [ ] Rollback and PITR each executed once (staging) and documented; runbook validated by a second operator.
- [ ] Render decommissioned; ADR-002 + ADR-004 Accepted; CI grep gate live.
