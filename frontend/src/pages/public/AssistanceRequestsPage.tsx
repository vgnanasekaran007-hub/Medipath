import type { AssistanceType } from '@medipath/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accessibility } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  ErrorBanner,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getServiceMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function AssistanceRequestsPage() {
  const { tf } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

  const graphQuery = useQuery({ queryKey: ['navigation-graph'], queryFn: api.getNavigationGraph });
  const myRequestsQuery = useQuery({
    queryKey: ['my-assistance'],
    queryFn: api.getMyAssistanceRequests,
    enabled: Boolean(user),
  });

  const nodes = graphQuery.data?.nodes ?? [];
  const destinations = graphQuery.data?.destinations ?? [];

  const [requesterName, setRequesterName] = useState(user?.fullName ?? '');
  const [requesterPhone, setRequesterPhone] = useState(user?.phone ?? '+91 98401 00000');
  const [requestType, setRequestType] = useState<AssistanceType>('wheelchair');
  const [pickupNodeId, setPickupNodeId] = useState(searchParams.get('pickupNodeId') ?? '');
  const [pickupLabel, setPickupLabel] = useState('Main Entrance Portico');
  const [destinationId, setDestinationId] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: api.submitAssistanceRequest,
    onSuccess: ({ request }) => {
      setSuccessMsg(
        `Concierge request ${request.id.slice(0, 8)} logged at ${request.pickupLabel}. Ground Atrium staff notified.`,
      );
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['my-assistance'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    const chosenNode = nodes.find((n) => n.id === pickupNodeId);
    mutation.mutate({
      requesterName: requesterName.trim(),
      requesterPhone: requesterPhone.trim(),
      requestType,
      pickupNodeId: pickupNodeId || undefined,
      pickupLabel: chosenNode ? tf(chosenNode.label, chosenNode.labelTa) : pickupLabel.trim(),
      destinationId: destinationId || undefined,
      notes: notes.trim(),
    });
  };

  const mobilityMedia = getServiceMedia('wheelchair-escort-assistance', 'support');

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Patient Mobility & Concierge"
        title="Request Wheelchair, Porter Escort or Interpreter"
        description="Dispatch ground-atrium mobility assistance to meet you at any entrance, lobby elevator, or QR checkpoint."
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {successMsg && <div className="mb-4"><SuccessBanner message={successMsg} /></div>}
          {mutation.error && (
            <div className="mb-4">
              <ErrorBanner
                message={mutation.error instanceof Error ? mutation.error.message : 'Unable to send request'}
              />
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-architectural border border-champagne-border bg-surface p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ast-name" className="mb-1 block text-xs font-medium text-ink">
                  Visitor / Patient Name
                </label>
                <input
                  id="ast-name"
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="ast-phone" className="mb-1 block text-xs font-medium text-ink">
                  Contact Mobile Number
                </label>
                <input
                  id="ast-phone"
                  type="tel"
                  required
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ast-type" className="mb-1 block text-xs font-medium text-ink">
                Service Type
              </label>
              <select
                id="ast-type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as AssistanceType)}
                className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
              >
                <option value="wheelchair">Wheelchair &amp; Porter Escort</option>
                <option value="porter_escort">Walking Guide / Escort</option>
                <option value="language_interpreter">Tamil / English / Multilingual Help</option>
                <option value="emergency_guidance">Urgent Priority Escort</option>
                <option value="general_inquiry">General Concierge Desk</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ast-pickup" className="mb-1 block text-xs font-medium text-ink">
                  Pickup Landmark / QR Spot
                </label>
                <select
                  id="ast-pickup"
                  value={pickupNodeId}
                  onChange={(e) => setPickupNodeId(e.target.value)}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                >
                  <option value="">Other Entrance / Specify Below</option>
                  {nodes
                    .filter((n) => n.type === 'entrance' || n.type === 'elevator' || n.type === 'department_entrance')
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.code} — {tf(n.label, n.labelTa)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="ast-dest" className="mb-1 block text-xs font-medium text-ink">
                  Target Department / Destination (Optional)
                </label>
                <select
                  id="ast-dest"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                >
                  <option value="">Select destination…</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.roomCode} — {tf(d.name, d.nameTa)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!pickupNodeId && (
              <div>
                <label htmlFor="ast-label" className="mb-1 block text-xs font-medium text-ink">
                  Describe Your Current Waiting Location
                </label>
                <input
                  id="ast-label"
                  type="text"
                  required
                  value={pickupLabel}
                  onChange={(e) => setPickupLabel(e.target.value)}
                  className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
                />
              </div>
            )}

            <div>
              <label htmlFor="ast-notes" className="mb-1 block text-xs font-medium text-ink">
                Additional Mobility Notes
              </label>
              <textarea
                id="ast-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Accompanying elderly family member arriving at South Drop-off"
                className="w-full rounded-architectural border border-champagne-border bg-surface p-3 text-sm text-ink placeholder:text-ink/60"
              />
            </div>

            <Button type="submit" variant="primary" loading={mutation.isPending}>
              <Accessibility className="h-4 w-4" aria-hidden="true" />
              <span>Dispatch Assistance Request</span>
            </Button>
          </form>
        </div>

        <aside className="space-y-4 lg:col-span-5">
          <div className="overflow-hidden rounded-architectural border border-champagne-border bg-surface">
            <img
              src={mobilityMedia.src}
              alt={tf(mobilityMedia.alt, mobilityMedia.altTa)}
              width={mobilityMedia.width}
              height={mobilityMedia.height}
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="p-6">
              <h2 className="font-display text-base font-semibold text-ink">
                {user ? 'Your Recent Assistance Requests' : 'Concierge Dispatch Protocol'}
              </h2>
              {user ? (
                <div className="mt-4 space-y-3">
                  {(myRequestsQuery.data?.requests ?? []).map((r) => (
                    <div key={r.id} className="rounded border border-champagne-border bg-ivory/60 p-3.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold capitalize text-ink">
                          {r.requestType.replace('_', ' ')}
                        </span>
                        <StatusBadge tone={r.status === 'resolved' ? 'success' : 'champagne'}>
                          {r.status}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-ink">Pickup: {r.pickupLabel}</p>
                      {r.assignedStaffName && (
                        <p className="mt-1 text-xs font-medium text-ink">
                          Assigned Staff: {r.assignedStaffName}
                        </p>
                      )}
                    </div>
                  ))}
                  {(myRequestsQuery.data?.requests.length ?? 0) === 0 && (
                    <p className="text-sm text-ink">No open requests found under your account.</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  Walk-in visitors may submit requests directly here without logging in. Atrium
                  concierge porters keep wheelchairs ready at the Ground Portico Desk (G-03) and East
                  Elevators.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
