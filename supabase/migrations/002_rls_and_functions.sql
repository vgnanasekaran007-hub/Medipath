-- =============================================================================
-- MEDIPATH — Migration 002: Row Level Security (RLS) & Transaction Functions
-- Roles: patient | hospital_staff | admin
-- Service-role key stays strictly on backend Express server.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'patient'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_user_role() IN ('hospital_staff', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

-- Enable RLS across every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (hospital navigation directory, public floor plans, announcements)
CREATE POLICY "Public read hospital_services" ON public.hospital_services FOR SELECT USING (TRUE);
CREATE POLICY "Admin manage hospital_services" ON public.hospital_services FOR ALL USING (public.is_admin());
CREATE POLICY "Public read hospitals" ON public.hospitals FOR SELECT USING (TRUE);
CREATE POLICY "Public read buildings" ON public.buildings FOR SELECT USING (TRUE);
CREATE POLICY "Public read published floors" ON public.floors FOR SELECT USING (is_published = TRUE OR public.is_staff_or_admin());
CREATE POLICY "Public read map_versions" ON public.map_versions FOR SELECT USING (status = 'published' OR public.is_staff_or_admin());
CREATE POLICY "Public read navigation_nodes" ON public.navigation_nodes FOR SELECT USING (TRUE);
CREATE POLICY "Public read non-restricted navigation_edges" ON public.navigation_edges FOR SELECT USING (is_restricted = FALSE OR public.is_staff_or_admin());
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (TRUE);
CREATE POLICY "Public read destinations" ON public.destinations FOR SELECT USING (TRUE);
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (TRUE);
CREATE POLICY "Public read doctor_schedules" ON public.doctor_schedules FOR SELECT USING (TRUE);
CREATE POLICY "Public read active announcements" ON public.announcements FOR SELECT USING (is_active = TRUE OR public.is_staff_or_admin());
CREATE POLICY "Public read active qr_checkpoints" ON public.qr_checkpoints FOR SELECT USING (is_active = TRUE OR public.is_staff_or_admin());
-- Queue board hides private identity details when anonymous; row access for live token status display
CREATE POLICY "Public read queue tokens" ON public.queue_tokens FOR SELECT USING (TRUE);

-- Profiles: Patients read/update own profile; Admins manage roles & view all
CREATE POLICY "Users view own profile or staff view all"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_staff_or_admin());

CREATE POLICY "Users update own non-role fields"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    OR public.is_admin()
  );

-- Appointments: Patients only view/create/cancel their own appointments; Staff/Admin manage all
CREATE POLICY "Patients read own appointments"
  ON public.appointments FOR SELECT
  USING (patient_id = auth.uid() OR public.is_staff_or_admin());

CREATE POLICY "Patients insert own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (patient_id = auth.uid() OR public.is_staff_or_admin());

CREATE POLICY "Patients cancel own or staff update appointments"
  ON public.appointments FOR UPDATE
  USING (patient_id = auth.uid() OR public.is_staff_or_admin());

-- Service Requests: Patients view/create own; Staff/Admin manage all
CREATE POLICY "Patients read own service requests"
  ON public.service_requests FOR SELECT
  USING (patient_id = auth.uid() OR public.is_staff_or_admin());

CREATE POLICY "Authenticated or guest create assistance request"
  ON public.service_requests FOR INSERT
  WITH CHECK (patient_id IS NULL OR patient_id = auth.uid() OR public.is_staff_or_admin());

CREATE POLICY "Staff update service requests"
  ON public.service_requests FOR UPDATE
  USING (public.is_staff_or_admin());

-- Admin/Staff Write Policies for Hospital Catalog & Spatial Graph
CREATE POLICY "Staff manage queue tokens" ON public.queue_tokens FOR ALL USING (public.is_staff_or_admin());
CREATE POLICY "Admin manage hospitals" ON public.hospitals FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage buildings" ON public.buildings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage floors" ON public.floors FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage map_versions" ON public.map_versions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage nodes" ON public.navigation_nodes FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage edges" ON public.navigation_edges FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage departments" ON public.departments FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage destinations" ON public.destinations FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage doctors" ON public.doctors FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage schedules" ON public.doctor_schedules FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage announcements" ON public.announcements FOR ALL USING (public.is_staff_or_admin());
CREATE POLICY "Admin manage qr_checkpoints" ON public.qr_checkpoints FOR ALL USING (public.is_admin());
CREATE POLICY "Staff read audit_logs" ON public.audit_logs FOR SELECT USING (public.is_staff_or_admin());
CREATE POLICY "Staff write audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_staff_or_admin());

-- Auto-create profile when a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'patient',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Transaction-safe appointment booking RPC
CREATE OR REPLACE FUNCTION public.book_appointment_safe(
  p_patient_id UUID,
  p_patient_name TEXT,
  p_patient_email TEXT,
  p_patient_phone TEXT,
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_slot_time TEXT,
  p_reason TEXT,
  p_accessibility_needed BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.doctors%ROWTYPE;
  v_existing UUID;
  v_ref TEXT;
  v_created public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_doc FROM public.doctors WHERE id = p_doctor_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctor not found or inactive';
  END IF;

  -- Lock candidate doctor appointments for date to serialize concurrent bookings
  SELECT id INTO v_existing
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND appointment_date = p_appointment_date
    AND slot_time = p_slot_time
    AND status <> 'cancelled'
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Selected appointment time slot is already booked';
  END IF;

  v_ref := 'MP-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.appointments (
    booking_reference,
    patient_id,
    patient_name,
    patient_email,
    patient_phone,
    doctor_id,
    department_id,
    destination_id,
    appointment_date,
    slot_time,
    reason,
    status,
    accessibility_needed,
    notes
  )
  VALUES (
    v_ref,
    p_patient_id,
    p_patient_name,
    p_patient_email,
    p_patient_phone,
    v_doc.id,
    v_doc.department_id,
    v_doc.destination_id,
    p_appointment_date,
    p_slot_time,
    p_reason,
    'confirmed',
    p_accessibility_needed,
    p_notes
  )
  RETURNING * INTO v_created;

  RETURN v_created;
END;
$$;
