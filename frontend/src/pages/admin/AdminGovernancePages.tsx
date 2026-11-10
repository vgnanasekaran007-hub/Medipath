import type { ServiceRequestStatus, UserRole } from '@medipath/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, LoadingState, StatusBadge, SuccessBanner } from '../../components/ui/Primitives';
import { api } from '../../lib/api';

export function AdminPatientsPage() {
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: api.admin.getUsers });
  const apptsQuery = useQuery({ queryKey: ['admin-appointments'], queryFn: api.admin.getAppointments });

  if (usersQuery.isLoading) return <LoadingState />;

  const patients = (usersQuery.data?.users ?? []).filter((u) => u.role === 'patient');
  const appts = apptsQuery.data?.appointments ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Patient Directory ({patients.length})</h1>
      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Patient Name</th>
              <th className="p-3.5">Contact</th>
              <th className="p-3.5">Language</th>
              <th className="p-3.5">Mobility Preference</th>
              <th className="p-3.5">Visits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {patients.map((p) => (
              <tr key={p.id}>
                <td className="p-3.5 font-medium text-ink">{p.fullName}</td>
                <td className="p-3.5 text-xs text-ink">{p.email} · {p.phone || '—'}</td>
                <td className="p-3.5 text-xs uppercase">{p.preferredLanguage}</td>
                <td className="p-3.5 text-xs">
                  <StatusBadge tone={p.accessibilityRequired ? 'teal' : 'neutral'}>
                    {p.accessibilityRequired ? 'Step-Free Elevator Only' : 'Standard'}
                  </StatusBadge>
                </td>
                <td className="p-3.5 text-xs font-semibold tabular-nums">
                  {appts.filter((a) => a.patientId === p.id || a.patientEmail === p.email).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const qc = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: api.admin.getUsers });
  const mut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => api.admin.updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (usersQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">User &amp; Role Management</h1>
      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Name</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">Current Role</th>
              <th className="p-3.5 text-right">Assign Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(usersQuery.data?.users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="p-3.5 font-medium text-ink">{u.fullName}</td>
                <td className="p-3.5 text-xs text-ink">{u.email}</td>
                <td className="p-3.5"><StatusBadge tone={u.role === 'admin' ? 'teal' : 'champagne'}>{u.role}</StatusBadge></td>
                <td className="p-3.5 text-right">
                  <select
                    aria-label={`Role for ${u.email}`}
                    value={u.role}
                    onChange={(e) => mut.mutate({ id: u.id, role: e.target.value as UserRole })}
                    className="min-h-[36px] rounded border border-champagne-border bg-surface px-2.5 py-1 text-xs text-ink"
                  >
                    <option value="patient">patient</option>
                    <option value="hospital_staff">hospital_staff</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminServiceRequestsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-service-requests'], queryFn: api.admin.getServiceRequests });

  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceRequestStatus }) =>
      api.admin.updateServiceRequest(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Service &amp; Escort Requests</h1>
      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Requester</th>
              <th className="p-3.5">Service</th>
              <th className="p-3.5">Pickup Point</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(query.data?.requests ?? []).map((r) => (
              <tr key={r.id}>
                <td className="p-3.5 font-medium text-ink">
                  {r.requesterName}
                  <span className="block text-xs text-ink">{r.requesterPhone}</span>
                </td>
                <td className="p-3.5 text-xs capitalize">{r.requestType.replace('_', ' ')}</td>
                <td className="p-3.5 text-xs">{r.pickupLabel}</td>
                <td className="p-3.5"><StatusBadge tone={r.status === 'resolved' ? 'success' : 'champagne'}>{r.status}</StatusBadge></td>
                <td className="p-3.5 text-right">
                  <select
                    aria-label={`Status for ${r.requesterName}`}
                    value={r.status}
                    onChange={(e) => mut.mutate({ id: r.id, status: e.target.value as ServiceRequestStatus })}
                    className="min-h-[36px] rounded border border-champagne-border bg-surface px-2.5 py-1 text-xs text-ink"
                  >
                    <option value="pending">pending</option>
                    <option value="assigned">assigned</option>
                    <option value="in_progress">in_progress</option>
                    <option value="resolved">resolved</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminAnnouncementsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-announcements'], queryFn: api.admin.getAnnouncements });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<'info' | 'advisory' | 'emergency'>('info');

  const mut = useMutation({
    mutationFn: api.admin.upsertAnnouncement,
    onSuccess: () => {
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      qc.invalidateQueries({ queryKey: ['hospital-overview'] });
    },
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteAnnouncement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Hospital Announcements</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ title: title.trim(), body: body.trim(), severity, isActive: true });
        }}
        className="space-y-3 rounded-architectural border border-champagne-border bg-surface p-5"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="text" required placeholder="Announcement Headline" value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink sm:col-span-2" />
          <select value={severity} onChange={(e) => setSeverity(e.target.value as 'info' | 'advisory' | 'emergency')} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink">
            <option value="info">info</option>
            <option value="advisory">advisory</option>
            <option value="emergency">emergency</option>
          </select>
        </div>
        <textarea rows={2} required placeholder="Full public campus advisory details…" value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded border border-champagne-border bg-surface p-3 text-sm text-ink" />
        <Button type="submit" variant="primary" size="sm" loading={mut.isPending}>Publish Notice</Button>
      </form>

      <div className="space-y-3">
        {(query.data?.announcements ?? []).map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-4 rounded-architectural border border-champagne-border bg-surface p-4">
            <div>
              <StatusBadge tone={a.severity === 'emergency' ? 'emergency' : 'teal'}>{a.severity}</StatusBadge>
              <h2 className="mt-2 font-display text-base font-semibold text-ink">{a.title}</h2>
              <p className="mt-1 text-sm text-ink">{a.body}</p>
            </div>
            <button type="button" onClick={() => delMut.mutate(a.id)} className="rounded p-2 text-emergency hover:bg-emergency-soft" aria-label={`Delete ${a.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const query = useQuery({ queryKey: ['admin-audit-logs'], queryFn: () => api.admin.getAuditLogs(150) });
  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Audit Logs</h1>
      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Actor</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Entity</th>
              <th className="p-3.5">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {(query.data?.logs ?? []).map((log) => (
              <tr key={log.id}>
                <td className="p-3.5 text-xs text-ink tabular-nums">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3.5 text-xs font-medium text-ink">{log.actorEmail} ({log.actorRole})</td>
                <td className="p-3.5"><StatusBadge tone="champagne">{log.action}</StatusBadge></td>
                <td className="p-3.5 font-mono text-xs">{log.entityType}</td>
                <td className="p-3.5 text-xs text-ink">{log.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSettingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['hospital-overview'], queryFn: api.getHospitalOverview });
  const hospital = query.data?.hospital;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [visitingHours, setVisitingHours] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hospital && !name) {
      setName(hospital.name);
      setAddress(hospital.address);
      setPhone(hospital.phone);
      setEmergencyPhone(hospital.emergencyPhone);
      setVisitingHours(hospital.visitingHours);
    }
  }, [hospital, name]);

  const mut = useMutation({
    mutationFn: api.admin.updateHospital,
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['hospital-overview'] });
    },
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Hospital System Settings</h1>
      {saved && <SuccessBanner message="Hospital configuration saved cleanly." />}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setSaved(false);
          mut.mutate({ name, address, phone, emergencyPhone, visitingHours });
        }}
        className="space-y-4 rounded-architectural border border-champagne-border bg-surface p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="set-name" className="mb-1 block text-xs font-medium text-ink">Hospital Name</label>
            <input id="set-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
          </div>
          <div>
            <label htmlFor="set-hours" className="mb-1 block text-xs font-medium text-ink">Visiting Hours</label>
            <input id="set-hours" type="text" value={visitingHours} onChange={(e) => setVisitingHours(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
          </div>
          <div>
            <label htmlFor="set-phone" className="mb-1 block text-xs font-medium text-ink">Concierge Phone</label>
            <input id="set-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
          </div>
          <div>
            <label htmlFor="set-er" className="mb-1 block text-xs font-medium text-ink">Emergency Phone</label>
            <input id="set-er" type="text" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="set-addr" className="mb-1 block text-xs font-medium text-ink">Campus Address</label>
            <input id="set-addr" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
          </div>
        </div>
        <Button type="submit" variant="primary" loading={mut.isPending}>Save System Settings</Button>
      </form>
    </div>
  );
}
