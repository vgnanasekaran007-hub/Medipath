import {
  calculateShortestPath,
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_APPOINTMENTS,
  SAMPLE_AUDIT_LOGS,
  SAMPLE_BUILDING,
  SAMPLE_DEPARTMENTS,
  SAMPLE_DESTINATIONS,
  SAMPLE_DOCTORS,
  SAMPLE_DOCTOR_SCHEDULES,
  SAMPLE_EDGES,
  SAMPLE_FLOORS,
  SAMPLE_HOSPITAL,
  SAMPLE_MAP_VERSION,
  SAMPLE_NODES,
  SAMPLE_QR_CHECKPOINTS,
  SAMPLE_QUEUE_TOKENS,
  SAMPLE_SERVICES,
  SAMPLE_SERVICE_REQUESTS,
  SAMPLE_USERS,
  validateNavigationGraph,
  type Announcement,
  type Appointment,
  type AppointmentStatus,
  type AuditLog,
  type Building,
  type Department,
  type Destination,
  type Doctor,
  type DoctorSchedule,
  type Floor,
  type GraphValidationResult,
  type Hospital,
  type HospitalGraphPayload,
  type HospitalServiceItem,
  type MapVersion,
  type NavigationEdge,
  type NavigationNode,
  type NavigationRouteResult,
  type QrCheckpoint,
  type QueueStatus,
  type QueueToken,
  type ServiceRequest,
  type ServiceRequestStatus,
  type UserProfile,
  type UserRole,
} from '@medipath/shared';
import { useAppStore } from '../stores/appStore';
import { ApiError } from './apiError';

/**
 * Clearly separated client-side fixture store for standalone frontend-only
 * execution (when VITE_FRONTEND_ONLY=true or when no backend API server is running).
 * Backed by @medipath/shared sample blueprints, Dijkstra wayfinding, and localStorage.
 */

const STORAGE_KEY = 'medipath-standalone-fixture-v1';
const DEMO_PASSWORD = 'MediPathDemo!2026';

interface StandaloneUserRecord extends UserProfile {
  password: string;
}

interface StandaloneFixtureState {
  hospital: Hospital;
  buildings: Building[];
  floors: Floor[];
  mapVersions: MapVersion[];
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  departments: Department[];
  destinations: Destination[];
  doctors: Doctor[];
  doctorSchedules: DoctorSchedule[];
  services: HospitalServiceItem[];
  qrCheckpoints: QrCheckpoint[];
  users: StandaloneUserRecord[];
  appointments: Appointment[];
  queueTokens: QueueToken[];
  serviceRequests: ServiceRequest[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
}

function genUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneData<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

function createInitialState(): StandaloneFixtureState {
  return {
    hospital: cloneData(SAMPLE_HOSPITAL),
    buildings: [cloneData(SAMPLE_BUILDING)],
    floors: cloneData(SAMPLE_FLOORS),
    mapVersions: [cloneData(SAMPLE_MAP_VERSION)],
    nodes: cloneData(SAMPLE_NODES),
    edges: cloneData(SAMPLE_EDGES),
    departments: cloneData(SAMPLE_DEPARTMENTS),
    destinations: cloneData(SAMPLE_DESTINATIONS),
    doctors: cloneData(SAMPLE_DOCTORS),
    doctorSchedules: cloneData(SAMPLE_DOCTOR_SCHEDULES),
    services: cloneData(SAMPLE_SERVICES),
    qrCheckpoints: cloneData(SAMPLE_QR_CHECKPOINTS),
    users: SAMPLE_USERS.map((u) => {
      const { passwordHashDemo: _, ...profile } = u;
      return { ...cloneData(profile), password: DEMO_PASSWORD };
    }),
    appointments: cloneData(SAMPLE_APPOINTMENTS),
    queueTokens: cloneData(SAMPLE_QUEUE_TOKENS),
    serviceRequests: cloneData(SAMPLE_SERVICE_REQUESTS),
    announcements: cloneData(SAMPLE_ANNOUNCEMENTS),
    auditLogs: cloneData(SAMPLE_AUDIT_LOGS),
  };
}

let memoryState: StandaloneFixtureState | null = null;

function loadState(): StandaloneFixtureState {
  if (memoryState) return memoryState;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memoryState = JSON.parse(raw) as StandaloneFixtureState;
        return memoryState;
      }
    }
  } catch {
    // Ignore storage read errors in constrained contexts
  }
  memoryState = createInitialState();
  saveState(memoryState);
  return memoryState;
}

function saveState(state: StandaloneFixtureState): void {
  memoryState = state;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore quota/private-mode storage errors
  }
}

export function resetStandaloneFixtureStore(): void {
  const fresh = createInitialState();
  saveState(fresh);
}

function stripPassword(record: StandaloneUserRecord): UserProfile {
  const { password: _, ...profile } = record;
  return cloneData(profile);
}

function getOptionalUser(state: StandaloneFixtureState): UserProfile | null {
  const token = useAppStore.getState().token;
  if (!token || !token.startsWith('standalone-token:')) return null;
  const userId = token.slice('standalone-token:'.length);
  const found = state.users.find((u) => u.id === userId);
  return found ? stripPassword(found) : null;
}

function requireSessionUser(state: StandaloneFixtureState, allowedRoles?: UserRole[]): UserProfile {
  const user = getOptionalUser(state);
  if (!user) {
    throw new ApiError(401, 'Authentication required. Please sign in to continue.');
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'Insufficient permissions for this action.');
  }
  return user;
}

function activeMapVersion(state: StandaloneFixtureState): MapVersion {
  return (
    state.mapVersions.find((v) => v.status === 'published') ??
    state.mapVersions[state.mapVersions.length - 1]
  );
}

function addAudit(
  state: StandaloneFixtureState,
  actor: { id?: string; email: string; role: UserRole | 'system' },
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
): void {
  state.auditLogs.unshift({
    id: genUuid(),
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    summary,
    createdAt: new Date().toISOString(),
  });
  if (state.auditLogs.length > 500) {
    state.auditLogs = state.auditLogs.slice(0, 500);
  }
}

function generateTimeSlots(start: string, end: string, durationMinutes: number): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots: string[] = [];
  for (let t = startTotal; t + durationMinutes <= endTotal; t += durationMinutes) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function maskPatientName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ');
}

function buildGraphPayload(state: StandaloneFixtureState, includeRestricted: boolean): HospitalGraphPayload {
  const version = activeMapVersion(state);
  const floors = [...state.floors].sort((a, b) => a.levelNumber - b.levelNumber);
  const nodes = state.nodes.filter((n) => n.mapVersionId === version.id);
  const edges = state.edges.filter(
    (e) => e.mapVersionId === version.id && (includeRestricted || !e.isRestricted),
  );
  return cloneData({
    hospital: state.hospital,
    building: state.buildings[0],
    activeMapVersion: version,
    floors,
    departments: state.departments,
    destinations: state.destinations,
    nodes,
    edges,
    qrCheckpoints: state.qrCheckpoints.filter((q) => q.isActive),
  });
}

function validateGraphState(state: StandaloneFixtureState): GraphValidationResult {
  const graph = buildGraphPayload(state, true);
  return validateNavigationGraph({
    floors: graph.floors,
    destinations: graph.destinations,
    nodes: graph.nodes,
    edges: graph.edges,
  });
}

const startedAt = Date.now();

export const standaloneFixtureApi = {
  getHealth: async () => {
    const state = loadState();
    const active = activeMapVersion(state);
    return {
      status: 'ok',
      persistenceMode: 'local' as const,
      mapVersion: active.versionNumber,
      mapVersionLabel: `${active.label} (Frontend Standalone)`,
      uptimeSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
    };
  },

  getHospitalOverview: async () => {
    const state = loadState();
    return cloneData({
      hospital: state.hospital,
      buildings: state.buildings,
      floors: [...state.floors].sort((a, b) => a.levelNumber - b.levelNumber),
      announcements: state.announcements.filter((a) => a.isActive),
    });
  },

  getDepartments: async () => {
    const state = loadState();
    return { departments: cloneData(state.departments) };
  },

  getDepartmentBySlug: async (slug: string) => {
    const state = loadState();
    const department = state.departments.find((d) => d.slug === slug);
    if (!department) {
      throw new ApiError(404, 'Department not found');
    }
    return cloneData({
      department,
      doctors: state.doctors.filter((d) => d.departmentId === department.id && d.isActive),
      destinations: state.destinations.filter((d) => d.departmentId === department.id),
      floor: state.floors.find((f) => f.id === department.floorId) ?? null,
    });
  },

  getDestinations: async (params?: { q?: string; floorId?: string }) => {
    const state = loadState();
    const q = String(params?.q ?? '').trim().toLowerCase();
    let destinations = state.destinations;
    if (params?.floorId) {
      destinations = destinations.filter((d) => d.floorId === params.floorId);
    }
    if (q) {
      destinations = destinations.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.nameTa.toLowerCase().includes(q) ||
          d.roomCode.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      );
    }
    return { destinations: cloneData(destinations) };
  },

  getDoctors: async (params?: { departmentId?: string; q?: string }) => {
    const state = loadState();
    const q = String(params?.q ?? '').trim().toLowerCase();
    let doctors = state.doctors.filter((d) => d.isActive);
    if (params?.departmentId) {
      doctors = doctors.filter((d) => d.departmentId === params.departmentId);
    }
    if (q) {
      doctors = doctors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.fullNameTa.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q),
      );
    }
    return {
      doctors: cloneData(doctors),
      schedules: cloneData(state.doctorSchedules),
    };
  },

  getDoctorBySlug: async (slug: string) => {
    const state = loadState();
    const doctor = state.doctors.find((d) => d.slug === slug);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }
    return cloneData({
      doctor,
      schedules: state.doctorSchedules.filter((s) => s.doctorId === doctor.id),
      department: state.departments.find((d) => d.id === doctor.departmentId) ?? null,
      destination: state.destinations.find((d) => d.id === doctor.destinationId) ?? null,
    });
  },

  getDoctorAvailableSlots: async (doctorId: string, date: string) => {
    const state = loadState();
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ApiError(400, 'Invalid date parameter');
    }
    const dayOfWeek = parsedDate.getUTCDay();
    const schedules = state.doctorSchedules.filter(
      (s) => s.doctorId === doctorId && s.dayOfWeek === dayOfWeek && s.isAvailable,
    );
    const bookedTimes = new Set(
      state.appointments
        .filter((a) => a.doctorId === doctorId && a.appointmentDate === date && a.status !== 'cancelled')
        .map((a) => a.slotTime),
    );
    const slots: { time: string; available: boolean; roomLabel: string }[] = [];
    for (const s of schedules) {
      for (const time of generateTimeSlots(s.startTime, s.endTime, s.slotDurationMinutes)) {
        slots.push({
          time,
          available: !bookedTimes.has(time),
          roomLabel: s.roomLabel,
        });
      }
    }
    return { date, dayOfWeek, slots };
  },

  getServices: async () => {
    const state = loadState();
    return { services: cloneData(state.services) };
  },

  getServiceBySlug: async (slug: string) => {
    const state = loadState();
    const service = state.services.find((s) => s.slug === slug);
    if (!service) {
      throw new ApiError(404, 'Service not found');
    }
    return cloneData({
      service,
      destination: state.destinations.find((d) => d.id === service.destinationId) ?? null,
    });
  },

  getNavigationGraph: async () => {
    const state = loadState();
    return buildGraphPayload(state, false);
  },

  calculateRoute: async (body: {
    startNodeId: string;
    endNodeId: string;
    accessibleOnly?: boolean;
  }): Promise<{ route: NavigationRouteResult }> => {
    const state = loadState();
    const graph = buildGraphPayload(state, false);
    const route = calculateShortestPath({
      nodes: graph.nodes,
      edges: graph.edges,
      floors: graph.floors,
      startNodeId: body.startNodeId,
      endNodeId: body.endNodeId,
      accessibleOnly: body.accessibleOnly,
    });
    return { route };
  },

  resolveQrCheckpoint: async (code: string) => {
    const state = loadState();
    const checkpoint = state.qrCheckpoints.find(
      (q) => q.code.toLowerCase() === code.toLowerCase() && q.isActive,
    );
    if (!checkpoint) {
      throw new ApiError(404, 'QR checkpoint code not found or inactive');
    }
    return { checkpoint: cloneData(checkpoint) };
  },

  login: async (body: { email: string; password: string }) => {
    const state = loadState();
    const record = state.users.find(
      (u) => u.email.toLowerCase() === body.email.trim().toLowerCase(),
    );
    if (!record || record.password !== body.password) {
      throw new ApiError(401, 'Invalid email or password.');
    }
    const user = stripPassword(record);
    return { user, token: `standalone-token:${user.id}` };
  },

  register: async (body: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    preferredLanguage?: 'en' | 'ta';
  }) => {
    const state = loadState();
    if (!body.email || !body.email.includes('@')) {
      throw new ApiError(400, 'Please enter a valid email address.');
    }
    if (!body.password || body.password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    if (!body.fullName || body.fullName.trim().length < 2) {
      throw new ApiError(400, 'Full name is required');
    }
    const exists = state.users.some(
      (u) => u.email.toLowerCase() === body.email.trim().toLowerCase(),
    );
    if (exists) {
      throw new ApiError(400, 'An account with this email already exists.');
    }
    const now = new Date().toISOString();
    const created: StandaloneUserRecord = {
      id: genUuid(),
      email: body.email.trim().toLowerCase(),
      fullName: body.fullName.trim(),
      phone: body.phone,
      role: 'patient',
      preferredLanguage: body.preferredLanguage ?? 'en',
      accessibilityRequired: false,
      createdAt: now,
      updatedAt: now,
      password: body.password,
    };
    state.users.push(created);
    addAudit(
      state,
      { id: created.id, email: created.email, role: 'patient' },
      'USER_REGISTERED',
      'profiles',
      created.id,
      `Registered patient ${created.email}.`,
    );
    saveState(state);
    const user = stripPassword(created);
    return { user, token: `standalone-token:${user.id}` };
  },

  forgotPassword: async (email: string) => {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'Please provide a valid email address.');
    }
    return {
      ok: true,
      message:
        'If an account exists for that email, password reset instructions have been prepared (frontend standalone demo mode).',
    };
  },

  me: async () => {
    const state = loadState();
    const user = requireSessionUser(state);
    return { user };
  },

  updateProfile: async (
    body: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'preferredLanguage' | 'accessibilityRequired'>>,
  ) => {
    const state = loadState();
    const sessionUser = requireSessionUser(state);
    const idx = state.users.findIndex((u) => u.id === sessionUser.id);
    if (idx < 0) throw new ApiError(404, 'Profile not found');
    state.users[idx] = {
      ...state.users[idx],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    saveState(state);
    return { user: stripPassword(state.users[idx]) };
  },

  bookAppointment: async (body: {
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    doctorId: string;
    appointmentDate: string;
    slotTime: string;
    reason: string;
    accessibilityNeeded?: boolean;
    notes?: string;
  }) => {
    const state = loadState();
    const sessionUser = getOptionalUser(state);
    const doctor = state.doctors.find((d) => d.id === body.doctorId && d.isActive);
    if (!doctor) {
      throw new ApiError(409, 'Selected doctor is unavailable or does not exist.');
    }
    const conflict = state.appointments.find(
      (a) =>
        a.doctorId === body.doctorId &&
        a.appointmentDate === body.appointmentDate &&
        a.slotTime === body.slotTime &&
        a.status !== 'cancelled',
    );
    if (conflict) {
      throw new ApiError(409, 'This time slot is already booked. Please choose another available slot.');
    }

    const now = new Date().toISOString();
    const refSuffix = Math.floor(100000 + Math.random() * 899999)
      .toString(16)
      .toUpperCase()
      .padStart(6, '0');
    const created: Appointment = {
      id: genUuid(),
      bookingReference: `MP-${new Date().getFullYear()}-${refSuffix}`,
      patientId: sessionUser?.id,
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      patientPhone: body.patientPhone,
      doctorId: doctor.id,
      departmentId: doctor.departmentId,
      destinationId: doctor.destinationId,
      appointmentDate: body.appointmentDate,
      slotTime: body.slotTime,
      reason: body.reason,
      status: 'confirmed',
      accessibilityNeeded: Boolean(body.accessibilityNeeded),
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    };

    state.appointments.unshift(created);
    addAudit(
      state,
      { id: sessionUser?.id, email: body.patientEmail, role: 'patient' },
      'APPOINTMENT_BOOKED',
      'appointments',
      created.id,
      `Booked ${created.bookingReference} with ${doctor.fullName} on ${created.appointmentDate} ${created.slotTime}.`,
    );
    saveState(state);
    return { appointment: cloneData(created) };
  },

  getMyAppointments: async () => {
    const state = loadState();
    const user = requireSessionUser(state);
    const isStaff = user.role === 'admin' || user.role === 'hospital_staff';
    const appointments = state.appointments
      .filter((a) => (isStaff ? true : a.patientId === user.id || a.patientEmail.toLowerCase() === user.email.toLowerCase()))
      .sort((a, b) => `${b.appointmentDate}T${b.slotTime}`.localeCompare(`${a.appointmentDate}T${a.slotTime}`));
    return { appointments: cloneData(appointments) };
  },

  getAppointmentById: async (id: string, email?: string) => {
    const state = loadState();
    const appt = state.appointments.find((a) => a.id === id || a.bookingReference === id);
    if (!appt) {
      throw new ApiError(404, 'Appointment not found');
    }
    const user = getOptionalUser(state);
    const isStaff = user?.role === 'admin' || user?.role === 'hospital_staff';
    const isOwner = Boolean(user && appt.patientId === user.id);
    const emailParam = String(email ?? '').trim().toLowerCase();
    const emailMatches = Boolean(emailParam && emailParam === appt.patientEmail.toLowerCase());
    if (!isStaff && !isOwner && !emailMatches) {
      throw new ApiError(403, 'Access denied to this appointment record.');
    }
    return { appointment: cloneData(appt) };
  },

  cancelAppointment: async (id: string) => {
    const state = loadState();
    const user = requireSessionUser(state);
    const idx = state.appointments.findIndex((a) => a.id === id);
    if (idx < 0) throw new ApiError(404, 'Appointment not found');
    const existing = state.appointments[idx];
    if (user.role === 'patient' && existing.patientId !== user.id) {
      throw new ApiError(403, 'Forbidden');
    }
    state.appointments[idx] = {
      ...existing,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
    addAudit(
      state,
      user,
      'APPOINTMENT_CANCELLED',
      'appointments',
      id,
      `Appointment ${existing.bookingReference} marked cancelled.`,
    );
    saveState(state);
    return { appointment: cloneData(state.appointments[idx]) };
  },

  getQueue: async (departmentId?: string) => {
    const state = loadState();
    const user = getOptionalUser(state);
    const isStaff = user?.role === 'admin' || user?.role === 'hospital_staff';
    const tokens = state.queueTokens
      .filter((t) => (!departmentId ? true : t.departmentId === departmentId))
      .map((t) => {
        if (isStaff || (user && t.patientId === user.id)) {
          return t;
        }
        return { ...t, patientName: maskPatientName(t.patientName) };
      });
    return { tokens: cloneData(tokens) };
  },

  issueQueueToken: async (body: {
    departmentId: string;
    appointmentId?: string;
    patientName: string;
    priority?: 'normal' | 'priority' | 'emergency';
  }) => {
    const state = loadState();
    const user = getOptionalUser(state);
    const dept = state.departments.find((d) => d.id === body.departmentId);
    if (!dept) throw new ApiError(400, 'Department not found');

    const deptTokens = state.queueTokens.filter((t) => t.departmentId === dept.id);
    const waitingCount = deptTokens.filter(
      (t) => t.status === 'waiting' || t.status === 'called',
    ).length;
    const prefix = dept.code[0] ?? 'Q';
    const created: QueueToken = {
      id: genUuid(),
      tokenNumber: `${prefix}-${101 + deptTokens.length}`,
      departmentId: dept.id,
      appointmentId: body.appointmentId,
      patientId: user?.id,
      patientName: body.patientName,
      counterLabel: dept.wing.split('·')[0].trim(),
      status: 'waiting',
      priority: body.priority ?? 'normal',
      estimatedWaitMinutes: Math.max(5, waitingCount * 10 + 5),
      issuedAt: new Date().toISOString(),
    };
    state.queueTokens.push(created);
    saveState(state);
    return { token: cloneData(created) };
  },

  getMyAssistanceRequests: async () => {
    const state = loadState();
    const user = requireSessionUser(state);
    const isStaff = user.role === 'admin' || user.role === 'hospital_staff';
    const requests = state.serviceRequests
      .filter((r) => (isStaff ? true : r.patientId === user.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { requests: cloneData(requests) };
  },

  submitAssistanceRequest: async (body: {
    requesterName: string;
    requesterPhone: string;
    requestType: ServiceRequest['requestType'];
    pickupNodeId?: string;
    pickupLabel: string;
    destinationId?: string;
    notes?: string;
  }) => {
    const state = loadState();
    const user = getOptionalUser(state);
    const now = new Date().toISOString();
    const created: ServiceRequest = {
      id: genUuid(),
      hospitalId: state.hospital.id,
      patientId: user?.id,
      requesterName: body.requesterName,
      requesterPhone: body.requesterPhone,
      requestType: body.requestType,
      pickupNodeId: body.pickupNodeId,
      pickupLabel: body.pickupLabel,
      destinationId: body.destinationId,
      notes: body.notes ?? '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    state.serviceRequests.unshift(created);
    addAudit(
      state,
      { id: user?.id, email: body.requesterName, role: 'patient' },
      'ASSISTANCE_REQUESTED',
      'service_requests',
      created.id,
      `Submitted ${created.requestType} request at ${created.pickupLabel}.`,
    );
    saveState(state);
    return { request: cloneData(created) };
  },

  admin: {
    getOverview: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      const today = new Date().toISOString().slice(0, 10);
      const activeAppointments = state.appointments.filter((a) => a.status !== 'cancelled');
      return cloneData({
        totalAppointments: activeAppointments.length,
        todayAppointments: activeAppointments.filter((a) => a.appointmentDate === today).length,
        registeredPatients: state.users.filter((u) => u.role === 'patient').length,
        activeDoctors: state.doctors.filter((d) => d.isActive).length,
        departmentCount: state.departments.length,
        queueStats: {
          waiting: state.queueTokens.filter((q) => q.status === 'waiting').length,
          called: state.queueTokens.filter((q) => q.status === 'called').length,
          inService: state.queueTokens.filter((q) => q.status === 'in_service').length,
          completedToday: state.queueTokens.filter((q) => q.status === 'completed').length,
        },
        pendingAssistanceRequests: state.serviceRequests.filter(
          (r) => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress',
        ).length,
        activeMapVersion: activeMapVersion(state),
        graphValidation: validateGraphState(state),
        recentAuditLogs: state.auditLogs.slice(0, 8),
      });
    },

    updateHospital: async (patch: Partial<Hospital>) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      state.hospital = { ...state.hospital, ...patch, id: state.hospital.id };
      addAudit(state, actor, 'HOSPITAL_SETTINGS_UPDATED', 'hospitals', state.hospital.id, 'Updated hospital campus settings.');
      saveState(state);
      return { hospital: cloneData(state.hospital) };
    },

    getBuildings: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { buildings: cloneData(state.buildings) };
    },

    upsertBuilding: async (body: Partial<Building> & { name: string; code: string }) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.buildings.findIndex((b) => b.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.buildings[idx], ...body };
        state.buildings[idx] = updated;
        addAudit(state, actor, 'BUILDING_UPDATED', 'buildings', updated.id, `Updated building ${updated.name} (${updated.code}).`);
        saveState(state);
        return { building: cloneData(updated) };
      }
      const created: Building = {
        id: body.id ?? genUuid(),
        hospitalId: state.hospital.id,
        name: body.name,
        nameTa: body.nameTa ?? body.name,
        code: body.code,
        description: body.description ?? '',
        descriptionTa: body.descriptionTa ?? '',
        totalFloors: body.totalFloors ?? state.floors.length,
        widthMeters: body.widthMeters ?? 48,
        depthMeters: body.depthMeters ?? 30,
        createdAt: new Date().toISOString(),
      };
      state.buildings.push(created);
      addAudit(state, actor, 'BUILDING_CREATED', 'buildings', created.id, `Created building ${created.name}.`);
      saveState(state);
      return { building: cloneData(created) };
    },

    getFloors: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return {
        floors: cloneData([...state.floors].sort((a, b) => a.levelNumber - b.levelNumber)),
      };
    },

    upsertFloor: async (body: Partial<Floor> & { code: string; name: string; levelNumber: number }) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.floors.findIndex((f) => f.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.floors[idx], ...body };
        state.floors[idx] = updated;
        addAudit(state, actor, 'FLOOR_UPDATED', 'floors', updated.id, `Updated floor ${updated.code} (${updated.name}).`);
        saveState(state);
        return { floor: cloneData(updated) };
      }
      const created: Floor = {
        id: body.id ?? genUuid(),
        buildingId: body.buildingId ?? state.buildings[0].id,
        levelNumber: body.levelNumber,
        code: body.code,
        name: body.name,
        nameTa: body.nameTa ?? body.name,
        subtitle: body.subtitle ?? '',
        subtitleTa: body.subtitleTa ?? '',
        elevationMeters: body.elevationMeters ?? body.levelNumber * 4.2,
        svgWidth: body.svgWidth ?? 1000,
        svgHeight: body.svgHeight ?? 640,
        svgPlan:
          body.svgPlan ??
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 640"><rect x="40" y="55" width="920" height="535" rx="6" fill="#FAF9F6" stroke="#102C35" stroke-width="3"/></svg>`,
        isPublished: body.isPublished ?? true,
      };
      state.floors.push(created);
      addAudit(state, actor, 'FLOOR_CREATED', 'floors', created.id, `Added floor ${created.code} (${created.name}).`);
      saveState(state);
      return { floor: cloneData(created) };
    },

    deleteFloor: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const existing = state.floors.find((f) => f.id === id);
      if (!existing) throw new ApiError(400, 'Floor not found');
      if (state.nodes.some((n) => n.floorId === id)) {
        throw new ApiError(400, 'Cannot delete a floor that still contains navigation nodes');
      }
      state.floors = state.floors.filter((f) => f.id !== id);
      addAudit(state, actor, 'FLOOR_DELETED', 'floors', id, `Removed floor ${existing.code}.`);
      saveState(state);
      return { ok: true };
    },

    upsertDepartment: async (body: Partial<Department> & { name: string; slug: string }) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.departments.findIndex((d) => d.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.departments[idx], ...body };
        state.departments[idx] = updated;
        addAudit(state, actor, 'DEPARTMENT_UPDATED', 'departments', updated.id, `Updated department ${updated.name}.`);
        saveState(state);
        return { department: cloneData(updated) };
      }
      const created: Department = {
        id: body.id ?? genUuid(),
        hospitalId: state.hospital.id,
        floorId: body.floorId ?? state.floors[0].id,
        slug: body.slug,
        code: body.code ?? body.slug.toUpperCase().slice(0, 8),
        name: body.name,
        nameTa: body.nameTa ?? body.name,
        wing: body.wing ?? 'Main Pavilion',
        wingTa: body.wingTa ?? 'முதன்மை பகுதி',
        summary: body.summary ?? '',
        summaryTa: body.summaryTa ?? '',
        description: body.description ?? '',
        descriptionTa: body.descriptionTa ?? '',
        clinicalLead: body.clinicalLead ?? 'On-Call Specialist',
        openHours: body.openHours ?? '08:00 – 20:00',
        openHoursTa: body.openHoursTa ?? '08:00 – 20:00',
        isEmergency: body.isEmergency ?? false,
        accentColor: body.accentColor ?? '#174C50',
        primaryDestinationId: body.primaryDestinationId,
        amenities: body.amenities ?? [],
      };
      state.departments.push(created);
      addAudit(state, actor, 'DEPARTMENT_CREATED', 'departments', created.id, `Created department ${created.name}.`);
      saveState(state);
      return { department: cloneData(created) };
    },

    deleteDepartment: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const existing = state.departments.find((d) => d.id === id);
      if (!existing) throw new ApiError(400, 'Department not found');
      state.departments = state.departments.filter((d) => d.id !== id);
      addAudit(state, actor, 'DEPARTMENT_DELETED', 'departments', id, `Deleted department ${existing.name}.`);
      saveState(state);
      return { ok: true };
    },

    upsertDestination: async (
      body: Partial<Destination> & { name: string; slug: string; floorId: string; nodeId: string },
    ) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.destinations.findIndex((d) => d.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.destinations[idx], ...body };
        state.destinations[idx] = updated;
        addAudit(state, actor, 'DESTINATION_UPDATED', 'destinations', updated.id, `Updated destination ${updated.name}.`);
        saveState(state);
        return { destination: cloneData(updated) };
      }
      const node = state.nodes.find((n) => n.id === body.nodeId);
      const created: Destination = {
        id: body.id ?? genUuid(),
        hospitalId: state.hospital.id,
        floorId: body.floorId,
        departmentId: body.departmentId,
        slug: body.slug,
        name: body.name,
        nameTa: body.nameTa ?? body.name,
        roomCode: body.roomCode ?? 'RM-NEW',
        category: body.category ?? 'clinical',
        description: body.description ?? '',
        descriptionTa: body.descriptionTa ?? '',
        nodeId: body.nodeId,
        zone: body.zone ?? {
          x: Math.max(60, Math.min(820, (node?.x ?? 450) - 60)),
          y: Math.max(80, Math.min(500, (node?.y ?? 300) - 45)),
          width: 120,
          height: 90,
          accentHex: '#174C50',
        },
        isAccessible: body.isAccessible ?? true,
        isEmergency: body.isEmergency ?? false,
        isSearchable: body.isSearchable ?? true,
      };
      state.destinations.push(created);
      addAudit(
        state,
        actor,
        'DESTINATION_CREATED',
        'destinations',
        created.id,
        `Added destination ${created.name} (${created.roomCode}).`,
      );
      saveState(state);
      return { destination: cloneData(created) };
    },

    deleteDestination: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const existing = state.destinations.find((d) => d.id === id);
      if (!existing) throw new ApiError(400, 'Destination not found');
      state.destinations = state.destinations.filter((d) => d.id !== id);
      addAudit(state, actor, 'DESTINATION_DELETED', 'destinations', id, `Removed destination ${existing.name}.`);
      saveState(state);
      return { ok: true };
    },

    upsertDoctor: async (
      body: Partial<Doctor> & { fullName: string; slug: string; departmentId: string; destinationId: string },
    ) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.doctors.findIndex((d) => d.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.doctors[idx], ...body };
        state.doctors[idx] = updated;
        addAudit(state, actor, 'DOCTOR_UPDATED', 'doctors', updated.id, `Updated doctor profile ${updated.fullName}.`);
        saveState(state);
        return { doctor: cloneData(updated) };
      }
      const initials = body.fullName
        .replace(/^Dr\.?\s+/i, '')
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? '')
        .join('');
      const created: Doctor = {
        id: body.id ?? genUuid(),
        hospitalId: state.hospital.id,
        departmentId: body.departmentId,
        destinationId: body.destinationId,
        slug: body.slug,
        fullName: body.fullName,
        fullNameTa: body.fullNameTa ?? body.fullName,
        title: body.title ?? 'Consultant Specialist',
        titleTa: body.titleTa ?? 'மருத்துவ ஆலோசகர்',
        specialty: body.specialty ?? 'Clinical Medicine',
        specialtyTa: body.specialtyTa ?? 'மருத்துவம்',
        qualifications: body.qualifications ?? 'MBBS, MD',
        languages: body.languages ?? ['English', 'Tamil'],
        experienceYears: body.experienceYears ?? 8,
        consultationFee: body.consultationFee ?? 750,
        bio: body.bio ?? '',
        bioTa: body.bioTa ?? '',
        portraitInitials: body.portraitInitials ?? (initials || 'MD'),
        isActive: body.isActive ?? true,
      };
      state.doctors.push(created);
      addAudit(state, actor, 'DOCTOR_CREATED', 'doctors', created.id, `Added doctor ${created.fullName}.`);
      saveState(state);
      return { doctor: cloneData(created) };
    },

    deleteDoctor: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const existing = state.doctors.find((d) => d.id === id);
      if (!existing) throw new ApiError(400, 'Doctor not found');
      state.doctors = state.doctors.filter((d) => d.id !== id);
      state.doctorSchedules = state.doctorSchedules.filter((s) => s.doctorId !== id);
      addAudit(state, actor, 'DOCTOR_DELETED', 'doctors', id, `Removed doctor ${existing.fullName}.`);
      saveState(state);
      return { ok: true };
    },

    getSchedules: async (doctorId?: string) => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      const schedules = doctorId
        ? state.doctorSchedules.filter((s) => s.doctorId === doctorId)
        : state.doctorSchedules;
      return { schedules: cloneData(schedules) };
    },

    upsertSchedule: async (
      body: Partial<DoctorSchedule> & { doctorId: string; dayOfWeek: number; startTime: string; endTime: string },
    ) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.doctorSchedules.findIndex((s) => s.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.doctorSchedules[idx], ...body };
        state.doctorSchedules[idx] = updated;
        addAudit(state, actor, 'SCHEDULE_UPDATED', 'doctor_schedules', updated.id, `Updated schedule for doctor ${updated.doctorId}.`);
        saveState(state);
        return { schedule: cloneData(updated) };
      }
      const created: DoctorSchedule = {
        id: body.id ?? genUuid(),
        doctorId: body.doctorId,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        slotDurationMinutes: body.slotDurationMinutes ?? 30,
        roomLabel: body.roomLabel ?? 'Consultation Suite',
        isAvailable: body.isAvailable ?? true,
      };
      state.doctorSchedules.push(created);
      addAudit(state, actor, 'SCHEDULE_CREATED', 'doctor_schedules', created.id, `Added schedule slot for doctor ${created.doctorId}.`);
      saveState(state);
      return { schedule: cloneData(created) };
    },

    deleteSchedule: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      state.doctorSchedules = state.doctorSchedules.filter((s) => s.id !== id);
      addAudit(state, actor, 'SCHEDULE_DELETED', 'doctor_schedules', id, `Removed schedule ${id}.`);
      saveState(state);
      return { ok: true };
    },

    getAppointments: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return {
        appointments: cloneData(
          [...state.appointments].sort((a, b) =>
            `${b.appointmentDate}T${b.slotTime}`.localeCompare(`${a.appointmentDate}T${a.slotTime}`),
          ),
        ),
      };
    },

    updateAppointmentStatus: async (id: string, status: AppointmentStatus) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin', 'hospital_staff']);
      const idx = state.appointments.findIndex((a) => a.id === id);
      if (idx < 0) throw new ApiError(400, 'Appointment not found');
      const existing = state.appointments[idx];
      state.appointments[idx] = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      };
      addAudit(
        state,
        actor,
        `APPOINTMENT_${status.toUpperCase()}`,
        'appointments',
        id,
        `Appointment ${existing.bookingReference} marked ${status}.`,
      );
      saveState(state);
      return { appointment: cloneData(state.appointments[idx]) };
    },

    getQueue: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { tokens: cloneData(state.queueTokens) };
    },

    updateQueueStatus: async (id: string, status: QueueStatus) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin', 'hospital_staff']);
      const idx = state.queueTokens.findIndex((t) => t.id === id);
      if (idx < 0) throw new ApiError(400, 'Queue token not found');
      const now = new Date().toISOString();
      const token = { ...state.queueTokens[idx], status };
      if (status === 'called' || status === 'in_service') {
        token.calledAt = now;
        token.estimatedWaitMinutes = 0;
      }
      if (status === 'completed' || status === 'skipped') {
        token.completedAt = now;
        token.estimatedWaitMinutes = 0;
      }
      state.queueTokens[idx] = token;
      addAudit(state, actor, 'QUEUE_TOKEN_UPDATED', 'queue_tokens', id, `Token ${token.tokenNumber} moved to ${status}.`);
      saveState(state);
      return { token: cloneData(token) };
    },

    getServiceRequests: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return {
        requests: cloneData([...state.serviceRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      };
    },

    updateServiceRequest: async (
      id: string,
      patch: { status?: ServiceRequestStatus; assignedStaffName?: string },
    ) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin', 'hospital_staff']);
      const idx = state.serviceRequests.findIndex((r) => r.id === id);
      if (idx < 0) throw new ApiError(400, 'Service request not found');
      state.serviceRequests[idx] = {
        ...state.serviceRequests[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      addAudit(
        state,
        actor,
        'ASSISTANCE_UPDATED',
        'service_requests',
        id,
        `Updated assistance request ${id} to ${state.serviceRequests[idx].status}.`,
      );
      saveState(state);
      return { request: cloneData(state.serviceRequests[idx]) };
    },

    getAnnouncements: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { announcements: cloneData(state.announcements) };
    },

    upsertAnnouncement: async (body: Partial<Announcement> & { title: string; body: string }) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin', 'hospital_staff']);
      const idx = body.id ? state.announcements.findIndex((a) => a.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.announcements[idx], ...body };
        state.announcements[idx] = updated;
        addAudit(state, actor, 'ANNOUNCEMENT_UPDATED', 'announcements', updated.id, `Updated announcement "${updated.title}".`);
        saveState(state);
        return { announcement: cloneData(updated) };
      }
      const created: Announcement = {
        id: body.id ?? genUuid(),
        hospitalId: state.hospital.id,
        title: body.title,
        titleTa: body.titleTa ?? body.title,
        body: body.body,
        bodyTa: body.bodyTa ?? body.body,
        severity: body.severity ?? 'info',
        isActive: body.isActive ?? true,
        publishedAt: new Date().toISOString(),
      };
      state.announcements.unshift(created);
      addAudit(state, actor, 'ANNOUNCEMENT_CREATED', 'announcements', created.id, `Published announcement "${created.title}".`);
      saveState(state);
      return { announcement: cloneData(created) };
    },

    deleteAnnouncement: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin', 'hospital_staff']);
      state.announcements = state.announcements.filter((a) => a.id !== id);
      addAudit(state, actor, 'ANNOUNCEMENT_DELETED', 'announcements', id, `Removed announcement ${id}.`);
      saveState(state);
      return { ok: true };
    },

    getMapGraph: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return buildGraphPayload(state, true);
    },

    getMapVersions: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return {
        versions: cloneData([...state.mapVersions].sort((a, b) => b.versionNumber - a.versionNumber)),
      };
    },

    upsertNode: async (body: Partial<NavigationNode> & { floorId: string; label: string; x: number; y: number }) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const version = activeMapVersion(state);
      const idx = body.id ? state.nodes.findIndex((n) => n.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.nodes[idx], ...body };
        state.nodes[idx] = updated;
        addAudit(state, actor, 'NODE_UPDATED', 'navigation_nodes', updated.id, `Updated navigation node ${updated.label} (${updated.code}).`);
        saveState(state);
        return { node: cloneData(updated) };
      }
      const floor = state.floors.find((f) => f.id === body.floorId);
      const created: NavigationNode = {
        id: body.id ?? genUuid(),
        floorId: body.floorId,
        mapVersionId: body.mapVersionId ?? version.id,
        code: body.code ?? `${floor?.code ?? 'LX'}-N${state.nodes.length + 1}`,
        label: body.label,
        labelTa: body.labelTa ?? body.label,
        type: body.type ?? 'corridor',
        x: body.x,
        y: body.y,
        isAccessible: body.isAccessible ?? true,
        isActive: body.isActive ?? true,
      };
      state.nodes.push(created);
      addAudit(state, actor, 'NODE_CREATED', 'navigation_nodes', created.id, `Added navigation node ${created.label}.`);
      saveState(state);
      return { node: cloneData(created) };
    },

    deleteNode: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const linkedDest = state.destinations.find((d) => d.nodeId === id);
      if (linkedDest) {
        throw new ApiError(400, `Cannot delete node while destination "${linkedDest.name}" points to it.`);
      }
      state.nodes = state.nodes.filter((n) => n.id !== id);
      state.edges = state.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id);
      addAudit(state, actor, 'NODE_DELETED', 'navigation_nodes', id, `Deleted navigation node ${id} and connected edges.`);
      saveState(state);
      return { ok: true };
    },

    upsertEdge: async (
      body: Partial<NavigationEdge> & { fromNodeId: string; toNodeId: string; distanceMeters: number },
    ) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      if (body.fromNodeId === body.toNodeId) {
        throw new ApiError(400, 'Cannot link a navigation node to itself.');
      }
      const version = activeMapVersion(state);
      const idx = body.id ? state.edges.findIndex((e) => e.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.edges[idx], ...body };
        state.edges[idx] = updated;
        addAudit(state, actor, 'EDGE_UPDATED', 'navigation_edges', updated.id, `Updated pathway ${updated.id}.`);
        saveState(state);
        return { edge: cloneData(updated) };
      }
      const created: NavigationEdge = {
        id: body.id ?? genUuid(),
        mapVersionId: body.mapVersionId ?? version.id,
        fromNodeId: body.fromNodeId,
        toNodeId: body.toNodeId,
        edgeType: body.edgeType ?? 'corridor',
        distanceMeters: Math.max(1, body.distanceMeters),
        isAccessible: body.isAccessible ?? body.edgeType !== 'staircase',
        isRestricted: body.isRestricted ?? false,
        bidirectional: body.bidirectional ?? true,
      };
      state.edges.push(created);
      addAudit(state, actor, 'EDGE_CREATED', 'navigation_edges', created.id, `Created ${created.edgeType} pathway (${created.distanceMeters} m).`);
      saveState(state);
      return { edge: cloneData(created) };
    },

    deleteEdge: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      state.edges = state.edges.filter((e) => e.id !== id);
      addAudit(state, actor, 'EDGE_DELETED', 'navigation_edges', id, `Removed pathway ${id}.`);
      saveState(state);
      return { ok: true };
    },

    validateMap: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { validation: cloneData(validateGraphState(state)) };
    },

    publishMap: async (body: { label?: string; notes?: string }) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const current = activeMapVersion(state);
      const validation = validateGraphState(state);
      if (!validation.valid) {
        throw new ApiError(
          400,
          `Cannot publish map with validation errors: ${validation.issues
            .filter((i) => i.severity === 'error')
            .map((i) => i.message)
            .join('; ')}`,
        );
      }
      const nextNum = Math.max(...state.mapVersions.map((m) => m.versionNumber)) + 1;
      const newVersionId = genUuid();
      for (const v of state.mapVersions) {
        if (v.status === 'published') v.status = 'archived';
      }
      const newVersion: MapVersion = {
        id: newVersionId,
        hospitalId: state.hospital.id,
        versionNumber: nextNum,
        label: body.label ?? `v${nextNum}.0 — Published Map Update`,
        status: 'published',
        publishedBy: actor.email,
        publishedAt: new Date().toISOString(),
        notes: body.notes ?? 'Validated and published from MEDIPATH 3D Admin Map Editor.',
        createdAt: new Date().toISOString(),
      };
      state.mapVersions.push(newVersion);
      for (const n of state.nodes) {
        if (n.mapVersionId === current.id) n.mapVersionId = newVersionId;
      }
      for (const e of state.edges) {
        if (e.mapVersionId === current.id) e.mapVersionId = newVersionId;
      }
      addAudit(
        state,
        actor,
        'MAP_VERSION_PUBLISHED',
        'map_versions',
        newVersion.id,
        `Published ${newVersion.label} (${validation.activeNodeCount} nodes, ${validation.edgeCount} edges).`,
      );
      saveState(state);
      return { version: cloneData(newVersion), validation: cloneData(validation) };
    },

    getQrCheckpoints: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { checkpoints: cloneData(state.qrCheckpoints) };
    },

    upsertQrCheckpoint: async (
      body: Partial<QrCheckpoint> & { floorId: string; nodeId: string; code: string; label: string },
    ) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = body.id ? state.qrCheckpoints.findIndex((q) => q.id === body.id) : -1;
      if (idx >= 0) {
        const updated = { ...state.qrCheckpoints[idx], ...body };
        state.qrCheckpoints[idx] = updated;
        addAudit(state, actor, 'QR_CHECKPOINT_UPDATED', 'qr_checkpoints', updated.id, `Updated QR checkpoint ${updated.code}.`);
        saveState(state);
        return { checkpoint: cloneData(updated) };
      }
      const created: QrCheckpoint = {
        id: body.id ?? genUuid(),
        hospitalId: state.hospital.id,
        floorId: body.floorId,
        nodeId: body.nodeId,
        code: body.code.toUpperCase(),
        label: body.label,
        labelTa: body.labelTa ?? body.label,
        locationHint: body.locationHint ?? '',
        locationHintTa: body.locationHintTa ?? '',
        isActive: body.isActive ?? true,
        createdAt: new Date().toISOString(),
      };
      state.qrCheckpoints.push(created);
      addAudit(state, actor, 'QR_CHECKPOINT_CREATED', 'qr_checkpoints', created.id, `Created QR checkpoint ${created.code}.`);
      saveState(state);
      return { checkpoint: cloneData(created) };
    },

    deleteQrCheckpoint: async (id: string) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      state.qrCheckpoints = state.qrCheckpoints.filter((q) => q.id !== id);
      addAudit(state, actor, 'QR_CHECKPOINT_DELETED', 'qr_checkpoints', id, `Deleted QR checkpoint ${id}.`);
      saveState(state);
      return { ok: true };
    },

    getUsers: async () => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { users: state.users.map(stripPassword) };
    },

    updateUserRole: async (id: string, role: UserRole) => {
      const state = loadState();
      const actor = requireSessionUser(state, ['admin']);
      const idx = state.users.findIndex((u) => u.id === id);
      if (idx < 0) throw new ApiError(400, 'User not found');
      state.users[idx] = {
        ...state.users[idx],
        role,
        updatedAt: new Date().toISOString(),
      };
      addAudit(state, actor, 'USER_ROLE_CHANGED', 'profiles', id, `Updated role for ${state.users[idx].email} to ${role}.`);
      saveState(state);
      return { user: stripPassword(state.users[idx]) };
    },

    getAuditLogs: async (limit = 100) => {
      const state = loadState();
      requireSessionUser(state, ['admin', 'hospital_staff']);
      return { logs: cloneData(state.auditLogs.slice(0, limit)) };
    },
  },
};

