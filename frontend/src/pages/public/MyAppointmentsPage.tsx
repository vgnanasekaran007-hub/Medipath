import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Compass, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorBanner,
  LoadingState,
  SectionHeader,
  StatusBadge,
} from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function MyAppointmentsPage() {
  const { tf, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['my-appointments'],
    queryFn: api.getMyAppointments,
    enabled: Boolean(user),
  });

  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });
  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });

  const cancelMut = useMutation({
    mutationFn: api.cancelAppointment,
    onSuccess: () => {
      setConfirmCancelId(null);
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <EmptyState
          title="Sign in to view your appointments"
          description="Protected patient visit history requires signing in with your email and password."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/login"><Button variant="primary">Sign In</Button></Link>
              <Link to="/appointments/book"><Button variant="outline">Book as Guest</Button></Link>
            </div>
          }
        />
      </div>
    );
  }

  const appointments = query.data?.appointments ?? [];

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Patient Visits"
        title={t.appointments.myAppointments}
        description={`Showing outpatient bookings linked to ${user.email}.`}
        action={
          <Link to="/appointments/book">
            <Button variant="primary" size="sm">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span>New Appointment</span>
            </Button>
          </Link>
        }
      />

      {cancelMut.error && (
        <ErrorBanner message={cancelMut.error instanceof Error ? cancelMut.error.message : 'Unable to cancel'} />
      )}

      {query.isLoading ? (
        <LoadingState />
      ) : appointments.length === 0 ? (
        <EmptyState
          title="No consultations booked yet"
          description="Choose a specialist to schedule your consultation and link indoor turn-by-turn navigation."
          action={
            <Link to="/appointments/book"><Button variant="primary">Book First Visit</Button></Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const doc = doctorsQuery.data?.doctors.find((d) => d.id === appt.doctorId);
            const dest = graphQuery.data?.destinations.find((d) => d.id === appt.destinationId);

            return (
              <div
                key={appt.id}
                className="flex flex-col justify-between gap-4 rounded-architectural border border-champagne-border bg-surface p-5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xs font-semibold text-ink">
                      {appt.bookingReference}
                    </span>
                    <StatusBadge
                      tone={
                        appt.status === 'cancelled'
                          ? 'emergency'
                          : appt.status === 'completed'
                            ? 'success'
                            : 'teal'
                      }
                    >
                      {appt.status}
                    </StatusBadge>
                    <span className="text-xs font-medium text-ink tabular-nums">
                      {appt.appointmentDate} · {appt.slotTime}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {doc ? tf(doc.fullName, doc.fullNameTa) : 'Specialist Consultation'}
                  </h2>
                  <p className="text-sm text-ink">
                    {dest ? `${dest.roomCode} · ${tf(dest.name, dest.nameTa)}` : ''} — {appt.reason}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {dest && appt.status !== 'cancelled' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEndNodeId(dest.nodeId);
                        navigate(
                          `/navigate?dest=${encodeURIComponent(dest.nodeId)}${
                            appt.accessibilityNeeded ? '&accessible=true' : ''
                          }`,
                        );
                      }}
                    >
                      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Navigate</span>
                    </Button>
                  )}

                  {appt.status === 'confirmed' && (
                    confirmCancelId === appt.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="emergency"
                          size="sm"
                          loading={cancelMut.isPending}
                          onClick={() => cancelMut.mutate(appt.id)}
                        >
                          Confirm Cancel
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmCancelId(null)}
                        >
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmCancelId(appt.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.appointments.cancelVisit}</span>
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
