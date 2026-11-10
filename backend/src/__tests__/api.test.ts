import { DEPARTMENT_IDS, DOCTOR_IDS, FLOOR_IDS, NODE_IDS } from '@medipath/shared';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { LocalPersistentStore } from '../services/localStore.js';

describe('MEDIPATH Backend API Integration', () => {
  let store: LocalPersistentStore;
  let app: ReturnType<typeof createApp>;
  let adminToken = '';
  let staffToken = '';
  let patientToken = '';

  beforeAll(async () => {
    store = new LocalPersistentStore(':memory:');
    await store.init();
    app = createApp(store);

    const [adminLogin, staffLogin, patientLogin] = await Promise.all([
      request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medipath.demo', password: 'MediPathDemo!2026' }),
      request(app)
        .post('/api/auth/login')
        .send({ email: 'staff@medipath.demo', password: 'MediPathDemo!2026' }),
      request(app)
        .post('/api/auth/login')
        .send({ email: 'patient@medipath.demo', password: 'MediPathDemo!2026' }),
    ]);

    adminToken = adminLogin.body.token;
    staffToken = staffLogin.body.token;
    patientToken = patientLogin.body.token;
  });

  it('serves health check and hospital overview metadata', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');
    expect(healthRes.body.persistenceMode).toBe('local');
    expect(healthRes.body.mapVersion).toBe(1);

    const hospitalRes = await request(app).get('/api/hospital');
    expect(hospitalRes.status).toBe(200);
    expect(hospitalRes.body.hospital.isSampleData).toBe(true);
    expect(hospitalRes.body.floors.length).toBe(4);
  });

  it('excludes restricted edges from public graph and computes Dijkstra multi-floor & accessible routes', async () => {
    const graphRes = await request(app).get('/api/navigation/graph');
    expect(graphRes.status).toBe(200);
    expect(graphRes.body.edges.some((e: { isRestricted: boolean }) => e.isRestricted)).toBe(false);

    // Multi-floor accessible route from Ground Entrance to Level 2 Cardiology
    const accessibleRes = await request(app).post('/api/navigation/route').send({
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: true,
    });
    expect(accessibleRes.status).toBe(200);
    expect(accessibleRes.body.route.found).toBe(true);
    expect(accessibleRes.body.route.floorIdsInvolved).toContain(FLOOR_IDS.L0);
    expect(accessibleRes.body.route.floorIdsInvolved).toContain(FLOOR_IDS.L2);
    expect(
      accessibleRes.body.route.steps.some(
        (s: { edgeType?: string }) => s.edgeType === 'staircase',
      ),
    ).toBe(false);
    expect(
      accessibleRes.body.route.floorTransitions.some(
        (ft: { via: string }) => ft.via === 'elevator',
      ),
    ).toBe(true);

    // Same-origin validation check
    const sameRes = await request(app).post('/api/navigation/route').send({
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L0_ENTRANCE,
      accessibleOnly: false,
    });
    expect(sameRes.status).toBe(200);
    expect(sameRes.body.route.found).toBe(false);
    expect(sameRes.body.route.errorCode).toBe('SAME_ORIGIN_DESTINATION');
  });

  it('resolves valid QR checkpoints cleanly and rejects invalid codes', async () => {
    const okRes = await request(app).get('/api/qr/MP-QR-ENTRANCE');
    expect(okRes.status).toBe(200);
    expect(okRes.body.checkpoint.nodeId).toBe(NODE_IDS.L0_ENTRANCE);

    const missingRes = await request(app).get('/api/qr/MP-UNKNOWN-999');
    expect(missingRes.status).toBe(404);
  });

  it('supports user registration, login, and profile updates', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      email: 'visitor.test@example.com',
      password: 'StrongPassword!9',
      fullName: 'Vikram Sundar',
      preferredLanguage: 'ta',
    });
    expect(regRes.status).toBe(201);
    expect(regRes.body.user.role).toBe('patient');
    expect(regRes.body.token).toBeTruthy();

    const patchRes = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${regRes.body.token}`)
      .send({ accessibilityRequired: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.user.accessibilityRequired).toBe(true);
  });

  it('prevents double-booking for the same doctor/date/slot and enforces owner privacy on cancel', async () => {
    const targetDate = '2027-03-15';
    const firstBook = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientName: 'Priya Narayanan',
        patientEmail: 'patient@medipath.demo',
        patientPhone: '+91 98401 55210',
        doctorId: DOCTOR_IDS.KAVITHA,
        appointmentDate: targetDate,
        slotTime: '09:30',
        reason: 'Follow-up ECG review',
        accessibilityNeeded: true,
      });

    expect(firstBook.status).toBe(201);
    const apptId = firstBook.body.appointment.id;

    // Duplicate booking for same doctor/date/slot must fail with 409
    const duplicateBook = await request(app)
      .post('/api/appointments')
      .send({
        patientName: 'Another Visitor',
        patientEmail: 'other@example.com',
        patientPhone: '+91 90000 00001',
        doctorId: DOCTOR_IDS.KAVITHA,
        appointmentDate: targetDate,
        slotTime: '09:30',
        reason: 'New consult',
      });
    expect(duplicateBook.status).toBe(409);

    // Cancel as owner
    const cancelRes = await request(app)
      .patch(`/api/appointments/${apptId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.appointment.status).toBe('cancelled');

    // Cancelled slot becomes available again
    const rebookRes = await request(app)
      .post('/api/appointments')
      .send({
        patientName: 'Rebook Visitor',
        patientEmail: 'rebook@example.com',
        patientPhone: '+91 90000 00002',
        doctorId: DOCTOR_IDS.KAVITHA,
        appointmentDate: targetDate,
        slotTime: '09:30',
        reason: 'New consult after cancellation',
      });
    expect(rebookRes.status).toBe(201);
  });

  it('masks public queue patient names and lets staff call tokens forward', async () => {
    const issueRes = await request(app).post('/api/queue/tokens').send({
      departmentId: DEPARTMENT_IDS.CARDIOLOGY,
      patientName: 'Anand Kumar',
      priority: 'normal',
    });
    expect(issueRes.status).toBe(201);
    const tokenId = issueRes.body.token.id;

    const publicQueue = await request(app).get('/api/queue');
    expect(publicQueue.status).toBe(200);
    const item = publicQueue.body.tokens.find((t: { id: string }) => t.id === tokenId);
    expect(item.patientName).toBe('A. K.');

    const staffCall = await request(app)
      .patch(`/api/admin/queue/${tokenId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'called' });
    expect(staffCall.status).toBe(200);
    expect(staffCall.body.token.status).toBe('called');
  });

  it('enforces RBAC on admin endpoints and supports map validation & versioned publishing', async () => {
    const anonRes = await request(app).get('/api/admin/overview');
    expect(anonRes.status).toBe(401);

    const patientForbidden = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(patientForbidden.status).toBe(403);

    const adminOverview = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.graphValidation.valid).toBe(true);

    // Add a temporary node and publish map
    const addNode = await request(app)
      .post('/api/admin/map/nodes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        floorId: FLOOR_IDS.L0,
        code: 'L0-TEST-KIOSK',
        label: 'Atrium Sample Kiosk',
        labelTa: 'மாதிரி கியோஸ்க்',
        type: 'corridor',
        x: 520,
        y: 430,
        isAccessible: true,
        isActive: true,
      });
    expect(addNode.status).toBe(200);
    const newNodeId = addNode.body.node.id;

    const addEdge = await request(app)
      .post('/api/admin/map/edges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fromNodeId: NODE_IDS.L0_RECEPTION,
        toNodeId: newNodeId,
        edgeType: 'corridor',
        distanceMeters: 2,
        isAccessible: true,
        isRestricted: false,
        bidirectional: true,
      });
    expect(addEdge.status).toBe(200);

    const validateRes = await request(app)
      .post('/api/admin/map/validate')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.validation.valid).toBe(true);

    const publishRes = await request(app)
      .post('/api/admin/map/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'v2.0 — Test Published Revision' });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.version.versionNumber).toBe(2);

    const logsRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    expect(
      logsRes.body.logs.some((l: { action: string }) => l.action === 'MAP_VERSION_PUBLISHED'),
    ).toBe(true);
  });
});

