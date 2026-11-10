# MEDIPATH REST API Reference

Base URL: `/api` (proxied locally via Vite, or deployed `VITE_API_BASE_URL`, e.g., `https://medipath-api.onrender.com/api`).

## Health & Telemetry

### `GET /api/health`
Returns server status, active persistence adapter (`local` | `supabase`), active published map version, and process uptime.

```json
{
  "status": "ok",
  "service": "medipath-api",
  "persistenceMode": "local",
  "mapVersion": 1,
  "mapVersionLabel": "v1.0 — Initial Architectural Blueprint",
  "uptimeSeconds": 12
}
```

---

## Public Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/hospital` | Hospital metadata, sample campus notice, buildings, floors, and active announcements |
| `GET` | `/api/buildings` | Building list with physical meters (`widthMeters`, `depthMeters`, `totalFloors`) |
| `GET` | `/api/floors` | Published floor plates including `svgPlan` SVG blueprints |
| `GET` | `/api/departments` | All clinical departments with bilingual EN/TA fields |
| `GET` | `/api/departments/:slug` | Single department profile, assigned specialists, floor plate, and destinations |
| `GET` | `/api/destinations?q=&floorId=` | Searchable destinations (rooms, diagnostics, amenities) |
| `GET` | `/api/doctors?departmentId=&q=` | Active specialists and weekly OPD schedule summaries |
| `GET` | `/api/doctors/:slug` | Doctor detail page payload |
| `GET` | `/api/doctors/:id/available-slots?date=YYYY-MM-DD` | Real-time open/booked time slots computed against non-cancelled appointments |
| `GET` | `/api/services` | Diagnostics, pharmacy, support, billing, and amenity services |
| `GET` | `/api/services/:slug` | Service prep notes, availability, and linked destination |
| `GET` | `/api/navigation/graph` | Complete published spatial payload (omits `isRestricted` staff-only edges) |
| `POST` | `/api/navigation/route` | Computes shortest path via server-side Dijkstra engine |
| `GET` | `/api/qr/:code` | Resolves QR checkpoint code (e.g., `MP-QR-ENTRANCE`) to indoor `nodeId` & floor |
| `GET` | `/api/queue?departmentId=` | Live OPD queue tokens (public visitor names masked to initials) |
| `POST` | `/api/queue/tokens` | Issues a walk-in queue token (`normal` \| `priority` \| `emergency`) |
| `POST` | `/api/assistance` | Submits wheelchair / porter escort / interpreter concierge request |

### `POST /api/navigation/route` Request & Response

```json
{
  "startNodeId": "a0000000-0000-4000-8000-000000000101",
  "endNodeId": "a0000000-0000-4000-8000-000000000307",
  "accessibleOnly": true
}
```

Returns `200 OK` with `{ "route": NavigationRouteResult }`, including ordered node coordinates, total distance in meters, walking duration estimate, floor transitions, and localized EN + TA step instructions.

---

## Authentication & Patient Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Registers a patient account (`min 8 char password`) and returns JWT |
| `POST` | `/api/auth/login` | Public | Authenticates patient, staff, or admin credentials |
| `POST` | `/api/auth/forgot-password` | Public | Initiates password recovery flow |
| `GET` | `/api/auth/me` | Bearer | Returns authenticated user profile |
| `PATCH` | `/api/auth/profile` | Bearer | Updates name, phone, `preferredLanguage`, and `accessibilityRequired` |
| `POST` | `/api/appointments` | Optional | Books an appointment slot atomically; returns `409 Conflict` if already taken |
| `GET` | `/api/appointments` | Bearer | Returns own appointments (`patient`) or all appointments (`staff`/`admin`) |
| `GET` | `/api/appointments/:id?email=` | Owner / Email Match / Staff | Loads booking confirmation securely |
| `PATCH` | `/api/appointments/:id/cancel` | Owner / Staff | Cancels confirmed visit and frees slot immediately |
| `GET` | `/api/assistance` | Bearer | Lists submitted concierge assistance requests scoped by ownership |

---

## Admin & Staff Endpoints (`/api/admin/*`)

All `/api/admin/*` endpoints require a valid Bearer token with role `admin` or `hospital_staff` (`401` if unauthenticated, `403` for `patient`). Destructive catalog, user-role, and map-publish routes strictly require `admin`.

| Area | Endpoints |
| :--- | :--- |
| **Overview** | `GET /api/admin/overview` |
| **Settings & Buildings** | `PUT /api/admin/hospital`, `GET/POST /api/admin/buildings` |
| **Floors & SVG Plans** | `GET/POST /api/admin/floors`, `DELETE /api/admin/floors/:id` |
| **Clinical Catalog** | `POST/DELETE /api/admin/departments`, `/api/admin/doctors`, `/api/admin/schedules` |
| **Queue & Visits** | `GET /api/admin/appointments`, `PATCH /api/admin/appointments/:id/status`, `GET /api/admin/queue`, `PATCH /api/admin/queue/:id/status` |
| **Concierge & Advisories** | `GET /api/admin/service-requests`, `PATCH /api/admin/service-requests/:id`, `GET/POST/DELETE /api/admin/announcements` |
| **3D/2D Map Studio** | `GET /api/admin/map/graph`, `GET /api/admin/map/versions`, `POST/DELETE /api/admin/map/nodes`, `POST/DELETE /api/admin/map/edges`, `POST /api/admin/map/validate`, `POST /api/admin/map/publish` |
| **QR Checkpoints** | `GET/POST/DELETE /api/admin/qr-checkpoints` |
| **Users & Governance** | `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `GET /api/admin/audit-logs` |

