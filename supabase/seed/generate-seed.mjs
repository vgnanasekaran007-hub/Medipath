import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SAMPLE_ANNOUNCEMENTS,
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
} from '../../shared/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const esc = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;
const arr = (items) => `ARRAY[${items.map(esc).join(', ')}]::text[]`;
const jsonb = (obj) => `${esc(JSON.stringify(obj))}::jsonb`;

const lines = [
  '-- =============================================================================',
  '-- MEDIPATH — Idempotent Sample Hospital Seed (Aurelia Pavilion Medical Center)',
  '-- Fictional sample campus dataset strictly for MEDIPATH development & demo.',
  '-- =============================================================================',
  '',
  'BEGIN;',
  '',
  `INSERT INTO public.hospitals (id, name, name_ta, tagline, tagline_ta, is_sample_data, sample_disclaimer, sample_disclaimer_ta, address, address_ta, city, phone, emergency_phone, email, latitude, longitude, visiting_hours, visiting_hours_ta) VALUES (${[
    esc(SAMPLE_HOSPITAL.id),
    esc(SAMPLE_HOSPITAL.name),
    esc(SAMPLE_HOSPITAL.nameTa),
    esc(SAMPLE_HOSPITAL.tagline),
    esc(SAMPLE_HOSPITAL.taglineTa),
    SAMPLE_HOSPITAL.isSampleData,
    esc(SAMPLE_HOSPITAL.sampleDisclaimer),
    esc(SAMPLE_HOSPITAL.sampleDisclaimerTa),
    esc(SAMPLE_HOSPITAL.address),
    esc(SAMPLE_HOSPITAL.addressTa),
    esc(SAMPLE_HOSPITAL.city),
    esc(SAMPLE_HOSPITAL.phone),
    esc(SAMPLE_HOSPITAL.emergencyPhone),
    esc(SAMPLE_HOSPITAL.email),
    SAMPLE_HOSPITAL.latitude,
    SAMPLE_HOSPITAL.longitude,
    esc(SAMPLE_HOSPITAL.visitingHours),
    esc(SAMPLE_HOSPITAL.visitingHoursTa),
  ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  '',
  `INSERT INTO public.buildings (id, hospital_id, name, name_ta, code, description, description_ta, total_floors, width_meters, depth_meters) VALUES (${[
    esc(SAMPLE_BUILDING.id),
    esc(SAMPLE_BUILDING.hospitalId),
    esc(SAMPLE_BUILDING.name),
    esc(SAMPLE_BUILDING.nameTa),
    esc(SAMPLE_BUILDING.code),
    esc(SAMPLE_BUILDING.description),
    esc(SAMPLE_BUILDING.descriptionTa),
    SAMPLE_BUILDING.totalFloors,
    SAMPLE_BUILDING.widthMeters,
    SAMPLE_BUILDING.depthMeters,
  ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  '',
  `INSERT INTO public.map_versions (id, hospital_id, version_number, label, status, published_by, published_at, notes) VALUES (${[
    esc(SAMPLE_MAP_VERSION.id),
    esc(SAMPLE_MAP_VERSION.hospitalId),
    SAMPLE_MAP_VERSION.versionNumber,
    esc(SAMPLE_MAP_VERSION.label),
    esc(SAMPLE_MAP_VERSION.status),
    esc(SAMPLE_MAP_VERSION.publishedBy),
    esc(SAMPLE_MAP_VERSION.publishedAt),
    esc(SAMPLE_MAP_VERSION.notes),
  ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  '',
];

for (const f of SAMPLE_FLOORS) {
  lines.push(
    `INSERT INTO public.floors (id, building_id, level_number, code, name, name_ta, subtitle, subtitle_ta, elevation_meters, svg_width, svg_height, svg_plan, is_published) VALUES (${[
      esc(f.id),
      esc(f.buildingId),
      f.levelNumber,
      esc(f.code),
      esc(f.name),
      esc(f.nameTa),
      esc(f.subtitle),
      esc(f.subtitleTa),
      f.elevationMeters,
      f.svgWidth,
      f.svgHeight,
      esc(f.svgPlan),
      f.isPublished,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const n of SAMPLE_NODES) {
  lines.push(
    `INSERT INTO public.navigation_nodes (id, floor_id, map_version_id, code, label, label_ta, type, x, y, is_accessible, is_active) VALUES (${[
      esc(n.id),
      esc(n.floorId),
      esc(n.mapVersionId),
      esc(n.code),
      esc(n.label),
      esc(n.labelTa),
      esc(n.type),
      n.x,
      n.y,
      n.isAccessible,
      n.isActive,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const e of SAMPLE_EDGES) {
  lines.push(
    `INSERT INTO public.navigation_edges (id, map_version_id, from_node_id, to_node_id, edge_type, distance_meters, is_accessible, is_restricted, bidirectional) VALUES (${[
      esc(e.id),
      esc(e.mapVersionId),
      esc(e.fromNodeId),
      esc(e.toNodeId),
      esc(e.edgeType),
      e.distanceMeters,
      e.isAccessible,
      e.isRestricted,
      e.bidirectional,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const d of SAMPLE_DEPARTMENTS) {
  lines.push(
    `INSERT INTO public.departments (id, hospital_id, floor_id, slug, code, name, name_ta, wing, wing_ta, summary, summary_ta, description, description_ta, clinical_lead, open_hours, open_hours_ta, is_emergency, accent_color, amenities) VALUES (${[
      esc(d.id),
      esc(d.hospitalId),
      esc(d.floorId),
      esc(d.slug),
      esc(d.code),
      esc(d.name),
      esc(d.nameTa),
      esc(d.wing),
      esc(d.wingTa),
      esc(d.summary),
      esc(d.summaryTa),
      esc(d.description),
      esc(d.descriptionTa),
      esc(d.clinicalLead),
      esc(d.openHours),
      esc(d.openHoursTa),
      d.isEmergency,
      esc(d.accentColor),
      jsonb(d.amenities),
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const dest of SAMPLE_DESTINATIONS) {
  lines.push(
    `INSERT INTO public.destinations (id, hospital_id, floor_id, department_id, slug, name, name_ta, room_code, category, description, description_ta, node_id, zone, is_accessible, is_emergency, is_searchable) VALUES (${[
      esc(dest.id),
      esc(dest.hospitalId),
      esc(dest.floorId),
      dest.departmentId ? esc(dest.departmentId) : 'NULL',
      esc(dest.slug),
      esc(dest.name),
      esc(dest.nameTa),
      esc(dest.roomCode),
      esc(dest.category),
      esc(dest.description),
      esc(dest.descriptionTa),
      esc(dest.nodeId),
      jsonb(dest.zone),
      dest.isAccessible,
      dest.isEmergency,
      dest.isSearchable,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const d of SAMPLE_DEPARTMENTS) {
  if (d.primaryDestinationId) {
    lines.push(
      `UPDATE public.departments SET primary_destination_id = ${esc(d.primaryDestinationId)} WHERE id = ${esc(d.id)} AND primary_destination_id IS NULL;`,
    );
  }
}
lines.push('');

for (const doc of SAMPLE_DOCTORS) {
  lines.push(
    `INSERT INTO public.doctors (id, hospital_id, department_id, destination_id, slug, full_name, full_name_ta, title, title_ta, specialty, specialty_ta, qualifications, languages, experience_years, consultation_fee, bio, bio_ta, portrait_initials, is_active) VALUES (${[
      esc(doc.id),
      esc(doc.hospitalId),
      esc(doc.departmentId),
      esc(doc.destinationId),
      esc(doc.slug),
      esc(doc.fullName),
      esc(doc.fullNameTa),
      esc(doc.title),
      esc(doc.titleTa),
      esc(doc.specialty),
      esc(doc.specialtyTa),
      esc(doc.qualifications),
      arr(doc.languages),
      doc.experienceYears,
      doc.consultationFee,
      esc(doc.bio),
      esc(doc.bioTa),
      esc(doc.portraitInitials),
      doc.isActive,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const s of SAMPLE_DOCTOR_SCHEDULES) {
  lines.push(
    `INSERT INTO public.doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, room_label, is_available) VALUES (${[
      esc(s.id),
      esc(s.doctorId),
      s.dayOfWeek,
      esc(s.startTime),
      esc(s.endTime),
      s.slotDurationMinutes,
      esc(s.roomLabel),
      s.isAvailable,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const srv of SAMPLE_SERVICES) {
  lines.push(
    `INSERT INTO public.hospital_services (id, hospital_id, department_id, destination_id, slug, name, name_ta, category, summary, summary_ta, details, details_ta, preparation_notes, preparation_notes_ta, availability, availability_ta, turnaround_estimate) VALUES (${[
      esc(srv.id),
      esc(srv.hospitalId),
      srv.departmentId ? esc(srv.departmentId) : 'NULL',
      esc(srv.destinationId),
      esc(srv.slug),
      esc(srv.name),
      esc(srv.nameTa),
      esc(srv.category),
      esc(srv.summary),
      esc(srv.summaryTa),
      esc(srv.details),
      esc(srv.detailsTa),
      esc(srv.preparationNotes),
      esc(srv.preparationNotesTa),
      esc(srv.availability),
      esc(srv.availabilityTa),
      esc(srv.turnaroundEstimate),
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const qr of SAMPLE_QR_CHECKPOINTS) {
  lines.push(
    `INSERT INTO public.qr_checkpoints (id, hospital_id, floor_id, node_id, code, label, label_ta, location_hint, location_hint_ta, is_active) VALUES (${[
      esc(qr.id),
      esc(qr.hospitalId),
      esc(qr.floorId),
      esc(qr.nodeId),
      esc(qr.code),
      esc(qr.label),
      esc(qr.labelTa),
      esc(qr.locationHint),
      esc(qr.locationHintTa),
      qr.isActive,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const qt of SAMPLE_QUEUE_TOKENS) {
  lines.push(
    `INSERT INTO public.queue_tokens (id, token_number, department_id, patient_name, counter_label, status, priority, estimated_wait_minutes) VALUES (${[
      esc(qt.id),
      esc(qt.tokenNumber),
      esc(qt.departmentId),
      esc(qt.patientName),
      esc(qt.counterLabel),
      esc(qt.status),
      esc(qt.priority),
      qt.estimatedWaitMinutes,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

for (const ann of SAMPLE_ANNOUNCEMENTS) {
  lines.push(
    `INSERT INTO public.announcements (id, hospital_id, title, title_ta, body, body_ta, severity, is_active) VALUES (${[
      esc(ann.id),
      esc(ann.hospitalId),
      esc(ann.title),
      esc(ann.titleTa),
      esc(ann.body),
      esc(ann.bodyTa),
      esc(ann.severity),
      ann.isActive,
    ].join(', ')}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');
lines.push('COMMIT;');

const outPath = join(__dirname, 'seed.sql');
writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Generated ${outPath} (${lines.length} statements)`);

