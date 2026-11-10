import { calculateShortestPath, NODE_IDS } from '@medipath/shared';
import { useQuery } from '@tanstack/react-query';
import { Accessibility, ArrowUpRight, Box, Map as MapIcon, Maximize2, RotateCcw } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FloorPlan2DSVG } from '../../components/navigation/FloorPlan2DSVG';
import { RouteDirectionsPanel } from '../../components/navigation/RouteDirectionsPanel';
import { Button, ErrorBanner, LoadingState } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getDepartmentMedia, getServiceMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

const HospitalScene3D = lazy(() =>
  import('../../components/navigation/HospitalScene3D').then((m) => ({
    default: m.HospitalScene3D,
  })),
);

export function Navigate3DPage() {
  const { code: qrCodeParam } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, tf } = useTranslation();

  const {
    startNodeId,
    endNodeId,
    accessibleOnly,
    viewMode,
    exploded,
    selectedFloorId,
    activeStepIndex,
    activeQrCheckpoint,
    setStartNodeId,
    setEndNodeId,
    setAccessibleOnly,
    setViewMode,
    setExploded,
    setSelectedFloorId,
    setActiveStepIndex,
    setActiveQrCheckpoint,
    resetNavigationSelection,
  } = useAppStore();

  const [qrError, setQrError] = useState<string | null>(null);

  const graphQuery = useQuery({
    queryKey: ['navigation-graph'],
    queryFn: api.getNavigationGraph,
  });

  useEffect(() => {
    const destParam = searchParams.get('dest');
    const startParam = searchParams.get('start');
    const viewParam = searchParams.get('view');
    const accParam = searchParams.get('accessible');
    const searchQuery = searchParams.get('q');

    if (destParam) setEndNodeId(destParam);
    if (startParam) setStartNodeId(startParam);
    if (viewParam === '2d' || viewParam === '3d') setViewMode(viewParam);
    if (accParam === 'true') setAccessibleOnly(true);

    if (searchQuery && graphQuery.data) {
      const q = searchQuery.trim().toLowerCase();
      const found = graphQuery.data.destinations.find(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.roomCode.toLowerCase().includes(q) ||
          d.slug.toLowerCase().includes(q),
      );
      if (found) {
        setEndNodeId(found.nodeId);
        setSelectedFloorId(found.floorId);
      }
    }
  }, [
    searchParams,
    graphQuery.data,
    setEndNodeId,
    setStartNodeId,
    setViewMode,
    setAccessibleOnly,
    setSelectedFloorId,
  ]);

  useEffect(() => {
    if (!qrCodeParam) return;
    let active = true;
    setQrError(null);
    api
      .resolveQrCheckpoint(qrCodeParam)
      .then(({ checkpoint }) => {
        if (!active) return;
        setActiveQrCheckpoint(checkpoint);
        setSelectedFloorId('all');
      })
      .catch((err) => {
        if (!active) return;
        setQrError(err instanceof Error ? err.message : 'Unable to resolve QR checkpoint');
      });
    return () => {
      active = false;
    };
  }, [qrCodeParam, setActiveQrCheckpoint, setSelectedFloorId]);

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

  const graph = graphQuery.data;

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

  if (graphQuery.isLoading) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-10 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (graphQuery.error || !graph) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-10 sm:px-6">
        <ErrorBanner
          message="Could not load Pavilion architectural graph."
          onRetry={() => graphQuery.refetch()}
        />
      </div>
    );
  }

  const sortedFloors = [...graph.floors].sort((a, b) => a.levelNumber - b.levelNumber);
  const floorFor2D = sortedFloors.find((f) => f.id === selectedFloorId) ?? sortedFloors[0];

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

  return (
    <div className="mx-auto max-w-editorial px-4 py-8 sm:px-6">
      {/* Studio Control Header */}
      <div className="mb-5 flex flex-col gap-4 border-b border-champagne-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
            Map {graph.activeMapVersion.label}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t.wayfinding.title}
          </h1>
          <p className="mt-1 text-sm text-ink">{t.wayfinding.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Visualization mode"
            className="inline-flex rounded-architectural border border-champagne-border bg-surface p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded px-3 text-xs font-semibold ${
                viewMode === '3d'
                  ? 'bg-teal-deep text-white'
                  : 'text-ink hover:bg-ivory'
              }`}
            >
              <Box className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.wayfinding.view3d}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded px-3 text-xs font-semibold ${
                viewMode === '2d'
                  ? 'bg-teal-deep text-white'
                  : 'text-ink hover:bg-ivory'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.wayfinding.view2d}</span>
            </button>
          </div>

          <Button
            variant={accessibleOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setAccessibleOnly(!accessibleOnly)}
          >
            <Accessibility className="h-4 w-4" aria-hidden="true" />
            <span>Step-Free: {accessibleOnly ? 'ON' : 'OFF'}</span>
          </Button>

          <Link
            to={`/map-2d?dest=${encodeURIComponent(endNodeId)}&floor=${encodeURIComponent(floorFor2D?.id ?? '')}${accessibleOnly ? '&accessible=true' : ''}`}
          >
            <Button variant="outline" size="sm">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Full 2D Map</span>
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={resetNavigationSelection}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Overview</span>
          </Button>
        </div>
      </div>

      {/* Visual Quick-Tap Destination Gallery (Opens Full-Page Enhanced 2D Map) */}
      <div className="mb-6">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink">
            Quick Tap Destination Photos
          </p>
          <span className="text-xs text-ink">
            Tap any photo to open its Full-Page 2D Architectural Map
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {visualQuickTargets.map(({ dest, fl, media }) => {
            const active = endNodeId === dest.nodeId;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => {
                  setEndNodeId(dest.nodeId);
                  setSelectedFloorId(dest.floorId);
                  navigate(
                    `/map-2d?dest=${encodeURIComponent(dest.nodeId)}&floor=${encodeURIComponent(dest.floorId)}${accessibleOnly ? '&accessible=true' : ''}`,
                  );
                }}
                className={`group flex min-h-[44px] flex-col justify-between overflow-hidden rounded-architectural border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  active
                    ? 'border-champagne bg-teal-mist ring-1 ring-champagne'
                    : 'border-champagne-border bg-surface hover:border-champagne'
                }`}
              >
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <img
                      src={media.src}
                      alt={tf(media.alt, media.altTa)}
                      width={media.width}
                      height={media.height}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded bg-[#0F242C]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                      {fl?.code} · {dest.roomCode}
                    </span>
                  </div>
                  <div className="px-2.5 pt-2.5 pb-1">
                    <span className="block font-display text-xs font-semibold leading-snug text-ink">
                      {tf(dest.name, dest.nameTa)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2.5 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink/80 group-hover:text-ink">
                  <span>Full 2D Map</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {qrError && (
        <div className="mb-5">
          <ErrorBanner title="QR Totem Lookup" message={qrError} />
        </div>
      )}

      {/* Split Spatial Workbench */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-4">
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
            onChangeEnd={setEndNodeId}
            onToggleAccessible={setAccessibleOnly}
            onSelectQrCheckpoint={(cp) => {
              setActiveQrCheckpoint(cp);
              setSelectedFloorId(viewMode === '2d' ? cp.floorId : 'all');
            }}
            onSelectStep={(stepIdx, floorId) => {
              setActiveStepIndex(stepIdx);
              setSelectedFloorId(floorId);
            }}
          />
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-8">
          {viewMode === '3d' ? (
            <Suspense
              fallback={
                <div
                  role="status"
                  aria-live="polite"
                  className="flex h-[440px] items-center justify-center rounded-architectural border border-champagne-border bg-architectural px-6 text-center text-sm text-white md:h-[620px]"
                >
                  Rendering 3D Pavilion scene…
                </div>
              }
            >
              <HospitalScene3D
                floors={sortedFloors}
                nodes={graph.nodes}
                edges={graph.edges}
                destinations={graph.destinations}
                qrCheckpoints={graph.qrCheckpoints}
                route={activeRoute}
                startNodeId={startNodeId}
                endNodeId={endNodeId}
                selectedFloorId={selectedFloorId}
                exploded={exploded}
                onSelectFloor={setSelectedFloorId}
                onToggleExploded={setExploded}
                onSelectDestination={(dest) => setEndNodeId(dest.nodeId)}
                onSelectNode={(node) => setStartNodeId(node.id)}
                onSwitchTo2D={() => setViewMode('2d')}
              />
            </Suspense>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-architectural border border-champagne-border bg-surface p-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {sortedFloors.map((floor) => {
                    const isInRoute = activeRoute?.found && activeRoute.floorIdsInvolved.includes(floor.id);
                    const isSelected = floorFor2D?.id === floor.id;
                    return (
                      <button
                        key={floor.id}
                        type="button"
                        onClick={() => setSelectedFloorId(floor.id)}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded px-3 text-xs font-semibold ${
                          isSelected
                            ? 'bg-teal-deep text-white'
                            : 'bg-ivory text-ink hover:bg-champagne-soft'
                        }`}
                      >
                        <span>{floor.code}</span>
                        <span className="hidden sm:inline">— {tf(floor.name, floor.nameTa)}</span>
                        {isInRoute && (
                          <span
                            className="h-2 w-2 rounded-full bg-champagne"
                            title="Included in calculated route"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {floorFor2D && (
                <FloorPlan2DSVG
                  floor={floorFor2D}
                  nodes={graph.nodes}
                  edges={graph.edges}
                  destinations={graph.destinations}
                  qrCheckpoints={graph.qrCheckpoints}
                  route={activeRoute}
                  startNodeId={startNodeId}
                  endNodeId={endNodeId}
                  activeStepNodeId={activeRoute?.steps?.[activeStepIndex]?.nodeId}
                  headerActions={
                    <Link
                      to={`/map-2d?dest=${encodeURIComponent(endNodeId)}&floor=${encodeURIComponent(floorFor2D.id)}${accessibleOnly ? '&accessible=true' : ''}`}
                      className="inline-flex h-9 items-center gap-1 rounded border border-champagne-border bg-surface px-2.5 text-xs font-semibold text-ink hover:bg-champagne-soft"
                    >
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Full-Page Map</span>
                    </Link>
                  }
                  onDestinationClick={(dest) => setEndNodeId(dest.nodeId)}
                  onNodeClick={(node) => setStartNodeId(node.id)}
                />
              )}
            </div>
          )}

          {activeRoute?.found && (
            <div className="rounded-architectural border border-champagne-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink">
                <span>
                  Floors along this route:{' '}
                  <strong className="font-semibold text-ink">
                    {activeRoute.floorIdsInvolved
                      .map((id) => graph.floors.find((f) => f.id === id)?.code)
                      .filter(Boolean)
                      .join(' → ')}
                  </strong>
                </span>
                <span>Tap any highlighted zone in 3D or 2D to set it as your destination.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
