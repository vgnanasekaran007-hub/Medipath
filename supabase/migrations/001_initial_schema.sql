-- =============================================================================
-- MEDIPATH — Migration 001: Core Relational PostgreSQL Schema (Supabase)
-- All 17 core tables with UUID PKs, FKs, unique & check constraints, indexes.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper trigger for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1. profiles (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'hospital_staff', 'admin')),
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ta')),
  accessibility_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. hospitals
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ta TEXT NOT NULL,
  tagline TEXT NOT NULL,
  tagline_ta TEXT NOT NULL,
  is_sample_data BOOLEAN NOT NULL DEFAULT TRUE,
  sample_disclaimer TEXT NOT NULL DEFAULT '',
  sample_disclaimer_ta TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  address_ta TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  email TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  visiting_hours TEXT NOT NULL,
  visiting_hours_ta TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. buildings
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ta TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  description_ta TEXT NOT NULL DEFAULT '',
  total_floors INTEGER NOT NULL CHECK (total_floors >= 1),
  width_meters NUMERIC(6, 2) NOT NULL CHECK (width_meters > 0),
  depth_meters NUMERIC(6, 2) NOT NULL CHECK (depth_meters > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, code)
);

-- 4. floors
CREATE TABLE IF NOT EXISTS public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ta TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  subtitle_ta TEXT NOT NULL DEFAULT '',
  elevation_meters NUMERIC(6, 2) NOT NULL DEFAULT 0,
  svg_width INTEGER NOT NULL DEFAULT 1000 CHECK (svg_width > 0),
  svg_height INTEGER NOT NULL DEFAULT 640 CHECK (svg_height > 0),
  svg_plan TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, level_number),
  UNIQUE (building_id, code)
);

-- 5. map_versions
CREATE TABLE IF NOT EXISTS public.map_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_by TEXT,
  published_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_map_versions_one_published_per_hospital
  ON public.map_versions (hospital_id)
  WHERE status = 'published';

-- 6. navigation_nodes
CREATE TABLE IF NOT EXISTS public.navigation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  map_version_id UUID NOT NULL REFERENCES public.map_versions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  label_ta TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('entrance', 'corridor', 'junction', 'elevator', 'staircase', 'department_entrance', 'room', 'qr_checkpoint')
  ),
  x DOUBLE PRECISION NOT NULL CHECK (x >= 0 AND x <= 1000),
  y DOUBLE PRECISION NOT NULL CHECK (y >= 0 AND y <= 640),
  is_accessible BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (map_version_id, code)
);

CREATE INDEX IF NOT EXISTS idx_navigation_nodes_floor_version
  ON public.navigation_nodes (map_version_id, floor_id);

-- 7. navigation_edges
CREATE TABLE IF NOT EXISTS public.navigation_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_version_id UUID NOT NULL REFERENCES public.map_versions(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.navigation_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.navigation_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN ('corridor', 'elevator', 'staircase', 'ramp')),
  distance_meters NUMERIC(7, 2) NOT NULL CHECK (distance_meters > 0),
  is_accessible BOOLEAN NOT NULL DEFAULT TRUE,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_node_id <> to_node_id)
);

CREATE INDEX IF NOT EXISTS idx_navigation_edges_version_nodes
  ON public.navigation_edges (map_version_id, from_node_id, to_node_id);

-- 8. departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ta TEXT NOT NULL,
  wing TEXT NOT NULL,
  wing_ta TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  summary_ta TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_ta TEXT NOT NULL DEFAULT '',
  clinical_lead TEXT NOT NULL DEFAULT '',
  open_hours TEXT NOT NULL DEFAULT '',
  open_hours_ta TEXT NOT NULL DEFAULT '',
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  accent_color TEXT NOT NULL DEFAULT '#174C50',
  primary_destination_id UUID,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. destinations
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ta TEXT NOT NULL,
  room_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'entrance', 'reception', 'emergency', 'clinical', 'diagnostics',
      'pharmacy', 'critical_care', 'inpatient', 'billing', 'amenity', 'restroom', 'help_desk'
    )
  ),
  description TEXT NOT NULL DEFAULT '',
  description_ta TEXT NOT NULL DEFAULT '',
  node_id UUID NOT NULL REFERENCES public.navigation_nodes(id) ON DELETE RESTRICT,
  zone JSONB NOT NULL,
  is_accessible BOOLEAN NOT NULL DEFAULT TRUE,
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departments
  ADD CONSTRAINT fk_departments_primary_destination
  FOREIGN KEY (primary_destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_destinations_floor ON public.destinations (floor_id);
CREATE INDEX IF NOT EXISTS idx_destinations_department ON public.destinations (department_id);

-- 10. doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ta TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ta TEXT NOT NULL,
  specialty TEXT NOT NULL,
  specialty_ta TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT ARRAY['English'],
  experience_years INTEGER NOT NULL DEFAULT 1 CHECK (experience_years >= 0),
  consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  bio TEXT NOT NULL DEFAULT '',
  bio_ta TEXT NOT NULL DEFAULT '',
  portrait_initials TEXT NOT NULL DEFAULT 'MD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_department ON public.doctors (department_id);

-- 11. doctor_schedules
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes BETWEEN 10 AND 120),
  room_label TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_day ON public.doctor_schedules (doctor_id, day_of_week);

-- 12. appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  slot_time TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled')),
  accessibility_needed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent double-booking active slots for the same doctor/date/time
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot_unique
  ON public.appointments (doctor_id, appointment_date, slot_time)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (appointment_date);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 13. queue_tokens
CREATE TABLE IF NOT EXISTS public.queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  counter_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'skipped')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'priority', 'emergency')),
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 15 CHECK (estimated_wait_minutes >= 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_tokens_dept_status ON public.queue_tokens (department_id, status);

-- 14. service_requests (Patient Assistance & Escort)
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (
    request_type IN ('wheelchair', 'porter_escort', 'language_interpreter', 'emergency_guidance', 'general_inquiry')
  ),
  pickup_node_id UUID REFERENCES public.navigation_nodes(id) ON DELETE SET NULL,
  pickup_label TEXT NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'cancelled')),
  assigned_staff_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 15. announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ta TEXT NOT NULL,
  body TEXT NOT NULL,
  body_ta TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'advisory', 'emergency')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. qr_checkpoints
CREATE TABLE IF NOT EXISTS public.qr_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.navigation_nodes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  label_ta TEXT NOT NULL,
  location_hint TEXT NOT NULL,
  location_hint_ta TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('patient', 'hospital_staff', 'admin', 'system')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- 18. hospital_services (Patient services directory)
CREATE TABLE IF NOT EXISTS public.hospital_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ta TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('diagnostic', 'pharmacy', 'emergency', 'support', 'amenity', 'billing')),
  summary TEXT NOT NULL DEFAULT '',
  summary_ta TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  details_ta TEXT NOT NULL DEFAULT '',
  preparation_notes TEXT NOT NULL DEFAULT '',
  preparation_notes_ta TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT '',
  availability_ta TEXT NOT NULL DEFAULT '',
  turnaround_estimate TEXT NOT NULL DEFAULT ''
);
