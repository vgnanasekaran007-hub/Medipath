import type {
  Destination,
  Floor,
  NavigationNode,
  NavigationRouteResult,
  QrCheckpoint,
} from '@medipath/shared';
import {
  Accessibility,
  ArrowUpDown,
  Compass,
  Navigation,
  QrCode,
  Route as RouteIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/translations';

interface RouteDirectionsPanelProps {
  floors: Floor[];
  nodes: NavigationNode[];
  destinations: Destination[];
  qrCheckpoints: QrCheckpoint[];
  startNodeId: string;
  endNodeId: string;
  accessibleOnly: boolean;
  activeQrCheckpoint: QrCheckpoint | null;
  route: NavigationRouteResult | null;
  activeStepIndex: number;
  onChangeStart: (nodeId: string) => void;
  onChangeEnd: (nodeId: string) => void;
  onToggleAccessible: (val: boolean) => void;
  onSelectQrCheckpoint: (cp: QrCheckpoint) => void;
  onSelectStep: (stepIndex: number, floorId: string) => void;
}

export function RouteDirectionsPanel({
  floors,
  nodes,
  destinations,
  qrCheckpoints,
  startNodeId,
  endNodeId,
  accessibleOnly,
  activeQrCheckpoint,
  route,
  activeStepIndex,
  onChangeStart,
  onChangeEnd,
  onToggleAccessible,
  onSelectQrCheckpoint,
  onSelectStep,
}: RouteDirectionsPanelProps) {
  const { t, lang, tf } = useTranslation();
  const floorMap = new Map(floors.map((f) => [f.id, f]));

  const originCandidates = nodes
    .filter(
      (n) =>
        n.isActive &&
        (n.type === 'entrance' ||
          n.type === 'department_entrance' ||
          n.type === 'room' ||
          n.type === 'elevator' ||
          n.type === 'qr_checkpoint'),
    )
    .sort((a, b) => {
      const fa = floorMap.get(a.floorId)?.levelNumber ?? 0;
      const fb = floorMap.get(b.floorId)?.levelNumber ?? 0;
      return fa - fb || a.label.localeCompare(b.label);
    });

  const sortedDestinations = [...destinations].sort((a, b) => {
    const fa = floorMap.get(a.floorId)?.levelNumber ?? 0;
    const fb = floorMap.get(b.floorId)?.levelNumber ?? 0;
    return fa - fb || a.name.localeCompare(b.name);
  });

  const handleSwap = () => {
    if (!startNodeId || !endNodeId) return;
    const prevStart = startNodeId;
    const prevEnd = endNodeId;
    onChangeStart(prevEnd);
    onChangeEnd(prevStart);
  };

  return (
    <aside
      aria-label="Route planning controls and step-by-step instructions"
      className="flex flex-col gap-5 rounded-architectural border border-champagne-border bg-surface p-5 text-ink"
    >
      {/* Active QR Positioning notice */}
      {activeQrCheckpoint && (
        <div className="flex items-start gap-2.5 rounded-architectural border border-champagne bg-champagne-soft px-3.5 py-2.5 text-xs text-ink">
          <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
          <div>
            <span className="font-semibold">{t.wayfinding.qrActivePrefix}</span>{' '}
            <span>{tf(activeQrCheckpoint.label, activeQrCheckpoint.labelTa)}</span>
            <p className="mt-0.5 opacity-90">
              {tf(activeQrCheckpoint.locationHint, activeQrCheckpoint.locationHintTa)}
            </p>
          </div>
        </div>
      )}

      {/* Origin & Destination Form */}
      <div className="space-y-3.5">
        <div>
          <label
            htmlFor="origin-node-select"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink"
          >
            {t.wayfinding.originLabel}
          </label>
          <select
            id="origin-node-select"
            value={startNodeId}
            onChange={(e) => onChangeStart(e.target.value)}
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-ivory px-3 text-sm text-ink"
          >
            {originCandidates.map((n) => {
              const fl = floorMap.get(n.floorId);
              return (
                <option key={n.id} value={n.id}>
                  {fl ? `${fl.code} · ` : ''}
                  {tf(n.label, n.labelTa)} ({n.code})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-ink">Quick Lobby QR Totems:</span>
          <button
            type="button"
            onClick={handleSwap}
            className="inline-flex min-h-[34px] items-center gap-1 rounded border border-champagne-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-champagne-soft"
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Swap</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {qrCheckpoints.slice(0, 4).map((qr) => (
            <button
              key={qr.id}
              type="button"
              onClick={() => onSelectQrCheckpoint(qr)}
              className={`inline-flex min-h-[34px] items-center gap-1 rounded border px-2.5 py-1 text-xs ${
                startNodeId === qr.nodeId
                  ? 'border-teal-deep bg-teal-deep text-white'
                  : 'border-champagne-border bg-ivory text-ink hover:border-ink'
              }`}
            >
              <QrCode className="h-3 w-3" aria-hidden="true" />
              <span>{qr.code.replace('MP-QR-', '')}</span>
            </button>
          ))}
        </div>

        <div>
          <label
            htmlFor="destination-node-select"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink"
          >
            {t.wayfinding.destinationLabel}
          </label>
          <select
            id="destination-node-select"
            value={endNodeId}
            onChange={(e) => onChangeEnd(e.target.value)}
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-ivory px-3 text-sm text-ink"
          >
            {sortedDestinations.map((dest) => {
              const fl = floorMap.get(dest.floorId);
              return (
                <option key={dest.id} value={dest.nodeId}>
                  {fl ? `${fl.code} · ` : ''}
                  {dest.roomCode} — {tf(dest.name, dest.nameTa)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Wheelchair / Step-free Toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-architectural border border-champagne-border bg-ivory/80 p-3">
          <input
            type="checkbox"
            checked={accessibleOnly}
            onChange={(e) => onToggleAccessible(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-champagne-border accent-teal-forest"
          />
          <div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Accessibility className="h-4 w-4 text-ink" aria-hidden="true" />
              {t.wayfinding.accessibleLabel}
            </span>
            <p className="mt-0.5 text-xs text-ink">{t.wayfinding.accessibleHint}</p>
          </div>
        </label>
      </div>

      {/* Route Summary KPIs or Validation Error */}
      {!route ? (
        <div className="rounded-architectural border border-champagne-border bg-ivory p-4 text-sm text-ink">
          {t.wayfinding.noRoutePrompt}
        </div>
      ) : !route.found ? (
        <div
          role="alert"
          className="rounded-architectural border border-emergency/35 bg-emergency-soft p-4 text-sm text-ink"
        >
          <p className="font-semibold">
            {lang === 'ta' && route.errorMessageTa ? route.errorMessageTa : route.errorMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Distance & Time Metric Bar */}
          <div className="grid grid-cols-3 divide-x divide-champagne-border rounded-architectural border border-champagne-border bg-ivory">
            <div className="p-3">
              <span className="block text-[11px] uppercase tracking-wider text-ink">
                {t.wayfinding.distance}
              </span>
              <span className="mt-0.5 block font-display text-lg font-semibold text-ink tabular-nums">
                {route.totalDistanceMeters} {t.common.meters}
              </span>
            </div>
            <div className="p-3">
              <span className="block text-[11px] uppercase tracking-wider text-ink">
                {t.wayfinding.duration}
              </span>
              <span className="mt-0.5 block font-display text-lg font-semibold text-ink tabular-nums">
                {route.estimatedDurationMinutes} {t.common.minutes}
              </span>
            </div>
            <div className="p-3">
              <span className="block text-[11px] uppercase tracking-wider text-ink">
                {t.wayfinding.transitions}
              </span>
              <span className="mt-0.5 block font-display text-lg font-semibold text-ink tabular-nums">
                {route.floorTransitions.length}
              </span>
            </div>
          </div>

          {route.floorTransitions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {route.floorTransitions.map((ft, idx) => (
                <span
                  key={`${ft.nodeId}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-architectural border border-champagne-border bg-teal-mist px-2.5 py-1 text-xs font-medium text-ink"
                >
                  <Compass className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
                  <span>
                    {ft.fromFloorCode} → {ft.toFloorCode} ({ft.via})
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Turn-by-turn steps list */}
          <div>
            <h3 className="mb-2.5 flex items-center gap-2 font-display text-sm font-semibold text-ink">
              <RouteIcon className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>{t.wayfinding.stepsHeading}</span>
            </h3>
            <ol className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {route.steps.map((step) => {
                const isActive = step.index === activeStepIndex;
                return (
                  <li key={`${step.index}-${step.nodeId}`}>
                    <button
                      type="button"
                      onClick={() => onSelectStep(step.index, step.floorId)}
                      className={`w-full rounded-architectural border p-3 text-left ${
                        isActive
                          ? 'border-ink bg-teal-mist'
                          : 'border-champagne-border bg-ivory/60 hover:border-ink'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-deep text-[10px] text-white tabular-nums">
                            {step.index + 1}
                          </span>
                          <span>{step.floorCode}</span>
                          {step.isFloorTransition && (
                            <span className="rounded bg-champagne-soft px-1.5 py-0.5 text-[10px] text-ink">
                              Level Change
                            </span>
                          )}
                        </span>
                        {step.distanceMeters > 0 && (
                          <span className="text-xs font-medium text-ink tabular-nums">
                            +{step.distanceMeters} {t.common.meters}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-snug text-ink">
                        {lang === 'ta' ? step.instructionTa : step.instruction}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* Porter / Wheelchair Concierge Callout */}
      <div className="border-t border-champagne-border pt-3">
        <Link
          to={`/assistance?pickupNodeId=${encodeURIComponent(startNodeId)}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.wayfinding.requestEscort}</span>
        </Link>
      </div>
    </aside>
  );
}
