# MEDIPATH — 3D Hospital Navigation & Clinical Service Platform

> **Find Your Way. Access Care. Save Time.**  
> Interactive 3D multi-floor hospital wayfinding powered by Three.js, React Three Fiber, synchronized 2D SVG floor plans, Dijkstra shortest-path calculation, bilingual English/Tamil UX, outpatient booking, queue tracking, and a full hospital operations console.

> **Sample Campus Disclosure:** *Aurelia Pavilion Medical Center* is a fictional four-level sample hospital dataset created strictly for MEDIPATH demonstration and engineering verification.

---

## Key Capabilities

- **Synchronized 3D + 2D Spatial Navigation Engine**:
  - 4 structural pavilion floors (`L0–L3`, `48m × 30m`) rendered interactively with React Three Fiber + Drei alongside pixel-synchronized `1000×640` architectural SVG floor plans.
  - Real multi-floor **Dijkstra shortest-path engine** (`@medipath/shared`) supporting standard corridors, dual elevator cores (`ELV-A`, `ELV-B`), staircases, wheelchair/step-free filtering (`accessibleOnly`), and restricted staff-bypass corridor exclusion (`isRestricted`).
  - Honest indoor positioning: visitors select their starting landmark manually or scan lobby/corridor QR checkpoints (`/qr/:code`) — never claiming unverified indoor GPS/BLE triangulation.
  - Automatic graceful WebGL fallback to the full interactive 2D SVG map if WebGL is unavailable.
- **Public Patient & Visitor Portal (21 Routes)**:
  - Architectural homepage with live 3D pavilion preview and instant destination autocomplete.
  - Full department, doctor, and hospital service directories with direct one-click suite routing.
  - Double-booking-protected outpatient slot reservation, confirmation passes, visit cancellation, live anonymized OPD queue board, token issuance, emergency protocol & Gate A routing, wheelchair/porter concierge requests, and full **English (`en`) / Tamil (`ta`)** language switching.
- **Admin Operations & Map Editor Console (20 Routes)**:
  - Role-based access (`admin`, `hospital_staff`) overseeing KPIs, appointments, queue counters, schedules, departments, destinations, navigation nodes, pathways, QR code totems, announcements, audit logs, and system settings.
  - **Unified 2D + 3D Map Studio** with SVG floor-plan file uploads, interactive node/edge placement, live Dijkstra route preview, pre-publish graph connectivity validation, and versioned map publishing.

---

## Monorepo Architecture

```text
Medipath/
├── shared/          # @medipath/shared — TypeScript models, SVG↔3D math, Dijkstra engine, sample dataset
├── backend/         # @medipath/backend — Express + TypeScript REST API (Supabase + Local fallback store)
├── frontend/        # @medipath/frontend — React + Vite + Tailwind + Three.js/R3F + Leaflet UI
├── supabase/        # PostgreSQL migrations (18 tables + RLS + RPC) & deterministic seed SQL
├── docs/            # Architecture, API, Database, Navigation Engine, and Deployment guides
├── vercel.json      # Vercel SPA deployment & security headers
└── render.yaml      # Render backend deployment blueprint
```

---

## Quickstart (Local Development)

### Prerequisites
- Node.js `>= 20` and npm `>= 10`
- Optional for production cloud database: Supabase project URL, Anon key, and Service Role key

### 1. Install Dependencies & Build Shared Package

```bash
npm install
npm run build -w shared
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` if you wish to connect Supabase, or run immediately with the built-in persistent local JSON store (`backend/data/dev-store.json`):

```bash
cp .env.example .env
```

> **Security Rule:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in `frontend/` or any `VITE_*` variable.

### 3. Run Development Servers

**Full-stack (Frontend + Express API):**

```bash
npm run dev
```

- **Frontend (Vite):** http://localhost:5173
- **Backend API (Express):** http://localhost:4000/api/health

**Frontend-only standalone mode (no backend required; powered by `@medipath/shared` fixtures + `localStorage`):**

```bash
npm run dev:frontend:only
```

- **Frontend Standalone (Vite):** http://localhost:5173

---

## Sample Development Accounts

When running in local sample persistence mode (`PERSISTENCE_MODE=auto` without Supabase env vars):

| Role | Email | Password |
| :--- | :--- | :--- |
| Administrator | `admin@medipath.demo` | `MediPathDemo!2026` |
| Hospital Staff | `staff@medipath.demo` | `MediPathDemo!2026` |
| Patient | `patient@medipath.demo` | `MediPathDemo!2026` |

---

## Testing & Verification

```bash
# Typecheck all workspaces
npm run typecheck

# Unit & API integration tests (shared + backend + frontend RTL)
npm run test

# Production build check across all workspaces
npm run build

# End-to-end Chromium browser verification
npm run test:e2e
```

---

## Documentation Suite

- [System Architecture](docs/architecture.md)
- [REST API Reference](docs/api.md)
- [Supabase Database & RLS](docs/database.md)
- [3D & 2D Dijkstra Navigation Engine](docs/navigation-engine.md)
- [Deployment Guide (Supabase, Render, Vercel, GitHub)](docs/deployment.md)

