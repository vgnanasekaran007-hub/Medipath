import { useQuery } from '@tanstack/react-query';
import { Award, CalendarPlus, Clock, Compass, Languages } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorBanner, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DoctorDetailPage() {
  const { slug = '' } = useParams();
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);

  const query = useQuery({
    queryKey: ['doctor-detail', slug],
    queryFn: () => api.getDoctorBySlug(slug),
    enabled: Boolean(slug),
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-12 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="mx-auto max-w-editorial space-y-4 px-4 py-12 sm:px-6">
        <ErrorBanner title="Specialist profile unavailable" message="Could not find the requested doctor." />
        <Link to="/doctors"><Button variant="outline">Back to Specialists</Button></Link>
      </div>
    );
  }

  const { doctor, schedules, department, destination } = query.data;

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <div className="rounded-architectural border border-champagne-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-architectural border border-champagne-border bg-teal-deep font-serif text-2xl font-semibold text-champagne">
              {doctor.portraitInitials}
            </div>
            <div>
              {department && (
                <Link to={`/departments/${department.slug}`}>
                  <StatusBadge tone="teal">{tf(department.name, department.nameTa)}</StatusBadge>
                </Link>
              )}
              <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {tf(doctor.fullName, doctor.fullNameTa)}
              </h1>
              <p className="mt-1 text-sm font-medium text-ink">
                {tf(doctor.title, doctor.titleTa)} · {tf(doctor.specialty, doctor.specialtyTa)}
              </p>
              <p className="mt-1 text-xs text-ink">{doctor.qualifications}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {destination && (
              <Button
                variant="outline"
                onClick={() => {
                  setEndNodeId(destination.nodeId);
                  navigate(`/navigate?dest=${encodeURIComponent(destination.nodeId)}`);
                }}
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>3D Route to Suite {destination.roomCode}</span>
              </Button>
            )}
            <Link to={`/appointments/book?doctorId=${encodeURIComponent(doctor.id)}`}>
              <Button variant="primary">
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t border-champagne-border pt-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h2 className="font-display text-base font-semibold text-ink">Clinical Practice</h2>
            <p className="text-sm leading-relaxed text-ink">{tf(doctor.bio, doctor.bioTa)}</p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm text-ink">
              <span className="inline-flex items-center gap-2 text-ink">
                <Languages className="h-4 w-4 text-ink" aria-hidden="true" />
                Languages: {doctor.languages.join(', ')}
              </span>
              <span className="inline-flex items-center gap-2 text-ink tabular-nums">
                <Award className="h-4 w-4 text-ink" aria-hidden="true" />
                Experience: {doctor.experienceYears} years · Fee ₹{doctor.consultationFee}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
              <Clock className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Weekly Consultation Hours</span>
            </h2>
            <div className="mt-3 divide-y divide-champagne-border rounded-architectural border border-champagne-border bg-ivory/60">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-ink">{WEEKDAYS_FULL[s.dayOfWeek]}</span>
                  <span className="text-ink tabular-nums">
                    {s.startTime} – {s.endTime} · {s.roomLabel}
                  </span>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="p-4 text-sm text-ink">On-call rotational schedule.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
