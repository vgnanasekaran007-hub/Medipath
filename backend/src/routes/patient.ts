import { Router } from 'express';
import { z } from 'zod';
import { createAuthMiddleware } from '../middleware/auth.js';
import type { MediPathStore } from '../services/index.js';

const bookAppointmentSchema = z.object({
  patientName: z.string().min(2),
  patientEmail: z.string().email(),
  patientPhone: z.string().min(6),
  doctorId: z.string().min(1),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().min(3),
  accessibilityNeeded: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const issueTokenSchema = z.object({
  departmentId: z.string().min(1),
  appointmentId: z.string().optional(),
  patientName: z.string().min(2),
  priority: z.enum(['normal', 'priority', 'emergency']).optional().default('normal'),
});

const assistanceSchema = z.object({
  requesterName: z.string().min(2),
  requesterPhone: z.string().min(6),
  requestType: z.enum([
    'wheelchair',
    'porter_escort',
    'language_interpreter',
    'emergency_guidance',
    'general_inquiry',
  ]),
  pickupNodeId: z.string().optional(),
  pickupLabel: z.string().min(2),
  destinationId: z.string().optional(),
  notes: z.string().optional().default(''),
});

function maskPatientName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ');
}

export function createPatientRouter(store: MediPathStore): Router {
  const router = Router();
  const { optionalAuth, requireAuth } = createAuthMiddleware(store);

  router.use(optionalAuth);

  // Appointments
  router.get('/appointments', requireAuth, async (req, res, next) => {
    try {
      const isStaff = req.user!.role === 'admin' || req.user!.role === 'hospital_staff';
      const appointments = await store.listAppointments(
        isStaff ? undefined : { patientId: req.user!.id },
      );
      res.json({ appointments });
    } catch (err) {
      next(err);
    }
  });

  router.get('/appointments/:id', async (req, res, next) => {
    try {
      const appt = await store.getAppointmentById(req.params.id);
      if (!appt) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }
      const isStaff = req.user?.role === 'admin' || req.user?.role === 'hospital_staff';
      const isOwner = Boolean(req.user && appt.patientId === req.user.id);
      const emailParam = String(req.query.email ?? '').trim().toLowerCase();
      const emailMatches = Boolean(emailParam && emailParam === appt.patientEmail.toLowerCase());

      if (!isStaff && !isOwner && !emailMatches) {
        res.status(403).json({ error: 'Access denied to this appointment record.' });
        return;
      }
      res.json({ appointment: appt });
    } catch (err) {
      next(err);
    }
  });

  router.post('/appointments', async (req, res) => {
    const parsed = bookAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid booking input', details: parsed.error.flatten() });
      return;
    }
    try {
      const appointment = await store.bookAppointment({
        ...parsed.data,
        patientId: req.user?.id,
      });
      res.status(201).json({ appointment });
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to book appointment',
      });
    }
  });

  router.patch('/appointments/:id/cancel', requireAuth, async (req, res) => {
    try {
      const appointment = await store.updateAppointmentStatus(String(req.params.id), 'cancelled', req.user!);
      res.json({ appointment });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to cancel appointment';
      res.status(msg === 'Forbidden' ? 403 : 400).json({ error: msg });
    }
  });

  // Queue Tracking
  router.get('/queue', async (req, res, next) => {
    try {
      const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
      const tokens = await store.listQueueTokens(departmentId);
      const isStaff = req.user?.role === 'admin' || req.user?.role === 'hospital_staff';
      const safeTokens = tokens.map((t) => {
        if (isStaff || (req.user && t.patientId === req.user.id)) {
          return t;
        }
        return { ...t, patientName: maskPatientName(t.patientName) };
      });
      res.json({ tokens: safeTokens });
    } catch (err) {
      next(err);
    }
  });

  router.post('/queue/tokens', async (req, res) => {
    const parsed = issueTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid queue token input', details: parsed.error.flatten() });
      return;
    }
    try {
      const token = await store.issueQueueToken({
        ...parsed.data,
        patientId: req.user?.id,
      });
      res.status(201).json({ token });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to issue queue token' });
    }
  });

  // Assistance / Service Requests
  router.get('/assistance', requireAuth, async (req, res, next) => {
    try {
      const isStaff = req.user!.role === 'admin' || req.user!.role === 'hospital_staff';
      const requests = await store.listServiceRequests(isStaff ? undefined : req.user!.id);
      res.json({ requests });
    } catch (err) {
      next(err);
    }
  });

  router.post('/assistance', async (req, res) => {
    const parsed = assistanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid assistance request', details: parsed.error.flatten() });
      return;
    }
    try {
      const request = await store.createServiceRequest({
        ...parsed.data,
        patientId: req.user?.id,
      });
      res.status(201).json({ request });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to submit request' });
    }
  });

  return router;
}
