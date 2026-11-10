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
import { useAppStore } from '../stores/appStore';
import { ApiError } from './apiError';
import { standaloneFixtureApi } from './standaloneFixtureApi';

export { ApiError } from './apiError';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE = RAW_BASE.replace(/\/+$/, '');
const FORCE_FRONTEND_ONLY = import.meta.env.VITE_FRONTEND_ONLY === 'true';

let detectedBackendOffline = false;

export function isFrontendOnlyMode(): boolean {
  return FORCE_FRONTEND_ONLY || detectedBackendOffline;
}

export const hasSupabaseFrontendConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !String(import.meta.env.VITE_SUPABASE_URL).includes('your-project-ref'),
);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAppStore.getState().token;
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${normalizedPath}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Backend API unreachable', undefined, true);
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  let parsedJson = false;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        json = parsed as Record<string, unknown>;
        parsedJson = true;
      }
    } catch {
      json = { error: text };
    }
  }

  if (!res.ok) {
    const isProxyDown =
      !parsedJson && (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504);
    const errMsg =
      (typeof json.error === 'string' && json.error) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(res.status, errMsg, json.details, isProxyDown);
  }

  return json as T;
}

async function withFallback<T>(
  liveCall: () => Promise<T>,
  standaloneCall: () => Promise<T>,
): Promise<T> {
  if (FORCE_FRONTEND_ONLY || detectedBackendOffline) {
    return standaloneCall();
  }
  try {
    return await liveCall();
  } catch (err) {
    if (!hasSupabaseFrontendConfig && err instanceof ApiError && err.isTransportFailure) {
      detectedBackendOffline = true;
      return standaloneCall();
    }
    throw err;
  }
}

export const api = {
  // Health & Hospital
  getHealth: () =>
    withFallback(
      () =>
        request<{
          status: string;
          persistenceMode: 'local' | 'supabase';
          mapVersion: number;
          mapVersionLabel: string;
          uptimeSeconds: number;
        }>('/health'),
      () => standaloneFixtureApi.getHealth(),
    ),

  getHospitalOverview: () =>
    withFallback(
      () =>
        request<{
          hospital: Hospital;
          buildings: Building[];
          floors: Floor[];
          announcements: Announcement[];
        }>('/hospital'),
      () => standaloneFixtureApi.getHospitalOverview(),
    ),

  getDepartments: () =>
    withFallback(
      () => request<{ departments: Department[] }>('/departments'),
      () => standaloneFixtureApi.getDepartments(),
    ),

  getDepartmentBySlug: (slug: string) =>
    withFallback(
      () =>
        request<{
          department: Department;
          doctors: Doctor[];
          destinations: Destination[];
          floor: Floor | null;
        }>(`/departments/${encodeURIComponent(slug)}`),
      () => standaloneFixtureApi.getDepartmentBySlug(slug),
    ),

  getDestinations: (params?: { q?: string; floorId?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.floorId) search.set('floorId', params.floorId);
    const qs = search.toString();
    return withFallback(
      () => request<{ destinations: Destination[] }>(`/destinations${qs ? `?${qs}` : ''}`),
      () => standaloneFixtureApi.getDestinations(params),
    );
  },

  getDoctors: (params?: { departmentId?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.departmentId) search.set('departmentId', params.departmentId);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return withFallback(
      () => request<{ doctors: Doctor[]; schedules: DoctorSchedule[] }>(`/doctors${qs ? `?${qs}` : ''}`),
      () => standaloneFixtureApi.getDoctors(params),
    );
  },

  getDoctorBySlug: (slug: string) =>
    withFallback(
      () =>
        request<{
          doctor: Doctor;
          schedules: DoctorSchedule[];
          department: Department | null;
          destination: Destination | null;
        }>(`/doctors/${encodeURIComponent(slug)}`),
      () => standaloneFixtureApi.getDoctorBySlug(slug),
    ),

  getDoctorAvailableSlots: (doctorId: string, date: string) =>
    withFallback(
      () =>
        request<{
          date: string;
          dayOfWeek: number;
          slots: { time: string; available: boolean; roomLabel: string }[];
        }>(`/doctors/${encodeURIComponent(doctorId)}/available-slots?date=${encodeURIComponent(date)}`),
      () => standaloneFixtureApi.getDoctorAvailableSlots(doctorId, date),
    ),

  getServices: () =>
    withFallback(
      () => request<{ services: HospitalServiceItem[] }>('/services'),
      () => standaloneFixtureApi.getServices(),
    ),

  getServiceBySlug: (slug: string) =>
    withFallback(
      () =>
        request<{ service: HospitalServiceItem; destination: Destination | null }>(
          `/services/${encodeURIComponent(slug)}`,
        ),
      () => standaloneFixtureApi.getServiceBySlug(slug),
    ),

  getNavigationGraph: () =>
    withFallback(
      () => request<HospitalGraphPayload>('/navigation/graph'),
      () => standaloneFixtureApi.getNavigationGraph(),
    ),

  calculateRoute: (body: { startNodeId: string; endNodeId: string; accessibleOnly?: boolean }) =>
    withFallback(
      () =>
        request<{ route: NavigationRouteResult }>('/navigation/route', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.calculateRoute(body),
    ),

  resolveQrCheckpoint: (code: string) =>
    withFallback(
      () => request<{ checkpoint: QrCheckpoint }>(`/qr/${encodeURIComponent(code)}`),
      () => standaloneFixtureApi.resolveQrCheckpoint(code),
    ),

  // Auth
  login: (body: { email: string; password: string }) =>
    withFallback(
      () =>
        request<{ user: UserProfile; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.login(body),
    ),

  register: (body: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    preferredLanguage?: 'en' | 'ta';
  }) =>
    withFallback(
      () =>
        request<{ user: UserProfile; token: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.register(body),
    ),

  forgotPassword: (email: string) =>
    withFallback(
      () =>
        request<{ ok: boolean; message: string }>('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        }),
      () => standaloneFixtureApi.forgotPassword(email),
    ),

  me: () =>
    withFallback(
      () => request<{ user: UserProfile }>('/auth/me'),
      () => standaloneFixtureApi.me(),
    ),

  updateProfile: (
    body: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'preferredLanguage' | 'accessibilityRequired'>>,
  ) =>
    withFallback(
      () =>
        request<{ user: UserProfile }>('/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.updateProfile(body),
    ),

  // Appointments, Queue, Assistance
  bookAppointment: (body: {
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    doctorId: string;
    appointmentDate: string;
    slotTime: string;
    reason: string;
    accessibilityNeeded?: boolean;
    notes?: string;
  }) =>
    withFallback(
      () =>
        request<{ appointment: Appointment }>('/appointments', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.bookAppointment(body),
    ),

  getMyAppointments: () =>
    withFallback(
      () => request<{ appointments: Appointment[] }>('/appointments'),
      () => standaloneFixtureApi.getMyAppointments(),
    ),

  getAppointmentById: (id: string, email?: string) =>
    withFallback(
      () =>
        request<{ appointment: Appointment }>(
          `/appointments/${encodeURIComponent(id)}${email ? `?email=${encodeURIComponent(email)}` : ''}`,
        ),
      () => standaloneFixtureApi.getAppointmentById(id, email),
    ),

  cancelAppointment: (id: string) =>
    withFallback(
      () =>
        request<{ appointment: Appointment }>(`/appointments/${encodeURIComponent(id)}/cancel`, {
          method: 'PATCH',
        }),
      () => standaloneFixtureApi.cancelAppointment(id),
    ),

  getQueue: (departmentId?: string) =>
    withFallback(
      () =>
        request<{ tokens: QueueToken[] }>(
          `/queue${departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ''}`,
        ),
      () => standaloneFixtureApi.getQueue(departmentId),
    ),

  issueQueueToken: (body: {
    departmentId: string;
    appointmentId?: string;
    patientName: string;
    priority?: 'normal' | 'priority' | 'emergency';
  }) =>
    withFallback(
      () =>
        request<{ token: QueueToken }>('/queue/tokens', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.issueQueueToken(body),
    ),

  getMyAssistanceRequests: () =>
    withFallback(
      () => request<{ requests: ServiceRequest[] }>('/assistance'),
      () => standaloneFixtureApi.getMyAssistanceRequests(),
    ),

  submitAssistanceRequest: (body: {
    requesterName: string;
    requesterPhone: string;
    requestType: ServiceRequest['requestType'];
    pickupNodeId?: string;
    pickupLabel: string;
    destinationId?: string;
    notes?: string;
  }) =>
    withFallback(
      () =>
        request<{ request: ServiceRequest }>('/assistance', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      () => standaloneFixtureApi.submitAssistanceRequest(body),
    ),

  // Admin
  admin: {
    getOverview: () =>
      withFallback(
        () =>
          request<{
            totalAppointments: number;
            todayAppointments: number;
            registeredPatients: number;
            activeDoctors: number;
            departmentCount: number;
            queueStats: {
              waiting: number;
              called: number;
              inService: number;
              completedToday: number;
            };
            pendingAssistanceRequests: number;
            activeMapVersion: MapVersion;
            graphValidation: GraphValidationResult;
            recentAuditLogs: AuditLog[];
          }>('/admin/overview'),
        () => standaloneFixtureApi.admin.getOverview(),
      ),

    updateHospital: (patch: Partial<Hospital>) =>
      withFallback(
        () =>
          request<{ hospital: Hospital }>('/admin/hospital', {
            method: 'PUT',
            body: JSON.stringify(patch),
          }),
        () => standaloneFixtureApi.admin.updateHospital(patch),
      ),

    getBuildings: () =>
      withFallback(
        () => request<{ buildings: Building[] }>('/admin/buildings'),
        () => standaloneFixtureApi.admin.getBuildings(),
      ),

    upsertBuilding: (body: Partial<Building> & { name: string; code: string }) =>
      withFallback(
        () =>
          request<{ building: Building }>('/admin/buildings', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertBuilding(body),
      ),

    getFloors: () =>
      withFallback(
        () => request<{ floors: Floor[] }>('/admin/floors'),
        () => standaloneFixtureApi.admin.getFloors(),
      ),

    upsertFloor: (body: Partial<Floor> & { code: string; name: string; levelNumber: number }) =>
      withFallback(
        () =>
          request<{ floor: Floor }>('/admin/floors', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertFloor(body),
      ),

    deleteFloor: (id: string) =>
      withFallback(
        () => request<{ ok: boolean }>(`/admin/floors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        () => standaloneFixtureApi.admin.deleteFloor(id),
      ),

    upsertDepartment: (body: Partial<Department> & { name: string; slug: string }) =>
      withFallback(
        () =>
          request<{ department: Department }>('/admin/departments', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertDepartment(body),
      ),

    deleteDepartment: (id: string) =>
      withFallback(
        () =>
          request<{ ok: boolean }>(`/admin/departments/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          }),
        () => standaloneFixtureApi.admin.deleteDepartment(id),
      ),

    upsertDestination: (
      body: Partial<Destination> & { name: string; slug: string; floorId: string; nodeId: string },
    ) =>
      withFallback(
        () =>
          request<{ destination: Destination }>('/admin/destinations', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertDestination(body),
      ),

    deleteDestination: (id: string) =>
      withFallback(
        () =>
          request<{ ok: boolean }>(`/admin/destinations/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          }),
        () => standaloneFixtureApi.admin.deleteDestination(id),
      ),

    upsertDoctor: (
      body: Partial<Doctor> & { fullName: string; slug: string; departmentId: string; destinationId: string },
    ) =>
      withFallback(
        () =>
          request<{ doctor: Doctor }>('/admin/doctors', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertDoctor(body),
      ),

    deleteDoctor: (id: string) =>
      withFallback(
        () => request<{ ok: boolean }>(`/admin/doctors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        () => standaloneFixtureApi.admin.deleteDoctor(id),
      ),

    getSchedules: (doctorId?: string) =>
      withFallback(
        () =>
          request<{ schedules: DoctorSchedule[] }>(
            `/admin/schedules${doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : ''}`,
          ),
        () => standaloneFixtureApi.admin.getSchedules(doctorId),
      ),

    upsertSchedule: (
      body: Partial<DoctorSchedule> & { doctorId: string; dayOfWeek: number; startTime: string; endTime: string },
    ) =>
      withFallback(
        () =>
          request<{ schedule: DoctorSchedule }>('/admin/schedules', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertSchedule(body),
      ),

    deleteSchedule: (id: string) =>
      withFallback(
        () => request<{ ok: boolean }>(`/admin/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        () => standaloneFixtureApi.admin.deleteSchedule(id),
      ),

    getAppointments: () =>
      withFallback(
        () => request<{ appointments: Appointment[] }>('/admin/appointments'),
        () => standaloneFixtureApi.admin.getAppointments(),
      ),

    updateAppointmentStatus: (id: string, status: AppointmentStatus) =>
      withFallback(
        () =>
          request<{ appointment: Appointment }>(
            `/admin/appointments/${encodeURIComponent(id)}/status`,
            { method: 'PATCH', body: JSON.stringify({ status }) },
          ),
        () => standaloneFixtureApi.admin.updateAppointmentStatus(id, status),
      ),

    getQueue: () =>
      withFallback(
        () => request<{ tokens: QueueToken[] }>('/admin/queue'),
        () => standaloneFixtureApi.admin.getQueue(),
      ),

    updateQueueStatus: (id: string, status: QueueStatus) =>
      withFallback(
        () =>
          request<{ token: QueueToken }>(`/admin/queue/${encodeURIComponent(id)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          }),
        () => standaloneFixtureApi.admin.updateQueueStatus(id, status),
      ),

    getServiceRequests: () =>
      withFallback(
        () => request<{ requests: ServiceRequest[] }>('/admin/service-requests'),
        () => standaloneFixtureApi.admin.getServiceRequests(),
      ),

    updateServiceRequest: (
      id: string,
      patch: { status?: ServiceRequestStatus; assignedStaffName?: string },
    ) =>
      withFallback(
        () =>
          request<{ request: ServiceRequest }>(`/admin/service-requests/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          }),
        () => standaloneFixtureApi.admin.updateServiceRequest(id, patch),
      ),

    getAnnouncements: () =>
      withFallback(
        () => request<{ announcements: Announcement[] }>('/admin/announcements'),
        () => standaloneFixtureApi.admin.getAnnouncements(),
      ),

    upsertAnnouncement: (body: Partial<Announcement> & { title: string; body: string }) =>
      withFallback(
        () =>
          request<{ announcement: Announcement }>('/admin/announcements', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertAnnouncement(body),
      ),

    deleteAnnouncement: (id: string) =>
      withFallback(
        () =>
          request<{ ok: boolean }>(`/admin/announcements/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          }),
        () => standaloneFixtureApi.admin.deleteAnnouncement(id),
      ),

    getMapGraph: () =>
      withFallback(
        () => request<HospitalGraphPayload>('/admin/map/graph'),
        () => standaloneFixtureApi.admin.getMapGraph(),
      ),

    getMapVersions: () =>
      withFallback(
        () => request<{ versions: MapVersion[] }>('/admin/map/versions'),
        () => standaloneFixtureApi.admin.getMapVersions(),
      ),

    upsertNode: (
      body: Partial<NavigationNode> & { floorId: string; label: string; x: number; y: number },
    ) =>
      withFallback(
        () =>
          request<{ node: NavigationNode }>('/admin/map/nodes', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertNode(body),
      ),

    deleteNode: (id: string) =>
      withFallback(
        () => request<{ ok: boolean }>(`/admin/map/nodes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        () => standaloneFixtureApi.admin.deleteNode(id),
      ),

    upsertEdge: (
      body: Partial<NavigationEdge> & { fromNodeId: string; toNodeId: string; distanceMeters: number },
    ) =>
      withFallback(
        () =>
          request<{ edge: NavigationEdge }>('/admin/map/edges', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertEdge(body),
      ),

    deleteEdge: (id: string) =>
      withFallback(
        () => request<{ ok: boolean }>(`/admin/map/edges/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        () => standaloneFixtureApi.admin.deleteEdge(id),
      ),

    validateMap: () =>
      withFallback(
        () => request<{ validation: GraphValidationResult }>('/admin/map/validate', { method: 'POST' }),
        () => standaloneFixtureApi.admin.validateMap(),
      ),

    publishMap: (body: { label?: string; notes?: string }) =>
      withFallback(
        () =>
          request<{ version: MapVersion; validation: GraphValidationResult }>('/admin/map/publish', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.publishMap(body),
      ),

    getQrCheckpoints: () =>
      withFallback(
        () => request<{ checkpoints: QrCheckpoint[] }>('/admin/qr-checkpoints'),
        () => standaloneFixtureApi.admin.getQrCheckpoints(),
      ),

    upsertQrCheckpoint: (
      body: Partial<QrCheckpoint> & { floorId: string; nodeId: string; code: string; label: string },
    ) =>
      withFallback(
        () =>
          request<{ checkpoint: QrCheckpoint }>('/admin/qr-checkpoints', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        () => standaloneFixtureApi.admin.upsertQrCheckpoint(body),
      ),

    deleteQrCheckpoint: (id: string) =>
      withFallback(
        () =>
          request<{ ok: boolean }>(`/admin/qr-checkpoints/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          }),
        () => standaloneFixtureApi.admin.deleteQrCheckpoint(id),
      ),

    getUsers: () =>
      withFallback(
        () => request<{ users: UserProfile[] }>('/admin/users'),
        () => standaloneFixtureApi.admin.getUsers(),
      ),

    updateUserRole: (id: string, role: UserRole) =>
      withFallback(
        () =>
          request<{ user: UserProfile }>(`/admin/users/${encodeURIComponent(id)}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
          }),
        () => standaloneFixtureApi.admin.updateUserRole(id, role),
      ),

    getAuditLogs: (limit = 100) =>
      withFallback(
        () => request<{ logs: AuditLog[] }>(`/admin/audit-logs?limit=${limit}`),
        () => standaloneFixtureApi.admin.getAuditLogs(limit),
      ),
  },
};
