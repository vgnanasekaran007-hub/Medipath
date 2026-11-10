import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, LoadingState, SectionHeader, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DoctorsPage() {
  const { tf, t } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });
  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: api.getDepartments });
  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });

  const doctors = doctorsQuery.data?.doctors ?? [];
  const schedules = doctorsQuery.data?.schedules ?? [];
  const departments = deptsQuery.data?.departments ?? [];
  const destinations = graphQuery.data?.destinations ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (deptFilter !== 'all' && d.departmentId !== deptFilter) return false;
      if (!q) return true;
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.fullNameTa.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
      );
    });
  }, [doctors, deptFilter, search]);

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Medical Specialists"
        title={t.home.doctorsHeading}
        description={t.home.doctorsLead}
      />

      <div className="flex flex-col gap-3 rounded-architectural border border-champagne-border bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search specialists"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name or clinical specialty…"
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-ivory/70 pl-9 pr-3 text-sm text-ink placeholder:text-ink/60"
          />
        </div>
        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="min-h-[44px] rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink sm:w-64"
        >
          <option value="all">All Departments</option>
          {departments.map((dep) => (
            <option key={dep.id} value={dep.id}>
              {tf(dep.name, dep.nameTa)}
            </option>
          ))}
        </select>
      </div>

      {doctorsQuery.isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching specialists"
          description="Try broadening your search or choosing another department."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => {
            const dept = departments.find((d) => d.id === doc.departmentId);
            const dest = destinations.find((d) => d.id === doc.destinationId);
            const docSched = schedules.filter((s) => s.doctorId === doc.id && s.isAvailable);

            return (
              <article
                key={doc.id}
                className="flex flex-col justify-between rounded-architectural border border-champagne-border bg-surface p-6"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-architectural border border-champagne-border bg-teal-deep font-serif text-lg font-semibold text-champagne">
                      {doc.portraitInitials}
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-ink">
                        <Link to={`/doctors/${doc.slug}`} className="hover:underline">
                          {tf(doc.fullName, doc.fullNameTa)}
                        </Link>
                      </h2>
                      <p className="text-xs font-medium text-ink">
                        {tf(doc.title, doc.titleTa)}
                      </p>
                      <p className="mt-1 text-xs text-ink">
                        {dept ? tf(dept.name, dept.nameTa) : ''} · Room {dest?.roomCode}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-ink">
                    {tf(doc.bio, doc.bioTa)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {docSched.map((s) => (
                      <StatusBadge key={s.id} tone="champagne">
                        {WEEKDAYS[s.dayOfWeek]} {s.startTime}–{s.endTime}
                      </StatusBadge>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-champagne-border pt-4">
                  <span className="text-xs font-semibold text-ink tabular-nums">
                    ₹{doc.consultationFee} · {doc.experienceYears} yrs exp.
                  </span>
                  <div className="flex gap-2">
                    {dest && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEndNodeId(dest.nodeId);
                          navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Suite</span>
                      </Button>
                    )}
                    <Link to={`/appointments/book?doctorId=${encodeURIComponent(doc.id)}`}>
                      <Button variant="primary" size="sm">
                        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Book</span>
                      </Button>
                    </Link>
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
