import type {
  Destination,
  EdgeType,
  Floor,
  FloorTransitionSummary,
  GraphValidationIssue,
  GraphValidationResult,
  NavigationEdge,
  NavigationNode,
  NavigationRouteResult,
  RouteStep,
} from './types.js';

export const BUILDING_3D_HALF_WIDTH = 24; // meters (-24 .. +24 = 48m wide)
export const BUILDING_3D_HALF_DEPTH = 15; // meters (-15 .. +15 = 30m deep)
export const FLOOR_HEIGHT_METERS = 4.2;

export function svgTo3D(
  x: number,
  y: number,
  levelNumber: number,
  explodedGapMeters = 0,
  yOffsetMeters = 0.28,
): [number, number, number] {
  const x3d = ((x - 500) / 500) * BUILDING_3D_HALF_WIDTH;
  const z3d = ((y - 320) / 320) * BUILDING_3D_HALF_DEPTH;
  const y3d = levelNumber * (FLOOR_HEIGHT_METERS + explodedGapMeters) + yOffsetMeters;
  return [Number(x3d.toFixed(3)), Number(y3d.toFixed(3)), Number(z3d.toFixed(3))];
}

export function coords3DToSvg(x3d: number, z3d: number): { x: number; y: number } {
  const x = Math.max(0, Math.min(1000, Math.round((x3d / BUILDING_3D_HALF_WIDTH) * 500 + 500)));
  const y = Math.max(0, Math.min(640, Math.round((z3d / BUILDING_3D_HALF_DEPTH) * 320 + 320)));
  return { x, y };
}

export function computeEdgeMetersFromNodes(a: NavigationNode, b: NavigationNode): number {
  if (a.floorId !== b.floorId) {
    return 12;
  }
  const dx = ((a.x - b.x) / 500) * BUILDING_3D_HALF_WIDTH;
  const dz = ((a.y - b.y) / 320) * BUILDING_3D_HALF_DEPTH;
  return Math.max(2, Math.round(Math.hypot(dx, dz)));
}

interface AdjacencyItem {
  toNodeId: string;
  edge: NavigationEdge;
  weight: number;
}

export interface CalculateRouteParams {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  floors: Floor[];
  startNodeId: string;
  endNodeId: string;
  accessibleOnly?: boolean;
}

function buildAdjacency(
  nodeMap: Map<string, NavigationNode>,
  edges: NavigationEdge[],
  accessibleOnly: boolean,
): Map<string, AdjacencyItem[]> {
  const adj = new Map<string, AdjacencyItem[]>();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
  }

  for (const edge of edges) {
    if (edge.isRestricted) continue;

    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);
    if (!fromNode || !toNode) continue;
    if (!fromNode.isActive || !toNode.isActive) continue;

    if (accessibleOnly) {
      if (!edge.isAccessible || edge.edgeType === 'staircase') continue;
      if (!fromNode.isAccessible || !toNode.isAccessible) continue;
    }

    // Slightly favor elevators in accessible mode and avoid excessive stair penalty distortion
    const edgeCost = Math.max(0.5, edge.distanceMeters);
    adj.get(edge.fromNodeId)?.push({
      toNodeId: edge.toNodeId,
      edge,
      weight: edgeCost,
    });

    if (edge.bidirectional) {
      adj.get(edge.toNodeId)?.push({
        toNodeId: edge.fromNodeId,
        edge,
        weight: edgeCost,
      });
    }
  }

  return adj;
}

function runDijkstra(
  nodeMap: Map<string, NavigationNode>,
  adj: Map<string, AdjacencyItem[]>,
  startNodeId: string,
  endNodeId: string,
): {
  found: boolean;
  orderedNodeIds: string[];
  traversedEdges: NavigationEdge[];
  totalDistanceMeters: number;
} {
  const dist = new Map<string, number>();
  const prevNode = new Map<string, string | null>();
  const prevEdge = new Map<string, NavigationEdge | null>();
  const visited = new Set<string>();

  for (const id of nodeMap.keys()) {
    dist.set(id, Number.POSITIVE_INFINITY);
    prevNode.set(id, null);
    prevEdge.set(id, null);
  }
  dist.set(startNodeId, 0);

  while (visited.size < nodeMap.size) {
    let currentId: string | null = null;
    let smallest = Number.POSITIVE_INFINITY;

    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < smallest) {
        smallest = d;
        currentId = id;
      }
    }

    if (currentId === null || smallest === Number.POSITIVE_INFINITY) {
      break;
    }
    if (currentId === endNodeId) {
      break;
    }

    visited.add(currentId);
    const neighbors = adj.get(currentId) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.toNodeId)) continue;
      const alt = smallest + neighbor.weight;
      if (alt < (dist.get(neighbor.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        dist.set(neighbor.toNodeId, alt);
        prevNode.set(neighbor.toNodeId, currentId);
        prevEdge.set(neighbor.toNodeId, neighbor.edge);
      }
    }
  }

  const finalDistance = dist.get(endNodeId) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(finalDistance)) {
    return {
      found: false,
      orderedNodeIds: [],
      traversedEdges: [],
      totalDistanceMeters: 0,
    };
  }

  const orderedNodeIds: string[] = [];
  const traversedEdges: NavigationEdge[] = [];
  let cursor: string | null = endNodeId;

  while (cursor !== null) {
    orderedNodeIds.unshift(cursor);
    const edge = prevEdge.get(cursor);
    if (edge) {
      traversedEdges.unshift(edge);
    }
    cursor = prevNode.get(cursor) ?? null;
  }

  return {
    found: orderedNodeIds[0] === startNodeId,
    orderedNodeIds,
    traversedEdges,
    totalDistanceMeters: Math.round(finalDistance),
  };
}

function getRelativeTurnPhrase(
  prev: NavigationNode | undefined,
  curr: NavigationNode,
  next: NavigationNode,
): { en: string; ta: string } {
  if (!prev || prev.floorId !== curr.floorId || curr.floorId !== next.floorId) {
    return { en: 'Proceed', ta: 'நேராக செல்லவும்' };
  }
  const v1x = curr.x - prev.x;
  const v1y = curr.y - prev.y;
  const v2x = next.x - curr.x;
  const v2y = next.y - curr.y;

  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;
  const angle = Math.atan2(cross, dot) * (180 / Math.PI);

  if (Math.abs(angle) < 28) {
    return { en: 'Continue straight', ta: 'நேராக தொடரவும்' };
  }
  if (angle >= 28 && angle < 145) {
    return { en: 'Turn right', ta: 'வலதுபுறம் திரும்பவும்' };
  }
  if (angle <= -28 && angle > -145) {
    return { en: 'Turn left', ta: 'இடதுபுறம் திரும்பவும்' };
  }
  return { en: 'Proceed', ta: 'தொடர்ந்து செல்லவும்' };
}

export function calculateShortestPath(params: CalculateRouteParams): NavigationRouteResult {
  const { nodes, edges, floors, startNodeId, endNodeId, accessibleOnly = false } = params;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const floorMap = new Map(floors.map((f) => [f.id, f]));

  const startNode = nodeMap.get(startNodeId);
  const endNode = nodeMap.get(endNodeId);

  if (!startNode || !endNode || !startNode.isActive || !endNode.isActive) {
    return {
      found: false,
      errorCode: 'MISSING_NODE',
      errorMessage: 'Selected origin or destination waypoint is currently inactive or missing.',
      errorMessageTa: 'தேர்ந்தெடுக்கப்பட்ட தொடக்கம் அல்லது சேருமிட முனையம் கிடைக்கவில்லை.',
      accessibleOnly,
      startNodeId,
      endNodeId,
      orderedNodeIds: [],
      orderedNodes: [],
      traversedEdgeIds: [],
      floorIdsInvolved: [],
      totalDistanceMeters: 0,
      estimatedDurationMinutes: 0,
      floorTransitions: [],
      steps: [],
    };
  }

  if (startNodeId === endNodeId) {
    const startFloor = floorMap.get(startNode.floorId);
    return {
      found: false,
      errorCode: 'SAME_ORIGIN_DESTINATION',
      errorMessage: `You are already at ${startNode.label} (${startFloor?.code ?? ''}). Choose a different destination.`,
      errorMessageTa: `நீங்கள் ஏற்கனவே ${startNode.labelTa} (${startFloor?.code ?? ''}) இடத்தில் உள்ளீர்கள். வேறு சேருமிடத்தைத் தேர்ந்தெடுக்கவும்.`,
      accessibleOnly,
      startNodeId,
      endNodeId,
      orderedNodeIds: [startNodeId],
      orderedNodes: [startNode],
      traversedEdgeIds: [],
      floorIdsInvolved: [startNode.floorId],
      totalDistanceMeters: 0,
      estimatedDurationMinutes: 0,
      floorTransitions: [],
      steps: [],
    };
  }

  const adj = buildAdjacency(nodeMap, edges, accessibleOnly);
  const result = runDijkstra(nodeMap, adj, startNodeId, endNodeId);

  if (!result.found) {
    // Check if an unrestricted non-accessible path exists so we give clear, specific UX guidance
    let hasStandardFallback = false;
    if (accessibleOnly) {
      const standardAdj = buildAdjacency(nodeMap, edges, false);
      hasStandardFallback = runDijkstra(nodeMap, standardAdj, startNodeId, endNodeId).found;
    }

    return {
      found: false,
      errorCode: hasStandardFallback ? 'NO_ACCESSIBLE_PATH' : 'NO_VALID_PATH',
      errorMessage: hasStandardFallback
        ? 'No step-free accessible elevator path is currently available between these locations. Please contact the Help Desk for assisted transfer or disable Accessible-Only filtering.'
        : 'No open walkable pathway connects the selected origin and destination in the published hospital graph.',
      errorMessageTa: hasStandardFallback
        ? 'இந்த இடங்களுக்கு இடையே படிக்கட்டு இல்லாத சக்கர நாற்காலி அணுகல் பாதை தற்போது இல்லை. உதவி மையத்தைத் தொடர்பு கொள்ளவும்.'
        : 'தற்போதைய மருத்துவமனை வரைபடத்தில் இந்த இடங்களை இணைக்கும் திறந்த பாதை இல்லை.',
      accessibleOnly,
      startNodeId,
      endNodeId,
      orderedNodeIds: [],
      orderedNodes: [],
      traversedEdgeIds: [],
      floorIdsInvolved: [],
      totalDistanceMeters: 0,
      estimatedDurationMinutes: 0,
      floorTransitions: [],
      steps: [],
    };
  }

  const orderedNodes = result.orderedNodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is NavigationNode => Boolean(n));

  const floorIdsInvolved = Array.from(new Set(orderedNodes.map((n) => n.floorId)));
  const floorTransitions: FloorTransitionSummary[] = [];
  const steps: RouteStep[] = [];

  const firstFloor = floorMap.get(orderedNodes[0].floorId);
  steps.push({
    index: 1,
    nodeId: orderedNodes[0].id,
    floorId: orderedNodes[0].floorId,
    floorCode: firstFloor?.code ?? 'L0',
    floorLevel: firstFloor?.levelNumber ?? 0,
    instruction: `Start at ${orderedNodes[0].label} (${firstFloor?.name ?? ''}).`,
    instructionTa: `${orderedNodes[0].labelTa} (${firstFloor?.nameTa ?? ''}) இடத்திலிருந்து தொடங்கவும்.`,
    distanceMeters: 0,
    isFloorTransition: false,
  });

  let transitionPenaltySeconds = 0;

  for (let i = 0; i < result.traversedEdges.length; i++) {
    const edge = result.traversedEdges[i];
    const fromNode = orderedNodes[i];
    const toNode = orderedNodes[i + 1];
    const prevNode = i > 0 ? orderedNodes[i - 1] : undefined;

    const fromFloor = floorMap.get(fromNode.floorId);
    const toFloor = floorMap.get(toNode.floorId);
    const isFloorTransition = fromNode.floorId !== toNode.floorId;

    if (isFloorTransition) {
      const via: 'elevator' | 'staircase' | 'ramp' =
        edge.edgeType === 'elevator'
          ? 'elevator'
          : edge.edgeType === 'ramp'
            ? 'ramp'
            : 'staircase';

      transitionPenaltySeconds += via === 'elevator' ? 38 : 24;

      floorTransitions.push({
        fromFloorId: fromNode.floorId,
        fromFloorCode: fromFloor?.code ?? '',
        toFloorId: toNode.floorId,
        toFloorCode: toFloor?.code ?? '',
        via,
        nodeId: toNode.id,
        label: fromNode.label,
        labelTa: fromNode.labelTa,
      });

      const movingUp = (toFloor?.levelNumber ?? 0) > (fromFloor?.levelNumber ?? 0);
      const viaEn =
        via === 'elevator'
          ? 'Take the elevator'
          : via === 'ramp'
            ? 'Follow the accessible ramp'
            : 'Take the staircase';
      const viaTa =
        via === 'elevator'
          ? 'மின்தூக்கி (Elevator) வழியாக'
          : via === 'ramp'
            ? 'சாய்வு பாதை வழியாக'
            : 'படிக்கட்டு வழியாக';

      steps.push({
        index: steps.length + 1,
        nodeId: toNode.id,
        floorId: toNode.floorId,
        floorCode: toFloor?.code ?? '',
        floorLevel: toFloor?.levelNumber ?? 0,
        instruction: `${viaEn} ${movingUp ? 'up' : 'down'} from ${fromFloor?.code ?? ''} to ${toFloor?.code ?? ''} (${toFloor?.name ?? ''}).`,
        instructionTa: `${fromFloor?.code ?? ''} தளத்திலிருந்து ${toFloor?.code ?? ''} (${toFloor?.nameTa ?? ''}) தளத்திற்கு ${viaTa} ${movingUp ? 'மேலே' : 'கீழே'} செல்லவும்.`,
        edgeType: edge.edgeType,
        distanceMeters: edge.distanceMeters,
        isFloorTransition: true,
        fromFloorCode: fromFloor?.code,
        toFloorCode: toFloor?.code,
      });
    } else {
      const isFinal = i === result.traversedEdges.length - 1;
      const turn = getRelativeTurnPhrase(prevNode, fromNode, toNode);
      const stepInstructionEn = isFinal
        ? `${turn.en} ${edge.distanceMeters} m to arrive at ${toNode.label} (${toFloor?.code ?? ''}).`
        : `${turn.en} along ${toNode.label} (${edge.distanceMeters} m).`;
      const stepInstructionTa = isFinal
        ? `${turn.ta}, ${edge.distanceMeters} மீ நடந்து ${toNode.labelTa} (${toFloor?.code ?? ''}) அடையவும்.`
        : `${turn.ta}, ${toNode.labelTa} வழியாக ${edge.distanceMeters} மீ செல்லவும்.`;

      steps.push({
        index: steps.length + 1,
        nodeId: toNode.id,
        floorId: toNode.floorId,
        floorCode: toFloor?.code ?? '',
        floorLevel: toFloor?.levelNumber ?? 0,
        instruction: stepInstructionEn,
        instructionTa: stepInstructionTa,
        edgeType: edge.edgeType,
        distanceMeters: edge.distanceMeters,
        isFloorTransition: false,
      });
    }
  }

  const walkSpeedMetersPerSec = accessibleOnly ? 0.85 : 1.2;
  const totalSeconds = result.totalDistanceMeters / walkSpeedMetersPerSec + transitionPenaltySeconds;
  const estimatedDurationMinutes = Math.max(1, Math.ceil(totalSeconds / 60));

  return {
    found: true,
    accessibleOnly,
    startNodeId,
    endNodeId,
    orderedNodeIds: result.orderedNodeIds,
    orderedNodes,
    traversedEdgeIds: result.traversedEdges.map((e) => e.id),
    floorIdsInvolved,
    totalDistanceMeters: result.totalDistanceMeters,
    estimatedDurationMinutes,
    floorTransitions,
    steps,
  };
}

export function validateNavigationGraph(params: {
  floors: Floor[];
  destinations: Destination[];
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  primaryEntranceNodeId?: string;
}): GraphValidationResult {
  const { floors, destinations, nodes, edges } = params;
  const issues: GraphValidationIssue[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const floorMap = new Map(floors.map((f) => [f.id, f]));

  const primaryEntrance =
    (params.primaryEntranceNodeId ? nodeMap.get(params.primaryEntranceNodeId) : undefined) ??
    nodes.find((n) => n.type === 'entrance' && n.isActive);

  if (!primaryEntrance) {
    issues.push({
      severity: 'error',
      code: 'MISSING_PRIMARY_ENTRANCE',
      message: 'No active entrance node exists in the hospital navigation graph.',
    });
  }

  // Degree count across valid non-restricted edges
  const degree = new Map<string, number>();
  for (const node of nodes) {
    degree.set(node.id, 0);
  }

  for (const edge of edges) {
    const from = nodeMap.get(edge.fromNodeId);
    const to = nodeMap.get(edge.toNodeId);
    if (!from || !to) {
      issues.push({
        severity: 'error',
        code: 'BROKEN_EDGE_REFERENCE',
        message: `Edge ${edge.id} references a missing navigation node.`,
        entityId: edge.id,
      });
      continue;
    }
    if (edge.distanceMeters <= 0) {
      issues.push({
        severity: 'error',
        code: 'INVALID_EDGE_DISTANCE',
        message: `Edge between ${from.label} and ${to.label} must have a positive distance.`,
        entityId: edge.id,
      });
    }
    if (!edge.isRestricted && from.isActive && to.isActive) {
      degree.set(from.id, (degree.get(from.id) ?? 0) + 1);
      degree.set(to.id, (degree.get(to.id) ?? 0) + 1);
    }
  }

  const orphanNodeIds: string[] = [];
  for (const node of nodes) {
    if (node.isActive && (degree.get(node.id) ?? 0) === 0) {
      orphanNodeIds.push(node.id);
      issues.push({
        severity: 'warning',
        code: 'ORPHAN_NODE',
        message: `Node "${node.label}" (${floorMap.get(node.floorId)?.code ?? node.floorId}) has no open pathway connections.`,
        entityId: node.id,
      });
    }
  }

  const unreachableDestinationIds: string[] = [];
  const inaccessibleDestinationIds: string[] = [];

  for (const dest of destinations) {
    const targetNode = nodeMap.get(dest.nodeId);
    if (!targetNode || !targetNode.isActive) {
      unreachableDestinationIds.push(dest.id);
      issues.push({
        severity: 'error',
        code: 'DESTINATION_MISSING_NODE',
        message: `Destination "${dest.name}" is linked to an inactive or missing navigation node.`,
        entityId: dest.id,
      });
      continue;
    }

    if (primaryEntrance && primaryEntrance.id !== targetNode.id) {
      const standardRoute = calculateShortestPath({
        nodes,
        edges,
        floors,
        startNodeId: primaryEntrance.id,
        endNodeId: targetNode.id,
        accessibleOnly: false,
      });
      if (!standardRoute.found) {
        unreachableDestinationIds.push(dest.id);
        issues.push({
          severity: 'error',
          code: 'UNREACHABLE_DESTINATION',
          message: `Destination "${dest.name}" is unreachable from ${primaryEntrance.label}.`,
          entityId: dest.id,
        });
      } else if (dest.isAccessible) {
        const accessibleRoute = calculateShortestPath({
          nodes,
          edges,
          floors,
          startNodeId: primaryEntrance.id,
          endNodeId: targetNode.id,
          accessibleOnly: true,
        });
        if (!accessibleRoute.found) {
          inaccessibleDestinationIds.push(dest.id);
          issues.push({
            severity: 'warning',
            code: 'NO_ACCESSIBLE_ROUTE_TO_DESTINATION',
            message: `Destination "${dest.name}" is marked accessible but lacks a step-free route from ${primaryEntrance.label}.`,
            entityId: dest.id,
          });
        }
      }
    }
  }

  const disconnectedFloorIds: string[] = [];
  if (primaryEntrance) {
    for (const floor of floors) {
      const floorNodes = nodes.filter((n) => n.floorId === floor.id && n.isActive);
      if (floorNodes.length === 0) continue;
      if (floor.id === primaryEntrance.floorId) continue;

      const hasReachableNode = floorNodes.some((n) => {
        const r = calculateShortestPath({
          nodes,
          edges,
          floors,
          startNodeId: primaryEntrance.id,
          endNodeId: n.id,
          accessibleOnly: false,
        });
        return r.found;
      });
      if (!hasReachableNode) {
        disconnectedFloorIds.push(floor.id);
        issues.push({
          severity: 'error',
          code: 'DISCONNECTED_FLOOR',
          message: `Floor ${floor.code} (${floor.name}) has no open elevator or staircase connection to ${floorMap.get(primaryEntrance.floorId)?.code ?? 'ground'}.`,
          entityId: floor.id,
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    valid: !hasErrors,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    activeNodeCount: nodes.filter((n) => n.isActive).length,
    destinationCount: destinations.length,
    unreachableDestinationIds,
    inaccessibleDestinationIds,
    orphanNodeIds,
    disconnectedFloorIds,
    issues,
  };
}

