import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  HelpCircle,
  Map as MapIcon,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, ErrorBanner, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { api } from '../../lib/api';

export function AdminOverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: api.admin.getOverview,
  });

  if (overviewQuery.isLoading) return <LoadingState />;
  if (overviewQuery.error || !overviewQuery.data) {
    return (
      <ErrorBanner
        message={
          overviewQuery.error instanceof Error
            ? overviewQuery.error.message
            : 'Unable to fetch overview metrics.'
        }
        onRetry={() => overviewQuery.refetch()}
      />
    );
  }

  const data = overviewQuery.data;

  const metrics = [
    { label: 'Total Active Visits', value: data.totalAppointments, sub: `${data.todayAppointments} scheduled today`, icon: CalendarCheck },
    { label: 'Registered Patients', value: data.registeredPatients, sub: 'Verified portal accounts', icon: Users },
    { label: 'Active Specialists', value: data.activeDoctors, sub: `${data.departmentCount} departments`, icon: Stethoscope },
    { label: 'Pending Assistance', value: data.pendingAssistanceRequests, sub: 'Wheelchair & escort desk', icon: HelpCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-champagne-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
            Hospital Command Telemetry
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Aurelia Pavilion Operations Overview
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/map-editor">
            <Button variant="primary" size="sm">
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              <span>Open 3D Map Editor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid — Database Backed */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-architectural border border-champagne-border bg-surface p-5"
            >
              <div className="flex items-center justify-between text-ink">
                <span className="text-xs font-semibold uppercase tracking-wider">{m.label}</span>
                <Icon className="h-4 w-4 text-ink" aria-hidden="true" />
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">
                {m.value}
              </p>
              <p className="mt-1 text-xs text-ink">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Operational Split: Queue + Spatial Graph Health */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-architectural border border-champagne-border bg-surface p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
              <Activity className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Outpatient Queue Counters</span>
            </h2>
            <Link to="/admin/queue" className="text-xs font-semibold text-ink hover:underline">
              Manage Queue →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Waiting', value: data.queueStats.waiting },
              { label: 'Called', value: data.queueStats.called },
              { label: 'In Service', value: data.queueStats.inService },
              { label: 'Completed', value: data.queueStats.completedToday },
            ].map((q) => (
              <div
                key={q.label}
                className="flex flex-col justify-between rounded border border-champagne-border bg-ivory/70 p-3.5"
              >
                <span className="block whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-ink">
                  {q.label}
                </span>
                <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
                  {q.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-architectural border border-champagne-border bg-surface p-6 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
              <Building2 className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Published Map Status ({data.activeMapVersion.label})</span>
            </h2>
            <StatusBadge tone={data.graphValidation.valid ? 'success' : 'emergency'}>
              {data.graphValidation.valid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Graph Connected</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Needs Review</span>
                </>
              )}
            </StatusBadge>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm text-ink">
            <div className="rounded border border-champagne-border bg-ivory/70 p-3">
              <dt className="text-xs text-ink">Active Nodes</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                {data.graphValidation.activeNodeCount}
              </dd>
            </div>
            <div className="rounded border border-champagne-border bg-ivory/70 p-3">
              <dt className="text-xs text-ink">Pathways</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                {data.graphValidation.edgeCount}
              </dd>
            </div>
            <div className="rounded border border-champagne-border bg-ivory/70 p-3">
              <dt className="text-xs text-ink">Destinations</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                {data.graphValidation.destinationCount}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Recent Audit Stream */}
      <div className="rounded-architectural border border-champagne-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Recent Audit Trail</h2>
          <Link to="/admin/audit-logs" className="text-xs font-semibold text-ink hover:underline">
            View Full Audit Log →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-champagne-border text-xs uppercase text-ink">
              <tr>
                <th className="py-2.5 pr-4">Time</th>
                <th className="py-2.5 pr-4">Actor</th>
                <th className="py-2.5 pr-4">Action</th>
                <th className="py-2.5">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-champagne-border">
              {data.recentAuditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 pr-4 text-xs text-ink tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-medium text-ink">{log.actorEmail}</td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge tone="champagne">{log.action}</StatusBadge>
                  </td>
                  <td className="py-2.5 text-ink">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
