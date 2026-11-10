import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Ticket } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, ErrorBanner, LoadingState, SectionHeader, StatusBadge, SuccessBanner } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function QueueTrackingPage() {
  const { t, tf } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [issueDeptId, setIssueDeptId] = useState('');
  const [patientName, setPatientName] = useState(user?.fullName ?? '');
  const [priority, setPriority] = useState<'normal' | 'priority' | 'emergency'>('normal');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: api.getDepartments });
  const queueQuery = useQuery({
    queryKey: ['public-queue', deptFilter],
    queryFn: () => api.getQueue(deptFilter === 'all' ? undefined : deptFilter),
    refetchInterval: 10_000,
  });

  const departments = deptsQuery.data?.departments ?? [];

  useEffect(() => {
    if (!issueDeptId && departments.length > 0) {
      setIssueDeptId(departments[0].id);
    }
  }, [issueDeptId, departments]);

  const issueMut = useMutation({
    mutationFn: api.issueQueueToken,
    onSuccess: ({ token }) => {
      setIssuedToken(`Token ${token.tokenNumber} issued for ${token.counterLabel} (Est. wait ~${token.estimatedWaitMinutes} min).`);
      queryClient.invalidateQueries({ queryKey: ['public-queue'] });
    },
  });

  const handleIssue = (e: FormEvent) => {
    e.preventDefault();
    if (!issueDeptId || patientName.trim().length < 2) return;
    issueMut.mutate({
      departmentId: issueDeptId,
      patientName: patientName.trim(),
      priority,
    });
  };

  const tokens = queueQuery.data?.tokens ?? [];
  const activeTokens = tokens.filter((tk) => tk.status === 'called' || tk.status === 'in_service');
  const waitingTokens = tokens.filter((tk) => tk.status === 'waiting');

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Live Outpatient Flow"
        title={t.queue.title}
        description={t.queue.privacyNote}
        action={
          <Button variant="outline" size="sm" onClick={() => queueQuery.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Refresh Board</span>
          </Button>
        }
      />

      {/* Department filter strip */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setDeptFilter('all')}
          className={`min-h-[44px] rounded px-3.5 text-xs font-semibold ${
            deptFilter === 'all'
              ? 'bg-teal-deep text-white'
              : 'border border-champagne-border bg-surface text-ink hover:bg-ivory'
          }`}
        >
          All Departments
        </button>
        {departments.slice(0, 6).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDeptFilter(d.id)}
            className={`min-h-[44px] rounded px-3.5 text-xs font-semibold ${
              deptFilter === d.id
                ? 'bg-teal-deep text-white'
                : 'border border-champagne-border bg-surface text-ink hover:bg-ivory'
            }`}
          >
            {tf(d.name, d.nameTa)}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {queueQuery.isLoading ? (
            <LoadingState />
          ) : (
            <>
              <div className="rounded-architectural border border-champagne-border bg-surface p-6">
                <h2 className="font-display text-base font-semibold text-ink">
                  {t.queue.currentlyCalled}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {activeTokens.map((tk) => {
                    const dept = departments.find((d) => d.id === tk.departmentId);
                    return (
                      <div
                        key={tk.id}
                        className="flex items-center justify-between gap-2 rounded-architectural border border-champagne-border bg-teal-mist p-4"
                      >
                        <div>
                          <span className="font-display text-2xl font-bold text-ink tabular-nums">
                            {tk.tokenNumber}
                          </span>
                          <p className="mt-0.5 text-xs font-medium text-ink">
                            {dept ? tf(dept.name, dept.nameTa) : ''} · {tk.counterLabel}
                          </p>
                          <p className="text-xs text-ink">Visitor: {tk.patientName}</p>
                        </div>
                        <StatusBadge tone="teal">
                          {tk.status === 'called' ? 'Proceed to Counter' : 'In Consultation'}
                        </StatusBadge>
                      </div>
                    );
                  })}
                  {activeTokens.length === 0 && (
                    <p className="text-sm text-ink">No tokens actively called right now.</p>
                  )}
                </div>
              </div>

              <div className="rounded-architectural border border-champagne-border bg-surface p-6">
                <h2 className="font-display text-base font-semibold text-ink">
                  {t.queue.waitingList} ({waitingTokens.length})
                </h2>
                <div className="mt-4 divide-y divide-champagne-border">
                  {waitingTokens.map((tk) => {
                    const dept = departments.find((d) => d.id === tk.departmentId);
                    return (
                      <div key={tk.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="min-w-[58px] font-display font-bold text-ink tabular-nums">
                            {tk.tokenNumber}
                          </span>
                          <div>
                            <p className="font-medium text-ink">
                              {dept ? tf(dept.name, dept.nameTa) : ''}
                            </p>
                            <p className="text-xs text-ink">
                              {tk.counterLabel} · {tk.patientName}
                            </p>
                          </div>
                        </div>
                        <StatusBadge tone={tk.priority === 'emergency' ? 'emergency' : 'champagne'}>
                          Est. {tk.estimatedWaitMinutes} min
                        </StatusBadge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Issue Check-In Token Form */}
        <aside className="lg:col-span-4">
          <div className="rounded-architectural border border-champagne-border bg-surface p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Ticket className="h-5 w-5 text-ink" aria-hidden="true" />
              <span>{t.queue.issueToken}</span>
            </h2>
            <p className="mt-1 text-xs text-ink">
              Generate an outpatient walk-in or arrival queue number before reaching the clinic counter.
            </p>

            {issuedToken && (
              <div className="mt-4">
                <SuccessBanner message={issuedToken} />
              </div>
            )}
            {issueMut.error && (
              <div className="mt-4">
                <ErrorBanner
                  message={issueMut.error instanceof Error ? issueMut.error.message : 'Unable to issue token'}
                />
              </div>
            )}

            <form onSubmit={handleIssue} className="mt-5 space-y-4">
              <div>
                <label htmlFor="q-dept" className="mb-1 block text-xs font-medium text-ink">
                  Department / Desk
                </label>
                <select
                  id="q-dept"
                  value={issueDeptId}
                  onChange={(e) => setIssueDeptId(e.target.value)}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {tf(d.name, d.nameTa)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="q-name" className="mb-1 block text-xs font-medium text-ink">
                  Patient Full Name
                </label>
                <input
                  id="q-name"
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink placeholder:text-ink/60"
                />
              </div>

              <div>
                <label htmlFor="q-priority" className="mb-1 block text-xs font-medium text-ink">
                  Priority Category
                </label>
                <select
                  id="q-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'normal' | 'priority' | 'emergency')}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                >
                  <option value="normal">Standard Outpatient</option>
                  <option value="priority">Senior / Wheelchair Priority</option>
                  <option value="emergency">Urgent Triage</option>
                </select>
              </div>

              <Button type="submit" variant="primary" className="w-full" loading={issueMut.isPending}>
                Issue Queue Number
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
