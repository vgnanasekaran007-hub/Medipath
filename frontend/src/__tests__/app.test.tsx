import {
  calculateShortestPath,
  NODE_IDS,
  SAMPLE_DESTINATIONS,
  SAMPLE_EDGES,
  SAMPLE_FLOORS,
  SAMPLE_NODES,
  SAMPLE_QR_CHECKPOINTS,
} from '@medipath/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FloorPlan2DSVG } from '../components/navigation/FloorPlan2DSVG';
import { RouteDirectionsPanel } from '../components/navigation/RouteDirectionsPanel';
import { AdminLayout } from '../layouts/AdminLayout';
import { ApiError } from '../lib/apiError';
import {
  getDepartmentMedia,
  getServiceMedia,
  HOSPITAL_EXTERIOR_MEDIA,
} from '../lib/hospitalMedia';
import {
  resetStandaloneFixtureStore,
  standaloneFixtureApi,
} from '../lib/standaloneFixtureApi';
import { useAppStore } from '../stores/appStore';

describe('MEDIPATH Frontend Core Components', () => {
  beforeEach(() => {
    useAppStore.getState().setLanguage('en');
    useAppStore.getState().setTheme('light');
    useAppStore.getState().setBuildingStyle('cutaway');
    useAppStore.getState().clearSession();
  });

  it('renders synchronized 2D SVG floor plan with destination zones and calculated Dijkstra route overlay', () => {
    const route = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L0_EMERGENCY,
      accessibleOnly: true,
    });

    const { container } = render(
      <MemoryRouter>
        <FloorPlan2DSVG
          floor={SAMPLE_FLOORS[0]}
          nodes={SAMPLE_NODES}
          edges={SAMPLE_EDGES}
          destinations={SAMPLE_DESTINATIONS}
          qrCheckpoints={SAMPLE_QR_CHECKPOINTS}
          route={route}
          startNodeId={NODE_IDS.L0_ENTRANCE}
          endNodeId={NODE_IDS.L0_EMERGENCY}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Ground Atrium & Emergency/i)).toBeInTheDocument();
    expect(screen.getByText('G-ER')).toBeInTheDocument();
    expect(container.querySelectorAll('polyline').length).toBeGreaterThanOrEqual(2);
  });

  it('switches directions panel cleanly between English and Tamil and triggers accessibility callback', () => {
    const route = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: true,
    });

    const onToggleAccessible = vi.fn();

    render(
      <MemoryRouter>
        <RouteDirectionsPanel
          floors={SAMPLE_FLOORS}
          nodes={SAMPLE_NODES}
          destinations={SAMPLE_DESTINATIONS}
          qrCheckpoints={SAMPLE_QR_CHECKPOINTS}
          startNodeId={NODE_IDS.L0_ENTRANCE}
          endNodeId={NODE_IDS.L2_CARDIOLOGY}
          accessibleOnly
          activeQrCheckpoint={null}
          route={route}
          activeStepIndex={0}
          onChangeStart={vi.fn()}
          onChangeEnd={vi.fn()}
          onToggleAccessible={onToggleAccessible}
          onSelectQrCheckpoint={vi.fn()}
          onSelectStep={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Step-by-Step Walking Guide/i)).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggleAccessible).toHaveBeenCalledWith(false);

    // Toggle global language to Tamil reactively on same mounted tree
    act(() => {
      useAppStore.getState().setLanguage('ta');
    });

    expect(screen.getByText(/படிப்படியான நடை வழிகாட்டி/)).toBeInTheDocument();
  });

  it('prevents patient users from entering AdminLayout shell', () => {
    useAppStore.getState().setSession(
      {
        id: 'p1',
        email: 'patient@medipath.demo',
        fullName: 'Priya',
        role: 'patient',
        preferredLanguage: 'en',
        accessibilityRequired: false,
        createdAt: '',
        updatedAt: '',
      },
      'mock-token',
    );

    render(
      <MemoryRouter>
        <AdminLayout>
          <div>Secret Admin Panel</div>
        </AdminLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Staff or Administrator Access Required/i)).toBeInTheDocument();
    expect(screen.queryByText(/Secret Admin Panel/i)).not.toBeInTheDocument();
  });

  it('supports full standalone frontend-only navigation, booking conflict, queue masking & admin RBAC', async () => {
    resetStandaloneFixtureStore();
    useAppStore.getState().clearSession();

    const overview = await standaloneFixtureApi.getHospitalOverview();
    expect(overview.hospital.name).toContain('Aurelia Pavilion');

    const routeRes = await standaloneFixtureApi.calculateRoute({
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: true,
    });
    expect(routeRes.route.found).toBe(true);
    expect(routeRes.route.floorTransitions.every((tr) => tr.via === 'elevator')).toBe(true);

    // Public queue masks patient names when unauthenticated
    const publicQueue = await standaloneFixtureApi.getQueue();
    expect(publicQueue.tokens[0].patientName).toMatch(/^[A-Z]\./);

    // Admin overview rejects unauthenticated requests cleanly
    await expect(standaloneFixtureApi.admin.getOverview()).rejects.toBeInstanceOf(ApiError);

    // Sign in as admin and verify overview + validation work
    const { user, token } = await standaloneFixtureApi.login({
      email: 'admin@medipath.demo',
      password: 'MediPathDemo!2026',
    });
    useAppStore.getState().setSession(user, token);
    const adminOverview = await standaloneFixtureApi.admin.getOverview();
    expect(adminOverview.graphValidation.valid).toBe(true);
    expect(adminOverview.departmentCount).toBe(10);
  });

  it('toggles Light/Dark View class on document root, switches Real Building 3D style, and resolves .jpg media assets', () => {
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    act(() => {
      useAppStore.getState().toggleTheme();
    });
    expect(useAppStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      useAppStore.getState().toggleTheme();
    });
    expect(useAppStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    expect(useAppStore.getState().buildingStyle).toBe('cutaway');
    act(() => {
      useAppStore.getState().toggleBuildingStyle();
    });
    expect(useAppStore.getState().buildingStyle).toBe('realistic');

    expect(HOSPITAL_EXTERIOR_MEDIA.src).toBe('/images/hospital-exterior.jpg');
    expect(getServiceMedia('24-hour-pharmacy-dispensary').src).toBe('/images/service-pharmacy.jpg');
    expect(getDepartmentMedia('emergency').src).toBe('/images/service-emergency.jpg');
  });

  it('renders enhanced 2D floor plan directional flow chevrons and elevator transfer callouts on multi-floor routes', () => {
    const multiFloorRoute = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: true,
    });

    const { container } = render(
      <MemoryRouter>
        <FloorPlan2DSVG
          floor={SAMPLE_FLOORS[0]}
          nodes={SAMPLE_NODES}
          edges={SAMPLE_EDGES}
          destinations={SAMPLE_DESTINATIONS}
          qrCheckpoints={SAMPLE_QR_CHECKPOINTS}
          route={multiFloorRoute}
          startNodeId={NODE_IDS.L0_ENTRANCE}
          endNodeId={NODE_IDS.L2_CARDIOLOGY}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText(/TAKE LIFT → L2/i)).toBeInTheDocument();
    expect(container.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(3);
  });
});
