import { useQuery } from '@tanstack/react-query';
import { Clock, Compass, FileCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorBanner, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getServiceMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function ServiceDetailPage() {
  const { slug = '' } = useParams();
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);

  const query = useQuery({
    queryKey: ['service-detail', slug],
    queryFn: () => api.getServiceBySlug(slug),
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
        <ErrorBanner title="Service unavailable" message="The requested service details could not be loaded." />
        <Link to="/services"><Button variant="outline">Back to Services</Button></Link>
      </div>
    );
  }

  const { service, destination } = query.data;
  const media = getServiceMedia(service.slug, service.category);

  return (
    <div className="mx-auto max-w-editorial px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-architectural border border-champagne-border bg-surface">
        <div className="grid lg:grid-cols-12">
          <div className="p-6 sm:p-10 lg:col-span-7">
            <StatusBadge tone="champagne">{service.category}</StatusBadge>
            <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
              {tf(service.name, service.nameTa)}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">
              {tf(service.details, service.detailsTa)}
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-architectural border border-champagne-border bg-ivory/70 p-5">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                  <FileCheck className="h-4 w-4 text-ink" aria-hidden="true" />
                  <span>What to Prepare</span>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {tf(service.preparationNotes, service.preparationNotesTa)}
                </p>
              </div>
              <div className="rounded-architectural border border-champagne-border bg-ivory/70 p-5">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                  <Clock className="h-4 w-4 text-ink" aria-hidden="true" />
                  <span>Open Hours &amp; Wait Time</span>
                </h2>
                <p className="mt-2 text-sm text-ink">{tf(service.availability, service.availabilityTa)}</p>
                <p className="mt-1 text-xs font-medium text-ink">Typical wait: {service.turnaroundEstimate}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-champagne-border pt-6">
              {destination && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEndNodeId(destination.nodeId);
                    navigate(`/navigate?dest=${encodeURIComponent(destination.nodeId)}`);
                  }}
                >
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>Show 3D Path to {destination.roomCode} ({tf(destination.name, destination.nameTa)})</span>
                </Button>
              )}
              <Link to="/assistance">
                <Button variant="outline">Request Escort / Wheelchair</Button>
              </Link>
            </div>
          </div>

          <div className="border-t border-champagne-border lg:col-span-5 lg:border-l lg:border-t-0">
            <img
              src={media.src}
              alt={tf(media.alt, media.altTa)}
              width={media.width}
              height={media.height}
              className="h-full min-h-[260px] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
