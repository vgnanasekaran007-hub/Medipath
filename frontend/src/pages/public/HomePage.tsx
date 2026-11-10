import { calculateShortestPath, NODE_IDS, type Destination } from '@medipath/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Accessibility,
  ArrowRight,
  CalendarPlus,
  Clock,
  Compass,
  MapPin,
  PhoneCall,
  QrCode,
  Search,
  Stethoscope,
} from 'lucide-react';
import { Suspense, lazy, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CampusMapLeaflet } from '../../components/ui/CampusMapLeaflet';
import { Button, LoadingState, SectionHeader, StatusBadge } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import {
  HOSPITAL_EXTERIOR_MEDIA,
  SIMPLE_WAYFINDING_STEPS,
  getDepartmentMedia,
  getServiceMedia,
} from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

const HospitalScene3D = lazy(() =>
  import('../../components/navigation/HospitalScene3D').then((m) => ({
    default: m.HospitalScene3D,
  })),
);

export function HomePage() {
  const { t, tf } = useTranslation();
  const navigate = useNavigate();
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const setStartNodeId = useAppStore((s) => s.setStartNodeId);
  const setSelectedFloorId = useAppStore((s) => s.setSelectedFloorId);

  const [queryText, setQueryText] = useState('');
  const [previewFloorId, setPreviewFloorId] = useState<string | 'all'>('all');
  const [previewExploded, setPreviewExploded] = useState(true);

  const overviewQuery = useQuery({
    queryKey: ['hospital-overview'],
    queryFn: api.getHospitalOverview,
  });

  const graphQuery = useQuery({
    queryKey: ['navigation-graph'],
    queryFn: api.getNavigationGraph,
  });

  const deptsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: api.getDepartments,
  });

  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.getDoctors(),
  });

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });

  const graph = graphQuery.data;
  const hospital = overviewQuery.data?.hospital;
  const announcements = overviewQuery.data?.announcements ?? [];
  const departments = deptsQuery.data?.departments ?? [];
  const doctors = doctorsQuery.data?.doctors ?? [];
  const services = servicesQuery.data?.services ?? [];

  const previewRoute = useMemo(() => {
    if (!graph) return null;
    return calculateShortestPath({
      nodes: graph.nodes,
      edges: graph.edges,
      floors: graph.floors,
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: false,
    });
  }, [graph]);

  const matchingDestinations = useMemo(() => {
    if (!graph || !queryText.trim()) return [];
    const q = queryText.trim().toLowerCase();
    return graph.destinations
      .filter(
        (d) =>
          d.isSearchable &&
          (d.name.toLowerCase().includes(q) ||
            d.nameTa.toLowerCase().includes(q) ||
            d.roomCode.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [graph, queryText]);

  const handleLaunchRoute = (dest: Destination) => {
    setStartNodeId(NODE_IDS.L0_ENTRANCE);
    setEndNodeId(dest.nodeId);
    setSelectedFloorId('all');
    navigate(`/navigate?dest=${encodeURIComponent(dest.nodeId)}`);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (matchingDestinations.length > 0) {
      handleLaunchRoute(matchingDestinations[0]);
      return;
    }
    navigate(`/navigate${queryText.trim() ? `?q=${encodeURIComponent(queryText.trim())}` : ''}`);
  };

  const emergencyImage = getServiceMedia(undefined, 'emergency');

  return (
    <div>
      {/* 1. Asymmetric Architectural Hero Section */}
      <section className="border-b border-champagne-border bg-surface">
        <div className="mx-auto grid max-w-editorial gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:items-center lg:py-14">
          <div className="min-w-0 lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">
              {t.home.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.2] tracking-tight text-ink sm:text-4xl lg:text-[2.65rem]">
              {t.home.headline}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink">{t.home.subheadline}</p>

            {/* Prominent Destination Search */}
            <form onSubmit={handleSearchSubmit} className="relative mt-6">
              <label htmlFor="hero-destination-search" className="sr-only">
                {t.home.searchPlaceholder}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
                    aria-hidden="true"
                  />
                  <input
                    id="hero-destination-search"
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder={t.home.searchPlaceholder}
                    className="min-h-[48px] w-full rounded-architectural border border-champagne-border bg-ivory pl-10 pr-4 text-sm text-ink placeholder:text-ink/60"
                  />
                </div>
                <Button type="submit" size="lg">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>{t.home.searchAction}</span>
                </Button>
              </div>

              {matchingDestinations.length > 0 && (
                <ul
                  aria-label="Matching destinations"
                  className="absolute z-20 mt-1.5 w-full divide-y divide-champagne-border rounded-architectural border border-champagne-border bg-surface shadow-lg"
                >
                  {matchingDestinations.map((dest) => {
                    const fl = graph?.floors.find((f) => f.id === dest.floorId);
                    return (
                      <li key={dest.id}>
                        <button
                          type="button"
                          onClick={() => handleLaunchRoute(dest)}
                          className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-sm text-ink hover:bg-ivory"
                        >
                          <div>
                            <span className="font-semibold text-ink">
                              {tf(dest.name, dest.nameTa)}
                            </span>
                            <span className="ml-2 text-xs text-ink">{dest.roomCode}</span>
                          </div>
                          <span className="text-xs font-medium text-ink">
                            {fl?.code} · Show Way →
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </form>

            {/* Quick Wayfinding Entry Triggers */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-ink">Quick jump:</span>
              {['Cardiology', 'Radiology', 'Pharmacy', 'Emergency'].map((quickName) => {
                const match = graph?.destinations.find((d) =>
                  d.name.toLowerCase().includes(quickName.toLowerCase()),
                );
                if (!match) return null;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => handleLaunchRoute(match)}
                    className="min-h-[38px] rounded border border-champagne-border bg-ivory px-3 py-1 font-medium text-ink hover:border-champagne"
                  >
                    {tf(match.name, match.nameTa)}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/navigate">
                <Button variant="primary" size="md" className="px-4 shadow-sm">
                  <span>{t.home.open3dCta}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/map-2d">
                <Button variant="outline" size="md" className="px-4">
                  <span>2D Floor Map</span>
                </Button>
              </Link>
              <Link to="/appointments/book">
                <Button variant="outline" size="md" className="px-4">
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{t.home.bookCta}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Live Interactive 3D Architectural Preview */}
          <div className="min-w-0 lg:col-span-7">
            <div className="space-y-2">
              {graph ? (
                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex h-[380px] items-center justify-center rounded-architectural border border-champagne-border bg-architectural px-6 text-center text-sm text-white md:h-[520px]"
                    >
                      Initializing 3D architectural model…
                    </div>
                  }
                >
                  <HospitalScene3D
                    floors={graph.floors}
                    nodes={graph.nodes}
                    edges={graph.edges}
                    destinations={graph.destinations}
                    qrCheckpoints={graph.qrCheckpoints}
                    route={previewRoute}
                    startNodeId={NODE_IDS.L0_ENTRANCE}
                    endNodeId={NODE_IDS.L2_CARDIOLOGY}
                    selectedFloorId={previewFloorId}
                    exploded={previewExploded}
                    previewMode
                    onSelectFloor={setPreviewFloorId}
                    onToggleExploded={setPreviewExploded}
                    onSelectDestination={handleLaunchRoute}
                    onSwitchTo2D={() => navigate('/map-2d')}
                  />
                </Suspense>
              ) : (
                <LoadingState label="Loading Pavilion A blueprint…" />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-ink">
                <span>{t.home.previewHint}</span>
                <Link to="/explore" className="font-semibold text-ink underline-offset-2 hover:underline">
                  {t.home.exploreCta} (L0–L3) →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Announcements Notice Band */}
      {announcements.length > 0 && (
        <section aria-label="Campus advisories" className="border-b border-champagne-border bg-champagne-soft/80">
          <div className="mx-auto flex max-w-editorial flex-col gap-2 px-4 py-3.5 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge tone={announcements[0].severity === 'emergency' ? 'emergency' : 'teal'}>
                Campus Notice
              </StatusBadge>
              <p className="text-sm font-semibold text-ink">
                {tf(announcements[0].title, announcements[0].titleTa)}
              </p>
            </div>
            <p className="text-xs text-ink">
              {tf(announcements[0].body, announcements[0].bodyTa)}
            </p>
          </div>
        </section>
      )}

      {/* 1b. Visual Orientation & 3 Easy Steps Section */}
      <section className="mx-auto max-w-editorial px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="overflow-hidden rounded-architectural border border-champagne-border bg-surface lg:col-span-5">
            <img
              src={HOSPITAL_EXTERIOR_MEDIA.src}
              alt={tf(HOSPITAL_EXTERIOR_MEDIA.alt, HOSPITAL_EXTERIOR_MEDIA.altTa)}
              width={HOSPITAL_EXTERIOR_MEDIA.width}
              height={HOSPITAL_EXTERIOR_MEDIA.height}
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="border-t border-champagne-border px-4 py-3 text-xs font-medium text-ink">
              {tf(HOSPITAL_EXTERIOR_MEDIA.caption, HOSPITAL_EXTERIOR_MEDIA.captionTa)}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <SectionHeader
              eyebrow="Simple Visual Guide"
              title={t.home.howItWorksHeading}
              description={t.home.howItWorksLead}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {SIMPLE_WAYFINDING_STEPS.map((item) => (
                <Link
                  key={item.step}
                  to={item.to}
                  className="group flex flex-col overflow-hidden rounded-architectural border border-champagne-border bg-surface transition hover:border-champagne"
                >
                  <img
                    src={item.image.src}
                    alt={tf(item.image.alt, item.image.altTa)}
                    width={item.image.width}
                    height={item.image.height}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <span className="font-display text-xs font-bold tracking-widest text-ink tabular-nums">
                        STEP {item.step}
                      </span>
                      <h3 className="mt-1 font-display text-sm font-semibold text-ink group-hover:underline">
                        {tf(item.title, item.titleTa)}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink">
                        {tf(item.summary, item.summaryTa)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Image-Led Department Index by Floor */}
      <section className="mx-auto max-w-editorial px-4 py-10 sm:px-6">
        <SectionHeader
          eyebrow="Clinical Floor Guide"
          title={t.home.deptsHeading}
          description={t.home.deptsLead}
          action={
            <Link to="/departments">
              <Button variant="outline" size="sm">
                Full Department Index →
              </Button>
            </Link>
          }
        />

        <div className="mt-6 divide-y divide-champagne-border border-y border-champagne-border bg-surface">
          {departments.slice(0, 6).map((dept, index) => {
            const fl = graph?.floors.find((f) => f.id === dept.floorId);
            const primaryDest = graph?.destinations.find((d) => d.id === dept.primaryDestinationId);
            const deptMedia = getDepartmentMedia(dept.slug);
            return (
              <div
                key={dept.id}
                className="grid gap-4 px-4 py-4 transition hover:bg-ivory/70 sm:px-5 md:grid-cols-12 md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3 md:col-span-5">
                  <span className="hidden font-display text-xs font-semibold text-ink tabular-nums sm:inline">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <img
                    src={deptMedia.src}
                    alt={tf(deptMedia.alt, deptMedia.altTa)}
                    width={deptMedia.width}
                    height={deptMedia.height}
                    loading="lazy"
                    className="h-14 w-20 shrink-0 rounded-architectural border border-champagne-border object-cover"
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/departments/${dept.slug}`}
                      className="font-display text-base font-semibold text-ink hover:underline"
                    >
                      {tf(dept.name, dept.nameTa)}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink">{tf(dept.wing, dept.wingTa)}</p>
                  </div>
                </div>

                <div className="min-w-0 text-sm text-ink md:col-span-4">
                  {tf(dept.summary, dept.summaryTa)}
                </div>

                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 md:col-span-3 md:justify-end">
                  <StatusBadge tone={dept.isEmergency ? 'emergency' : 'champagne'}>
                    {fl?.code ?? 'L0'} · {dept.code}
                  </StatusBadge>
                  {primaryDest && (
                    <button
                      type="button"
                      onClick={() => handleLaunchRoute(primaryDest)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-architectural border border-champagne-border bg-ivory px-3 text-xs font-semibold text-ink hover:bg-teal-deep hover:text-white"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.common.directions}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Image-Led Hospital Services & Mobility Spread */}
      <section className="border-y border-champagne-border bg-surface py-14">
        <div className="mx-auto grid max-w-editorial gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
              Patient Care &amp; Services
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {t.home.servicesHeading}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink">
              {t.home.servicesLead}
            </p>

            <div className="mt-6 space-y-4 rounded-architectural border border-champagne-border bg-ivory p-5">
              <div className="flex items-start gap-3">
                <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Lobby QR Stands &amp; Wheelchair Help
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink">
                    Tap a lobby QR checkpoint or request a wheelchair before you arrive for an
                    elevator-only route straight to the desk.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/qr/MP-QR-ENTRANCE">
                      <Button variant="outline" size="sm">
                        Entrance QR Demo
                      </Button>
                    </Link>
                    <Link to="/assistance">
                      <Button variant="ghost" size="sm">
                        <Accessibility className="h-4 w-4" aria-hidden="true" />
                        <span>Wheelchair Help</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <Link to="/services">
                <Button variant="outline" size="md">
                  View All Hospital Services →
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:col-span-8">
            {services.slice(0, 4).map((svc) => {
              const media = getServiceMedia(svc.slug, svc.category);
              const dest = graph?.destinations.find((d) => d.id === svc.destinationId);
              return (
                <article
                  key={svc.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-architectural border border-champagne-border bg-ivory/40 transition hover:border-champagne hover:bg-surface"
                >
                  <div>
                    <Link to={`/services/${svc.slug}`} className="block overflow-hidden">
                      <img
                        src={media.src}
                        alt={tf(media.alt, media.altTa)}
                        width={media.width}
                        height={media.height}
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </Link>
                    <div className="p-5 pb-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-ink">
                        <StatusBadge tone="champagne">{svc.category}</StatusBadge>
                        <span className="font-medium">{svc.turnaroundEstimate}</span>
                      </div>
                      <h3 className="mt-2.5 font-display text-base font-semibold text-ink">
                        <Link to={`/services/${svc.slug}`} className="hover:underline">
                          {tf(svc.name, svc.nameTa)}
                        </Link>
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink">
                        {tf(svc.summary, svc.summaryTa)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-champagne-border px-5 py-3 text-xs font-medium text-ink">
                    <span>{tf(svc.availability, svc.availabilityTa)}</span>
                    {dest ? (
                      <button
                        type="button"
                        onClick={() => handleLaunchRoute(dest)}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded bg-teal-deep px-3 font-semibold text-white hover:bg-teal-forest"
                      >
                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Route</span>
                      </button>
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Specialist Consultation Teams */}
      <section className="mx-auto max-w-editorial px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Medical Specialists"
          title={t.home.doctorsHeading}
          description={t.home.doctorsLead}
          action={
            <Link to="/doctors">
              <Button variant="outline" size="sm">
                All Specialists →
              </Button>
            </Link>
          }
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {doctors.slice(0, 6).map((doc) => {
            const dept = departments.find((d) => d.id === doc.departmentId);
            const dest = graph?.destinations.find((d) => d.id === doc.destinationId);
            return (
              <article
                key={doc.id}
                className="flex flex-col justify-between rounded-architectural border border-champagne-border bg-surface p-5"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-architectural border border-champagne-border bg-teal-deep font-serif text-base font-semibold text-champagne">
                      {doc.portraitInitials}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/doctors/${doc.slug}`}
                        className="font-display text-base font-semibold text-ink hover:underline"
                      >
                        {tf(doc.fullName, doc.fullNameTa)}
                      </Link>
                      <p className="text-xs font-medium text-ink">
                        {tf(doc.title, doc.titleTa)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink">
                        {dept ? tf(dept.name, dept.nameTa) : ''} · Suite {dest?.roomCode}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink">
                    {tf(doc.bio, doc.bioTa)}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-champagne-border pt-4">
                  <span className="text-xs text-ink">
                    {doc.languages.join(' · ')}
                  </span>
                  <div className="flex gap-2">
                    {dest && (
                      <button
                        type="button"
                        onClick={() => handleLaunchRoute(dest)}
                        className="inline-flex min-h-[40px] items-center rounded border border-champagne-border px-3 text-xs font-medium text-ink hover:border-champagne"
                      >
                        Locate Suite
                      </button>
                    )}
                    <Link
                      to={`/appointments/book?doctorId=${encodeURIComponent(doc.id)}`}
                      className="inline-flex min-h-[40px] items-center rounded bg-teal-deep px-3.5 text-xs font-semibold text-white hover:bg-teal-forest"
                    >
                      Book Visit
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. Emergency Assistance Band with Gate A Photo */}
      <section className="mx-auto max-w-editorial px-4 pb-12 sm:px-6">
        <div className="grid gap-6 overflow-hidden rounded-architectural border border-champagne-border border-l-4 border-l-emergency bg-surface lg:grid-cols-12 lg:items-center">
          <div className="p-6 sm:p-8 lg:col-span-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emergency">
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>24/7 Urgent Dispatch · Sample Hotline +91 44 4019 2911</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
              {t.home.emergencyTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">{t.home.emergencyBody}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/emergency">
                <Button variant="emergency" size="md">
                  {t.home.emergencyAction}
                </Button>
              </Link>
              <Link to={`/navigate?dest=${encodeURIComponent(NODE_IDS.L0_EMERGENCY)}`}>
                <Button variant="outline" size="md">
                  Show Gate A 3D Path
                </Button>
              </Link>
            </div>
          </div>
          <div className="h-full min-h-[190px] lg:col-span-4">
            <img
              src={emergencyImage.src}
              alt={tf(emergencyImage.alt, emergencyImage.altTa)}
              width={emergencyImage.width}
              height={emergencyImage.height}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 6. Outdoor Arrival Leaflet Map & Hospital Info */}
      {hospital && (
        <section className="mx-auto max-w-editorial px-4 pb-8 sm:px-6">
          <SectionHeader
            eyebrow="Campus Location & Hours"
            title={t.home.campusInfoHeading}
            description={tf(hospital.sampleDisclaimer, hospital.sampleDisclaimerTa)}
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7">
              <CampusMapLeaflet
                latitude={hospital.latitude}
                longitude={hospital.longitude}
                hospitalName={tf(hospital.name, hospital.nameTa)}
                address={tf(hospital.address, hospital.addressTa)}
              />
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-architectural border border-champagne-border bg-surface p-6 lg:col-span-5">
              <dl className="space-y-4 text-sm text-ink">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Hospital Address
                  </dt>
                  <dd className="mt-1 font-medium text-ink">
                    {tf(hospital.address, hospital.addressTa)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Visiting &amp; Outpatient Hours
                  </dt>
                  <dd className="mt-1 flex items-center gap-2 text-ink">
                    <Clock className="h-4 w-4 text-ink" aria-hidden="true" />
                    <span>{tf(hospital.visitingHours, hospital.visitingHoursTa)}</span>
                  </dd>
                </div>
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Concierge Desk
                    </dt>
                    <dd className="mt-1 font-medium text-ink tabular-nums">{hospital.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-emergency">
                      Emergency Ramp
                    </dt>
                    <dd className="mt-1 font-semibold text-emergency tabular-nums">
                      {hospital.emergencyPhone}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-champagne-border pt-4">
                <Link to="/queue">
                  <Button variant="outline" size="sm">
                    <Stethoscope className="h-4 w-4" aria-hidden="true" />
                    <span>Live OPD Queue</span>
                  </Button>
                </Link>
                <Link to="/appointments/book">
                  <Button variant="primary" size="sm">
                    Book Consultation →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
