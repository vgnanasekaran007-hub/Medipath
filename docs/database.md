# MEDIPATH Database Schema & Supabase Configuration

Schema SQL lives cleanly in:
- `supabase/migrations/001_initial_schema.sql` — 18 normalized relational tables, indexes, and triggers.
- `supabase/migrations/002_rls_and_functions.sql` — Row-Level Security (RLS) policies, helper predicates, and atomic booking RPC.
- `supabase/seed/seed.sql` — Idempotent seed data generated directly from `shared/src/sampleHospital.ts`.

---

## Core Relational Tables (18)

1. **`hospitals`**: Root facility metadata, bilingual disclaimers, coordinates, phone numbers, hours.
2. **`buildings`**: Architectural pavilion bounds (`width_meters = 48`, `depth_meters = 30`, `total_floors = 4`).
3. **`floors`**: Floor hierarchy (`L0–L3`), elevation in meters (`0, 4.2, 8.4, 12.6`), SVG viewBox dimensions (`1000×640`), raw SVG markup (`svg_plan`), and `is_published`.
4. **`map_versions`**: Versioned releases (`draft`, `published`, `archived`) tracking release labels and author emails.
5. **`navigation_nodes`**: Walkable and transitional vertices tied to a `floor_id` and `map_version_id` with exact SVG coordinates `(x, y)`, `node_type`, `is_accessible`, and `is_active`.
6. **`navigation_edges`**: Weighted directed/bidirectional connections (`corridor`, `elevator`, `staircase`, `ramp`) with `distance_meters`, `is_accessible`, and `is_restricted`.
7. **`departments`**: Clinical divisions mapped to floors and primary destinations.
8. **`destinations`**: Searchable indoor points (`room_code`, `node_id`, 2D/3D `zone` JSON `{ x, y, width, height, accentHex }`).
9. **`qr_checkpoints`**: Scannable physical placard codes (`MP-QR-ENTRANCE`, etc.) pinned to exact `node_id` locations.
10. **`doctors`**: Specialist roster linked to departments and consultation suites.
11. **`doctor_schedules`**: Recurring weekly OPD hours (`day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`).
12. **`hospital_services`**: Diagnostics, pharmacy, support, billing, and dining service records with preparation notes.
13. **`profiles`**: Extended auth users storing `role` (`patient` | `hospital_staff` | `admin`), `preferred_language` (`en` | `ta`), and `accessibility_required`.
14. **`appointments`**: Outpatient reservations guarded by a partial unique index to block overlapping active bookings:
    ```sql
    CREATE UNIQUE INDEX appointments_no_double_booking_idx
      ON public.appointments (doctor_id, appointment_date, slot_time)
      WHERE status <> 'cancelled';
    ```
15. **`queue_tokens`**: Daily counter tokens (`C-104`, etc.) with priority and live workflow status (`waiting`, `called`, `in_service`, `completed`, `skipped`).
16. **`service_requests`**: Wheelchair, porter escort, and language interpreter dispatches.
17. **`announcements`**: Campus-wide advisories (`info`, `advisory`, `emergency`).
18. **`audit_logs`**: Immutable administrative and clinical operation records.

---

## Transactional Slot Reservation (`book_appointment_safe`)

When backed by Supabase PostgreSQL, appointment booking invokes `public.book_appointment_safe(...)`, which locks the target doctor row (`SELECT ... FOR UPDATE`), verifies no non-cancelled visit occupies `(doctor_id, appointment_date, slot_time)`, and inserts the confirmed appointment inside a single atomic transaction.

## Row-Level Security (RLS) Highlights

- Public visitors may read catalog & published spatial tables (`hospitals`, `buildings`, `floors` where `is_published`, `navigation_nodes`, public `navigation_edges` where `NOT is_restricted`, `departments`, `destinations`, `doctors`, `doctor_schedules`, `hospital_services`, `qr_checkpoints`).
- Authenticated patients can only read/update their own `profiles`, cancel their own `appointments`, and read their own `service_requests`.
- `hospital_staff` and `admin` roles manage queue progression, appointment check-ins, and service request dispatch; `admin` solely controls clinical catalog mutations, role assignments, and map publishing.

