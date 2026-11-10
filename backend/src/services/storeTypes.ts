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

export interface AuthSessionUser extends UserProfile {}

export interface StoreUserRecord extends UserProfile {
  passwordHash: string;
}

export interface BookAppointmentInput {
  patientId?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  appointmentDate: string;
  slotTime: string;
  reason: string;
  accessibilityNeeded?: boolean;
  notes?: string;
}

export interface IssueQueueTokenInput {
  departmentId: string;
  appointmentId?: string;
  patientId?: string;
  patientName: string;
  priority?: 'normal' | 'priority' | 'emergency';
}

export interface CreateServiceRequestInput {
  patientId?: string;
  requesterName: string;
  requesterPhone: string;
  requestType: ServiceRequest['requestType'];
  pickupNodeId?: string;
  pickupLabel: string;
  destinationId?: string;
  notes?: string;
}

export interface AdminOverviewStats {
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
}

export interface MediPathStore {
  readonly mode: 'local' | 'supabase';
  init(): Promise<void>;

  // Public Catalog & Hospital
  getHospital(): Promise<Hospital>;
  updateHospital(patch: Partial<Hospital>, actor: AuthSessionUser): Promise<Hospital>;
  getBuildings(): Promise<Building[]>;
  upsertBuilding(input: Partial<Building> & { name: string; code: string }, actor: AuthSessionUser): Promise<Building>;
  getFloors(): Promise<Floor[]>;
  upsertFloor(input: Partial<Floor> & { code: string; name: string; levelNumber: number }, actor: AuthSessionUser): Promise<Floor>;
  deleteFloor(id: string, actor: AuthSessionUser): Promise<void>;

  getDepartments(): Promise<Department[]>;
  getDepartmentBySlug(slug: string): Promise<Department | null>;
  upsertDepartment(input: Partial<Department> & { name: string; slug: string }, actor: AuthSessionUser): Promise<Department>;
  deleteDepartment(id: string, actor: AuthSessionUser): Promise<void>;

  getDestinations(): Promise<Destination[]>;
  upsertDestination(input: Partial<Destination> & { name: string; slug: string; floorId: string; nodeId: string }, actor: AuthSessionUser): Promise<Destination>;
  deleteDestination(id: string, actor: AuthSessionUser): Promise<void>;

  getDoctors(): Promise<Doctor[]>;
  getDoctorBySlug(slug: string): Promise<Doctor | null>;
  upsertDoctor(input: Partial<Doctor> & { fullName: string; slug: string; departmentId: string; destinationId: string }, actor: AuthSessionUser): Promise<Doctor>;
  deleteDoctor(id: string, actor: AuthSessionUser): Promise<void>;

  getDoctorSchedules(doctorId?: string): Promise<DoctorSchedule[]>;
  upsertDoctorSchedule(input: Partial<DoctorSchedule> & { doctorId: string; dayOfWeek: number; startTime: string; endTime: string }, actor: AuthSessionUser): Promise<DoctorSchedule>;
  deleteDoctorSchedule(id: string, actor: AuthSessionUser): Promise<void>;

  getServices(): Promise<HospitalServiceItem[]>;
  getServiceBySlug(slug: string): Promise<HospitalServiceItem | null>;

  getAnnouncements(includeInactive?: boolean): Promise<Announcement[]>;
  upsertAnnouncement(input: Partial<Announcement> & { title: string; body: string }, actor: AuthSessionUser): Promise<Announcement>;
  deleteAnnouncement(id: string, actor: AuthSessionUser): Promise<void>;

  // Spatial Navigation & Map Editor
  getNavigationGraph(versionId?: string): Promise<HospitalGraphPayload>;
  calculateRoute(params: {
    startNodeId: string;
    endNodeId: string;
    accessibleOnly?: boolean;
    versionId?: string;
  }): Promise<NavigationRouteResult>;
  getQrCheckpoints(): Promise<QrCheckpoint[]>;
  getQrCheckpointByCode(code: string): Promise<QrCheckpoint | null>;
  upsertQrCheckpoint(input: Partial<QrCheckpoint> & { code: string; label: string; floorId: string; nodeId: string }, actor: AuthSessionUser): Promise<QrCheckpoint>;
  deleteQrCheckpoint(id: string, actor: AuthSessionUser): Promise<void>;

  getMapVersions(): Promise<MapVersion[]>;
  upsertNode(input: Partial<NavigationNode> & { floorId: string; label: string; x: number; y: number }, actor: AuthSessionUser): Promise<NavigationNode>;
  deleteNode(id: string, actor: AuthSessionUser): Promise<void>;
  upsertEdge(input: Partial<NavigationEdge> & { fromNodeId: string; toNodeId: string; distanceMeters: number }, actor: AuthSessionUser): Promise<NavigationEdge>;
  deleteEdge(id: string, actor: AuthSessionUser): Promise<void>;
  validateMap(versionId?: string): Promise<GraphValidationResult>;
  publishMapVersion(input: { label?: string; notes?: string }, actor: AuthSessionUser): Promise<{ version: MapVersion; validation: GraphValidationResult }>;

  // Auth & Profiles
  findUserByEmail(email: string): Promise<StoreUserRecord | null>;
  findUserById(id: string): Promise<UserProfile | null>;
  registerUser(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    preferredLanguage?: 'en' | 'ta';
  }): Promise<UserProfile>;
  verifyPassword(user: StoreUserRecord, password: string): boolean;
  updateProfile(userId: string, patch: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'preferredLanguage' | 'accessibilityRequired'>>): Promise<UserProfile>;
  listUsers(): Promise<UserProfile[]>;
  updateUserRole(userId: string, role: UserRole, actor: AuthSessionUser): Promise<UserProfile>;

  // Appointments
  listAppointments(filter?: { patientId?: string; doctorId?: string; date?: string }): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | null>;
  bookAppointment(input: BookAppointmentInput): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: AppointmentStatus, actor: AuthSessionUser): Promise<Appointment>;

  // Queue Tokens
  listQueueTokens(departmentId?: string): Promise<QueueToken[]>;
  issueQueueToken(input: IssueQueueTokenInput): Promise<QueueToken>;
  updateQueueTokenStatus(id: string, status: QueueStatus, actor: AuthSessionUser): Promise<QueueToken>;

  // Assistance / Service Requests
  listServiceRequests(patientId?: string): Promise<ServiceRequest[]>;
  createServiceRequest(input: CreateServiceRequestInput): Promise<ServiceRequest>;
  updateServiceRequest(
    id: string,
    patch: { status?: ServiceRequestStatus; assignedStaffName?: string },
    actor: AuthSessionUser,
  ): Promise<ServiceRequest>;

  // Audit & Overview
  listAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAdminOverview(): Promise<AdminOverviewStats>;
}

