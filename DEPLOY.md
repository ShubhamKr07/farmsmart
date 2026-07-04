# FarmSmart — Render Deploy Guide

Production hosting on Render. Codebase on GitHub; Render is the only runtime (Replit retired).

## Architecture
- **farmsmart-api** (Web Service, ~$7/mo): Express API at `artifacts/api-server`.
- **farmsmart-dashboard** (Web Service, free, `vite preview`): Vite SPA at `artifacts/admin-dashboard`. Free plan spins down after inactivity (~30s cold start).
- **Postgres**: external Neon (keep `NEON_DATABASE_URL`).
- **Auth**: Clerk (`CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY`).

## First deploy (in the Render dashboard)

1. **New → Blueprint**, connect this GitHub repo. Render reads `render.yaml` and creates both services.
2. **Set env vars** (Render → each service → Environment):
   - **farmsmart-api**: `NEON_DATABASE_URL` = Neon connection string; `CLERK_SECRET_KEY` = `sk_…`; `CLERK_PUBLISHABLE_KEY` = `pk_…`; `CORS_ORIGIN` = the dashboard URL (set after step 4).
   - **farmsmart-dashboard**: `VITE_API_BASE_URL` = the API URL (Render-assigned, e.g. `https://farmsmart-api-j3qt.onrender.com`); `VITE_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_…`. (`PORT` + `BASE_PATH` are preset in `render.yaml`.)
3. **Deploy the API first.** Wait for it to go live; note its URL. Run migrations against Neon once (locally is fine — they may already be applied): `DATABASE_URL=<neon> node lib/db/scripts/migrate.mjs`.
4. **Set the dashboard's `VITE_API_BASE_URL`** to the API URL, then **deploy the dashboard.** Note its URL.
5. **Set the API's `CORS_ORIGIN`** to the dashboard URL (redeploy the API).
6. **Clerk dashboard** → add both URLs to the instance's allowed origins.

## Migrations
Drizzle migrations live in `lib/db/drizzle`. Run with:
```
DATABASE_URL=<neon-url> node lib/db/scripts/migrate.mjs
```
Neon already has migrations 0000–0005 applied.

## Custom domain (optional)
Render → service → Settings → Custom Domain. Point `farmsmart.app` (or `dashboard.farmsmart.app`) at the dashboard, `api.farmsmart.app` at the API. Update `VITE_API_BASE_URL` + `CORS_ORIGIN` + Clerk origins to the custom domains.

## Env var checklist
| Var | Where | Value |
|---|---|---|
| `NEON_DATABASE_URL` | API | `postgresql://…?sslmode=require` |
| `CLERK_SECRET_KEY` | API | `sk_…` |
| `CLERK_PUBLISHABLE_KEY` | API | `pk_…` |
| `CORS_ORIGIN` | API | dashboard URL |
| `QBO_CLIENT_ID` | API | Intuit Developer app Client ID |
| `QBO_CLIENT_SECRET` | API | Intuit Developer app Client Secret |
| `QBO_REDIRECT_URI` | API | must match a Redirect URI in the Intuit app's Keys & OAuth settings, e.g. `https://farmsmart-api-j3qt.onrender.com/api/accounting/callback` |
| `QBO_ENVIRONMENT` | API | `sandbox` or `production` |
| `ACCOUNTING_ENCRYPTION_KEY` | API | random 32+ char secret (`openssl rand -base64 32`), encrypts QuickBooks tokens at rest |
| `RECOMMENDER_URL` | API | `farmsmart-recommender`'s Render URL, e.g. `https://farmsmart-recommender.onrender.com` |
| `RECOMMENDER_INTERNAL_KEY` | API + Recommender | shared secret (`openssl rand -base64 32`), same value on both services — set as `RECOMMENDER_INTERNAL_KEY` on the API and `INTERNAL_API_KEY` on the recommender |
| `VITE_API_BASE_URL` | Dashboard | API URL |
| `VITE_PUBLIC_CLERK_PUBLISHABLE_KEY` | Dashboard | `pk_…` |
| `PORT` | Dashboard | `10000` (preset; Render injects at runtime) |
| `BASE_PATH` | Dashboard | `/` (preset) |
| `DATABASE_URL` | Recommender | same Neon connection string as the API |
| `GEMINI_API_KEY` | Recommender | `aistudio.google.com` key, used for `gemini-embedding-001` |
