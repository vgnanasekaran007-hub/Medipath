import {
  calculateShortestPath,
  validateNavigationGraph,
} from '@medipath/shared';
import type {
  Announcement,
  Appointment,
  AppointmentStatus,
  AuditLog,
  Building,
  Department,
  Destination,
  Doctor,
  DoctorSchedule,
  Floor,
  GraphValidationResult,
  Hospital,
  HospitalGraphPayload,
  HospitalServiceItem,
  MapVersion,
  NavigationEdge,
  NavigationNode,
  NavigationRouteResult,
  QrCheckpoint,
  QueueStatus,
  QueueToken,
  ServiceRequest,
  ServiceRequestStatus,
  UserProfile,
  UserRole,
} from '@medipath/shared';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import type {
  AdminOverviewStats,
  AuthSessionUser,
  BookAppointmentInput,
  CreateServiceRequestInput,
  IssueQueueTokenInput,
  MediPathStore,
  StoreUserRecord,
} from './storeTypes.js';

function mapHospital(r: Record<string, any>): Hospital {
  return {
    id: r.id,
    name: r.name,
    nameTa: r.name_ta,
    tagline: r.tagline,
    taglineTa: r.tagline_ta,
    isSampleData: Boolean(r.is_sample_data),
    sampleDisclaimer: r.sample_disclaimer ?? '',
    sampleDisclaimerTa: r.sample_disclaimer_ta ?? '',
    address: r.address,
    addressTa: r.address_ta,
    city: r.city,
    phone: r.phone,
    emergencyPhone: r.emergency_phone,
    email: r.email,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    visitingHours: r.visiting_hours,
    visitingHoursTa: r.visiting_hours_ta,
    createdAt: r.created_at,
  };
}

function mapBuilding(r: Record<string, any>): Building {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    name: r.name,
    nameTa: r.name_ta,
    code: r.code,
    description: r.description ?? '',
    descriptionTa: r.description_ta ?? '',
    totalFloors: Number(r.total_floors),
    widthMeters: Number(r.width_meters),
    depthMeters: Number(r.depth_meters),
    createdAt: r.created_at,
  };
}

function mapFloor(r: Record<string, any>): Floor {
  return {
    id: r.id,
    buildingId: r.building_id,
    levelNumber: Number(r.level_number),
    code: r.code,
    name: r.name,
    nameTa: r.name_ta,
    subtitle: r.subtitle ?? '',
    subtitleTa: r.subtitle_ta ?? '',
    elevationMeters: Number(r.elevation_meters),
    svgWidth: Number(r.svg_width),
    svgHeight: Number(r.svg_height),
    svgPlan: r.svg_plan ?? '',
    isPublished: Boolean(r.is_published),
  };
}

function mapDepartment(r: Record<string, any>): Department {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    floorId: r.floor_id,
    slug: r.slug,
    code: r.code,
    name: r.name,
    nameTa: r.name_ta,
    wing: r.wing,
    wingTa: r.wing_ta,
    summary: r.summary ?? '',
    summaryTa: r.summary_ta ?? '',
    description: r.description ?? '',
    descriptionTa: r.description_ta ?? '',
    clinicalLead: r.clinical_lead ?? '',
    openHours: r.open_hours ?? '',
    openHoursTa: r.open_hours_ta ?? '',
    isEmergency: Boolean(r.is_emergency),
    accentColor: r.accent_color ?? '#174C50',
    primaryDestinationId: r.primary_destination_id ?? undefined,
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
  };
}

function mapDestination(r: Record<string, any>): Destination {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    floorId: r.floor_id,
    departmentId: r.department_id ?? undefined,
    slug: r.slug,
    name: r.name,
    nameTa: r.name_ta,
    roomCode: r.room_code,
    category: r.category,
    description: r.description ?? '',
    descriptionTa: r.description_ta ?? '',
    nodeId: r.node_id,
    zone: r.zone,
    isAccessible: Boolean(r.is_accessible),
    isEmergency: Boolean(r.is_emergency),
    isSearchable: Boolean(r.is_searchable),
  };
}

function mapNode(r: Record<string, any>): NavigationNode {
  return {
    id: r.id,
    floorId: r.floor_id,
    mapVersionId: r.map_version_id,
    code: r.code,
    label: r.label,
    labelTa: r.label_ta,
    type: r.type,
    x: Number(r.x),
    y: Number(r.y),
    isAccessible: Boolean(r.is_accessible),
    isActive: Boolean(r.is_active),
  };
}

function mapEdge(r: Record<string, any>): NavigationEdge {
  return {
    id: r.id,
    mapVersionId: r.map_version_id,
    fromNodeId: r.from_node_id,
    toNodeId: r.to_node_id,
    edgeType: r.edge_type,
    distanceMeters: Number(r.distance_meters),
    isAccessible: Boolean(r.is_accessible),
    isRestricted: Boolean(r.is_restricted),
    bidirectional: Boolean(r.bidirectional),
  };
}

function mapDoctor(r: Record<string, any>): Doctor {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    departmentId: r.department_id,
    destinationId: r.destination_id,
    slug: r.slug,
    fullName: r.full_name,
    fullNameTa: r.full_name_ta,
    title: r.title,
    titleTa: r.title_ta,
    specialty: r.specialty,
    specialtyTa: r.specialty_ta,
    qualifications: r.qualifications,
    languages: Array.isArray(r.languages) ? r.languages : ['English'],
    experienceYears: Number(r.experience_years),
    consultationFee: Number(r.consultation_fee),
    bio: r.bio ?? '',
    bioTa: r.bio_ta ?? '',
    portraitInitials: r.portrait_initials ?? 'MD',
    isActive: Boolean(r.is_active),
  };
}

function mapSchedule(r: Record<string, any>): DoctorSchedule {
  return {
    id: r.id,
    doctorId: r.doctor_id,
    dayOfWeek: Number(r.day_of_week),
    startTime: String(r.start_time).slice(0, 5),
    endTime: String(r.end_time).slice(0, 5),
    slotDurationMinutes: Number(r.slot_duration_minutes),
    roomLabel: r.room_label,
    isAvailable: Boolean(r.is_available),
  };
}

function mapService(r: Record<string, any>): HospitalServiceItem {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    departmentId: r.department_id ?? undefined,
    destinationId: r.destination_id,
    slug: r.slug,
    name: r.name,
    nameTa: r.name_ta,
    category: r.category,
    summary: r.summary ?? '',
    summaryTa: r.summary_ta ?? '',
    details: r.details ?? '',
    detailsTa: r.details_ta ?? '',
    preparationNotes: r.preparation_notes ?? '',
    preparationNotesTa: r.preparation_notes_ta ?? '',
    availability: r.availability ?? '',
    availabilityTa: r.availability_ta ?? '',
    turnaroundEstimate: r.turnaround_estimate ?? '',
  };
}

function mapProfile(r: Record<string, any>): UserProfile {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    phone: r.phone ?? undefined,
    role: r.role,
    preferredLanguage: r.preferred_language ?? 'en',
    accessibilityRequired: Boolean(r.accessibility_required),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapAppointment(r: Record<string, any>): Appointment {
  return {
    id: r.id,
    bookingReference: r.booking_reference,
    patientId: r.patient_id ?? undefined,
    patientName: r.patient_name,
    patientEmail: r.patient_email,
    patientPhone: r.patient_phone,
    doctorId: r.doctor_id,
    departmentId: r.department_id,
    destinationId: r.destination_id,
    appointmentDate: String(r.appointment_date).slice(0, 10),
    slotTime: r.slot_time,
    reason: r.reason,
    status: r.status,
    accessibilityNeeded: Boolean(r.accessibility_needed),
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapQueueToken(r: Record<string, any>): QueueToken {
  return {
    id: r.id,
    tokenNumber: r.token_number,
    departmentId: r.department_id,
    appointmentId: r.appointment_id ?? undefined,
    patientId: r.patient_id ?? undefined,
    patientName: r.patient_name,
    counterLabel: r.counter_label,
    status: r.status,
    priority: r.priority,
    estimatedWaitMinutes: Number(r.estimated_wait_minutes),
    issuedAt: r.issued_at,
    calledAt: r.called_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
  };
}

function mapServiceRequest(r: Record<string, any>): ServiceRequest {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    patientId: r.patient_id ?? undefined,
    requesterName: r.requester_name,
    requesterPhone: r.requester_phone,
    requestType: r.request_type,
    pickupNodeId: r.pickup_node_id ?? undefined,
    pickupLabel: r.pickup_label,
    destinationId: r.destination_id ?? undefined,
    notes: r.notes ?? '',
    status: r.status,
    assignedStaffName: r.assigned_staff_name ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapAnnouncement(r: Record<string, any>): Announcement {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    title: r.title,
    titleTa: r.title_ta,
    body: r.body,
    bodyTa: r.body_ta,
    severity: r.severity,
    isActive: Boolean(r.is_active),
    publishedAt: r.published_at,
  };
}

function mapQr(r: Record<string, any>): QrCheckpoint {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    floorId: r.floor_id,
    nodeId: r.node_id,
    code: r.code,
    label: r.label,
    labelTa: r.label_ta,
    locationHint: r.location_hint ?? '',
    locationHintTa: r.location_hint_ta ?? '',
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
  };
}

function mapMapVersion(r: Record<string, any>): MapVersion {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    versionNumber: Number(r.version_number),
    label: r.label,
    status: r.status,
    publishedBy: r.published_by ?? undefined,
    publishedAt: r.published_at ?? undefined,
    notes: r.notes ?? '',
    createdAt: r.created_at,
  };
}

function mapAudit(r: Record<string, any>): AuditLog {
  return {
    id: r.id,
    actorId: r.actor_id ?? undefined,
    actorEmail: r.actor_email,
    actorRole: r.actor_role,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    summary: r.summary,
    createdAt: r.created_at,
  };
}

export class SupabaseStore implements MediPathStore {
  public readonly mode = 'supabase' as const;
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async init(): Promise<void> {
    const { error } = await this.client.from('hospitals').select('id').limit(1);
    if (error) {
      throw new Error(`Supabase connection check failed: ${error.message}`);
    }
  }

  private async logAudit(actor: Pick<AuthSessionUser, 'id' | 'email' | 'role'>, action: string, entityType: string, entityId: string, summary: string) {
    await this.client.from('audit_logs').insert({
      actor_id: actor.id,
      actor_email: actor.email,
      actor_role: actor.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      summary,
    });
  }

  private async activeVersion(): Promise<MapVersion> {
    const { data, error } = await this.client
      .from('map_versions')
      .select('*')
      .eq('status', 'published')
      .order('version_number', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) throw new Error(error?.message ?? 'No published map version found');
    return mapMapVersion(data);
  }

  async getHospital(): Promise<Hospital> {
    const { data, error } = await this.client.from('hospitals').select('*').limit(1).single();
    if (error || !data) throw new Error(error?.message ?? 'Hospital record missing');
    return mapHospital(data);
  }

  async updateHospital(patch: Partial<Hospital>, actor: AuthSessionUser): Promise<Hospital> {
    const current = await this.getHospital();
    const { data, error } = await this.client
      .from('hospitals')
      .update({
        name: patch.name ?? current.name,
        name_ta: patch.nameTa ?? current.nameTa,
        tagline: patch.tagline ?? current.tagline,
        tagline_ta: patch.taglineTa ?? current.taglineTa,
        address: patch.address ?? current.address,
        address_ta: patch.addressTa ?? current.addressTa,
        phone: patch.phone ?? current.phone,
        emergency_phone: patch.emergencyPhone ?? current.emergencyPhone,
        email: patch.email ?? current.email,
        visiting_hours: patch.visitingHours ?? current.visitingHours,
        visiting_hours_ta: patch.visitingHoursTa ?? current.visitingHoursTa,
      })
      .eq('id', current.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update hospital');
    await this.logAudit(actor, 'HOSPITAL_SETTINGS_UPDATED', 'hospitals', current.id, 'Updated hospital settings.');
    return mapHospital(data);
  }

  async getBuildings(): Promise<Building[]> {
    const { data, error } = await this.client.from('buildings').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBuilding);
  }

  async upsertBuilding(input: Partial<Building> & { name: string; code: string }, actor: AuthSessionUser): Promise<Building> {
    const hospital = await this.getHospital();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      hospital_id: hospital.id,
      name: input.name,
      name_ta: input.nameTa ?? input.name,
      code: input.code,
      description: input.description ?? '',
      description_ta: input.descriptionTa ?? '',
      total_floors: input.totalFloors ?? 4,
      width_meters: input.widthMeters ?? 48,
      depth_meters: input.depthMeters ?? 30,
    };
    const { data, error } = await this.client.from('buildings').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save building');
    await this.logAudit(actor, input.id ? 'BUILDING_UPDATED' : 'BUILDING_CREATED', 'buildings', data.id, `Saved building ${data.name}`);
    return mapBuilding(data);
  }

  async getFloors(): Promise<Floor[]> {
    const { data, error } = await this.client.from('floors').select('*').order('level_number', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFloor);
  }

  async upsertFloor(input: Partial<Floor> & { code: string; name: string; levelNumber: number }, actor: AuthSessionUser): Promise<Floor> {
    const buildings = await this.getBuildings();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      building_id: input.buildingId ?? buildings[0].id,
      level_number: input.levelNumber,
      code: input.code,
      name: input.name,
      name_ta: input.nameTa ?? input.name,
      subtitle: input.subtitle ?? '',
      subtitle_ta: input.subtitleTa ?? '',
      elevation_meters: input.elevationMeters ?? input.levelNumber * 4.2,
      svg_width: input.svgWidth ?? 1000,
      svg_height: input.svgHeight ?? 640,
      svg_plan: input.svgPlan ?? '',
      is_published: input.isPublished ?? true,
    };
    const { data, error } = await this.client.from('floors').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save floor');
    await this.logAudit(actor, input.id ? 'FLOOR_UPDATED' : 'FLOOR_CREATED', 'floors', data.id, `Saved floor ${data.code}`);
    return mapFloor(data);
  }

  async deleteFloor(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('floors').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'FLOOR_DELETED', 'floors', id, `Deleted floor ${id}`);
  }

  async getDepartments(): Promise<Department[]> {
    const { data, error } = await this.client.from('departments').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapDepartment);
  }

  async getDepartmentBySlug(slug: string): Promise<Department | null> {
    const { data } = await this.client.from('departments').select('*').eq('slug', slug).maybeSingle();
    return data ? mapDepartment(data) : null;
  }

  async upsertDepartment(input: Partial<Department> & { name: string; slug: string }, actor: AuthSessionUser): Promise<Department> {
    const hospital = await this.getHospital();
    const floors = await this.getFloors();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      hospital_id: hospital.id,
      floor_id: input.floorId ?? floors[0].id,
      slug: input.slug,
      code: input.code ?? input.slug.toUpperCase().slice(0, 8),
      name: input.name,
      name_ta: input.nameTa ?? input.name,
      wing: input.wing ?? 'Main Pavilion',
      wing_ta: input.wingTa ?? 'முதன்மை பகுதி',
      summary: input.summary ?? '',
      summary_ta: input.summaryTa ?? '',
      description: input.description ?? '',
      description_ta: input.descriptionTa ?? '',
      clinical_lead: input.clinicalLead ?? '',
      open_hours: input.openHours ?? '',
      open_hours_ta: input.openHoursTa ?? '',
      is_emergency: input.isEmergency ?? false,
      accent_color: input.accentColor ?? '#174C50',
      primary_destination_id: input.primaryDestinationId ?? null,
      amenities: input.amenities ?? [],
    };
    const { data, error } = await this.client.from('departments').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save department');
    await this.logAudit(actor, input.id ? 'DEPARTMENT_UPDATED' : 'DEPARTMENT_CREATED', 'departments', data.id, `Saved department ${data.name}`);
    return mapDepartment(data);
  }

  async deleteDepartment(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('departments').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'DEPARTMENT_DELETED', 'departments', id, `Deleted department ${id}`);
  }

  async getDestinations(): Promise<Destination[]> {
    const { data, error } = await this.client.from('destinations').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapDestination);
  }

  async upsertDestination(input: Partial<Destination> & { name: string; slug: string; floorId: string; nodeId: string }, actor: AuthSessionUser): Promise<Destination> {
    const hospital = await this.getHospital();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      hospital_id: hospital.id,
      floor_id: input.floorId,
      department_id: input.departmentId ?? null,
      slug: input.slug,
      name: input.name,
      name_ta: input.nameTa ?? input.name,
      room_code: input.roomCode ?? 'RM-NEW',
      category: input.category ?? 'clinical',
      description: input.description ?? '',
      description_ta: input.descriptionTa ?? '',
      node_id: input.nodeId,
      zone: input.zone ?? { x: 400, y: 260, width: 120, height: 90, accentHex: '#174C50' },
      is_accessible: input.isAccessible ?? true,
      is_emergency: input.isEmergency ?? false,
      is_searchable: input.isSearchable ?? true,
    };
    const { data, error } = await this.client.from('destinations').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save destination');
    await this.logAudit(actor, input.id ? 'DESTINATION_UPDATED' : 'DESTINATION_CREATED', 'destinations', data.id, `Saved destination ${data.name}`);
    return mapDestination(data);
  }

  async deleteDestination(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('destinations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'DESTINATION_DELETED', 'destinations', id, `Deleted destination ${id}`);
  }

  async getDoctors(): Promise<Doctor[]> {
    const { data, error } = await this.client.from('doctors').select('*').order('full_name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapDoctor);
  }

  async getDoctorBySlug(slug: string): Promise<Doctor | null> {
    const { data } = await this.client.from('doctors').select('*').eq('slug', slug).maybeSingle();
    return data ? mapDoctor(data) : null;
  }

  async upsertDoctor(input: Partial<Doctor> & { fullName: string; slug: string; departmentId: string; destinationId: string }, actor: AuthSessionUser): Promise<Doctor> {
    const hospital = await this.getHospital();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      hospital_id: hospital.id,
      department_id: input.departmentId,
      destination_id: input.destinationId,
      slug: input.slug,
      full_name: input.fullName,
      full_name_ta: input.fullNameTa ?? input.fullName,
      title: input.title ?? 'Consultant Specialist',
      title_ta: input.titleTa ?? 'மருத்துவ ஆலோசகர்',
      specialty: input.specialty ?? 'Clinical Medicine',
      specialty_ta: input.specialtyTa ?? 'மருத்துவம்',
      qualifications: input.qualifications ?? 'MBBS, MD',
      languages: input.languages ?? ['English', 'Tamil'],
      experience_years: input.experienceYears ?? 8,
      consultation_fee: input.consultationFee ?? 750,
      bio: input.bio ?? '',
      bio_ta: input.bioTa ?? '',
      portrait_initials: input.portraitInitials ?? 'MD',
      is_active: input.isActive ?? true,
    };
    const { data, error } = await this.client.from('doctors').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save doctor');
    await this.logAudit(actor, input.id ? 'DOCTOR_UPDATED' : 'DOCTOR_CREATED', 'doctors', data.id, `Saved doctor ${data.full_name}`);
    return mapDoctor(data);
  }

  async deleteDoctor(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('doctors').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'DOCTOR_DELETED', 'doctors', id, `Deleted doctor ${id}`);
  }

  async getDoctorSchedules(doctorId?: string): Promise<DoctorSchedule[]> {
    let query = this.client.from('doctor_schedules').select('*').order('day_of_week');
    if (doctorId) query = query.eq('doctor_id', doctorId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSchedule);
  }

  async upsertDoctorSchedule(input: Partial<DoctorSchedule> & { doctorId: string; dayOfWeek: number; startTime: string; endTime: string }, actor: AuthSessionUser): Promise<DoctorSchedule> {
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      doctor_id: input.doctorId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      slot_duration_minutes: input.slotDurationMinutes ?? 30,
      room_label: input.roomLabel ?? 'Consultation Suite',
      is_available: input.isAvailable ?? true,
    };
    const { data, error } = await this.client.from('doctor_schedules').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save schedule');
    await this.logAudit(actor, 'SCHEDULE_UPDATED', 'doctor_schedules', data.id, `Updated schedule for ${data.doctor_id}`);
    return mapSchedule(data);
  }

  async deleteDoctorSchedule(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('doctor_schedules').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'SCHEDULE_DELETED', 'doctor_schedules', id, `Deleted schedule ${id}`);
  }

  async getServices(): Promise<HospitalServiceItem[]> {
    const { data, error } = await this.client.from('hospital_services').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapService);
  }

  async getServiceBySlug(slug: string): Promise<HospitalServiceItem | null> {
    const { data } = await this.client.from('hospital_services').select('*').eq('slug', slug).maybeSingle();
    return data ? mapService(data) : null;
  }

  async getAnnouncements(includeInactive = false): Promise<Announcement[]> {
    let q = this.client.from('announcements').select('*').order('published_at', { ascending: false });
    if (!includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAnnouncement);
  }

  async upsertAnnouncement(input: Partial<Announcement> & { title: string; body: string }, actor: AuthSessionUser): Promise<Announcement> {
    const hospital = await this.getHospital();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      hospital_id: hospital.id,
      title: input.title,
      title_ta: input.titleTa ?? input.title,
      body: input.body,
      body_ta: input.bodyTa ?? input.body,
      severity: input.severity ?? 'info',
      is_active: input.isActive ?? true,
    };
    const { data, error } = await this.client.from('announcements').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save announcement');
    await this.logAudit(actor, 'ANNOUNCEMENT_SAVED', 'announcements', data.id, `Saved announcement "${data.title}"`);
    return mapAnnouncement(data);
  }

  async deleteAnnouncement(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('announcements').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'ANNOUNCEMENT_DELETED', 'announcements', id, `Deleted announcement ${id}`);
  }

  async getNavigationGraph(versionId?: string): Promise<HospitalGraphPayload> {
    const activeMapVersion = versionId
      ? mapMapVersion((await this.client.from('map_versions').select('*').eq('id', versionId).single()).data!)
      : await this.activeVersion();

    const [hospital, buildings, floors, departments, destinations, nodesRes, edgesRes, qrRes] = await Promise.all([
      this.getHospital(),
      this.getBuildings(),
      this.getFloors(),
      this.getDepartments(),
      this.getDestinations(),
      this.client.from('navigation_nodes').select('*').eq('map_version_id', activeMapVersion.id),
      this.client.from('navigation_edges').select('*').eq('map_version_id', activeMapVersion.id),
      this.client.from('qr_checkpoints').select('*').eq('is_active', true),
    ]);

    return {
      hospital,
      building: buildings[0],
      activeMapVersion,
      floors,
      departments,
      destinations,
      nodes: (nodesRes.data ?? []).map(mapNode),
      edges: (edgesRes.data ?? []).map(mapEdge),
      qrCheckpoints: (qrRes.data ?? []).map(mapQr),
    };
  }

  async calculateRoute(params: {
    startNodeId: string;
    endNodeId: string;
    accessibleOnly?: boolean;
    versionId?: string;
  }): Promise<NavigationRouteResult> {
    const graph = await this.getNavigationGraph(params.versionId);
    return calculateShortestPath({
      nodes: graph.nodes,
      edges: graph.edges,
      floors: graph.floors,
      startNodeId: params.startNodeId,
      endNodeId: params.endNodeId,
      accessibleOnly: params.accessibleOnly,
    });
  }

  async getQrCheckpoints(): Promise<QrCheckpoint[]> {
    const { data, error } = await this.client.from('qr_checkpoints').select('*').order('code');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapQr);
  }

  async getQrCheckpointByCode(code: string): Promise<QrCheckpoint | null> {
    const { data } = await this.client.from('qr_checkpoints').select('*').ilike('code', code).eq('is_active', true).maybeSingle();
    return data ? mapQr(data) : null;
  }

  async upsertQrCheckpoint(input: Partial<QrCheckpoint> & { code: string; label: string; floorId: string; nodeId: string }, actor: AuthSessionUser): Promise<QrCheckpoint> {
    const hospital = await this.getHospital();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      hospital_id: hospital.id,
      floor_id: input.floorId,
      node_id: input.nodeId,
      code: input.code.toUpperCase(),
      label: input.label,
      label_ta: input.labelTa ?? input.label,
      location_hint: input.locationHint ?? '',
      location_hint_ta: input.locationHintTa ?? '',
      is_active: input.isActive ?? true,
    };
    const { data, error } = await this.client.from('qr_checkpoints').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save QR checkpoint');
    await this.logAudit(actor, 'QR_CHECKPOINT_SAVED', 'qr_checkpoints', data.id, `Saved QR checkpoint ${data.code}`);
    return mapQr(data);
  }

  async deleteQrCheckpoint(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('qr_checkpoints').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'QR_CHECKPOINT_DELETED', 'qr_checkpoints', id, `Deleted QR checkpoint ${id}`);
  }

  async getMapVersions(): Promise<MapVersion[]> {
    const { data, error } = await this.client.from('map_versions').select('*').order('version_number', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMapVersion);
  }

  async upsertNode(input: Partial<NavigationNode> & { floorId: string; label: string; x: number; y: number }, actor: AuthSessionUser): Promise<NavigationNode> {
    const version = await this.activeVersion();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      floor_id: input.floorId,
      map_version_id: input.mapVersionId ?? version.id,
      code: input.code ?? `N-${Date.now().toString(36).toUpperCase()}`,
      label: input.label,
      label_ta: input.labelTa ?? input.label,
      type: input.type ?? 'corridor',
      x: input.x,
      y: input.y,
      is_accessible: input.isAccessible ?? true,
      is_active: input.isActive ?? true,
    };
    const { data, error } = await this.client.from('navigation_nodes').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save navigation node');
    await this.logAudit(actor, 'NODE_SAVED', 'navigation_nodes', data.id, `Saved node ${data.label}`);
    return mapNode(data);
  }

  async deleteNode(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('navigation_nodes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'NODE_DELETED', 'navigation_nodes', id, `Deleted node ${id}`);
  }

  async upsertEdge(input: Partial<NavigationEdge> & { fromNodeId: string; toNodeId: string; distanceMeters: number }, actor: AuthSessionUser): Promise<NavigationEdge> {
    const version = await this.activeVersion();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      map_version_id: input.mapVersionId ?? version.id,
      from_node_id: input.fromNodeId,
      to_node_id: input.toNodeId,
      edge_type: input.edgeType ?? 'corridor',
      distance_meters: input.distanceMeters,
      is_accessible: input.isAccessible ?? input.edgeType !== 'staircase',
      is_restricted: input.isRestricted ?? false,
      bidirectional: input.bidirectional ?? true,
    };
    const { data, error } = await this.client.from('navigation_edges').upsert(payload).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save navigation edge');
    await this.logAudit(actor, 'EDGE_SAVED', 'navigation_edges', data.id, `Saved pathway ${data.id}`);
    return mapEdge(data);
  }

  async deleteEdge(id: string, actor: AuthSessionUser): Promise<void> {
    const { error } = await this.client.from('navigation_edges').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.logAudit(actor, 'EDGE_DELETED', 'navigation_edges', id, `Deleted pathway ${id}`);
  }

  async validateMap(versionId?: string): Promise<GraphValidationResult> {
    const graph = await this.getNavigationGraph(versionId);
    return validateNavigationGraph({
      floors: graph.floors,
      destinations: graph.destinations,
      nodes: graph.nodes,
      edges: graph.edges,
    });
  }

  async publishMapVersion(input: { label?: string; notes?: string }, actor: AuthSessionUser): Promise<{ version: MapVersion; validation: GraphValidationResult }> {
    const current = await this.activeVersion();
    const validation = await this.validateMap(current.id);
    if (!validation.valid) {
      throw new Error('Cannot publish map while validation errors exist.');
    }
    const versions = await this.getMapVersions();
    const nextNum = Math.max(...versions.map((v) => v.versionNumber)) + 1;
    await this.client.from('map_versions').update({ status: 'archived' }).eq('status', 'published');
    const { data: created, error } = await this.client
      .from('map_versions')
      .insert({
        hospital_id: current.hospitalId,
        version_number: nextNum,
        label: input.label ?? `v${nextNum}.0 — Published Map Update`,
        status: 'published',
        published_by: actor.email,
        published_at: new Date().toISOString(),
        notes: input.notes ?? 'Published from MEDIPATH 3D Admin Map Editor.',
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message ?? 'Failed to create map version');
    await this.client.from('navigation_nodes').update({ map_version_id: created.id }).eq('map_version_id', current.id);
    await this.client.from('navigation_edges').update({ map_version_id: created.id }).eq('map_version_id', current.id);
    await this.logAudit(actor, 'MAP_VERSION_PUBLISHED', 'map_versions', created.id, `Published ${created.label}`);
    return { version: mapMapVersion(created), validation };
  }

  async findUserByEmail(email: string): Promise<StoreUserRecord | null> {
    const { data } = await this.client.from('profiles').select('*').ilike('email', email).maybeSingle();
    return data ? { ...mapProfile(data), passwordHash: '' } : null;
  }

  async findUserById(id: string): Promise<UserProfile | null> {
    const { data } = await this.client.from('profiles').select('*').eq('id', id).maybeSingle();
    return data ? mapProfile(data) : null;
  }

  async registerUser(input: { email: string; password: string; fullName: string; phone?: string; preferredLanguage?: 'en' | 'ta' }): Promise<UserProfile> {
    const { data, error } = await this.client.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, preferred_language: input.preferredLanguage ?? 'en' },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Registration failed');
    const profile = await this.updateProfile(data.user.id, {
      fullName: input.fullName,
      phone: input.phone,
      preferredLanguage: input.preferredLanguage ?? 'en',
    });
    return profile;
  }

  verifyPassword(): boolean {
    return false;
  }

  async updateProfile(userId: string, patch: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'preferredLanguage' | 'accessibilityRequired'>>): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('profiles')
      .update({
        ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.preferredLanguage !== undefined ? { preferred_language: patch.preferredLanguage } : {}),
        ...(patch.accessibilityRequired !== undefined ? { accessibility_required: patch.accessibilityRequired } : {}),
      })
      .eq('id', userId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update profile');
    return mapProfile(data);
  }

  async listUsers(): Promise<UserProfile[]> {
    const { data, error } = await this.client.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProfile);
  }

  async updateUserRole(userId: string, role: UserRole, actor: AuthSessionUser): Promise<UserProfile> {
    const { data, error } = await this.client.from('profiles').update({ role }).eq('id', userId).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update role');
    await this.logAudit(actor, 'USER_ROLE_CHANGED', 'profiles', userId, `Updated role to ${role}`);
    return mapProfile(data);
  }

  async listAppointments(filter?: { patientId?: string; doctorId?: string; date?: string }): Promise<Appointment[]> {
    let q = this.client.from('appointments').select('*').order('appointment_date', { ascending: false });
    if (filter?.patientId) q = q.eq('patient_id', filter.patientId);
    if (filter?.doctorId) q = q.eq('doctor_id', filter.doctorId);
    if (filter?.date) q = q.eq('appointment_date', filter.date);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAppointment);
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const { data } = await this.client.from('appointments').select('*').or(`id.eq.${id},booking_reference.eq.${id}`).maybeSingle();
    return data ? mapAppointment(data) : null;
  }

  async bookAppointment(input: BookAppointmentInput): Promise<Appointment> {
    const { data, error } = await this.client.rpc('book_appointment_safe', {
      p_patient_id: input.patientId ?? null,
      p_patient_name: input.patientName,
      p_patient_email: input.patientEmail,
      p_patient_phone: input.patientPhone,
      p_doctor_id: input.doctorId,
      p_appointment_date: input.appointmentDate,
      p_slot_time: input.slotTime,
      p_reason: input.reason,
      p_accessibility_needed: Boolean(input.accessibilityNeeded),
      p_notes: input.notes ?? null,
    });
    if (error || !data) throw new Error(error?.message ?? 'Booking failed');
    return mapAppointment(data);
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus, actor: AuthSessionUser): Promise<Appointment> {
    const { data, error } = await this.client.from('appointments').update({ status }).eq('id', id).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update appointment');
    await this.logAudit(actor, `APPOINTMENT_${status.toUpperCase()}`, 'appointments', id, `Appointment marked ${status}`);
    return mapAppointment(data);
  }

  async listQueueTokens(departmentId?: string): Promise<QueueToken[]> {
    let q = this.client.from('queue_tokens').select('*').order('issued_at');
    if (departmentId) q = q.eq('department_id', departmentId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapQueueToken);
  }

  async issueQueueToken(input: IssueQueueTokenInput): Promise<QueueToken> {
    const dept = (await this.getDepartments()).find((d) => d.id === input.departmentId);
    if (!dept) throw new Error('Department not found');
    const existing = await this.listQueueTokens(dept.id);
    const waitingCount = existing.filter((t) => t.status === 'waiting' || t.status === 'called').length;
    const tokenNumber = `${dept.code[0] ?? 'Q'}-${101 + existing.length}`;
    const { data, error } = await this.client
      .from('queue_tokens')
      .insert({
        token_number: tokenNumber,
        department_id: dept.id,
        appointment_id: input.appointmentId ?? null,
        patient_id: input.patientId ?? null,
        patient_name: input.patientName,
        counter_label: dept.wing.split('·')[0].trim(),
        status: 'waiting',
        priority: input.priority ?? 'normal',
        estimated_wait_minutes: Math.max(5, waitingCount * 10 + 5),
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to issue queue token');
    return mapQueueToken(data);
  }

  async updateQueueTokenStatus(id: string, status: QueueStatus, actor: AuthSessionUser): Promise<QueueToken> {
    const patch: Record<string, any> = { status };
    if (status === 'called' || status === 'in_service') {
      patch.called_at = new Date().toISOString();
      patch.estimated_wait_minutes = 0;
    }
    if (status === 'completed' || status === 'skipped') {
      patch.completed_at = new Date().toISOString();
      patch.estimated_wait_minutes = 0;
    }
    const { data, error } = await this.client.from('queue_tokens').update(patch).eq('id', id).select('*').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update token');
    await this.logAudit(actor, 'QUEUE_TOKEN_UPDATED', 'queue_tokens', id, `Token ${data.token_number} moved to ${status}`);
    return mapQueueToken(data);
  }

  async listServiceRequests(patientId?: string): Promise<ServiceRequest[]> {
    let q = this.client.from('service_requests').select('*').order('created_at', { ascending: false });
    if (patientId) q = q.eq('patient_id', patientId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapServiceRequest);
  }

  async createServiceRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
    const hospital = await this.getHospital();
    const { data, error } = await this.client
      .from('service_requests')
      .insert({
        hospital_id: hospital.id,
        patient_id: input.patientId ?? null,
        requester_name: input.requesterName,
        requester_phone: input.requesterPhone,
        request_type: input.requestType,
        pickup_node_id: input.pickupNodeId ?? null,
        pickup_label: input.pickupLabel,
        destination_id: input.destinationId ?? null,
        notes: input.notes ?? '',
        status: 'pending',
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to submit assistance request');
    return mapServiceRequest(data);
  }

  async updateServiceRequest(id: string, patch: { status?: ServiceRequestStatus; assignedStaffName?: string }, actor: AuthSessionUser): Promise<ServiceRequest> {
    const { data, error } = await this.client
      .from('service_requests')
      .update({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.assignedStaffName !== undefined ? { assigned_staff_name: patch.assignedStaffName } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update assistance request');
    await this.logAudit(actor, 'ASSISTANCE_UPDATED', 'service_requests', id, `Updated assistance request ${id}`);
    return mapServiceRequest(data);
  }

  async listAuditLogs(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await this.client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAudit);
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    const today = new Date().toISOString().slice(0, 10);
    const [appointments, users, doctors, departments, queue, requests, activeMapVersion, graphValidation, recentAuditLogs] = await Promise.all([
      this.listAppointments(),
      this.listUsers(),
      this.getDoctors(),
      this.getDepartments(),
      this.listQueueTokens(),
      this.listServiceRequests(),
      this.activeVersion(),
      this.validateMap(),
      this.listAuditLogs(8),
    ]);
    const active = appointments.filter((a) => a.status !== 'cancelled');
    return {
      totalAppointments: active.length,
      todayAppointments: active.filter((a) => a.appointmentDate === today).length,
      registeredPatients: users.filter((u) => u.role === 'patient').length,
      activeDoctors: doctors.filter((d) => d.isActive).length,
      departmentCount: departments.length,
      queueStats: {
        waiting: queue.filter((q) => q.status === 'waiting').length,
        called: queue.filter((q) => q.status === 'called').length,
        inService: queue.filter((q) => q.status === 'in_service').length,
        completedToday: queue.filter((q) => q.status === 'completed').length,
      },
      pendingAssistanceRequests: requests.filter((r) => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress').length,
      activeMapVersion,
      graphValidation,
      recentAuditLogs,
    };
  }
}

