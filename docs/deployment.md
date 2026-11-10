# MEDIPATH Production Deployment Guide

Architecture deployment topology:
- **Database & Auth:** Supabase (PostgreSQL + RLS + RPC)
- **Backend API:** Render (`render.yaml`)
- **Frontend SPA:** Vercel (`vercel.json`)
- **Source & CI:** GitHub Actions (`.github/workflows/ci.yml`)

---

## Step 1 — Provision Supabase PostgreSQL & Auth

1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** and execute the migrations in strict order:
   1. `supabase/migrations/001_initial_schema.sql`
   2. `supabase/migrations/002_rls_and_functions.sql`
   3. `supabase/seed/seed.sql`
3. In **Authentication → Users**, create staff/admin accounts (for example, your hospital administrator email) and assign their role in `public.profiles`:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@hospital.org';
   ```
4. Collect from **Project Settings → API**:
   - `Project URL` (`SUPABASE_URL`)
   - `anon public` key (`SUPABASE_ANON_KEY`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`) — **backend only!**

---

## Step 2 — Deploy Backend API on Render

This repository includes `/render.yaml` configured cleanly for the npm workspace monorepo:

- **Build Command:** `npm install && npm run build -w shared && npm run build -w backend`
- **Start Command:** `npm run start -w backend`
- **Health Check Path:** `/api/health`

Configure these **Render Environment Variables**:

| Variable | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PERSISTENCE_MODE` | `supabase` |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key |
| `SUPABASE_JWT_SECRET` | Supabase JWT Secret |
| `FRONTEND_URL` | `https://your-medipath-app.vercel.app` |
| `CORS_ORIGINS` | `https://your-medipath-app.vercel.app` |

Verify `https://<your-render-service>.onrender.com/api/health` responds with `persistenceMode: "supabase"` and `status: "ok"`.

---

## Step 3 — Deploy Frontend on Vercel

This repository includes `/vercel.json` handling SPA client-side routes (`/(.*) -> /index.html`), workspace builds, and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

Import the GitHub repository into Vercel (keep project root `.`) and configure **Environment Variables**:

| Variable | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api` |
| `VITE_SUPABASE_URL` | Your Supabase Project URL (optional) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Public Key (optional) |

---

## Step 4 — GitHub CI Verification

Every push or pull request triggers `.github/workflows/ci.yml`:
1. `npm ci`
2. `npm run build -w shared`
3. `npm run typecheck` (`shared`, `backend`, `frontend`)
4. `npm run test` (Dijkstra unit tests, Supertest backend integration tests, React Testing Library frontend tests)
5. `npm run build` (`shared`, `backend`, `frontend`)

