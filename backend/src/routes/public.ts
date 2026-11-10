import { Router } from 'express';
import { z } from 'zod';
import type { MediPathStore } from '../services/index.js';

const routeSchema = z.object({
  startNodeId: z.string().min(1),
  endNodeId: z.string().min(1),
  accessibleOnly: z.boolean().optional().default(false),
});

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

export function createPublicRouter(store: MediPathStore): Router {
  const router = Router();

  router.get('/hospital', async (_req, res, next) => {
    try {
      const [hospital, buildings, floors, announcements] = await Promise.all([
        store.getHospital(),
        store.getBuildings(),
        store.getFloors(),
        store.getAnnouncements(false),
      ]);
      res.json({ hospital, buildings, floors, announcements });
    } catch (err) {
      next(err);
    }
  });

  router.get('/buildings', async (_req, res, next) => {
    try {
      res.json({ buildings: await store.getBuildings() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/floors', async (_req, res, next) => {
    try {
      const floors = (await store.getFloors()).filter((f) => f.isPublished);
      res.json({ floors });
    } catch (err) {
      next(err);
    }
  });

  router.get('/departments', async (_req, res, next) => {
    try {
      res.json({ departments: await store.getDepartments() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/departments/:slug', async (req, res, next) => {
    try {
      const department = await store.getDepartmentBySlug(req.params.slug);
      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }
      const [doctors, destinations, floors] = await Promise.all([
        store.getDoctors(),
        store.getDestinations(),
        store.getFloors(),
      ]);
      res.json({
        department,
        doctors: doctors.filter((d) => d.departmentId === department.id && d.isActive),
        destinations: destinations.filter((d) => d.departmentId === department.id),
        floor: floors.find((f) => f.id === department.floorId) ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/destinations', async (req, res, next) => {
    try {
      const q = String(req.query.q ?? '').trim().toLowerCase();
      const floorId = req.query.floorId ? String(req.query.floorId) : undefined;
      let destinations = await store.getDestinations();
      if (floorId) destinations = destinations.filter((d) => d.floorId === floorId);
      if (q) {
        destinations = destinations.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.nameTa.toLowerCase().includes(q) ||
            d.roomCode.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q),
        );
      }
      res.json({ destinations });
    } catch (err) {
      next(err);
    }
  });

  router.get('/doctors', async (req, res, next) => {
    try {
      const deptId = req.query.departmentId ? String(req.query.departmentId) : undefined;
      const q = String(req.query.q ?? '').trim().toLowerCase();
      let doctors = (await store.getDoctors()).filter((d) => d.isActive);
      if (deptId) doctors = doctors.filter((d) => d.departmentId === deptId);
      if (q) {
        doctors = doctors.filter(
          (d) =>
            d.fullName.toLowerCase().includes(q) ||
            d.fullNameTa.toLowerCase().includes(q) ||
            d.specialty.toLowerCase().includes(q),
        );
      }
      const schedules = await store.getDoctorSchedules();
      res.json({ doctors, schedules });
    } catch (err) {
      next(err);
    }
  });

  router.get('/doctors/:slug', async (req, res, next) => {
    try {
      const doctor = await store.getDoctorBySlug(req.params.slug);
      if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
      }
      const [schedules, departments, destinations] = await Promise.all([
        store.getDoctorSchedules(doctor.id),
        store.getDepartments(),
        store.getDestinations(),
      ]);
      res.json({
        doctor,
        schedules,
        department: departments.find((d) => d.id === doctor.departmentId) ?? null,
        destination: destinations.find((d) => d.id === doctor.destinationId) ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/doctors/:id/available-slots', async (req, res, next) => {
    try {
      const dateStr = String(req.query.date ?? new Date().toISOString().slice(0, 10));
      const parsedDate = new Date(`${dateStr}T00:00:00Z`);
      if (Number.isNaN(parsedDate.getTime())) {
        res.status(400).json({ error: 'Invalid date parameter' });
        return;
      }
      const dayOfWeek = parsedDate.getUTCDay();
      const [schedules, booked] = await Promise.all([
        store.getDoctorSchedules(req.params.id),
        store.listAppointments({ doctorId: req.params.id, date: dateStr }),
      ]);
      const bookedTimes = new Set(
        booked.filter((a) => a.status !== 'cancelled').map((a) => a.slotTime),
      );
      const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek && s.isAvailable);
      const slots: { time: string; available: boolean; roomLabel: string }[] = [];
      for (const s of daySchedules) {
        for (const time of generateTimeSlots(s.startTime, s.endTime, s.slotDurationMinutes)) {
          slots.push({
            time,
            available: !bookedTimes.has(time),
            roomLabel: s.roomLabel,
          });
        }
      }
      res.json({ date: dateStr, dayOfWeek, slots });
    } catch (err) {
      next(err);
    }
  });

  router.get('/services', async (_req, res, next) => {
    try {
      res.json({ services: await store.getServices() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/services/:slug', async (req, res, next) => {
    try {
      const service = await store.getServiceBySlug(req.params.slug);
      if (!service) {
        res.status(404).json({ error: 'Service not found' });
        return;
      }
      const destinations = await store.getDestinations();
      res.json({
        service,
        destination: destinations.find((d) => d.id === service.destinationId) ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/announcements', async (_req, res, next) => {
    try {
      res.json({ announcements: await store.getAnnouncements(false) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/navigation/graph', async (_req, res, next) => {
    try {
      const graph = await store.getNavigationGraph();
      // Public clients receive public walkable graph; restricted staff corridors omitted from public client bundle
      res.json({
        ...graph,
        edges: graph.edges.filter((e) => !e.isRestricted),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/navigation/route', async (req, res, next) => {
    try {
      const parsed = routeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid route parameters', details: parsed.error.flatten() });
        return;
      }
      const route = await store.calculateRoute(parsed.data);
      res.json({ route });
    } catch (err) {
      next(err);
    }
  });

  router.get('/qr/:code', async (req, res, next) => {
    try {
      const checkpoint = await store.getQrCheckpointByCode(req.params.code);
      if (!checkpoint) {
        res.status(404).json({ error: 'QR checkpoint code not found or inactive' });
        return;
      }
      res.json({ checkpoint });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

