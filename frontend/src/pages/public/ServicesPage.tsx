import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, LoadingState, SectionHeader, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getServiceMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function ServicesPage() {
  const { tf, t } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const [catFilter, setCatFilter] = useState('all');

  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: api.getServices });
  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });

  const services = servicesQuery.data?.services ?? [];
  const destinations = graphQuery.data?.destinations ?? [];
  const visible =
    catFilter === 'all' ? services : services.filter((s) => s.category === catFilter);

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Patient Care Facilities"
        title={t.home.servicesHeading}
        description={t.home.servicesLead}
        action={
          <Link to="/assistance">
            <Button variant="primary" size="md">
              Request Wheelchair / Escort
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {['all', 'diagnostic', 'pharmacy', 'support', 'billing', 'amenity'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatFilter(cat)}
            className={`min-h-[44px] rounded px-4 text-xs font-semibold capitalize transition ${
              catFilter === cat
                ? 'bg-teal-deep text-white'
                : 'border border-champagne-border bg-surface text-ink hover:bg-champagne-soft'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {servicesQuery.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {visible.map((svc, idx) => {
            const dest = destinations.find((d) => d.id === svc.destinationId);
            const media = getServiceMedia(svc.slug, svc.category);
            return (
              <article
                key={svc.id}
                className="group flex flex-col justify-between overflow-hidden rounded-architectural border border-champagne-border bg-surface"
              >
                <div>
                  <Link to={`/services/${svc.slug}`} className="block overflow-hidden border-b border-champagne-border">
                    <img
                      src={media.src}
                      alt={tf(media.alt, media.altTa)}
                      width={media.width}
                      height={media.height}
                      loading={idx < 2 ? 'eager' : 'lazy'}
                      className="aspect-[16/9] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </Link>
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-ink">
                      <StatusBadge tone="champagne">{svc.category}</StatusBadge>
                      <span className="font-medium">{svc.turnaroundEstimate}</span>
                    </div>
                    <h2 className="mt-3 font-display text-xl font-semibold text-ink">
                      <Link to={`/services/${svc.slug}`} className="hover:underline">
                        {tf(svc.name, svc.nameTa)}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink">
                      {tf(svc.summary, svc.summaryTa)}
                    </p>
                    <p className="mt-3 rounded border border-champagne-border bg-ivory/70 px-3 py-2.5 text-xs leading-relaxed text-ink">
                      <strong>What to know:</strong> {tf(svc.preparationNotes, svc.preparationNotesTa)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-champagne-border px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{tf(svc.availability, svc.availabilityTa)}</span>
                  </span>
                  <div className="flex gap-2">
                    <Link to={`/services/${svc.slug}`}>
                      <Button variant="outline" size="sm">
                        <span>{t.common.viewDetails}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </Link>
                    {dest && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEndNodeId(dest.nodeId);
                          navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.common.directions}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
