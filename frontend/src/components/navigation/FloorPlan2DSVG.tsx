import type {
  Destination,
  Floor,
  NavigationEdge,
  NavigationNode,
  NavigationRouteResult,
  QrCheckpoint,
} from '@medipath/shared';
import clsx from 'clsx';
import { Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from '../../i18n/translations';
import { useAppStore } from '../../stores/appStore';

interface FloorPlan2DSVGProps {
  floor: Floor;
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  destinations: Destination[];
  qrCheckpoints?: QrCheckpoint[];
  route?: NavigationRouteResult | null;
  startNodeId?: string;
  endNodeId?: string;
  highlightedNodeId?: string;
  activeStepNodeId?: string;
  editable?: boolean;
  pendingEdgeFromId?: string | null;
  fullHeight?: boolean;
  headerActions?: ReactNode;
  onCanvasClick?: (coords: { x: number; y: number }) => void;
  onNodeClick?: (node: NavigationNode) => void;
  onDestinationClick?: (destination: Destination) => void;
}

function wrapZoneTitleLines(label: string, zoneWidth: number): string[] {
  const maxChars = Math.max(8, Math.floor((zoneWidth - 10) / 4.85));
  if (label.length <= maxChars) return [label];

  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  if (lines.length > 3) {
    const first = lines.slice(0, 2);
    const tail = lines.slice(2).join(' ');
    return [...first, tail.length > maxChars ? `${tail.slice(0, maxChars - 1)}…` : tail];
  }

  return lines;
}

export function FloorPlan2DSVG({
  floor,
  nodes,
  edges,
  destinations,
  qrCheckpoints = [],
  route,
  startNodeId,
  endNodeId,
  highlightedNodeId,
  activeStepNodeId,
  editable = false,
  pendingEdgeFromId = null,
  fullHeight = false,
  headerActions,
  onCanvasClick,
  onNodeClick,
  onDestinationClick,
}: FloorPlan2DSVGProps) {
  const { lang, tf } = useTranslation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const [zoom, setZoom] = useState(1);
  const [isDraggingPan, setIsDraggingPan] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    moved: 0,
  });

  const floorNodes = nodes.filter((n) => n.floorId === floor.id);
  const floorNodeIds = new Set(floorNodes.map((n) => n.id));
  const nodeMap = new Map(floorNodes.map((n) => [n.id, n]));

  const floorEdges = edges.filter(
    (e) => floorNodeIds.has(e.fromNodeId) && floorNodeIds.has(e.toNodeId),
  );
  const floorDestinations = destinations.filter((d) => d.floorId === floor.id);
  const floorQrs = qrCheckpoints.filter((q) => q.floorId === floor.id);

  const routeNodeIdsOnFloor = route?.found
    ? route.orderedNodes.filter((n) => n.floorId === floor.id)
    : [];

  // Consecutive segments & polylines strictly within this floor
  const routePolylines: string[] = [];
  const routeArrowSegments: { from: NavigationNode; to: NavigationNode }[] = [];

  if (route?.found) {
    let currentSegment: string[] = [];
    for (let i = 0; i < route.orderedNodes.length; i += 1) {
      const node = route.orderedNodes[i];
      const nextNode = route.orderedNodes[i + 1];

      if (node.floorId === floor.id) {
        currentSegment.push(`${node.x},${node.y}`);
        if (nextNode && nextNode.floorId === floor.id) {
          routeArrowSegments.push({ from: node, to: nextNode });
        }
      } else if (currentSegment.length > 0) {
        if (currentSegment.length >= 2) {
          routePolylines.push(currentSegment.join(' '));
        }
        currentSegment = [];
      }
    }
    if (currentSegment.length >= 2) {
      routePolylines.push(currentSegment.join(' '));
    }
  }

  // Compute smart Lift / Stairs departure & arrival callout pills directly from orderedNodes
  const transitionCallouts: {
    x: number;
    y: number;
    text: string;
    via: 'elevator' | 'staircase';
  }[] = [];

  if (route?.found && route.orderedNodes.length >= 2) {
    const floorCodeLookup = (fid: string) => {
      const sample = nodes.find((n) => n.floorId === fid);
      const prefixMatch = sample?.code.match(/^(L\d+)/);
      if (prefixMatch) return prefixMatch[1];
      return fid === floor.id ? floor.code : 'Next';
    };

    for (let i = 0; i < route.orderedNodes.length - 1; i += 1) {
      const curr = route.orderedNodes[i];
      const next = route.orderedNodes[i + 1];
      if (curr.floorId === next.floorId) continue;

      const via: 'elevator' | 'staircase' =
        curr.type === 'staircase' || next.type === 'staircase' ? 'staircase' : 'elevator';

      // Departing this floor vertically (skip straight to final non-shaft floor if riding multi-floor shaft)
      if (curr.floorId === floor.id) {
        let j = i + 1;
        while (
          j < route.orderedNodes.length - 1 &&
          route.orderedNodes[j + 1].floorId !== route.orderedNodes[j].floorId
        ) {
          j += 1;
        }
        const exitFloorCode = floorCodeLookup(route.orderedNodes[j].floorId);
        transitionCallouts.push({
          x: curr.x,
          y: curr.y,
          text:
            lang === 'ta'
              ? `${exitFloorCode}-க்கு ${via === 'elevator' ? 'மின்தூக்கி ↑' : 'படிக்கட்டு ↑'}`
              : `${via === 'elevator' ? 'TAKE LIFT' : 'STAIRS'} → ${exitFloorCode}`,
          via,
        });
      }

      // Exiting onto this floor from elevator/stairs to begin walking
      if (next.floorId === floor.id) {
        const afterNext = route.orderedNodes[i + 2];
        if (!afterNext || afterNext.floorId === floor.id) {
          transitionCallouts.push({
            x: next.x,
            y: next.y,
            text:
              lang === 'ta'
                ? `${via === 'elevator' ? 'மின்தூக்கி' : 'படிக்கட்டு'} வெளியே →`
                : `EXIT ${via === 'elevator' ? 'LIFT' : 'STAIRS'} →`,
            via,
          });
        }
      }
    }
  }

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (editable || !viewportRef.current) return;
    if (e.button !== 0) return;
    setIsDraggingPan(true);
    panStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
      moved: 0,
    };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!panStateRef.current.active || !viewportRef.current) return;
    const dx = e.clientX - panStateRef.current.startX;
    const dy = e.clientY - panStateRef.current.startY;
    panStateRef.current.moved = Math.max(panStateRef.current.moved, Math.hypot(dx, dy));
    viewportRef.current.scrollLeft = panStateRef.current.scrollLeft - dx;
    viewportRef.current.scrollTop = panStateRef.current.scrollTop - dy;
  };

  const stopPanDrag = () => {
    panStateRef.current.active = false;
    setIsDraggingPan(false);
  };

  const didPanDrag = () => panStateRef.current.moved > 6;

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!editable || !onCanvasClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(20, Math.min(980, Math.round(((e.clientX - rect.left) / rect.width) * 1000)));
    const y = Math.max(20, Math.min(620, Math.round(((e.clientY - rect.top) / rect.height) * 640)));
    onCanvasClick({ x, y });
  };

  const shellStroke = isDark ? '#4D7480' : '#102C35';
  const gridStroke = isDark ? '#1A353E' : '#EAE4D9';
  const corridorFill = isDark ? '#19353F' : '#EAE5DA';
  const corridorCurb = isDark ? '#2B5360' : '#D2CBBF';
  const corridorCenter = isDark ? '#3B6E7D' : '#BEB5A4';

  return (
    <div className="flex flex-col overflow-hidden rounded-architectural border border-champagne-border bg-surface shadow-sm">
      {/* Top Blueprint Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-champagne-border bg-ivory/80 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-teal-deep px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              {floor.code}
            </span>
            <h3 className="truncate font-display text-sm font-semibold text-ink sm:text-base">
              {tf(floor.name, floor.nameTa)}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Zoom out 2D plan"
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.2).toFixed(2))))}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-champagne-border bg-surface text-ink hover:bg-champagne-soft"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[46px] text-center text-xs font-semibold text-ink tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in 2D plan"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(2))))}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-champagne-border bg-surface text-ink hover:bg-champagne-soft"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              aria-label="Reset 2D zoom"
              onClick={() => setZoom(1)}
              className="inline-flex h-9 items-center gap-1 rounded border border-champagne-border bg-surface px-2.5 text-xs font-medium text-ink hover:bg-champagne-soft"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Fit</span>
            </button>
          )}
          {headerActions}
        </div>
      </div>

      {/* Pan & Zoom Architectural SVG Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopPanDrag}
        onMouseLeave={stopPanDrag}
        className={clsx(
          'relative overflow-auto p-2.5 sm:p-4',
          isDark ? 'bg-[#09161B]' : 'bg-[#F8F6F1]',
          !editable && (isDraggingPan ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'),
        )}
      >
        <div
          style={{ width: `${Math.round(zoom * 100)}%`, minWidth: '100%' }}
          className={fullHeight ? 'mx-auto max-w-[1440px]' : undefined}
        >
          <svg
            viewBox="0 0 1000 640"
            className={clsx(
              'h-auto w-full select-none',
              editable ? 'cursor-crosshair' : undefined,
            )}
            role="img"
            aria-label={`2D architectural floor map for ${floor.code} ${floor.name}`}
            onClick={handleSvgClick}
          >
            {/* 1. Blueprint Floor Plate & Architectural Perimeter */}
            <rect
              x="36"
              y="48"
              width="928"
              height="544"
              rx="10"
              fill={isDark ? '#0E1E24' : '#FCFBF8'}
              stroke={shellStroke}
              strokeWidth="3"
            />
            <rect
              x="46"
              y="58"
              width="908"
              height="524"
              rx="6"
              fill="none"
              stroke={isDark ? '#22414B' : '#DFD8CA'}
              strokeWidth="1"
            />

            {/* Subtle Structural Coordinate Grid */}
            {[120, 200, 280, 360, 440, 520, 600, 680, 760, 840, 920].map((gx) => (
              <line
                key={`grid-x-${gx}`}
                x1={gx}
                y1="58"
                x2={gx}
                y2="582"
                stroke={gridStroke}
                strokeWidth="0.8"
                strokeDasharray="3 5"
              />
            ))}
            {[140, 220, 300, 380, 460, 540].map((gy) => (
              <line
                key={`grid-y-${gy}`}
                x1="46"
                y1={gy}
                x2="954"
                y2={gy}
                stroke={gridStroke}
                strokeWidth="0.8"
                strokeDasharray="3 5"
              />
            ))}

            {/* 2. Cardinal Site Orientation Labels */}
            <text
              x="500"
              y="34"
              textAnchor="middle"
              fill={isDark ? '#9DB7BC' : '#43585D'}
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              ↑ North Courtyard · Restrooms &amp; Garden
            </text>
            <text
              x="500"
              y="618"
              textAnchor="middle"
              fill={isDark ? '#9DB7BC' : '#43585D'}
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              ↓ South Main Entrance · Drop-off Portico
            </text>
            <text
              x="19"
              y="320"
              textAnchor="middle"
              transform="rotate(-90 19 320)"
              fill={isDark ? '#9DB7BC' : '#43585D'}
              className="text-[9.5px] font-bold uppercase tracking-[0.18em]"
            >
              West Wing · ER Gate A
            </text>
            <text
              x="982"
              y="320"
              textAnchor="middle"
              transform="rotate(90 982 320)"
              fill={isDark ? '#9DB7BC' : '#43585D'}
              className="text-[9.5px] font-bold uppercase tracking-[0.18em]"
            >
              East Wing · Garden Lifts
            </text>

            {/* Architectural Compass Rose (Outer Top-Right Margin, clear of floor zones) */}
            <g transform="translate(946, 24)" aria-hidden="true">
              <circle
                r="14"
                fill={isDark ? '#142B33' : '#FFFFFF'}
                stroke={isDark ? '#4D7480' : '#B7A58A'}
                strokeWidth="1.2"
              />
              <polygon points="0,-10.5 3.2,0 0,-2.8 -3.2,0" fill="#B7A58A" />
              <polygon points="0,10.5 2.6,0 0,2.8 -2.6,0" fill={isDark ? '#4D7480' : '#102C35'} opacity="0.45" />
              <text
                x="0"
                y="-3.8"
                textAnchor="middle"
                fill={isDark ? '#EDF2F1' : '#102C35'}
                className="text-[7.5px] font-bold"
              >
                N
              </text>
            </g>

            {/* 3. Wide Walkable Concourse Corridor Loop */}
            <g>
              <path
                d="M 180 180 H 860 M 180 460 H 860 M 180 180 V 470 M 500 180 V 550 M 760 180 V 460"
                stroke={corridorCurb}
                strokeWidth="32"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 180 180 H 860 M 180 460 H 860 M 180 180 V 470 M 500 180 V 550 M 760 180 V 460"
                stroke={corridorFill}
                strokeWidth="26"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 180 180 H 860 M 180 460 H 860 M 180 180 V 470 M 500 180 V 550 M 760 180 V 460"
                stroke={corridorCenter}
                strokeWidth="1.2"
                strokeDasharray="6 6"
                fill="none"
                opacity={0.7}
              />
            </g>

            {/* Central Atrium Sunlight Void */}
            <g>
              <rect
                x="395"
                y="245"
                width="210"
                height="120"
                rx="6"
                fill={isDark ? '#122931' : '#F0ECE2'}
                stroke={isDark ? '#3F6570' : '#B7A58A'}
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <line
                x1="395"
                y1="245"
                x2="605"
                y2="365"
                stroke={isDark ? '#224550' : '#DFD7C8'}
                strokeWidth="1"
              />
              <line
                x1="605"
                y1="245"
                x2="395"
                y2="365"
                stroke={isDark ? '#224550' : '#DFD7C8'}
                strokeWidth="1"
              />
              <text
                x="500"
                y="302"
                textAnchor="middle"
                fill={isDark ? '#CFE0E2' : '#13262B'}
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
              >
                Central Atrium
              </text>
              <text
                x="500"
                y="319"
                textAnchor="middle"
                fill={isDark ? '#8FA9AE' : '#657477'}
                className="text-[9.5px] font-medium tracking-wider"
              >
                Open Skylight Court
              </text>
            </g>

            {/* Wing Corridor Street Names */}
            <text
              x="630"
              y="183"
              textAnchor="middle"
              fill={isDark ? '#8FA9AE' : '#657477'}
              className="text-[8.5px] font-bold uppercase tracking-[0.24em]"
            >
              North Gallery Walkway
            </text>
            <text
              x="625"
              y="463"
              textAnchor="middle"
              fill={isDark ? '#8FA9AE' : '#657477'}
              className="text-[8.5px] font-bold uppercase tracking-[0.24em]"
            >
              South Atrium Concourse
            </text>

            {/* 4. Graph Edges (shows restricted / accessible paths cleanly) */}
            {floorEdges.map((edge) => {
              const a = nodeMap.get(edge.fromNodeId);
              const b = nodeMap.get(edge.toNodeId);
              if (!a || !b) return null;
              return (
                <line
                  key={edge.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    edge.isRestricted
                      ? '#DC4C40'
                      : editable
                        ? isDark
                          ? '#6699A1'
                          : '#4C6B70'
                        : isDark
                          ? '#2F5560'
                          : '#A8B3B1'
                  }
                  strokeWidth={edge.isRestricted ? 2.5 : editable ? 2 : 1.2}
                  strokeDasharray={edge.isRestricted ? '6 4' : editable ? '4 4' : undefined}
                  opacity={editable ? 0.9 : 0.45}
                />
              );
            })}

            {/* 5. Vertical Core Architectural Shafts (Under Route Line so Paths Stay Unobscured) */}
            {[
              { x: 500, y: 190, code: 'ELV-A', kind: 'elevator' as const, dx: 40, dy: 0 },
              { x: 760, y: 320, code: 'ELV-B', kind: 'elevator' as const, dx: 40, dy: 0 },
              { x: 180, y: 180, code: 'STR-W', kind: 'stair' as const, dx: 0, dy: -28 },
              { x: 860, y: 460, code: 'STR-E', kind: 'stair' as const, dx: 0, dy: -28 },
            ].map((core) => (
              <g key={core.code}>
                <rect
                  x={core.x - 16}
                  y={core.y - 16}
                  width="32"
                  height="32"
                  rx="5"
                  fill={
                    core.kind === 'elevator'
                      ? isDark
                        ? '#174A54'
                        : '#E0EFEF'
                      : isDark
                        ? '#2A2B26'
                        : '#F2ECE1'
                  }
                  stroke={core.kind === 'elevator' ? '#217E82' : '#B7A58A'}
                  strokeWidth="1.6"
                />
                {core.kind === 'elevator' ? (
                  <path
                    d={`M ${core.x - 5} ${core.y - 2} L ${core.x} ${core.y - 8} L ${core.x + 5} ${core.y - 2} M ${core.x - 5} ${core.y + 3} L ${core.x} ${core.y + 9} L ${core.x + 5} ${core.y + 3}`}
                    fill="none"
                    stroke={isDark ? '#8AE0DE' : '#102C35'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d={`M ${core.x - 8} ${core.y + 7} H ${core.x - 3} V ${core.y + 2} H ${core.x + 2} V ${core.y - 3} H ${core.x + 8}`}
                    fill="none"
                    stroke={isDark ? '#E2D2B4' : '#594C36'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <g transform={`translate(${core.x + core.dx}, ${core.y + core.dy})`}>
                  <rect
                    x="-21"
                    y="-8"
                    width="42"
                    height="16"
                    rx="3"
                    fill={isDark ? '#112A32' : '#102C35'}
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="text-[8.5px] font-bold tracking-wider"
                  >
                    {core.code}
                  </text>
                </g>
              </g>
            ))}

            {/* 6. Articulated Hospital Destination Zones & Rooms */}
            {floorDestinations.map((dest) => {
              const isStartDest = dest.nodeId === startNodeId;
              const isEndDest = dest.nodeId === endNodeId;
              const isCompactCoreShaft =
                dest.zone.width < 80 ||
                dest.zone.height < 55 ||
                ['ELV-A', 'ELV-B', 'STR-W', 'STR-E'].includes(dest.roomCode);

              if (isCompactCoreShaft) return null;

              const label = tf(dest.name, dest.nameTa);
              const linkedNode = nodeMap.get(dest.nodeId);
              const hasCentralVerticalCorridor =
                linkedNode &&
                Math.abs(linkedNode.x - (dest.zone.x + dest.zone.width / 2)) < 26 &&
                dest.zone.height <= 95;
              const textZoneWidth = hasCentralVerticalCorridor
                ? Math.max(58, linkedNode!.x - dest.zone.x - 14)
                : dest.zone.width - 14;
              const titleLines = wrapZoneTitleLines(label, textZoneWidth);

              const baseFill = isEndDest
                ? isDark
                  ? '#214E59'
                  : '#EDF4F4'
                : isStartDest
                  ? isDark
                    ? '#18444B'
                    : '#E6F2F1'
                  : dest.isEmergency
                    ? isDark
                      ? '#3A1918'
                      : '#FDF2F0'
                    : isDark
                      ? '#152A32'
                      : '#FFFFFF';

              const stripeColor = isEndDest
                ? '#DC4C40'
                : isStartDest
                  ? '#217E82'
                  : dest.isEmergency
                    ? '#B83227'
                    : dest.zone.accentHex ?? '#B7A58A';

              const centerX = dest.zone.x + dest.zone.width / 2;
              const centerY = dest.zone.y + dest.zone.height / 2;

              // Calculate nearest edge door threshold marker facing linked node
              let doorX = centerX;
              let doorY = centerY;
              if (linkedNode) {
                doorX = Math.max(dest.zone.x, Math.min(dest.zone.x + dest.zone.width, linkedNode.x));
                doorY = Math.max(dest.zone.y, Math.min(dest.zone.y + dest.zone.height, linkedNode.y));
              }

              const codePillWidth = Math.max(42, dest.roomCode.length * 7 + 12);
              const headerX = dest.zone.x + 11;
              const pillY = dest.zone.y + 7;
              const lineStartY = dest.zone.y + (titleLines.length >= 3 ? 32 : 34);
              const lineStepY = titleLines.length >= 3 ? 11.5 : 13;

              return (
                <g
                  key={dest.id}
                  className={onDestinationClick ? 'cursor-pointer' : undefined}
                  onClick={(ev) => {
                    if (didPanDrag()) return;
                    if (onDestinationClick) {
                      ev.stopPropagation();
                      onDestinationClick(dest);
                    }
                  }}
                >
                  <title>{`${dest.roomCode} — ${label}`}</title>
                  <rect
                    x={dest.zone.x}
                    y={dest.zone.y}
                    width={dest.zone.width}
                    height={dest.zone.height}
                    rx="5"
                    fill={baseFill}
                    stroke={
                      isEndDest
                        ? '#DC4C40'
                        : isStartDest
                          ? '#217E82'
                          : isDark
                            ? '#355D68'
                            : '#B9B09E'
                    }
                    strokeWidth={isEndDest || isStartDest ? 2.8 : 1.5}
                  />
                  {/* Left Clinical Wing Color Bar */}
                  <rect
                    x={dest.zone.x + 2}
                    y={dest.zone.y + 4}
                    width="4.5"
                    height={Math.max(12, dest.zone.height - 8)}
                    rx="2"
                    fill={stripeColor}
                  />

                  {/* Architectural Entry Doorway Marker connecting to Corridor Node */}
                  {linkedNode && (
                    <circle
                      cx={doorX}
                      cy={doorY}
                      r="4"
                      fill={stripeColor}
                      stroke={isDark ? '#0E1E24' : '#FFFFFF'}
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Top-Left Anchored Room Code Pill (Collision-free from center route beacons) */}
                  <rect
                    x={headerX}
                    y={pillY}
                    width={codePillWidth}
                    height="14"
                    rx="3"
                    fill={isEndDest ? '#DC4C40' : isStartDest ? '#217E82' : isDark ? '#20424C' : '#102C35'}
                  />
                  <text
                    x={headerX + codePillWidth / 2}
                    y={pillY + 10.2}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="text-[9px] font-bold tracking-wider"
                  >
                    {dest.roomCode}
                  </text>

                  {/* Left-Aligned Multi-Line Readable Room Label */}
                  {titleLines.map((lineText, lineIdx) => (
                    <text
                      key={`${dest.id}-title-${lineIdx}`}
                      x={headerX}
                      y={lineStartY + lineIdx * lineStepY}
                      textAnchor="start"
                      fill={
                        lineIdx === 0
                          ? isDark
                            ? '#EDF2F1'
                            : '#13262B'
                          : isDark
                            ? '#C8D6D8'
                            : '#32484D'
                      }
                      style={{ paintOrder: 'stroke' }}
                      stroke={baseFill}
                      strokeWidth="3"
                      className={
                        titleLines.length >= 3
                          ? 'text-[9.5px] font-semibold'
                          : lineIdx === 0
                            ? 'text-[10.5px] font-semibold'
                            : 'text-[10px] font-medium'
                      }
                    >
                      {lineText}
                    </text>
                  ))}
                </g>
              );
            })}

            {/* 7. Active Dijkstra Route Overlay + Directional Flow Chevrons */}
            {routePolylines.map((points, i) => (
              <g key={`route-seg-${i}`}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={isDark ? '#071115' : '#FFFFFF'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.96}
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={isDark ? '#D4B886' : '#174C50'}
                  strokeWidth="5.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={isDark ? '#102C35' : '#FFFFFF'}
                  strokeWidth="1.6"
                  strokeDasharray="6 9"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              </g>
            ))}

            {/* Directional Wayfinding Arrow Chevrons at Segment Midpoints */}
            {routeArrowSegments.map(({ from, to }, idx) => {
              const dist = Math.hypot(to.x - from.x, to.y - from.y);
              if (dist < 42) return null;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
              return (
                <g key={`arrow-${idx}`} transform={`translate(${mx}, ${my}) rotate(${angle})`}>
                  <circle
                    r="8.5"
                    fill={isDark ? '#D4B886' : '#102C35'}
                    stroke={isDark ? '#0B161A' : '#FFFFFF'}
                    strokeWidth="2"
                  />
                  <polygon
                    points="-3,-3.5 4.5,0 -3,3.5"
                    fill={isDark ? '#102C35' : '#FFFFFF'}
                  />
                </g>
              );
            })}

            {/* Inline Elevator / Stairs Floor Transition Instruction Pills */}
            {transitionCallouts.map((call, idx) => (
              <g key={`trans-pill-${idx}`} transform={`translate(${call.x}, ${call.y - 38})`}>
                <rect
                  x="-54"
                  y="-11"
                  width="108"
                  height="22"
                  rx="11"
                  fill="#B7A58A"
                  stroke={isDark ? '#071115' : '#102C35'}
                  strokeWidth="1.8"
                />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#102C35"
                  className="text-[9.5px] font-bold tracking-wide"
                >
                  {call.text}
                </text>
              </g>
            ))}

            {/* 8. QR Checkpoint Totem Diamonds */}
            {floorQrs.map((qr) => {
              const node = nodeMap.get(qr.nodeId);
              if (!node) return null;
              return (
                <g key={qr.id} transform={`translate(${node.x + 22}, ${node.y + 8})`}>
                  <rect
                    x="-6"
                    y="-6"
                    width="12"
                    height="12"
                    transform="rotate(45)"
                    fill="#B7A58A"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                  />
                  <title>{`QR: ${qr.code} — ${qr.label}`}</title>
                </g>
              );
            })}

            {/* 9. Navigation Nodes + Start / End / Active Step Beacons */}
            {floorNodes.map((node) => {
              const isStart = node.id === startNodeId;
              const isEnd = node.id === endNodeId;
              const isActiveStep = node.id === activeStepNodeId;
              const isInRoute = routeNodeIdsOnFloor.some((rn) => rn.id === node.id);
              const isSelected = node.id === highlightedNodeId || node.id === pendingEdgeFromId;

              if (!editable && !isStart && !isEnd && !isInRoute && !isSelected && !isActiveStep) {
                return (
                  <circle
                    key={node.id}
                    cx={node.x}
                    cy={node.y}
                    r={node.type === 'department_entrance' || node.type === 'entrance' ? 4.5 : 3}
                    fill={node.isActive ? (isDark ? '#7EA3A8' : '#536A6E') : '#9CA3AF'}
                    opacity={0.72}
                    className={onNodeClick ? 'cursor-pointer' : undefined}
                    onClick={(ev) => {
                      if (didPanDrag()) return;
                      if (onNodeClick) {
                        ev.stopPropagation();
                        onNodeClick(node);
                      }
                    }}
                  >
                    <title>{node.label}</title>
                  </circle>
                );
              }

              return (
                <g
                  key={node.id}
                  className={onNodeClick ? 'cursor-pointer' : undefined}
                  onClick={(ev) => {
                    if (didPanDrag()) return;
                    if (onNodeClick) {
                      ev.stopPropagation();
                      onNodeClick(node);
                    }
                  }}
                >
                  {(isStart || isEnd || isSelected || isActiveStep) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isEnd || isStart ? 18 : 15}
                      fill={isEnd ? '#DC4C40' : isStart ? '#217E82' : '#C6B292'}
                      opacity={0.28}
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isStart || isEnd || isSelected || isActiveStep ? 8.5 : 5}
                    fill={
                      isEnd
                        ? '#DC4C40'
                        : isStart
                          ? '#217E82'
                          : isSelected || isActiveStep
                            ? '#C6B292'
                            : editable
                              ? isDark
                                ? '#C6B292'
                                : '#102C35'
                              : isDark
                                ? '#D4B886'
                                : '#174C50'
                    }
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                  />

                  {/* Unmistakable START & DEST Pills */}
                  {isStart && (
                    <g transform={`translate(${node.x}, ${node.y + 21})`}>
                      <rect x="-24" y="-8" width="48" height="15" rx="7.5" fill="#174C50" stroke="#FFFFFF" strokeWidth="1.2" />
                      <text x="0" y="2.8" textAnchor="middle" fill="#FFFFFF" className="text-[8.5px] font-bold tracking-wider">
                        START
                      </text>
                    </g>
                  )}
                  {isEnd && (
                    <g transform={`translate(${node.x}, ${node.y + 21})`}>
                      <rect x="-27" y="-8" width="54" height="15" rx="7.5" fill="#DC4C40" stroke="#FFFFFF" strokeWidth="1.2" />
                      <text x="0" y="2.8" textAnchor="middle" fill="#FFFFFF" className="text-[8.5px] font-bold tracking-wider">
                        ARRIVE
                      </text>
                    </g>
                  )}

                  {editable && (
                    <text
                      x={node.x}
                      y={node.y - 11}
                      textAnchor="middle"
                      fill={isDark ? '#EDF2F1' : '#13262B'}
                      className="text-[8.5px] font-semibold"
                    >
                      {node.code}
                    </text>
                  )}
                  <title>{`${node.code} — ${node.label}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Upgraded Architectural Floor Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-champagne-border bg-surface px-4 py-2.5 text-xs text-ink">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-full border border-white bg-[#217E82]" aria-hidden="true" />
            Start Spot
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-full border border-white bg-[#DC4C40]" aria-hidden="true" />
            Destination
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block h-1.5 w-5 rounded bg-teal-forest dark:bg-champagne" aria-hidden="true" />
            Calculated Path ▶
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-[#217E82] bg-[#E0EFEF] text-[8px] font-bold text-[#102C35]" aria-hidden="true">
              ⇅
            </span>
            Elevator (Wheelchair)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-champagne" aria-hidden="true" />
            QR Stand
          </span>
        </div>

        {!editable && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink">
            <Move className="h-3 w-3" aria-hidden="true" />
            <span>Tap any room to route{zoom > 1 ? ' · Drag map to pan' : ''}</span>
          </span>
        )}
      </div>
    </div>
  );
}
