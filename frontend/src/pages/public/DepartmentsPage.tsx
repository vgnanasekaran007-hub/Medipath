import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, LoadingState, SectionHeader, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getDepartmentMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function DepartmentsPage() {
  const { tf, t } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);

  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: api.getDepartments });
  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });

  const departments = deptsQuery.data?.departments ?? [];
  const floors = graphQuery.data?.floors ?? [];
  const destinations = graphQuery.data?.destinations ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments.filter((d) => {
      if (floorFilter !== 'all' && d.floorId !== floorFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.nameTa.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
      );
    });
  }, [departments, floorFilter, search]);

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Pavilion A · Clinical Units"
        title={t.home.deptsHeading}
        description={t.home.deptsLead}
      />

      {/* Search & Floor Filter */}
      <div className="flex flex-col gap-4 rounded-architectural border border-champagne-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Filter departments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cardiology, radiology, ICU…"
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-ivory/70 pl-9 pr-3 text-sm text-ink placeholder:text-ink/60"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFloorFilter('all')}
            className={`min-h-[44px] rounded px-3.5 text-xs font-semibold ${
              floorFilter === 'all'
                ? 'bg-teal-deep text-white'
                : 'border border-champagne-border bg-ivory text-ink'
            }`}
          >
            All Floors
          </button>
          {floors.map((fl) => (
            <button
              key={fl.id}
              type="button"
              onClick={() => setFloorFilter(fl.id)}
              className={`min-h-[44px] rounded px-3.5 text-xs font-semibold ${
                floorFilter === fl.id
                  ? 'bg-teal-deep text-white'
                  : 'border border-champagne-border bg-ivory text-ink'
              }`}
            >
              {fl.code}
            </button>
          ))}
        </div>
      </div>

      {deptsQuery.isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No departments match your filter"
          description="Try clearing your search term or selecting All Floors."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setFloorFilter('all');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-champagne-border border-y border-champagne-border bg-surface">
          {filtered.map((dept) => {
            const fl = floors.find((f) => f.id === dept.floorId);
            const dest = destinations.find((x) => x.id === dept.primaryDestinationId);
            const media = getDepartmentMedia(dept.slug);
            return (
              <div
                key={dept.id}
                className="grid gap-4 px-4 py-5 transition hover:bg-ivory/60 sm:px-5 md:grid-cols-12 md:items-center"
              >
                <div className="flex items-start gap-4 md:col-span-5">
                  <Link
                    to={`/departments/${dept.slug}`}
                    className="hidden shrink-0 overflow-hidden rounded-architectural border border-champagne-border sm:block"
                  >
                    <img
                      src={media.src}
                      alt={tf(media.alt, media.altTa)}
                      width={media.width}
                      height={media.height}
                      loading="lazy"
                      className="h-20 w-28 object-cover"
                    />
                  </Link>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={dept.isEmergency ? 'emergency' : 'teal'}>
                        {fl?.code ?? 'L0'} · {dept.code}
                      </StatusBadge>
                      <span className="text-xs text-ink">{tf(dept.openHours, dept.openHoursTa)}</span>
                    </div>
                    <h2 className="mt-2 font-display text-lg font-semibold text-ink">
                      <Link to={`/departments/${dept.slug}`} className="hover:underline">
                        {tf(dept.name, dept.nameTa)}
                      </Link>
                    </h2>
                    <p className="text-xs text-ink">{tf(dept.wing, dept.wingTa)}</p>
                  </div>
                </div>

                <div className="md:col-span-4">
                  <p className="text-sm leading-relaxed text-ink">
                    {tf(dept.summary, dept.summaryTa)}
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-ink">Lead: {dept.clinicalLead}</p>
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-3 md:justify-end">
                  <Link to={`/departments/${dept.slug}`}>
                    <Button variant="outline" size="sm">
                      {t.common.viewDetails}
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
                      <span>Route</span>
                    </Button>
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
