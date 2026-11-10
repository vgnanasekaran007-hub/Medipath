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
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AdminOverviewStats,
  AuthSessionUser,
  BookAppointmentInput,
  CreateServiceRequestInput,
  IssueQueueTokenInput,
  MediPathStore,
  StoreUserRecord,
} from './storeTypes.js';

interface PersistedState {
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
  users: StoreUserRecord[];
  appointments: Appointment[];
  queueTokens: QueueToken[];
  serviceRequests: ServiceRequest[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScrypt(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

const DEFAULT_DEMO_PASSWORD = 'MediPathDemo!2026';

function buildInitialState(): PersistedState {
  const defaultHash = hashPassword(DEFAULT_DEMO_PASSWORD);
  return {
    hospital: structuredClone(SAMPLE_HOSPITAL),
    buildings: [structuredClone(SAMPLE_BUILDING)],
    floors: structuredClone(SAMPLE_FLOORS),
    mapVersions: [structuredClone(SAMPLE_MAP_VERSION)],
    nodes: structuredClone(SAMPLE_NODES),
    edges: structuredClone(SAMPLE_EDGES),
    departments: structuredClone(SAMPLE_DEPARTMENTS),
    destinations: structuredClone(SAMPLE_DESTINATIONS),
    doctors: structuredClone(SAMPLE_DOCTORS),
    doctorSchedules: structuredClone(SAMPLE_DOCTOR_SCHEDULES),
    services: structuredClone(SAMPLE_SERVICES),
    qrCheckpoints: structuredClone(SAMPLE_QR_CHECKPOINTS),
    users: SAMPLE_USERS.map((u) => ({ ...structuredClone(u), passwordHash: defaultHash })),
    appointments: structuredClone(SAMPLE_APPOINTMENTS),
    queueTokens: structuredClone(SAMPLE_QUEUE_TOKENS),
    serviceRequests: structuredClone(SAMPLE_SERVICE_REQUESTS),
    announcements: structuredClone(SAMPLE_ANNOUNCEMENTS),
    auditLogs: structuredClone(SAMPLE_AUDIT_LOGS),
  };
}

export class LocalPersistentStore implements MediPathStore {
  public readonly mode = 'local' as const;
  private readonly filePath: string;
  private state: PersistedState;

  constructor(customPath?: string) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    this.filePath = customPath ?? resolve(__dirname, '../../data/dev-store.json');
    this.state = buildInitialState();
  }

  async init(): Promise<void> {
    if (this.filePath === ':memory:') {
      this.state = buildInitialState();
      return;
    }
    mkdirSync(dirname(this.filePath), { recursive: true });
    if (existsSync(this.filePath)) {
      try {
        const raw = readFileSync(this.filePath, 'utf8');
        this.state = JSON.parse(raw) as PersistedState;
        return;
      } catch {
        this.state = buildInitialState();
      }
    }
    this.persist();
  }

  private persist(): void {
    if (this.filePath === ':memory:') return;
    writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  private addAudit(
    actor: Pick<AuthSessionUser, 'id' | 'email' | 'role'> | { id?: string; email: string; role: UserRole | 'system' },
    action: string,
    entityType: string,
    entityId: string,
    summary: string,
  ): void {
    this.state.auditLogs.unshift({
      id: crypto.randomUUID(),
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      summary,
      createdAt: new Date().toISOString(),
    });
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
  }

  private activeVersion(): MapVersion {
    return (
      this.state.mapVersions.find((v) => v.status === 'published') ??
      this.state.mapVersions[this.state.mapVersions.length - 1]
    );
  }

  async getHospital(): Promise<Hospital> {
    return this.state.hospital;
  }

  async updateHospital(patch: Partial<Hospital>, actor: AuthSessionUser): Promise<Hospital> {
    this.state.hospital = { ...this.state.hospital, ...patch, id: this.state.hospital.id };
    this.addAudit(actor, 'HOSPITAL_SETTINGS_UPDATED', 'hospitals', this.state.hospital.id, 'Updated hospital campus settings.');
    this.persist();
    return this.state.hospital;
  }

  async getBuildings(): Promise<Building[]> {
    return this.state.buildings;
  }

  async upsertBuilding(
    input: Partial<Building> & { name: string; code: string },
    actor: AuthSessionUser,
  ): Promise<Building> {
    const existingIdx = input.id ? this.state.buildings.findIndex((b) => b.id === input.id) : -1;
    if (existingIdx >= 0) {
      const updated = { ...this.state.buildings[existingIdx], ...input };
      this.state.buildings[existingIdx] = updated;
      this.addAudit(actor, 'BUILDING_UPDATED', 'buildings', updated.id, `Updated building ${updated.name} (${updated.code}).`);
      this.persist();
      return updated;
    }
    const created: Building = {
      id: input.id ?? crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      name: input.name,
      nameTa: input.nameTa ?? input.name,
      code: input.code,
      description: input.description ?? '',
      descriptionTa: input.descriptionTa ?? '',
      totalFloors: input.totalFloors ?? this.state.floors.length,
      widthMeters: input.widthMeters ?? 48,
      depthMeters: input.depthMeters ?? 30,
      createdAt: new Date().toISOString(),
    };
    this.state.buildings.push(created);
    this.addAudit(actor, 'BUILDING_CREATED', 'buildings', created.id, `Created building ${created.name}.`);
    this.persist();
    return created;
  }

  async getFloors(): Promise<Floor[]> {
    return [...this.state.floors].sort((a, b) => a.levelNumber - b.levelNumber);
  }

  async upsertFloor(
    input: Partial<Floor> & { code: string; name: string; levelNumber: number },
    actor: AuthSessionUser,
  ): Promise<Floor> {
    const idx = input.id ? this.state.floors.findIndex((f) => f.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.floors[idx], ...input };
      this.state.floors[idx] = updated;
      this.addAudit(actor, 'FLOOR_UPDATED', 'floors', updated.id, `Updated floor ${updated.code} (${updated.name}).`);
      this.persist();
      return updated;
    }
    const created: Floor = {
      id: input.id ?? crypto.randomUUID(),
      buildingId: input.buildingId ?? this.state.buildings[0].id,
      levelNumber: input.levelNumber,
      code: input.code,
      name: input.name,
      nameTa: input.nameTa ?? input.name,
      subtitle: input.subtitle ?? '',
      subtitleTa: input.subtitleTa ?? '',
      elevationMeters: input.elevationMeters ?? input.levelNumber * 4.2,
      svgWidth: input.svgWidth ?? 1000,
      svgHeight: input.svgHeight ?? 640,
      svgPlan:
        input.svgPlan ??
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 640"><rect x="40" y="55" width="920" height="535" rx="6" fill="#FAF9F6" stroke="#102C35" stroke-width="3"/></svg>`,
      isPublished: input.isPublished ?? true,
    };
    this.state.floors.push(created);
    this.addAudit(actor, 'FLOOR_CREATED', 'floors', created.id, `Added floor ${created.code} (${created.name}).`);
    this.persist();
    return created;
  }

  async deleteFloor(id: string, actor: AuthSessionUser): Promise<void> {
    const existing = this.state.floors.find((f) => f.id === id);
    if (!existing) throw new Error('Floor not found');
    const hasNodes = this.state.nodes.some((n) => n.floorId === id);
    if (hasNodes) throw new Error('Cannot delete a floor that still contains navigation nodes');
    this.state.floors = this.state.floors.filter((f) => f.id !== id);
    this.addAudit(actor, 'FLOOR_DELETED', 'floors', id, `Removed floor ${existing.code}.`);
    this.persist();
  }

  async getDepartments(): Promise<Department[]> {
    return this.state.departments;
  }

  async getDepartmentBySlug(slug: string): Promise<Department | null> {
    return this.state.departments.find((d) => d.slug === slug) ?? null;
  }

  async upsertDepartment(
    input: Partial<Department> & { name: string; slug: string },
    actor: AuthSessionUser,
  ): Promise<Department> {
    const idx = input.id ? this.state.departments.findIndex((d) => d.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.departments[idx], ...input };
      this.state.departments[idx] = updated;
      this.addAudit(actor, 'DEPARTMENT_UPDATED', 'departments', updated.id, `Updated department ${updated.name}.`);
      this.persist();
      return updated;
    }
    const created: Department = {
      id: input.id ?? crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      floorId: input.floorId ?? this.state.floors[0].id,
      slug: input.slug,
      code: input.code ?? input.slug.toUpperCase().slice(0, 8),
      name: input.name,
      nameTa: input.nameTa ?? input.name,
      wing: input.wing ?? 'Main Pavilion',
      wingTa: input.wingTa ?? 'முதன்மை பகுதி',
      summary: input.summary ?? '',
      summaryTa: input.summaryTa ?? '',
      description: input.description ?? '',
      descriptionTa: input.descriptionTa ?? '',
      clinicalLead: input.clinicalLead ?? 'On-Call Specialist',
      openHours: input.openHours ?? '08:00 – 20:00',
      openHoursTa: input.openHoursTa ?? '08:00 – 20:00',
      isEmergency: input.isEmergency ?? false,
      accentColor: input.accentColor ?? '#174C50',
      primaryDestinationId: input.primaryDestinationId,
      amenities: input.amenities ?? [],
    };
    this.state.departments.push(created);
    this.addAudit(actor, 'DEPARTMENT_CREATED', 'departments', created.id, `Created department ${created.name}.`);
    this.persist();
    return created;
  }

  async deleteDepartment(id: string, actor: AuthSessionUser): Promise<void> {
    const existing = this.state.departments.find((d) => d.id === id);
    if (!existing) throw new Error('Department not found');
    this.state.departments = this.state.departments.filter((d) => d.id !== id);
    this.addAudit(actor, 'DEPARTMENT_DELETED', 'departments', id, `Deleted department ${existing.name}.`);
    this.persist();
  }

  async getDestinations(): Promise<Destination[]> {
    return this.state.destinations;
  }

  async upsertDestination(
    input: Partial<Destination> & { name: string; slug: string; floorId: string; nodeId: string },
    actor: AuthSessionUser,
  ): Promise<Destination> {
    const idx = input.id ? this.state.destinations.findIndex((d) => d.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.destinations[idx], ...input };
      this.state.destinations[idx] = updated;
      this.addAudit(actor, 'DESTINATION_UPDATED', 'destinations', updated.id, `Updated destination ${updated.name}.`);
      this.persist();
      return updated;
    }
    const node = this.state.nodes.find((n) => n.id === input.nodeId);
    const created: Destination = {
      id: input.id ?? crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      floorId: input.floorId,
      departmentId: input.departmentId,
      slug: input.slug,
      name: input.name,
      nameTa: input.nameTa ?? input.name,
      roomCode: input.roomCode ?? 'RM-NEW',
      category: input.category ?? 'clinical',
      description: input.description ?? '',
      descriptionTa: input.descriptionTa ?? '',
      nodeId: input.nodeId,
      zone: input.zone ?? {
        x: Math.max(60, Math.min(820, (node?.x ?? 450) - 60)),
        y: Math.max(80, Math.min(500, (node?.y ?? 300) - 45)),
        width: 120,
        height: 90,
        accentHex: '#174C50',
      },
      isAccessible: input.isAccessible ?? true,
      isEmergency: input.isEmergency ?? false,
      isSearchable: input.isSearchable ?? true,
    };
    this.state.destinations.push(created);
    this.addAudit(actor, 'DESTINATION_CREATED', 'destinations', created.id, `Added destination ${created.name} (${created.roomCode}).`);
    this.persist();
    return created;
  }

  async deleteDestination(id: string, actor: AuthSessionUser): Promise<void> {
    const existing = this.state.destinations.find((d) => d.id === id);
    if (!existing) throw new Error('Destination not found');
    this.state.destinations = this.state.destinations.filter((d) => d.id !== id);
    this.addAudit(actor, 'DESTINATION_DELETED', 'destinations', id, `Removed destination ${existing.name}.`);
    this.persist();
  }

  async getDoctors(): Promise<Doctor[]> {
    return this.state.doctors;
  }

  async getDoctorBySlug(slug: string): Promise<Doctor | null> {
    return this.state.doctors.find((d) => d.slug === slug) ?? null;
  }

  async upsertDoctor(
    input: Partial<Doctor> & { fullName: string; slug: string; departmentId: string; destinationId: string },
    actor: AuthSessionUser,
  ): Promise<Doctor> {
    const idx = input.id ? this.state.doctors.findIndex((d) => d.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.doctors[idx], ...input };
      this.state.doctors[idx] = updated;
      this.addAudit(actor, 'DOCTOR_UPDATED', 'doctors', updated.id, `Updated doctor profile ${updated.fullName}.`);
      this.persist();
      return updated;
    }
    const initials = input.fullName
      .replace(/^Dr\.?\s+/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('');
    const created: Doctor = {
      id: input.id ?? crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      departmentId: input.departmentId,
      destinationId: input.destinationId,
      slug: input.slug,
      fullName: input.fullName,
      fullNameTa: input.fullNameTa ?? input.fullName,
      title: input.title ?? 'Consultant Specialist',
      titleTa: input.titleTa ?? 'மருத்துவ ஆலோசகர்',
      specialty: input.specialty ?? 'Clinical Medicine',
      specialtyTa: input.specialtyTa ?? 'மருத்துவம்',
      qualifications: input.qualifications ?? 'MBBS, MD',
      languages: input.languages ?? ['English', 'Tamil'],
      experienceYears: input.experienceYears ?? 8,
      consultationFee: input.consultationFee ?? 750,
      bio: input.bio ?? '',
      bioTa: input.bioTa ?? '',
      portraitInitials: input.portraitInitials ?? (initials || 'MD'),
      isActive: input.isActive ?? true,
    };
    this.state.doctors.push(created);
    this.addAudit(actor, 'DOCTOR_CREATED', 'doctors', created.id, `Added doctor ${created.fullName}.`);
    this.persist();
    return created;
  }

  async deleteDoctor(id: string, actor: AuthSessionUser): Promise<void> {
    const existing = this.state.doctors.find((d) => d.id === id);
    if (!existing) throw new Error('Doctor not found');
    this.state.doctors = this.state.doctors.filter((d) => d.id !== id);
    this.state.doctorSchedules = this.state.doctorSchedules.filter((s) => s.doctorId !== id);
    this.addAudit(actor, 'DOCTOR_DELETED', 'doctors', id, `Removed doctor ${existing.fullName}.`);
    this.persist();
  }

  async getDoctorSchedules(doctorId?: string): Promise<DoctorSchedule[]> {
    return doctorId
      ? this.state.doctorSchedules.filter((s) => s.doctorId === doctorId)
      : this.state.doctorSchedules;
  }

  async upsertDoctorSchedule(
    input: Partial<DoctorSchedule> & { doctorId: string; dayOfWeek: number; startTime: string; endTime: string },
    actor: AuthSessionUser,
  ): Promise<DoctorSchedule> {
    const idx = input.id ? this.state.doctorSchedules.findIndex((s) => s.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.doctorSchedules[idx], ...input };
      this.state.doctorSchedules[idx] = updated;
      this.addAudit(actor, 'SCHEDULE_UPDATED', 'doctor_schedules', updated.id, `Updated schedule for doctor ${updated.doctorId}.`);
      this.persist();
      return updated;
    }
    const created: DoctorSchedule = {
      id: input.id ?? crypto.randomUUID(),
      doctorId: input.doctorId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      slotDurationMinutes: input.slotDurationMinutes ?? 30,
      roomLabel: input.roomLabel ?? 'Consultation Suite',
      isAvailable: input.isAvailable ?? true,
    };
    this.state.doctorSchedules.push(created);
    this.addAudit(actor, 'SCHEDULE_CREATED', 'doctor_schedules', created.id, `Added schedule slot for doctor ${created.doctorId}.`);
    this.persist();
    return created;
  }

  async deleteDoctorSchedule(id: string, actor: AuthSessionUser): Promise<void> {
    this.state.doctorSchedules = this.state.doctorSchedules.filter((s) => s.id !== id);
    this.addAudit(actor, 'SCHEDULE_DELETED', 'doctor_schedules', id, `Removed schedule ${id}.`);
    this.persist();
  }

  async getServices(): Promise<HospitalServiceItem[]> {
    return this.state.services;
  }

  async getServiceBySlug(slug: string): Promise<HospitalServiceItem | null> {
    return this.state.services.find((s) => s.slug === slug) ?? null;
  }

  async getAnnouncements(includeInactive = false): Promise<Announcement[]> {
    return includeInactive
      ? this.state.announcements
      : this.state.announcements.filter((a) => a.isActive);
  }

  async upsertAnnouncement(
    input: Partial<Announcement> & { title: string; body: string },
    actor: AuthSessionUser,
  ): Promise<Announcement> {
    const idx = input.id ? this.state.announcements.findIndex((a) => a.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.announcements[idx], ...input };
      this.state.announcements[idx] = updated;
      this.addAudit(actor, 'ANNOUNCEMENT_UPDATED', 'announcements', updated.id, `Updated announcement "${updated.title}".`);
      this.persist();
      return updated;
    }
    const created: Announcement = {
      id: input.id ?? crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      title: input.title,
      titleTa: input.titleTa ?? input.title,
      body: input.body,
      bodyTa: input.bodyTa ?? input.body,
      severity: input.severity ?? 'info',
      isActive: input.isActive ?? true,
      publishedAt: new Date().toISOString(),
    };
    this.state.announcements.unshift(created);
    this.addAudit(actor, 'ANNOUNCEMENT_CREATED', 'announcements', created.id, `Published announcement "${created.title}".`);
    this.persist();
    return created;
  }

  async deleteAnnouncement(id: string, actor: AuthSessionUser): Promise<void> {
    this.state.announcements = this.state.announcements.filter((a) => a.id !== id);
    this.addAudit(actor, 'ANNOUNCEMENT_DELETED', 'announcements', id, `Removed announcement ${id}.`);
    this.persist();
  }

  async getNavigationGraph(versionId?: string): Promise<HospitalGraphPayload> {
    const activeMapVersion =
      (versionId ? this.state.mapVersions.find((v) => v.id === versionId) : undefined) ??
      this.activeVersion();

    const nodes = this.state.nodes.filter((n) => n.mapVersionId === activeMapVersion.id);
    const edges = this.state.edges.filter((e) => e.mapVersionId === activeMapVersion.id);

    return {
      hospital: this.state.hospital,
      building: this.state.buildings[0],
      activeMapVersion,
      floors: await this.getFloors(),
      departments: this.state.departments,
      destinations: this.state.destinations,
      nodes,
      edges,
      qrCheckpoints: this.state.qrCheckpoints.filter((q) => q.isActive),
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
    return this.state.qrCheckpoints;
  }

  async getQrCheckpointByCode(code: string): Promise<QrCheckpoint | null> {
    return (
      this.state.qrCheckpoints.find((q) => q.code.toLowerCase() === code.toLowerCase() && q.isActive) ??
      null
    );
  }

  async upsertQrCheckpoint(
    input: Partial<QrCheckpoint> & { code: string; label: string; floorId: string; nodeId: string },
    actor: AuthSessionUser,
  ): Promise<QrCheckpoint> {
    const idx = input.id ? this.state.qrCheckpoints.findIndex((q) => q.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.qrCheckpoints[idx], ...input };
      this.state.qrCheckpoints[idx] = updated;
      this.addAudit(actor, 'QR_CHECKPOINT_UPDATED', 'qr_checkpoints', updated.id, `Updated QR checkpoint ${updated.code}.`);
      this.persist();
      return updated;
    }
    const created: QrCheckpoint = {
      id: input.id ?? crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      floorId: input.floorId,
      nodeId: input.nodeId,
      code: input.code.toUpperCase(),
      label: input.label,
      labelTa: input.labelTa ?? input.label,
      locationHint: input.locationHint ?? '',
      locationHintTa: input.locationHintTa ?? '',
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString(),
    };
    this.state.qrCheckpoints.push(created);
    this.addAudit(actor, 'QR_CHECKPOINT_CREATED', 'qr_checkpoints', created.id, `Created QR checkpoint ${created.code}.`);
    this.persist();
    return created;
  }

  async deleteQrCheckpoint(id: string, actor: AuthSessionUser): Promise<void> {
    this.state.qrCheckpoints = this.state.qrCheckpoints.filter((q) => q.id !== id);
    this.addAudit(actor, 'QR_CHECKPOINT_DELETED', 'qr_checkpoints', id, `Deleted QR checkpoint ${id}.`);
    this.persist();
  }

  async getMapVersions(): Promise<MapVersion[]> {
    return [...this.state.mapVersions].sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async upsertNode(
    input: Partial<NavigationNode> & { floorId: string; label: string; x: number; y: number },
    actor: AuthSessionUser,
  ): Promise<NavigationNode> {
    const version = this.activeVersion();
    const idx = input.id ? this.state.nodes.findIndex((n) => n.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.nodes[idx], ...input };
      this.state.nodes[idx] = updated;
      this.addAudit(actor, 'NODE_UPDATED', 'navigation_nodes', updated.id, `Updated navigation node ${updated.label} (${updated.code}).`);
      this.persist();
      return updated;
    }
    const floor = this.state.floors.find((f) => f.id === input.floorId);
    const created: NavigationNode = {
      id: input.id ?? crypto.randomUUID(),
      floorId: input.floorId,
      mapVersionId: input.mapVersionId ?? version.id,
      code: input.code ?? `${floor?.code ?? 'LX'}-N${this.state.nodes.length + 1}`,
      label: input.label,
      labelTa: input.labelTa ?? input.label,
      type: input.type ?? 'corridor',
      x: input.x,
      y: input.y,
      isAccessible: input.isAccessible ?? true,
      isActive: input.isActive ?? true,
    };
    this.state.nodes.push(created);
    this.addAudit(actor, 'NODE_CREATED', 'navigation_nodes', created.id, `Added navigation node ${created.label}.`);
    this.persist();
    return created;
  }

  async deleteNode(id: string, actor: AuthSessionUser): Promise<void> {
    const linkedDest = this.state.destinations.find((d) => d.nodeId === id);
    if (linkedDest) {
      throw new Error(`Cannot delete node while destination "${linkedDest.name}" points to it.`);
    }
    this.state.nodes = this.state.nodes.filter((n) => n.id !== id);
    this.state.edges = this.state.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id);
    this.addAudit(actor, 'NODE_DELETED', 'navigation_nodes', id, `Deleted navigation node ${id} and connected edges.`);
    this.persist();
  }

  async upsertEdge(
    input: Partial<NavigationEdge> & { fromNodeId: string; toNodeId: string; distanceMeters: number },
    actor: AuthSessionUser,
  ): Promise<NavigationEdge> {
    if (input.fromNodeId === input.toNodeId) {
      throw new Error('Cannot link a navigation node to itself.');
    }
    const version = this.activeVersion();
    const idx = input.id ? this.state.edges.findIndex((e) => e.id === input.id) : -1;
    if (idx >= 0) {
      const updated = { ...this.state.edges[idx], ...input };
      this.state.edges[idx] = updated;
      this.addAudit(actor, 'EDGE_UPDATED', 'navigation_edges', updated.id, `Updated pathway ${updated.id}.`);
      this.persist();
      return updated;
    }
    const created: NavigationEdge = {
      id: input.id ?? crypto.randomUUID(),
      mapVersionId: input.mapVersionId ?? version.id,
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      edgeType: input.edgeType ?? 'corridor',
      distanceMeters: Math.max(1, input.distanceMeters),
      isAccessible: input.isAccessible ?? input.edgeType !== 'staircase',
      isRestricted: input.isRestricted ?? false,
      bidirectional: input.bidirectional ?? true,
    };
    this.state.edges.push(created);
    this.addAudit(actor, 'EDGE_CREATED', 'navigation_edges', created.id, `Created ${created.edgeType} pathway (${created.distanceMeters} m).`);
    this.persist();
    return created;
  }

  async deleteEdge(id: string, actor: AuthSessionUser): Promise<void> {
    this.state.edges = this.state.edges.filter((e) => e.id !== id);
    this.addAudit(actor, 'EDGE_DELETED', 'navigation_edges', id, `Removed pathway ${id}.`);
    this.persist();
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

  async publishMapVersion(
    input: { label?: string; notes?: string },
    actor: AuthSessionUser,
  ): Promise<{ version: MapVersion; validation: GraphValidationResult }> {
    const current = this.activeVersion();
    const validation = await this.validateMap(current.id);
    if (!validation.valid) {
      throw new Error(
        `Cannot publish map with validation errors: ${validation.issues
          .filter((i) => i.severity === 'error')
          .map((i) => i.message)
          .join('; ')}`,
      );
    }

    const nextNum = Math.max(...this.state.mapVersions.map((m) => m.versionNumber)) + 1;
    const newVersionId = crypto.randomUUID();

    for (const v of this.state.mapVersions) {
      if (v.status === 'published') v.status = 'archived';
    }

    const newVersion: MapVersion = {
      id: newVersionId,
      hospitalId: this.state.hospital.id,
      versionNumber: nextNum,
      label: input.label ?? `v${nextNum}.0 — Published Map Update`,
      status: 'published',
      publishedBy: actor.email,
      publishedAt: new Date().toISOString(),
      notes: input.notes ?? 'Validated and published from MEDIPATH 3D Admin Map Editor.',
      createdAt: new Date().toISOString(),
    };
    this.state.mapVersions.push(newVersion);

    // Remap active nodes & edges to the new published version ID so version history stays consistent
    const currentNodes = this.state.nodes.filter((n) => n.mapVersionId === current.id);
    const currentEdges = this.state.edges.filter((e) => e.mapVersionId === current.id);
    for (const n of currentNodes) n.mapVersionId = newVersionId;
    for (const e of currentEdges) e.mapVersionId = newVersionId;

    this.addAudit(
      actor,
      'MAP_VERSION_PUBLISHED',
      'map_versions',
      newVersion.id,
      `Published ${newVersion.label} (${validation.activeNodeCount} nodes, ${validation.edgeCount} edges).`,
    );
    this.persist();

    return { version: newVersion, validation };
  }

  async findUserByEmail(email: string): Promise<StoreUserRecord | null> {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async findUserById(id: string): Promise<UserProfile | null> {
    const u = this.state.users.find((x) => x.id === id);
    if (!u) return null;
    const { passwordHash: _, ...profile } = u;
    return profile;
  }

  async registerUser(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    preferredLanguage?: 'en' | 'ta';
  }): Promise<UserProfile> {
    const existing = await this.findUserByEmail(input.email);
    if (existing) throw new Error('An account with this email already exists.');

    const now = new Date().toISOString();
    const created: StoreUserRecord = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      phone: input.phone,
      role: 'patient',
      preferredLanguage: input.preferredLanguage ?? 'en',
      accessibilityRequired: false,
      createdAt: now,
      updatedAt: now,
      passwordHash: hashPassword(input.password),
    };
    this.state.users.push(created);
    this.addAudit({ id: created.id, email: created.email, role: 'patient' }, 'USER_REGISTERED', 'profiles', created.id, `Registered patient ${created.email}.`);
    this.persist();
    const { passwordHash: _, ...profile } = created;
    return profile;
  }

  verifyPassword(user: StoreUserRecord, password: string): boolean {
    return verifyScrypt(password, user.passwordHash);
  }

  async updateProfile(
    userId: string,
    patch: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'preferredLanguage' | 'accessibilityRequired'>>,
  ): Promise<UserProfile> {
    const idx = this.state.users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('Profile not found');
    const updated = {
      ...this.state.users[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.state.users[idx] = updated;
    this.persist();
    const { passwordHash: _, ...profile } = updated;
    return profile;
  }

  async listUsers(): Promise<UserProfile[]> {
    return this.state.users.map(({ passwordHash: _, ...profile }) => profile);
  }

  async updateUserRole(userId: string, role: UserRole, actor: AuthSessionUser): Promise<UserProfile> {
    const idx = this.state.users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('User not found');
    this.state.users[idx].role = role;
    this.state.users[idx].updatedAt = new Date().toISOString();
    this.addAudit(actor, 'USER_ROLE_CHANGED', 'profiles', userId, `Updated role for ${this.state.users[idx].email} to ${role}.`);
    this.persist();
    const { passwordHash: _, ...profile } = this.state.users[idx];
    return profile;
  }

  async listAppointments(filter?: { patientId?: string; doctorId?: string; date?: string }): Promise<Appointment[]> {
    return this.state.appointments
      .filter((a) => {
        if (filter?.patientId && a.patientId !== filter.patientId) return false;
        if (filter?.doctorId && a.doctorId !== filter.doctorId) return false;
        if (filter?.date && a.appointmentDate !== filter.date) return false;
        return true;
      })
      .sort((a, b) => `${b.appointmentDate}T${b.slotTime}`.localeCompare(`${a.appointmentDate}T${a.slotTime}`));
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    return (
      this.state.appointments.find((a) => a.id === id || a.bookingReference === id) ?? null
    );
  }

  async bookAppointment(input: BookAppointmentInput): Promise<Appointment> {
    const doctor = this.state.doctors.find((d) => d.id === input.doctorId && d.isActive);
    if (!doctor) throw new Error('Selected doctor is unavailable or does not exist.');

    const conflict = this.state.appointments.find(
      (a) =>
        a.doctorId === input.doctorId &&
        a.appointmentDate === input.appointmentDate &&
        a.slotTime === input.slotTime &&
        a.status !== 'cancelled',
    );
    if (conflict) {
      throw new Error('This time slot is already booked. Please choose another available slot.');
    }

    const now = new Date().toISOString();
    const created: Appointment = {
      id: crypto.randomUUID(),
      bookingReference: `MP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      patientId: input.patientId,
      patientName: input.patientName,
      patientEmail: input.patientEmail,
      patientPhone: input.patientPhone,
      doctorId: doctor.id,
      departmentId: doctor.departmentId,
      destinationId: doctor.destinationId,
      appointmentDate: input.appointmentDate,
      slotTime: input.slotTime,
      reason: input.reason,
      status: 'confirmed',
      accessibilityNeeded: Boolean(input.accessibilityNeeded),
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.state.appointments.unshift(created);
    this.addAudit(
      { id: input.patientId, email: input.patientEmail, role: 'patient' },
      'APPOINTMENT_BOOKED',
      'appointments',
      created.id,
      `Booked ${created.bookingReference} with ${doctor.fullName} on ${created.appointmentDate} ${created.slotTime}.`,
    );
    this.persist();
    return created;
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus, actor: AuthSessionUser): Promise<Appointment> {
    const idx = this.state.appointments.findIndex((a) => a.id === id);
    if (idx < 0) throw new Error('Appointment not found');
    const existing = this.state.appointments[idx];
    if (actor.role === 'patient' && existing.patientId !== actor.id) {
      throw new Error('Forbidden');
    }
    if (actor.role === 'patient' && status !== 'cancelled') {
      throw new Error('Patients may only cancel their own appointments.');
    }
    this.state.appointments[idx] = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.addAudit(actor, `APPOINTMENT_${status.toUpperCase()}`, 'appointments', id, `Appointment ${existing.bookingReference} marked ${status}.`);
    this.persist();
    return this.state.appointments[idx];
  }

  async listQueueTokens(departmentId?: string): Promise<QueueToken[]> {
    return this.state.queueTokens.filter((t) => (!departmentId ? true : t.departmentId === departmentId));
  }

  async issueQueueToken(input: IssueQueueTokenInput): Promise<QueueToken> {
    const dept = this.state.departments.find((d) => d.id === input.departmentId);
    if (!dept) throw new Error('Department not found');

    const deptTokens = this.state.queueTokens.filter((t) => t.departmentId === dept.id);
    const waitingCount = deptTokens.filter((t) => t.status === 'waiting' || t.status === 'called').length;
    const prefix = dept.code[0] ?? 'Q';
    const tokenNumber = `${prefix}-${101 + deptTokens.length}`;

    const created: QueueToken = {
      id: crypto.randomUUID(),
      tokenNumber,
      departmentId: dept.id,
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      patientName: input.patientName,
      counterLabel: dept.wing.split('·')[0].trim(),
      status: 'waiting',
      priority: input.priority ?? 'normal',
      estimatedWaitMinutes: Math.max(5, waitingCount * 10 + 5),
      issuedAt: new Date().toISOString(),
    };
    this.state.queueTokens.push(created);
    this.persist();
    return created;
  }

  async updateQueueTokenStatus(id: string, status: QueueStatus, actor: AuthSessionUser): Promise<QueueToken> {
    const idx = this.state.queueTokens.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error('Queue token not found');
    const now = new Date().toISOString();
    const token = { ...this.state.queueTokens[idx], status };
    if (status === 'called' || status === 'in_service') {
      token.calledAt = now;
      token.estimatedWaitMinutes = 0;
    }
    if (status === 'completed' || status === 'skipped') {
      token.completedAt = now;
      token.estimatedWaitMinutes = 0;
    }
    this.state.queueTokens[idx] = token;
    this.addAudit(actor, 'QUEUE_TOKEN_UPDATED', 'queue_tokens', id, `Token ${token.tokenNumber} moved to ${status}.`);
    this.persist();
    return token;
  }

  async listServiceRequests(patientId?: string): Promise<ServiceRequest[]> {
    return this.state.serviceRequests
      .filter((r) => (!patientId ? true : r.patientId === patientId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createServiceRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
    const now = new Date().toISOString();
    const created: ServiceRequest = {
      id: crypto.randomUUID(),
      hospitalId: this.state.hospital.id,
      patientId: input.patientId,
      requesterName: input.requesterName,
      requesterPhone: input.requesterPhone,
      requestType: input.requestType,
      pickupNodeId: input.pickupNodeId,
      pickupLabel: input.pickupLabel,
      destinationId: input.destinationId,
      notes: input.notes ?? '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.state.serviceRequests.unshift(created);
    this.addAudit(
      { id: input.patientId, email: input.requesterName, role: 'patient' },
      'ASSISTANCE_REQUESTED',
      'service_requests',
      created.id,
      `Submitted ${created.requestType} request at ${created.pickupLabel}.`,
    );
    this.persist();
    return created;
  }

  async updateServiceRequest(
    id: string,
    patch: { status?: ServiceRequestStatus; assignedStaffName?: string },
    actor: AuthSessionUser,
  ): Promise<ServiceRequest> {
    const idx = this.state.serviceRequests.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error('Service request not found');
    this.state.serviceRequests[idx] = {
      ...this.state.serviceRequests[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.addAudit(actor, 'ASSISTANCE_UPDATED', 'service_requests', id, `Updated assistance request ${id} to ${this.state.serviceRequests[idx].status}.`);
    this.persist();
    return this.state.serviceRequests[idx];
  }

  async listAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.state.auditLogs.slice(0, limit);
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    const today = new Date().toISOString().slice(0, 10);
    const activeAppointments = this.state.appointments.filter((a) => a.status !== 'cancelled');
    const graphValidation = await this.validateMap();

    return {
      totalAppointments: activeAppointments.length,
      todayAppointments: activeAppointments.filter((a) => a.appointmentDate === today).length,
      registeredPatients: this.state.users.filter((u) => u.role === 'patient').length,
      activeDoctors: this.state.doctors.filter((d) => d.isActive).length,
      departmentCount: this.state.departments.length,
      queueStats: {
        waiting: this.state.queueTokens.filter((q) => q.status === 'waiting').length,
        called: this.state.queueTokens.filter((q) => q.status === 'called').length,
        inService: this.state.queueTokens.filter((q) => q.status === 'in_service').length,
        completedToday: this.state.queueTokens.filter((q) => q.status === 'completed').length,
      },
      pendingAssistanceRequests: this.state.serviceRequests.filter(
        (r) => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress',
      ).length,
      activeMapVersion: this.activeVersion(),
      graphValidation,
      recentAuditLogs: this.state.auditLogs.slice(0, 8),
    };
  }
}

