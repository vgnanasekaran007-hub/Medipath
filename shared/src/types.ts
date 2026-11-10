export type LanguageCode = 'en' | 'ta';

export type UserRole = 'patient' | 'hospital_staff' | 'admin';

export type NodeType =
  | 'entrance'
  | 'corridor'
  | 'junction'
  | 'elevator'
  | 'staircase'
  | 'department_entrance'
  | 'room'
  | 'qr_checkpoint';

export type EdgeType = 'corridor' | 'elevator' | 'staircase' | 'ramp';

export type DestinationCategory =
  | 'entrance'
  | 'reception'
  | 'emergency'
  | 'clinical'
  | 'diagnostics'
  | 'pharmacy'
  | 'critical_care'
  | 'inpatient'
  | 'billing'
  | 'amenity'
  | 'restroom'
  | 'help_desk';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  accessibilityRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  nameTa: string;
  tagline: string;
  taglineTa: string;
  isSampleData: boolean;
  sampleDisclaimer: string;
  sampleDisclaimerTa: string;
  address: string;
  addressTa: string;
  city: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  latitude: number;
  longitude: number;
  visitingHours: string;
  visitingHoursTa: string;
  createdAt: string;
}

export interface Building {
  id: string;
  hospitalId: string;
  name: string;
  nameTa: string;
  code: string;
  description: string;
  descriptionTa: string;
  totalFloors: number;
  widthMeters: number;
  depthMeters: number;
  createdAt: string;
}

export interface RoomZoneGeometry {
  x: number; // 0..1000 SVG viewBox X
  y: number; // 0..640 SVG viewBox Y
  width: number;
  height: number;
  accentHex?: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  levelNumber: number; // 0, 1, 2, 3
  code: string; // L0, L1, L2, L3
  name: string;
  nameTa: string;
  subtitle: string;
  subtitleTa: string;
  elevationMeters: number;
  svgWidth: number;
  svgHeight: number;
  svgPlan: string;
  isPublished: boolean;
}

export interface Department {
  id: string;
  hospitalId: string;
  floorId: string;
  slug: string;
  code: string;
  name: string;
  nameTa: string;
  wing: string;
  wingTa: string;
  summary: string;
  summaryTa: string;
  description: string;
  descriptionTa: string;
  clinicalLead: string;
  openHours: string;
  openHoursTa: string;
  isEmergency: boolean;
  accentColor: string;
  primaryDestinationId?: string;
  amenities: string[];
}

export interface Destination {
  id: string;
  hospitalId: string;
  floorId: string;
  departmentId?: string;
  slug: string;
  name: string;
  nameTa: string;
  roomCode: string;
  category: DestinationCategory;
  description: string;
  descriptionTa: string;
  nodeId: string;
  zone: RoomZoneGeometry;
  isAccessible: boolean;
  isEmergency: boolean;
  isSearchable: boolean;
}

export interface NavigationNode {
  id: string;
  floorId: string;
  mapVersionId: string;
  code: string;
  label: string;
  labelTa: string;
  type: NodeType;
  x: number; // 0..1000 SVG space
  y: number; // 0..640 SVG space
  isAccessible: boolean;
  isActive: boolean;
}

export interface NavigationEdge {
  id: string;
  mapVersionId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: EdgeType;
  distanceMeters: number;
  isAccessible: boolean;
  isRestricted: boolean;
  bidirectional: boolean;
}

export interface QrCheckpoint {
  id: string;
  hospitalId: string;
  floorId: string;
  nodeId: string;
  code: string;
  label: string;
  labelTa: string;
  locationHint: string;
  locationHintTa: string;
  isActive: boolean;
  createdAt: string;
}

export interface Doctor {
  id: string;
  hospitalId: string;
  departmentId: string;
  destinationId: string;
  slug: string;
  fullName: string;
  fullNameTa: string;
  title: string;
  titleTa: string;
  specialty: string;
  specialtyTa: string;
  qualifications: string;
  languages: string[];
  experienceYears: number;
  consultationFee: number;
  bio: string;
  bioTa: string;
  isActive: boolean;
  portraitInitials: string;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  slotDurationMinutes: number;
  roomLabel: string;
  isAvailable: boolean;
}

export type AppointmentStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  bookingReference: string;
  patientId?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  departmentId: string;
  destinationId: string;
  appointmentDate: string; // YYYY-MM-DD
  slotTime: string; // HH:MM
  reason: string;
  status: AppointmentStatus;
  accessibilityNeeded: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type QueueStatus = 'waiting' | 'called' | 'in_service' | 'completed' | 'skipped';

export interface QueueToken {
  id: string;
  tokenNumber: string;
  departmentId: string;
  appointmentId?: string;
  patientId?: string;
  patientName: string;
  counterLabel: string;
  status: QueueStatus;
  priority: 'normal' | 'priority' | 'emergency';
  estimatedWaitMinutes: number;
  issuedAt: string;
  calledAt?: string;
  completedAt?: string;
}

export type ServiceCategory =
  | 'diagnostic'
  | 'pharmacy'
  | 'emergency'
  | 'support'
  | 'amenity'
  | 'billing';

export interface HospitalServiceItem {
  id: string;
  hospitalId: string;
  departmentId?: string;
  destinationId: string;
  slug: string;
  name: string;
  nameTa: string;
  category: ServiceCategory;
  summary: string;
  summaryTa: string;
  details: string;
  detailsTa: string;
  preparationNotes: string;
  preparationNotesTa: string;
  availability: string;
  availabilityTa: string;
  turnaroundEstimate: string;
}

export type AssistanceType =
  | 'wheelchair'
  | 'porter_escort'
  | 'language_interpreter'
  | 'emergency_guidance'
  | 'general_inquiry';

export type ServiceRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';

export interface ServiceRequest {
  id: string;
  hospitalId: string;
  patientId?: string;
  requesterName: string;
  requesterPhone: string;
  requestType: AssistanceType;
  pickupNodeId?: string;
  pickupLabel: string;
  destinationId?: string;
  notes: string;
  status: ServiceRequestStatus;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  hospitalId: string;
  title: string;
  titleTa: string;
  body: string;
  bodyTa: string;
  severity: 'info' | 'advisory' | 'emergency';
  isActive: boolean;
  publishedAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorEmail: string;
  actorRole: UserRole | 'system';
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface MapVersion {
  id: string;
  hospitalId: string;
  versionNumber: number;
  label: string;
  status: 'draft' | 'published' | 'archived';
  publishedBy?: string;
  publishedAt?: string;
  notes: string;
  createdAt: string;
}

export interface RouteStep {
  index: number;
  nodeId: string;
  floorId: string;
  floorCode: string;
  floorLevel: number;
  instruction: string;
  instructionTa: string;
  edgeType?: EdgeType;
  distanceMeters: number;
  isFloorTransition: boolean;
  fromFloorCode?: string;
  toFloorCode?: string;
}

export interface FloorTransitionSummary {
  fromFloorId: string;
  fromFloorCode: string;
  toFloorId: string;
  toFloorCode: string;
  via: 'elevator' | 'staircase' | 'ramp';
  nodeId: string;
  label: string;
  labelTa: string;
}

export interface NavigationRouteResult {
  found: boolean;
  errorCode?:
    | 'SAME_ORIGIN_DESTINATION'
    | 'MISSING_NODE'
    | 'NO_VALID_PATH'
    | 'NO_ACCESSIBLE_PATH';
  errorMessage?: string;
  errorMessageTa?: string;
  accessibleOnly: boolean;
  startNodeId: string;
  endNodeId: string;
  orderedNodeIds: string[];
  orderedNodes: NavigationNode[];
  traversedEdgeIds: string[];
  floorIdsInvolved: string[];
  totalDistanceMeters: number;
  estimatedDurationMinutes: number;
  floorTransitions: FloorTransitionSummary[];
  steps: RouteStep[];
}

export interface GraphValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  entityId?: string;
}

export interface GraphValidationResult {
  valid: boolean;
  nodeCount: number;
  edgeCount: number;
  activeNodeCount: number;
  destinationCount: number;
  unreachableDestinationIds: string[];
  inaccessibleDestinationIds: string[];
  orphanNodeIds: string[];
  disconnectedFloorIds: string[];
  issues: GraphValidationIssue[];
}

export interface HospitalGraphPayload {
  hospital: Hospital;
  building: Building;
  activeMapVersion: MapVersion;
  floors: Floor[];
  departments: Department[];
  destinations: Destination[];
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  qrCheckpoints: QrCheckpoint[];
}

