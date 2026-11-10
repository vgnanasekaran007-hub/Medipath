import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Clock, Compass, User } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FloorPlan2DSVG } from '../../components/navigation/FloorPlan2DSVG';
import { Button, ErrorBanner, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getDepartmentMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function DepartmentDetailPage() {
  const { slug = '' } = useParams();
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);

  const detailQuery = useQuery({
    queryKey: ['department-detail', slug],
    queryFn: () => api.getDepartmentBySlug(slug),
    enabled: Boolean(slug),
  });

  const graphQuery = useQuery({
    queryKey: ['navigation-graph'],
    queryFn: api.getNavigationGraph,
  });

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-12 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-editorial space-y-4 px-4 py-12 sm:px-6">
        <ErrorBanner title="Department unavailable" message="The requested wing could not be loaded." />
        <Link to="/departments">
          <Button variant="outline">Back to Departments</Button>
        </Link>
      </div>
    );
  }

  const { department, doctors, destinations, floor } = detailQuery.data;
  const primaryDest = destinations[0];
  const deptMedia = getDepartmentMedia(department.slug);

  return (
    <div className="mx-auto max-w-editorial space-y-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-6 border-b border-champagne-border pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={department.isEmergency ? 'emergency' : 'teal'}>
              {floor?.code ?? 'L0'} · {department.code}
            </StatusBadge>
            <span className="text-xs font-medium text-ink">
              {tf(department.wing, department.wingTa)}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
            {tf(department.name, department.nameTa)}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">
            {tf(department.description, department.descriptionTa)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {primaryDest && (
            <Button
              variant="primary"
              onClick={() => {
                setEndNodeId(primaryDest.nodeId);
                navigate(`/navigate?dest=${encodeURIComponent(primaryDest.nodeId)}`);
              }}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>3D Directions to Wing</span>
            </Button>
          )}
          <Link to="/appointments/book">
            <Button variant="outline">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span>Book Consultation</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <div className="overflow-hidden rounded-architectural border border-champagne-border bg-surface">
            <img
              src={deptMedia.src}
              alt={tf(deptMedia.alt, deptMedia.altTa)}
              width={deptMedia.width}
              height={deptMedia.height}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="p-6">
              <h2 className="font-display text-base font-semibold text-ink">
                Department Operations
              </h2>
              <dl className="mt-4 space-y-3 text-sm text-ink">
                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 h-4 w-4 text-ink" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold text-ink">Clinical Lead</dt>
                    <dd className="font-medium text-ink">{department.clinicalLead}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 text-ink" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold text-ink">Service Hours</dt>
                    <dd className="font-medium text-ink">
                      {tf(department.openHours, department.openHoursTa)}
                    </dd>
                  </div>
                </div>
              </dl>
              {department.amenities.length > 0 && (
                <div className="mt-5 border-t border-champagne-border pt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Suite Amenities
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {department.amenities.map((a) => (
                      <StatusBadge key={a} tone="champagne">
                        {a}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-architectural border border-champagne-border bg-surface p-6">
            <h2 className="font-display text-base font-semibold text-ink">
              Specialists in This Department ({doctors.length})
            </h2>
            <div className="mt-4 space-y-3">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded border border-champagne-border bg-ivory/60 p-3.5"
                >
                  <div>
                    <Link
                      to={`/doctors/${doc.slug}`}
                      className="font-display text-sm font-semibold text-ink hover:underline"
                    >
                      {tf(doc.fullName, doc.fullNameTa)}
                    </Link>
                    <p className="text-xs text-ink">{tf(doc.specialty, doc.specialtyTa)}</p>
                  </div>
                  <Link
                    to={`/appointments/book?doctorId=${encodeURIComponent(doc.id)}`}
                    className="inline-flex min-h-[38px] items-center rounded bg-teal-deep px-3 text-xs font-semibold text-white hover:bg-teal-forest"
                  >
                    Book
                  </Link>
                </div>
              ))}
              {doctors.length === 0 && (
                <p className="text-sm text-ink">Walk-in clinical care &amp; diagnostic triage.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {floor && graphQuery.data && (
            <FloorPlan2DSVG
              floor={floor}
              nodes={graphQuery.data.nodes}
              edges={graphQuery.data.edges}
              destinations={graphQuery.data.destinations}
              qrCheckpoints={graphQuery.data.qrCheckpoints}
              endNodeId={primaryDest?.nodeId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
