import { describe, expect, it } from 'vitest';
import {
  calculateShortestPath,
  coords3DToSvg,
  svgTo3D,
  validateNavigationGraph,
} from '../navigation.js';
import {
  FLOOR_IDS,
  NODE_IDS,
  RESTRICTED_EDGE_ID,
  SAMPLE_DESTINATIONS,
  SAMPLE_EDGES,
  SAMPLE_FLOORS,
  SAMPLE_NODES,
} from '../sampleHospital.js';

describe('MEDIPATH Dijkstra Navigation Engine & Graph Integrity', () => {
  it('validates the entire sample hospital spatial graph with zero errors and zero warnings', () => {
    const validation = validateNavigationGraph({
      floors: SAMPLE_FLOORS,
      destinations: SAMPLE_DESTINATIONS,
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      primaryEntranceNodeId: NODE_IDS.L0_ENTRANCE,
    });

    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.unreachableDestinationIds).toEqual([]);
    expect(validation.inaccessibleDestinationIds).toEqual([]);
    expect(validation.orphanNodeIds).toEqual([]);
    expect(validation.disconnectedFloorIds).toEqual([]);
  });

  it('calculates a valid multi-floor route from Main Entrance (L0) to Cardiology (L2)', () => {
    const route = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: false,
    });

    expect(route.found).toBe(true);
    expect(route.totalDistanceMeters).toBeGreaterThan(20);
    expect(route.estimatedDurationMinutes).toBeGreaterThanOrEqual(1);
    expect(route.floorTransitions.length).toBeGreaterThanOrEqual(1);
    expect(route.floorIdsInvolved).toContain(FLOOR_IDS.L0);
    expect(route.floorIdsInvolved).toContain(FLOOR_IDS.L2);
    expect(route.steps[0].instruction).toContain('Main Entrance Portico');
    expect(route.steps.at(-1)?.instructionTa).toContain('இதயவியல் சிகிச்சைப் பிரிவு');
  });

  it('enforces accessible routing by strictly excluding staircase edges', () => {
    const standardRoute = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_STAIR_W,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: false,
    });
    expect(standardRoute.found).toBe(true);
    expect(standardRoute.floorTransitions.some((t) => t.via === 'staircase')).toBe(true);

    const accessibleRoute = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_STAIR_W,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: true,
    });

    expect(accessibleRoute.found).toBe(true);
    expect(accessibleRoute.floorTransitions.length).toBeGreaterThanOrEqual(1);
    expect(accessibleRoute.floorTransitions.every((t) => t.via === 'elevator')).toBe(true);
  });

  it('strictly excludes restricted staff-only pathways from public routes', () => {
    const route = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L3_ICU,
      endNodeId: NODE_IDS.L3_CENTRAL_GALLERY,
      accessibleOnly: true,
    });

    expect(route.found).toBe(true);
    expect(route.traversedEdgeIds).not.toContain(RESTRICTED_EDGE_ID);
  });

  it('returns clear error when origin and destination are identical or disconnected', () => {
    const same = calculateShortestPath({
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_RECEPTION,
      endNodeId: NODE_IDS.L0_RECEPTION,
    });
    expect(same.found).toBe(false);
    expect(same.errorCode).toBe('SAME_ORIGIN_DESTINATION');

    const isolatedNodes = [
      ...SAMPLE_NODES,
      {
        id: 'isolated-room',
        floorId: FLOOR_IDS.L2,
        mapVersionId: 'v1',
        code: 'ISO',
        label: 'Isolated Vault',
        labelTa: 'தனிமை அறை',
        type: 'room' as const,
        x: 600,
        y: 300,
        isAccessible: true,
        isActive: true,
      },
    ];

    const disconnected = calculateShortestPath({
      nodes: isolatedNodes,
      edges: SAMPLE_EDGES,
      floors: SAMPLE_FLOORS,
      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: 'isolated-room',
    });
    expect(disconnected.found).toBe(false);
    expect(disconnected.errorCode).toBe('NO_VALID_PATH');
  });

  it('maps SVG 2D coordinates to 3D meters and back accurately', () => {
    const [x3d, y3d, z3d] = svgTo3D(500, 320, 2);
    expect(x3d).toBe(0);
    expect(z3d).toBe(0);
    expect(y3d).toBeCloseTo(8.68, 2);

    const [edgeX, , edgeZ] = svgTo3D(750, 480, 0);
    const back = coords3DToSvg(edgeX, edgeZ);
    expect(back.x).toBeCloseTo(750, 0);
    expect(back.y).toBeCloseTo(480, 0);
  });
});
