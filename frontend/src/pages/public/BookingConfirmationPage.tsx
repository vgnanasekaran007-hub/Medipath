import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Compass, MapPin, Printer } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, ErrorBanner, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function BookingConfirmationPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const setAccessibleOnly = useAppStore((s) => s.setAccessibleOnly);
  const email = searchParams.get('email') ?? undefined;

  const apptQuery = useQuery({
    queryKey: ['appointment-confirm', id, email],
    queryFn: () => api.getAppointmentById(id, email),
    enabled: Boolean(id),
  });

  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });
  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });

  if (apptQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (apptQuery.error || !apptQuery.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 sm:px-6">
        <ErrorBanner
          title="Confirmation unavailable"
          message={
            apptQuery.error instanceof Error
              ? apptQuery.error.message
              : 'Unable to load booking record.'
          }
        />
        <Link to="/appointments">
          <Button variant="outline">View My Appointments</Button>
        </Link>
      </div>
    );
  }

  const appt = apptQuery.data.appointment;
  const dest = graphQuery.data?.destinations.find((d) => d.id === appt.destinationId);
  const floor = graphQuery.data?.floors.find((f) => f.id === dest?.floorId);
  const doc = doctorsQuery.data?.doctors.find((d) => d.id === appt.doctorId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-architectural border border-champagne-border bg-surface p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-champagne-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-architectural bg-teal-mist text-ink">
              <CalendarCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">
                Visit Confirmed
              </p>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Ref: {appt.bookingReference}
              </h1>
            </div>
          </div>
          <StatusBadge tone={appt.status === 'cancelled' ? 'emergency' : 'success'}>
            {appt.status}
          </StatusBadge>
        </div>

        <dl className="mt-6 grid gap-4 text-sm text-ink sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-ink">Patient</dt>
            <dd className="mt-0.5 font-semibold text-ink">{appt.patientName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink">Consultation Specialist</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {doc ? tf(doc.fullName, doc.fullNameTa) : 'Assigned Specialist'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink">Date &amp; Slot</dt>
            <dd className="mt-0.5 font-medium text-ink tabular-nums">
              {appt.appointmentDate} · {appt.slotTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink">Destination Room</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-medium text-ink">
              <MapPin className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
              <span>
                {floor?.code} · Room {dest?.roomCode} ({dest ? tf(dest.name, dest.nameTa) : ''})
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-ink">Reason &amp; Mobility Preference</dt>
            <dd className="mt-0.5 text-ink">
              {appt.reason}{' '}
              {appt.accessibilityNeeded && '· Accessible Elevator-Only Routing Requested'}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-champagne-border pt-6">
          {dest && (
            <Button
              variant="primary"
              onClick={() => {
                setEndNodeId(dest.nodeId);
                if (appt.accessibilityNeeded) setAccessibleOnly(true);
                navigate(
                  `/navigate?dest=${encodeURIComponent(dest.nodeId)}${
                    appt.accessibilityNeeded ? '&accessible=true' : ''
                  }`,
                );
              }}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Open 3D Route from Entrance</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Print Pass</span>
          </Button>
          <Link to="/appointments">
            <Button variant="ghost">My Visits</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
