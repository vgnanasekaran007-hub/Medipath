import { Router } from 'express';
import { z } from 'zod';
import { createAuthMiddleware } from '../middleware/auth.js';
import type { MediPathStore } from '../services/index.js';

const floorSchema = z.object({
  id: z.string().optional(),
  buildingId: z.string().optional(),
  levelNumber: z.number().int(),
  code: z.string().min(1),
  name: z.string().min(1),
  nameTa: z.string().optional(),
  subtitle: z.string().optional(),
  subtitleTa: z.string().optional(),
  elevationMeters: z.number().optional(),
  svgWidth: z.number().int().positive().optional(),
  svgHeight: z.number().int().positive().optional(),
  svgPlan: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const departmentSchema = z.object({
  id: z.string().optional(),
  floorId: z.string().optional(),
  slug: z.string().min(1),
  code: z.string().optional(),
  name: z.string().min(1),
  nameTa: z.string().optional(),
  wing: z.string().optional(),
  wingTa: z.string().optional(),
  summary: z.string().optional(),
  summaryTa: z.string().optional(),
  description: z.string().optional(),
  descriptionTa: z.string().optional(),
  clinicalLead: z.string().optional(),
  openHours: z.string().optional(),
  openHoursTa: z.string().optional(),
  isEmergency: z.boolean().optional(),
  accentColor: z.string().optional(),
  primaryDestinationId: z.string().optional(),
  amenities: z.array(z.string()).optional(),
});

const destinationSchema = z.object({
  id: z.string().optional(),
  floorId: z.string().min(1),
  departmentId: z.string().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  nameTa: z.string().optional(),
  roomCode: z.string().optional(),
  category: z.enum([
    'entrance',
    'reception',
    'emergency',
    'clinical',
    'diagnostics',
    'pharmacy',
    'critical_care',
    'inpatient',
    'billing',
    'amenity',
    'restroom',
    'help_desk',
  ]).optional(),
  description: z.string().optional(),
  descriptionTa: z.string().optional(),
  nodeId: z.string().min(1),
  zone: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    accentHex: z.string().optional(),
  }).optional(),
  isAccessible: z.boolean().optional(),
  isEmergency: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
});

const nodeSchema = z.object({
  id: z.string().optional(),
  floorId: z.string().min(1),
  code: z.string().optional(),
  label: z.string().min(1),
  labelTa: z.string().optional(),
  type: z.enum([
    'entrance',
    'corridor',
    'junction',
    'elevator',
    'staircase',
    'department_entrance',
    'room',
    'qr_checkpoint',
  ]).optional(),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(640),
  isAccessible: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const edgeSchema = z.object({
  id: z.string().optional(),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  edgeType: z.enum(['corridor', 'elevator', 'staircase', 'ramp']).optional(),
  distanceMeters: z.number().positive(),
  isAccessible: z.boolean().optional(),
  isRestricted: z.boolean().optional(),
  bidirectional: z.boolean().optional(),
});

const doctorSchema = z.object({
  id: z.string().optional(),
  departmentId: z.string().min(1),
  destinationId: z.string().min(1),
  slug: z.string().min(1),
  fullName: z.string().min(2),
  fullNameTa: z.string().optional(),
  title: z.string().optional(),
  titleTa: z.string().optional(),
  specialty: z.string().optional(),
  specialtyTa: z.string().optional(),
  qualifications: z.string().optional(),
  languages: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).optional(),
  consultationFee: z.number().min(0).optional(),
  bio: z.string().optional(),
  bioTa: z.string().optional(),
  isActive: z.boolean().optional(),
});

const scheduleSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.number().int().min(10).max(120).optional(),
  roomLabel: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

const qrSchema = z.object({
  id: z.string().optional(),
  floorId: z.string().min(1),
  nodeId: z.string().min(1),
  code: z.string().min(3),
  label: z.string().min(2),
  labelTa: z.string().optional(),
  locationHint: z.string().optional(),
  locationHintTa: z.string().optional(),
  isActive: z.boolean().optional(),
});

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2),
  titleTa: z.string().optional(),
  body: z.string().min(4),
  bodyTa: z.string().optional(),
  severity: z.enum(['info', 'advisory', 'emergency']).optional(),
  isActive: z.boolean().optional(),
});

export function createAdminRouter(store: MediPathStore): Router {
  const router = Router();
  const { requireAuth, requireRole } = createAuthMiddleware(store);

  router.use(requireAuth);
  router.use(requireRole(['admin', 'hospital_staff']));

  // Overview
  router.get('/overview', async (_req, res, next) => {
    try {
      res.json(await store.getAdminOverview());
    } catch (err) {
      next(err);
    }
  });

  // Hospital Settings (Admin only)
  router.put('/hospital', requireRole(['admin']), async (req, res, next) => {
    try {
      const hospital = await store.updateHospital(req.body, req.user!);
      res.json({ hospital });
    } catch (err) {
      next(err);
    }
  });

  // Buildings & Floors
  router.get('/buildings', async (_req, res, next) => {
    try {
      res.json({ buildings: await store.getBuildings() });
    } catch (err) {
      next(err);
    }
  });

  router.post('/buildings', requireRole(['admin']), async (req, res, next) => {
    try {
      const building = await store.upsertBuilding(req.body, req.user!);
      res.json({ building });
    } catch (err) {
      next(err);
    }
  });

  router.get('/floors', async (_req, res, next) => {
    try {
      res.json({ floors: await store.getFloors() });
    } catch (err) {
      next(err);
    }
  });

  router.post('/floors', requireRole(['admin']), async (req, res) => {
    const parsed = floorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid floor data', details: parsed.error.flatten() });
      return;
    }
    try {
      const floor = await store.upsertFloor(parsed.data, req.user!);
      res.json({ floor });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save floor' });
    }
  });

  router.delete('/floors/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteFloor(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete floor' });
    }
  });

  // Departments
  router.post('/departments', requireRole(['admin']), async (req, res) => {
    const parsed = departmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid department data', details: parsed.error.flatten() });
      return;
    }
    try {
      const department = await store.upsertDepartment(parsed.data, req.user!);
      res.json({ department });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save department' });
    }
  });

  router.delete('/departments/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteDepartment(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete department' });
    }
  });

  // Destinations
  router.post('/destinations', requireRole(['admin']), async (req, res) => {
    const parsed = destinationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid destination data', details: parsed.error.flatten() });
      return;
    }
    try {
      const destination = await store.upsertDestination(parsed.data, req.user!);
      res.json({ destination });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save destination' });
    }
  });

  router.delete('/destinations/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteDestination(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete destination' });
    }
  });

  // Doctors & Schedules
  router.post('/doctors', requireRole(['admin']), async (req, res) => {
    const parsed = doctorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid doctor data', details: parsed.error.flatten() });
      return;
    }
    try {
      const doctor = await store.upsertDoctor(parsed.data, req.user!);
      res.json({ doctor });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save doctor' });
    }
  });

  router.delete('/doctors/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteDoctor(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete doctor' });
    }
  });

  router.get('/schedules', async (req, res, next) => {
    try {
      const doctorId = req.query.doctorId ? String(req.query.doctorId) : undefined;
      res.json({ schedules: await store.getDoctorSchedules(doctorId) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/schedules', requireRole(['admin']), async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid schedule data', details: parsed.error.flatten() });
      return;
    }
    try {
      const schedule = await store.upsertDoctorSchedule(parsed.data, req.user!);
      res.json({ schedule });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save schedule' });
    }
  });

  router.delete('/schedules/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteDoctorSchedule(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete schedule' });
    }
  });

  // Appointments & Queue Operations (Staff + Admin)
  router.get('/appointments', async (req, res, next) => {
    try {
      const doctorId = req.query.doctorId ? String(req.query.doctorId) : undefined;
      const date = req.query.date ? String(req.query.date) : undefined;
      res.json({ appointments: await store.listAppointments({ doctorId, date }) });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/appointments/:id/status', async (req, res) => {
    const parsed = z.object({ status: z.enum(['confirmed', 'checked_in', 'completed', 'cancelled']) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid appointment status' });
      return;
    }
    try {
      const appointment = await store.updateAppointmentStatus(req.params.id, parsed.data.status, req.user!);
      res.json({ appointment });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update appointment' });
    }
  });

  router.get('/queue', async (req, res, next) => {
    try {
      const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
      res.json({ tokens: await store.listQueueTokens(departmentId) });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/queue/:id/status', async (req, res) => {
    const parsed = z.object({ status: z.enum(['waiting', 'called', 'in_service', 'completed', 'skipped']) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid queue token status' });
      return;
    }
    try {
      const token = await store.updateQueueTokenStatus(req.params.id, parsed.data.status, req.user!);
      res.json({ token });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update queue token' });
    }
  });

  // Service / Assistance Requests
  router.get('/service-requests', async (_req, res, next) => {
    try {
      res.json({ requests: await store.listServiceRequests() });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/service-requests/:id', async (req, res) => {
    const parsed = z.object({
      status: z.enum(['pending', 'assigned', 'in_progress', 'resolved', 'cancelled']).optional(),
      assignedStaffName: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid service request patch' });
      return;
    }
    try {
      const request = await store.updateServiceRequest(req.params.id, parsed.data, req.user!);
      res.json({ request });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update request' });
    }
  });

  // Announcements
  router.get('/announcements', async (_req, res, next) => {
    try {
      res.json({ announcements: await store.getAnnouncements(true) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/announcements', async (req, res) => {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid announcement', details: parsed.error.flatten() });
      return;
    }
    try {
      const announcement = await store.upsertAnnouncement(parsed.data, req.user!);
      res.json({ announcement });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save announcement' });
    }
  });

  router.delete('/announcements/:id', async (req, res) => {
    try {
      await store.deleteAnnouncement(req.params.id, req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete announcement' });
    }
  });

  // 3D/2D Map Editor Graph & Version Publishing
  router.get('/map/graph', async (_req, res, next) => {
    try {
      res.json(await store.getNavigationGraph());
    } catch (err) {
      next(err);
    }
  });

  router.get('/map/versions', async (_req, res, next) => {
    try {
      res.json({ versions: await store.getMapVersions() });
    } catch (err) {
      next(err);
    }
  });

  router.post('/map/nodes', requireRole(['admin']), async (req, res) => {
    const parsed = nodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid node data', details: parsed.error.flatten() });
      return;
    }
    try {
      const node = await store.upsertNode(parsed.data, req.user!);
      res.json({ node });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save node' });
    }
  });

  router.delete('/map/nodes/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteNode(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete node' });
    }
  });

  router.post('/map/edges', requireRole(['admin']), async (req, res) => {
    const parsed = edgeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid pathway data', details: parsed.error.flatten() });
      return;
    }
    try {
      const edge = await store.upsertEdge(parsed.data, req.user!);
      res.json({ edge });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save pathway' });
    }
  });

  router.delete('/map/edges/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteEdge(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete pathway' });
    }
  });

  router.post('/map/validate', async (_req, res, next) => {
    try {
      const validation = await store.validateMap();
      res.json({ validation });
    } catch (err) {
      next(err);
    }
  });

  router.post('/map/publish', requireRole(['admin']), async (req, res) => {
    try {
      const result = await store.publishMapVersion(req.body ?? {}, req.user!);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Map publish blocked' });
    }
  });

  // QR Checkpoints
  router.get('/qr-checkpoints', async (_req, res, next) => {
    try {
      res.json({ checkpoints: await store.getQrCheckpoints() });
    } catch (err) {
      next(err);
    }
  });

  router.post('/qr-checkpoints', requireRole(['admin']), async (req, res) => {
    const parsed = qrSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid QR checkpoint', details: parsed.error.flatten() });
      return;
    }
    try {
      const checkpoint = await store.upsertQrCheckpoint(parsed.data, req.user!);
      res.json({ checkpoint });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save QR checkpoint' });
    }
  });

  router.delete('/qr-checkpoints/:id', requireRole(['admin']), async (req, res) => {
    try {
      await store.deleteQrCheckpoint(String(req.params.id), req.user!);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete QR checkpoint' });
    }
  });

  // Users & Roles
  router.get('/users', async (_req, res, next) => {
    try {
      res.json({ users: await store.listUsers() });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/users/:id/role', requireRole(['admin']), async (req, res) => {
    const parsed = z.object({ role: z.enum(['patient', 'hospital_staff', 'admin']) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    try {
      const user = await store.updateUserRole(String(req.params.id), parsed.data.role, req.user!);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update role' });
    }
  });

  // Audit Logs
  router.get('/audit-logs', async (req, res, next) => {
    try {
      const limit = Number(req.query.limit ?? 100);
      res.json({ logs: await store.listAuditLogs(Math.min(250, Math.max(10, limit))) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
