import { useQuery } from '@tanstack/react-query';
import { Accessibility, CalendarCheck, Compass, Ticket, UserCog } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, LoadingState, SectionHeader, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function PatientDashboardPage() {
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);

  const apptQuery = useQuery({
    queryKey: ['my-appointments'],
    queryFn: api.getMyAppointments,
    enabled: Boolean(user),
  });
  const astQuery = useQuery({
    queryKey: ['my-assistance'],
    queryFn: api.getMyAssistanceRequests,
    enabled: Boolean(user),
  });
  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const appointments = apptQuery.data?.appointments ?? [];
  const activeVisits = appointments.filter((a) => a.status !== 'cancelled');
  const requests = astQuery.data?.requests ?? [];

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Personal Care Dashboard"
        title={`Welcome, ${user.fullName}`}
        description={`Account ${user.email} · Preferred Language: ${user.preferredLanguage === 'ta' ? 'தமிழ் (Tamil)' : 'English'}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/portal/profile">
              <Button variant="outline" size="sm">
                <UserCog className="h-4 w-4" aria-hidden="true" />
                <span>Edit Profile</span>
              </Button>
            </Link>
            <Link to="/appointments/book">
              <Button variant="primary" size="sm">Book Consultation</Button>
            </Link>
          </div>
        }
      />

      {/* Focused Patient Utility Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-architectural border border-champagne-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink">
              Active Visits
            </span>
            <CalendarCheck className="h-4 w-4 text-ink" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">
            {activeVisits.length}
          </p>
          <Link to="/appointments" className="mt-2 inline-block text-xs font-semibold text-ink hover:underline">
            Manage visits →
          </Link>
        </div>

        <div className="rounded-architectural border border-champagne-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink">
              Mobility Profile
            </span>
            <Accessibility className="h-4 w-4 text-ink" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-lg font-semibold text-ink">
            {user.accessibilityRequired ? 'Elevator-Only Preferred' : 'Standard Routing'}
          </p>
          <Link to="/portal/profile" className="mt-2 inline-block text-xs font-semibold text-ink hover:underline">
            Adjust accessibility →
          </Link>
        </div>

        <div className="rounded-architectural border border-champagne-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink">
              Concierge Requests
            </span>
            <Ticket className="h-4 w-4 text-ink" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">
            {requests.length}
          </p>
          <Link to="/assistance" className="mt-2 inline-block text-xs font-semibold text-ink hover:underline">
            Request escort →
          </Link>
        </div>
      </div>

      {apptQuery.isLoading ? (
        <LoadingState />
      ) : (
        <div className="rounded-architectural border border-champagne-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Upcoming Consultations &amp; Direct Floor Navigation
          </h2>
          <div className="mt-4 divide-y divide-champagne-border">
            {activeVisits.map((appt) => {
              const dest = graphQuery.data?.destinations.find((d) => d.id === appt.destinationId);
              return (
                <div
                  key={appt.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone="teal">{appt.status}</StatusBadge>
                      <span className="text-sm font-semibold text-ink tabular-nums">
                        {appt.appointmentDate} · {appt.slotTime}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink">
                      {dest ? `${dest.roomCode} · ${tf(dest.name, dest.nameTa)}` : ''} — {appt.reason}
                    </p>
                  </div>
                  {dest && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEndNodeId(dest.nodeId);
                        navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
                      }}
                    >
                      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Route to Suite</span>
                    </Button>
                  )}
                </div>
              );
            })}
            {activeVisits.length === 0 && (
              <p className="py-4 text-sm text-ink">No upcoming scheduled visits.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
