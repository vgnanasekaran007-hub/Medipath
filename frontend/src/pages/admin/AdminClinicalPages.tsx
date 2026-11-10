import type { AppointmentStatus, QueueStatus } from '@medipath/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, ErrorBanner, LoadingState, StatusBadge, SuccessBanner } from '../../components/ui/Primitives';
import { api } from '../../lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AdminDepartmentsPage() {
  const qc = useQueryClient();
  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: api.getDepartments });
  const floorsQuery = useQuery({ queryKey: ['admin-floors'], queryFn: api.admin.getFloors });

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [floorId, setFloorId] = useState('');
  const [clinicalLead, setClinicalLead] = useState('');
  const [openHours, setOpenHours] = useState('Mon–Sat · 08:00 – 19:00');
  const [summary, setSummary] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const floors = floorsQuery.data?.floors ?? [];

  useEffect(() => {
    if (!floorId && floors.length > 0) setFloorId(floors[0].id);
  }, [floorId, floors]);

  const saveMut = useMutation({
    mutationFn: api.admin.upsertDepartment,
    onSuccess: ({ department }) => {
      setMsg(`Saved department ${department.name}.`);
      setName('');
      setCode('');
      setSummary('');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.admin.deleteDepartment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    saveMut.mutate({
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      code: code.trim() || 'DEPT',
      floorId,
      clinicalLead: clinicalLead.trim() || 'Medical Director',
      openHours,
      summary: summary.trim() || `${name.trim()} specialist suite`,
    });
  };

  if (deptsQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Department Management</h1>
      {msg && <SuccessBanner message={msg} />}
      {saveMut.error && <ErrorBanner message={(saveMut.error as Error).message} />}

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-3">
        <input
          type="text"
          required
          placeholder="Department Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        />
        <input
          type="text"
          placeholder="Code (e.g., DERM-02)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        />
        <select
          value={floorId}
          onChange={(e) => setFloorId(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>{f.code} — {f.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Clinical Lead"
          value={clinicalLead}
          onChange={(e) => setClinicalLead(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        />
        <input
          type="text"
          placeholder="Open Hours"
          value={openHours}
          onChange={(e) => setOpenHours(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        />
        <input
          type="text"
          placeholder="Short Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        />
        <div className="sm:col-span-3">
          <Button type="submit" variant="primary" size="sm" loading={saveMut.isPending}>
            Add / Update Department
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Code</th>
              <th className="p-3.5">Department</th>
              <th className="p-3.5">Floor</th>
              <th className="p-3.5">Lead</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(deptsQuery.data?.departments ?? []).map((d) => {
              const fl = floors.find((f) => f.id === d.floorId);
              return (
                <tr key={d.id}>
                  <td className="p-3.5 font-mono text-xs font-semibold text-ink">{d.code}</td>
                  <td className="p-3.5 font-medium text-ink">{d.name}</td>
                  <td className="p-3.5 text-xs">{fl?.code}</td>
                  <td className="p-3.5 text-xs text-ink">{d.clinicalLead}</td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      aria-label={`Delete ${d.name}`}
                      onClick={() => deleteMut.mutate(d.id)}
                      className="rounded p-2 text-emergency hover:bg-emergency-soft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminDoctorsPage() {
  const qc = useQueryClient();
  const docsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });
  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: api.getDepartments });
  const graphQuery = useQuery({ queryKey: ['admin-map-graph'], queryFn: api.admin.getMapGraph });

  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [consultationFee, setConsultationFee] = useState(800);

  const departments = deptsQuery.data?.departments ?? [];
  const destinations = graphQuery.data?.destinations ?? [];

  useEffect(() => {
    if (!departmentId && departments.length > 0) setDepartmentId(departments[0].id);
    if (!destinationId && destinations.length > 0) setDestinationId(destinations[0].id);
  }, [departmentId, destinationId, departments, destinations]);

  const saveMut = useMutation({
    mutationFn: api.admin.upsertDoctor,
    onSuccess: () => {
      setFullName('');
      setSpecialty('');
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteDoctor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });

  if (docsQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Specialist Directory Management</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate({
            fullName: fullName.trim(),
            slug: fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            departmentId,
            destinationId,
            specialty: specialty.trim() || 'Clinical Specialist',
            consultationFee: Number(consultationFee),
            isActive: true,
          });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-5"
      >
        <input
          type="text"
          required
          placeholder="Doctor Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink sm:col-span-2"
        />
        <input
          type="text"
          required
          placeholder="Specialty"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        />
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        >
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        >
          {destinations.map((d) => <option key={d.id} value={d.id}>{d.roomCode} — {d.name}</option>)}
        </select>
        <input
          type="number"
          min={0}
          value={consultationFee}
          onChange={(e) => setConsultationFee(Number(e.target.value))}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink tabular-nums"
        />
        <div className="flex items-center sm:col-span-4">
          <Button type="submit" variant="primary" size="sm" loading={saveMut.isPending}>
            Add Specialist
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Specialist</th>
              <th className="p-3.5">Department</th>
              <th className="p-3.5">Room Suite</th>
              <th className="p-3.5">Fee</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(docsQuery.data?.doctors ?? []).map((doc) => {
              const dept = departments.find((d) => d.id === doc.departmentId);
              const dest = destinations.find((d) => d.id === doc.destinationId);
              return (
                <tr key={doc.id}>
                  <td className="p-3.5 font-medium text-ink">
                    {doc.fullName}
                    <span className="block text-xs text-ink">{doc.specialty}</span>
                  </td>
                  <td className="p-3.5 text-xs">{dept?.name}</td>
                  <td className="p-3.5 text-xs">{dest?.roomCode}</td>
                  <td className="p-3.5 text-xs tabular-nums">₹{doc.consultationFee}</td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => delMut.mutate(doc.id)}
                      className="rounded p-2 text-emergency hover:bg-emergency-soft"
                      aria-label={`Remove ${doc.fullName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSchedulesPage() {
  const qc = useQueryClient();
  const docsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });
  const schedQuery = useQuery({ queryKey: ['admin-schedules'], queryFn: () => api.admin.getSchedules() });

  const [doctorId, setDoctorId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [roomLabel] = useState('Suite 204-A');

  const doctors = docsQuery.data?.doctors ?? [];
  useEffect(() => {
    if (!doctorId && doctors.length > 0) setDoctorId(doctors[0].id);
  }, [doctorId, doctors]);

  const saveMut = useMutation({
    mutationFn: api.admin.upsertSchedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-schedules'] }),
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteSchedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-schedules'] }),
  });

  if (schedQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Doctor Schedule Management</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate({ doctorId, dayOfWeek, startTime, endTime, roomLabel, slotDurationMinutes: 30, isAvailable: true });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-6"
      >
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink sm:col-span-2"
        >
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </select>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink"
        >
          {DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-2.5 text-sm text-ink"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="min-h-[42px] rounded border border-champagne-border bg-surface px-2.5 text-sm text-ink"
        />
        <Button type="submit" variant="primary" size="sm" loading={saveMut.isPending}>
          Add Session
        </Button>
      </form>

      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Specialist</th>
              <th className="p-3.5">Weekday</th>
              <th className="p-3.5">Window</th>
              <th className="p-3.5">Suite</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(schedQuery.data?.schedules ?? []).map((s) => {
              const doc = doctors.find((d) => d.id === s.doctorId);
              return (
                <tr key={s.id}>
                  <td className="p-3.5 font-medium text-ink">{doc?.fullName}</td>
                  <td className="p-3.5 text-xs">{DAYS[s.dayOfWeek]}</td>
                  <td className="p-3.5 text-xs tabular-nums">{s.startTime} – {s.endTime}</td>
                  <td className="p-3.5 text-xs">{s.roomLabel}</td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => delMut.mutate(s.id)}
                      className="rounded p-2 text-emergency hover:bg-emergency-soft"
                      aria-label="Delete schedule slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminAppointmentsPage() {
  const qc = useQueryClient();
  const apptsQuery = useQuery({ queryKey: ['admin-appointments'], queryFn: api.admin.getAppointments });
  const docsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.admin.updateAppointmentStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-appointments'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  if (apptsQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Appointment Operations</h1>
      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Ref</th>
              <th className="p-3.5">Patient</th>
              <th className="p-3.5">Doctor</th>
              <th className="p-3.5">Date &amp; Slot</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Transition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(apptsQuery.data?.appointments ?? []).map((a) => {
              const doc = docsQuery.data?.doctors.find((d) => d.id === a.doctorId);
              return (
                <tr key={a.id}>
                  <td className="p-3.5 font-mono text-xs font-semibold text-ink">{a.bookingReference}</td>
                  <td className="p-3.5">
                    <span className="font-medium text-ink">{a.patientName}</span>
                    <span className="block text-xs text-ink">{a.patientEmail}</span>
                  </td>
                  <td className="p-3.5 text-xs">{doc?.fullName}</td>
                  <td className="p-3.5 text-xs tabular-nums">{a.appointmentDate} · {a.slotTime}</td>
                  <td className="p-3.5">
                    <StatusBadge tone={a.status === 'cancelled' ? 'emergency' : a.status === 'completed' ? 'success' : 'teal'}>
                      {a.status}
                    </StatusBadge>
                  </td>
                  <td className="p-3.5 text-right">
                    <select
                      aria-label={`Status for ${a.bookingReference}`}
                      value={a.status}
                      onChange={(e) =>
                        statusMut.mutate({ id: a.id, status: e.target.value as AppointmentStatus })
                      }
                      className="min-h-[36px] rounded border border-champagne-border bg-surface px-2 py-1 text-xs text-ink"
                    >
                      <option value="confirmed">confirmed</option>
                      <option value="checked_in">checked_in</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminQueuePage() {
  const qc = useQueryClient();
  const queueQuery = useQuery({ queryKey: ['admin-queue'], queryFn: api.admin.getQueue });
  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: api.getDepartments });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QueueStatus }) =>
      api.admin.updateQueueStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-queue'] });
      qc.invalidateQueries({ queryKey: ['public-queue'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  if (queueQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Queue Counter Control</h1>
      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Token</th>
              <th className="p-3.5">Patient</th>
              <th className="p-3.5">Department / Counter</th>
              <th className="p-3.5">Priority</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(queueQuery.data?.tokens ?? []).map((tk) => {
              const dept = deptsQuery.data?.departments.find((d) => d.id === tk.departmentId);
              return (
                <tr key={tk.id}>
                  <td className="p-3.5 font-display font-bold text-ink tabular-nums">{tk.tokenNumber}</td>
                  <td className="p-3.5 font-medium">{tk.patientName}</td>
                  <td className="p-3.5 text-xs">{dept?.name} · {tk.counterLabel}</td>
                  <td className="p-3.5"><StatusBadge tone={tk.priority === 'emergency' ? 'emergency' : 'champagne'}>{tk.priority}</StatusBadge></td>
                  <td className="p-3.5"><StatusBadge tone="teal">{tk.status}</StatusBadge></td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: tk.id, status: 'called' })}>
                        Call
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => statusMut.mutate({ id: tk.id, status: 'in_service' })}>
                        Serve
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => statusMut.mutate({ id: tk.id, status: 'completed' })}>
                        Complete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
