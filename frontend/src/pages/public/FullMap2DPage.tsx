import { calculateShortestPath, NODE_IDS } from '@medipath/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Compass,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FloorPlan2DSVG } from '../../components/navigation/FloorPlan2DSVG';
import { RouteDirectionsPanel } from '../../components/navigation/RouteDirectionsPanel';
import { Button, ErrorBanner, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getDepartmentMedia, getServiceMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function FullMap2DPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang, tf } = useTranslation();

  const {
    startNodeId,
    endNodeId,
    accessibleOnly,
    activeStepIndex,
    activeQrCheckpoint,
    setStartNodeId,
    setEndNodeId,
    setAccessibleOnly,
    setActiveStepIndex,
    setActiveQrCheckpoint,
    resetNavigationSelection,
  } = useAppStore();

  const [focusedFloorId, setFocusedFloorId] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const graphQuery = useQuery({
    queryKey: ['navigation-graph'],
    queryFn: api.getNavigationGraph,
  });

  const graph = graphQuery.data;

  // Apply URL query parameters when landing from Quick Tap Photos or external links
  useEffect(() => {
    const destParam = searchParams.get('dest');
    const floorParam = searchParams.get('floor');
    const startParam = searchParams.get('start');
    const accParam = searchParams.get('accessible');

    if (destParam) setEndNodeId(destParam);
    if (startParam) setStartNodeId(startParam);
    if (accParam === 'true') setAccessibleOnly(true);
    if (floorParam) {
      setFocusedFloorId(floorParam);
    } else if (destParam && graph) {
      const destObj = graph.destinations.find((d) => d.nodeId === destParam);
      if (destObj) setFocusedFloorId(destObj.floorId);
    }
  }, [searchParams, graph, setEndNodeId, setStartNodeId, setAccessibleOnly]);

  const routeQuery = useQuery({
    queryKey: ['route-calc', startNodeId, endNodeId, accessibleOnly],
    queryFn: () =>
      api.calculateRoute({
        startNodeId,
        endNodeId,
        accessibleOnly,
      }),
    enabled: Boolean(startNodeId && endNodeId),
  });

  const fallbackLocalRoute = useMemo(() => {
    if (!graph || !startNodeId || !endNodeId) return null;
    return calculateShortestPath({
      nodes: graph.nodes,
      edges: graph.edges,
      floors: graph.floors,
      startNodeId,
      endNodeId,
      accessibleOnly,
    });
  }, [graph, startNodeId, endNodeId, accessibleOnly]);

  const activeRoute = routeQuery.data?.route ?? fallbackLocalRoute;

  const sortedFloors = useMemo(() => {
    if (!graph) return [];
    return [...graph.floors].sort((a, b) => a.levelNumber - b.levelNumber);
  }, [graph]);

  const activeFloor = useMemo(() => {
    if (sortedFloors.length === 0) return null;
    if (focusedFloorId) {
      const exact = sortedFloors.find((f) => f.id === focusedFloorId);
      if (exact) return exact;
    }
    const destObj = graph?.destinations.find((d) => d.nodeId === endNodeId);
    if (destObj) {
      const destFloor = sortedFloors.find((f) => f.id === destObj.floorId);
      if (destFloor) return destFloor;
    }
    return sortedFloors[0];
  }, [sortedFloors, focusedFloorId, graph, endNodeId]);

  if (graphQuery.isLoading) {
    return (
      <div className="mx-auto max-w-[1640px] px-4 py-10 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (graphQuery.error || !graph) {
    return (
      <div className="mx-auto max-w-[1640px] px-4 py-10 sm:px-6">
        <ErrorBanner
          message="Could not load Pavilion 2D architectural floor plans."
          onRetry={() => graphQuery.refetch()}
        />
      </div>
    );
  }

  const activeDestination = graph.destinations.find((d) => d.nodeId === endNodeId);
  const destFloor = sortedFloors.find((f) => f.id === activeDestination?.floorId);
  const activeStepNodeId = activeRoute?.steps?.[activeStepIndex]?.nodeId;

  const routeFloors = activeRoute?.found ? activeRoute.floorIdsInvolved : [];
  const currentRouteFloorIdx = activeFloor ? routeFloors.indexOf(activeFloor.id) : -1;
  const nextRouteFloorId =
    routeFloors.length > 1
      ? routeFloors[(currentRouteFloorIdx + 1) % routeFloors.length]
      : null;
  const nextRouteFloor = sortedFloors.find((f) => f.id === nextRouteFloorId);

  const visualQuickTargets = [
    { nodeId: NODE_IDS.L0_EMERGENCY, slug: 'emergency', kind: 'dept' as const },
    { nodeId: NODE_IDS.L1_RADIOLOGY, slug: 'radiology', kind: 'dept' as const },
    { nodeId: NODE_IDS.L1_PHARMACY, slug: 'pharmacy', kind: 'dept' as const },
    { nodeId: NODE_IDS.L2_CARDIOLOGY, slug: 'cardiology', kind: 'dept' as const },
    { nodeId: NODE_IDS.L0_HELP_DESK, slug: 'wheelchair-escort-assistance', kind: 'svc' as const },
    { nodeId: NODE_IDS.L0_CAFETERIA, slug: 'garden-terrace-cafeteria', kind: 'svc' as const },
  ]
    .map((item) => {
      const dest = graph.destinations.find((d) => d.nodeId === item.nodeId);
      if (!dest) return null;
      const fl = sortedFloors.find((f) => f.id === dest.floorId);
      const media =
        item.kind === 'dept' ? getDepartmentMedia(item.slug) : getServiceMedia(item.slug);
      return { dest, fl, media };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const selectDestinationAndSyncUrl = (nodeId: string, floorId: string) => {
    setEndNodeId(nodeId);
    setFocusedFloorId(floorId);
    setSearchParams({
      dest: nodeId,
      floor: floorId,
      ...(accessibleOnly ? { accessible: 'true' } : {}),
    });
  };

  return (
    <div className="mx-auto max-w-[1640px] space-y-5 px-3 py-5 sm:px-6 lg:py-6">
      {/* Compact Full-Page 2D Architectural Command Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-architectural border border-champagne-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/navigate">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'ta' ? '3D வரைபடத்திற்குத் திரும்பு' : 'Back to 3D Map'}</span>
            </Button>
          </Link>

          <div className="h-6 w-px bg-champagne-border hidden sm:block" aria-hidden="true" />

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
              {lang === 'ta' ? 'முழுத் திரை 2D கட்டிட வரைபடம்' : 'Full-Page 2D Architectural Floor Map'}
            </p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {activeDestination
                ? `${tf(activeDestination.name, activeDestination.nameTa)} · ${activeDestination.roomCode}`
                : t.wayfinding.title}
            </h1>
          </div>

          {destFloor && (
            <StatusBadge tone={activeDestination?.isEmergency ? 'emergency' : 'teal'}>
              {destFloor.code} · {tf(destFloor.name, destFloor.nameTa)}
            </StatusBadge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeRoute?.found && (
            <div className="inline-flex items-center gap-2 rounded-architectural border border-champagne-border bg-ivory px-3 py-1.5 text-xs font-semibold text-ink tabular-nums">
              <Compass className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
              <span>
                {activeRoute.totalDistanceMeters} {t.common.meters} · ~
                {activeRoute.estimatedDurationMinutes} {t.common.minutes}
              </span>
            </div>
          )}

          <Button
            variant={accessibleOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setAccessibleOnly(!accessibleOnly)}
          >
            <Accessibility className="h-4 w-4" aria-hidden="true" />
            <span>Step-Free: {accessibleOnly ? 'ON' : 'OFF'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar((prev) => !prev)}
            aria-pressed={!showSidebar}
          >
            {showSidebar ? (
              <>
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                <span>Full-Width Map</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                <span>Show Directions</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetNavigationSelection();
              setFocusedFloorId(sortedFloors[0]?.id ?? '');
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* Floor Level Switcher & Route Progress Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-architectural border border-champagne-border bg-surface p-2.5">
        <div className="flex flex-wrap gap-1.5">
          {sortedFloors.map((floor) => {
            const isInRoute = activeRoute?.found && activeRoute.floorIdsInvolved.includes(floor.id);
            const isSelected = activeFloor?.id === floor.id;
            const isStartFloor = activeRoute?.found && activeRoute.orderedNodes[0]?.floorId === floor.id;
            const isDestFloor =
              activeRoute?.found &&
              activeRoute.orderedNodes[activeRoute.orderedNodes.length - 1]?.floorId === floor.id;

            return (
              <button
                key={floor.id}
                type="button"
                onClick={() => setFocusedFloorId(floor.id)}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-architectural px-3.5 text-xs font-semibold ${
                  isSelected
                    ? 'bg-teal-deep text-white shadow-sm'
                    : 'bg-ivory text-ink hover:bg-champagne-soft'
                }`}
              >
                <span>{floor.code}</span>
                <span className="hidden md:inline">— {tf(floor.name, floor.nameTa)}</span>
                {isStartFloor && (
                  <span className="rounded bg-[#217E82] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Start
                  </span>
                )}
                {isDestFloor && (
                  <span className="rounded bg-[#DC4C40] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Dest
                  </span>
                )}
                {isInRoute && !isStartFloor && !isDestFloor && (
                  <span className="h-2 w-2 rounded-full bg-champagne" title="Pass-through floor" />
                )}
              </button>
            );
          })}
        </div>

        {nextRouteFloor && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setFocusedFloorId(nextRouteFloor.id)}
          >
            <span>
              Trace Route: Jump to {nextRouteFloor.code}
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Main Full-Page 2D Blueprint + Collapsible Turn-by-Turn Guide */}
      <div className="grid gap-5 xl:grid-cols-12 xl:items-start">
        <div className={showSidebar ? 'min-w-0 xl:col-span-9' : 'min-w-0 xl:col-span-12'}>
          {activeFloor && (
            <FloorPlan2DSVG
              floor={activeFloor}
              nodes={graph.nodes}
              edges={graph.edges}
              destinations={graph.destinations}
              qrCheckpoints={graph.qrCheckpoints}
              route={activeRoute}
              startNodeId={startNodeId}
              endNodeId={endNodeId}
              activeStepNodeId={activeStepNodeId}
              fullHeight
              headerActions={
                <Link
                  to="/navigate"
                  className="inline-flex h-9 items-center gap-1 rounded border border-champagne-border bg-surface px-2.5 text-xs font-semibold text-ink hover:bg-champagne-soft"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Switch to 3D</span>
                </Link>
              }
              onDestinationClick={(dest) => selectDestinationAndSyncUrl(dest.nodeId, dest.floorId)}
              onNodeClick={(node) => setStartNodeId(node.id)}
            />
          )}
        </div>

        {showSidebar && (
          <div className="min-w-0 xl:col-span-3">
            <RouteDirectionsPanel
              floors={sortedFloors}
              nodes={graph.nodes}
              destinations={graph.destinations}
              qrCheckpoints={graph.qrCheckpoints}
              startNodeId={startNodeId}
              endNodeId={endNodeId}
              accessibleOnly={accessibleOnly}
              activeQrCheckpoint={activeQrCheckpoint}
              route={activeRoute}
              activeStepIndex={activeStepIndex}
              onChangeStart={setStartNodeId}
              onChangeEnd={(nodeId) => {
                const d = graph.destinations.find((item) => item.nodeId === nodeId);
                selectDestinationAndSyncUrl(nodeId, d?.floorId ?? activeFloor?.id ?? '');
              }}
              onToggleAccessible={setAccessibleOnly}
              onSelectQrCheckpoint={(cp) => {
                setActiveQrCheckpoint(cp);
                setFocusedFloorId(cp.floorId);
              }}
              onSelectStep={(stepIdx, floorId) => {
                setActiveStepIndex(stepIdx);
                setFocusedFloorId(floorId);
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom Quick-Switch Photo Strip */}
      <div className="rounded-architectural border border-champagne-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">
            Switch Full-Page 2D Destination Photo
          </p>
          <span className="text-xs text-ink">
            Tap any photo to focus its floor and calculate walking route
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {visualQuickTargets.map(({ dest, fl, media }) => {
            const active = endNodeId === dest.nodeId;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => selectDestinationAndSyncUrl(dest.nodeId, dest.floorId)}
                className={`group flex min-h-[44px] flex-col overflow-hidden rounded-architectural border text-left transition ${
                  active
                    ? 'border-champagne bg-teal-mist ring-1 ring-champagne'
                    : 'border-champagne-border bg-ivory/40 hover:border-champagne'
                }`}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={media.src}
                    alt={tf(media.alt, media.altTa)}
                    width={media.width}
                    height={media.height}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded bg-[#0F242C]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    {fl?.code} · {dest.roomCode}
                  </span>
                </div>
                <div className="p-2">
                  <span className="block font-display text-xs font-semibold leading-snug text-ink">
                    {tf(dest.name, dest.nameTa)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

