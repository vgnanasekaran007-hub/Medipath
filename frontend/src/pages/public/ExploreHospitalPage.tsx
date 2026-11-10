import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, Layers, MapPin, QrCode } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FloorPlan2DSVG } from '../../components/navigation/FloorPlan2DSVG';
import { Button, LoadingState, SectionHeader, StatusBadge } from '../../components/ui/Primitives';
import { QrBadge } from '../../components/ui/QrBadge';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { HOSPITAL_EXTERIOR_MEDIA } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

const HospitalScene3D = lazy(() =>
  import('../../components/navigation/HospitalScene3D').then((m) => ({
    default: m.HospitalScene3D,
  })),
);

export function ExploreHospitalPage() {
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const [selectedFloorId, setSelectedFloorId] = useState<string | 'all'>('all');
  const [exploded, setExploded] = useState(true);

  const graphQuery = useQuery({
    queryKey: ['navigation-graph'],
    queryFn: api.getNavigationGraph,
  });

  if (graphQuery.isLoading || !graphQuery.data) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-12 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  const graph = graphQuery.data;
  const floors = [...graph.floors].sort((a, b) => a.levelNumber - b.levelNumber);
  const focusedFloor = floors.find((f) => f.id === selectedFloorId) ?? floors[0];

  return (
    <div className="mx-auto max-w-editorial space-y-10 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow={`Pavilion Blueprint · ${graph.activeMapVersion.label}`}
        title={tf(graph.building.name, graph.building.nameTa)}
        description={tf(graph.building.description, graph.building.descriptionTa)}
        action={
          <Link to="/navigate">
            <Button variant="primary">
              <span>Open 3D Navigator</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        }
      />

      {/* Real Building Orientation Photo Banner */}
      <div className="grid gap-6 overflow-hidden rounded-architectural border border-champagne-border bg-surface lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <img
            src={HOSPITAL_EXTERIOR_MEDIA.src}
            alt={tf(HOSPITAL_EXTERIOR_MEDIA.alt, HOSPITAL_EXTERIOR_MEDIA.altTa)}
            width={HOSPITAL_EXTERIOR_MEDIA.width}
            height={HOSPITAL_EXTERIOR_MEDIA.height}
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
        <div className="space-y-4 p-6 lg:col-span-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>Exterior &amp; Floor Orientation</span>
          </div>
          <h2 className="font-display text-xl font-semibold text-ink">
            Four Simple Levels — One Step-Free Building
          </h2>
          <p className="text-sm leading-relaxed text-ink">
            Use the interactive 3D building below to drag or swipe 360° around every side, switch
            between the Real Building exterior and open Inside Map floors, or tap any level to inspect rooms.
          </p>
          <ul className="grid gap-2 text-xs font-medium text-ink sm:grid-cols-2">
            <li className="rounded border border-champagne-border bg-ivory/70 px-3 py-2">
              Ground (L0): Main Entrance, ER, Cafe
            </li>
            <li className="rounded border border-champagne-border bg-ivory/70 px-3 py-2">
              Level 1: Blood Lab, 3T MRI, Pharmacy
            </li>
            <li className="rounded border border-champagne-border bg-ivory/70 px-3 py-2">
              Level 2: Heart, Brain &amp; Bone Clinics
            </li>
            <li className="rounded border border-champagne-border bg-ivory/70 px-3 py-2">
              Level 3: ICU &amp; Private Recovery Rooms
            </li>
          </ul>
        </div>
      </div>

      {/* Synchronized 3D Building Explorer + Floor Inspector */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Suspense fallback={<LoadingState label="Loading 3D building overview…" />}>
            <HospitalScene3D
              floors={floors}
              nodes={graph.nodes}
              edges={graph.edges}
              destinations={graph.destinations}
              qrCheckpoints={graph.qrCheckpoints}
              selectedFloorId={selectedFloorId}
              exploded={exploded}
              onSelectFloor={setSelectedFloorId}
              onToggleExploded={setExploded}
              onSelectDestination={(dest) => {
                setEndNodeId(dest.nodeId);
                navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
              }}
            />
          </Suspense>
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-5">
          <div className="rounded-architectural border border-champagne-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
              <Layers className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Select Floor to Inspect Zones</span>
            </h2>
            <div className="mt-4 space-y-2.5">
              {floors.map((floor) => {
                const count = graph.destinations.filter((d) => d.floorId === floor.id).length;
                const active = selectedFloorId === floor.id;
                return (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => setSelectedFloorId(floor.id)}
                    className={`min-h-[48px] w-full rounded-architectural border p-3.5 text-left transition ${
                      active
                        ? 'border-champagne bg-teal-mist'
                        : 'border-champagne-border bg-ivory/40 hover:border-champagne'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold text-ink">
                        {floor.code} — {tf(floor.name, floor.nameTa)}
                      </span>
                      <StatusBadge tone={active ? 'teal' : 'champagne'}>
                        {count} Zones
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-ink">
                      {tf(floor.subtitle, floor.subtitleTa)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {focusedFloor && (
            <FloorPlan2DSVG
              floor={focusedFloor}
              nodes={graph.nodes}
              edges={graph.edges}
              destinations={graph.destinations}
              qrCheckpoints={graph.qrCheckpoints}
              onDestinationClick={(dest) => {
                setEndNodeId(dest.nodeId);
                navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
              }}
            />
          )}
        </div>
      </div>

      {/* Physical QR Totems Registry */}
      <section className="space-y-5 border-t border-champagne-border pt-8">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-ink" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-ink">
            Lobby &amp; Corridor QR Wayfinding Checkpoints
          </h2>
        </div>
        <p className="max-w-2xl text-sm text-ink">
          Each QR stand inside Aurelia Pavilion marks an exact starting node so patients get turn-by-turn routes without unreliable indoor GPS.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {graph.qrCheckpoints.map((qr) => (
            <QrBadge key={qr.id} code={qr.code} label={tf(qr.label, qr.labelTa)} compact />
          ))}
        </div>
      </section>

      {/* Complete Searchable Destination Matrix */}
      <section className="space-y-4 border-t border-champagne-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          All Hospital Destinations ({graph.destinations.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {graph.destinations.map((dest) => {
            const fl = floors.find((f) => f.id === dest.floorId);
            return (
              <div
                key={dest.id}
                className="flex flex-col justify-between rounded-architectural border border-champagne-border bg-surface p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-ink">
                    <span className="font-semibold">{fl?.code}</span>
                    <span>Room {dest.roomCode}</span>
                  </div>
                  <h3 className="mt-1 font-display text-sm font-semibold text-ink">
                    {tf(dest.name, dest.nameTa)}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink">
                    {tf(dest.description, dest.descriptionTa)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEndNodeId(dest.nodeId);
                    navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
                  }}
                  className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
                  <span>Show Walking Route →</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
