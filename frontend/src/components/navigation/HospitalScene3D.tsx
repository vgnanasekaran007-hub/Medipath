import {
  BUILDING_3D_HALF_DEPTH,
  BUILDING_3D_HALF_WIDTH,
  FLOOR_HEIGHT_METERS,
  svgTo3D,
  type Destination,
  type Floor,
  type NavigationEdge,
  type NavigationNode,
  type NavigationRouteResult,
  type QrCheckpoint,
} from '@medipath/shared';
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Building2, Compass, Eye, Layers, Maximize2, RotateCcw } from 'lucide-react';
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { useTranslation } from '../../i18n/translations';
import { useAppStore, type BuildingStyleMode, type ThemeMode } from '../../stores/appStore';
import { FloorPlan2DSVG } from './FloorPlan2DSVG';

export interface HospitalScene3DProps {
  floors: Floor[];
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  destinations: Destination[];
  qrCheckpoints?: QrCheckpoint[];
  route?: NavigationRouteResult | null;
  startNodeId?: string;
  endNodeId?: string;
  selectedFloorId: string | 'all';
  exploded: boolean;
  previewMode?: boolean;
  onSelectFloor?: (floorId: string | 'all') => void;
  onToggleExploded?: (val: boolean) => void;
  onSelectDestination?: (destination: Destination) => void;
  onSelectNode?: (node: NavigationNode) => void;
  onSwitchTo2D?: () => void;
}

function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(_err: Error, _info: ErrorInfo) {
    // Handled gracefully by 2D architectural plan fallback
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function zoneTo3DBox(zone: Destination['zone']) {
  const cx = ((zone.x + zone.width / 2 - 500) / 500) * BUILDING_3D_HALF_WIDTH;
  const cz = ((zone.y + zone.height / 2 - 320) / 320) * BUILDING_3D_HALF_DEPTH;
  const w = Math.max(1.2, (zone.width / 1000) * (BUILDING_3D_HALF_WIDTH * 2));
  const d = Math.max(1.2, (zone.height / 640) * (BUILDING_3D_HALF_DEPTH * 2));
  return { cx, cz, w, d };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function getCardinalWingLabel(deg: number, lang: 'en' | 'ta'): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 315 || normalized < 45) {
    return lang === 'ta' ? `${normalized}° · தெற்கு முகப்பு` : `${normalized}° · South Entrance`;
  }
  if (normalized >= 45 && normalized < 135) {
    return lang === 'ta' ? `${normalized}° · கிழக்குப் பகுதி` : `${normalized}° · East Garden Wing`;
  }
  if (normalized >= 135 && normalized < 225) {
    return lang === 'ta' ? `${normalized}° · வடக்குப் பகுதி` : `${normalized}° · North Courtyard`;
  }
  return lang === 'ta' ? `${normalized}° · மேற்கு அவசர வாயில்` : `${normalized}° · West ER Gate A`;
}

function SceneFirstFrameSignal({ onReady }: { onReady: () => void }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      onReady();
    }
  });
  return null;
}

function CameraController({
  cameraGoal,
  defaultTargetY,
  onClearGoal,
  onOrbitChange,
}: {
  cameraGoal: { position: [number, number, number]; target: [number, number, number] } | null;
  defaultTargetY: number;
  onClearGoal: () => void;
  onOrbitChange: (azimuthDeg: number) => void;
}) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const initializedTargetRef = useRef(false);
  const lastReportedDegRef = useRef<number>(-1);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (controlsRef.current && !initializedTargetRef.current) {
      controlsRef.current.target.set(0, defaultTargetY, 0);
      controlsRef.current.update();
      initializedTargetRef.current = true;
    }
  }, [defaultTargetY]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Report horizontal azimuth angle cleanly without excessive React state updates
    const tgt = controlsRef.current.target as THREE.Vector3;
    const dx = camera.position.x - tgt.x;
    const dz = camera.position.z - tgt.z;
    if (Math.hypot(dx, dz) > 0.35) {
      const deg = Math.round(((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360);
      const prev = lastReportedDegRef.current;
      const diff = prev < 0 ? 999 : Math.min(Math.abs(deg - prev), 360 - Math.abs(deg - prev));
      if (diff >= 3) {
        lastReportedDegRef.current = deg;
        onOrbitChange(deg);
      }
    }

    // Handle smooth animated focus / reset transitions
    if (!cameraGoal) return;
    const goalPos = new THREE.Vector3(...cameraGoal.position);
    const goalTarget = new THREE.Vector3(...cameraGoal.target);

    if (reducedMotion) {
      camera.position.copy(goalPos);
      controlsRef.current.target.copy(goalTarget);
      controlsRef.current.update();
      onClearGoal();
      return;
    }

    const alpha = 1 - Math.exp(-5.5 * delta);
    camera.position.lerp(goalPos, alpha);
    controlsRef.current.target.lerp(goalTarget, alpha);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(goalPos) < 0.25 &&
      controlsRef.current.target.distanceTo(goalTarget) < 0.2
    ) {
      onClearGoal();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableRotate
      rotateSpeed={0.95}
      enableZoom
      zoomSpeed={0.9}
      enablePan
      enableDamping
      dampingFactor={0.08}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      minDistance={12}
      maxDistance={140}
      minPolarAngle={0.14}
      maxPolarAngle={Math.PI * 0.48}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      onStart={() => {
        onClearGoal();
      }}
    />
  );
}

function FloorSlabGroup({
  floor,
  destinations,
  nodes,
  edges,
  qrCheckpoints,
  explodedGap,
  selectedFloorId,
  startNodeId,
  endNodeId,
  previewMode,
  realisticMode,
  lang,
  onSelectFloor,
  onSelectDestination,
  onSelectNode,
}: {
  floor: Floor;
  destinations: Destination[];
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  qrCheckpoints: QrCheckpoint[];
  explodedGap: number;
  selectedFloorId: string | 'all';
  startNodeId?: string;
  endNodeId?: string;
  previewMode?: boolean;
  realisticMode: boolean;
  lang: 'en' | 'ta';
  onSelectFloor?: (id: string) => void;
  onSelectDestination?: (dest: Destination) => void;
  onSelectNode?: (node: NavigationNode) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredDestId, setHoveredDestId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const targetY = floor.levelNumber * (FLOOR_HEIGHT_METERS + explodedGap);
  const isFocused = realisticMode || selectedFloorId === 'all' || selectedFloorId === floor.id;
  const opacity = isFocused ? 0.96 : 0.2;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (reducedMotion) {
      groupRef.current.position.y = targetY;
      return;
    }
    const alpha = 1 - Math.exp(-7 * delta);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, alpha);
  });

  const floorDestinations = useMemo(
    () => destinations.filter((d) => d.floorId === floor.id),
    [destinations, floor.id],
  );
  const floorNodes = useMemo(() => nodes.filter((n) => n.floorId === floor.id), [nodes, floor.id]);
  const floorNodeMap = useMemo(() => new Map(floorNodes.map((n) => [n.id, n])), [floorNodes]);
  const floorEdges = useMemo(
    () =>
      edges.filter(
        (e) => floorNodeMap.has(e.fromNodeId) && floorNodeMap.has(e.toNodeId) && !e.isRestricted,
      ),
    [edges, floorNodeMap],
  );
  const floorQrs = useMemo(
    () => qrCheckpoints.filter((q) => q.floorId === floor.id),
    [qrCheckpoints, floor.id],
  );

  // When Real Building exterior shell is active, hide overlapping slab outer rims cleanly
  if (realisticMode) {
    return null;
  }

  return (
    <group ref={groupRef} position={[0, targetY, 0]}>
      {/* Primary limestone/glass slab */}
      <mesh
        receiveShadow
        onClick={(e) => {
          if (onSelectFloor && !previewMode) {
            e.stopPropagation();
            onSelectFloor(floor.id);
          }
        }}
      >
        <boxGeometry args={[BUILDING_3D_HALF_WIDTH * 2, 0.28, BUILDING_3D_HALF_DEPTH * 2]} />
        <meshStandardMaterial
          color={isFocused ? '#EDEAE2' : '#263940'}
          roughness={0.72}
          metalness={0.08}
          transparent={!isFocused}
          opacity={opacity}
        />
      </mesh>

      {/* Architectural champagne perimeter spandrel fascia */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry
          args={[BUILDING_3D_HALF_WIDTH * 2 + 0.24, 0.12, BUILDING_3D_HALF_DEPTH * 2 + 0.24]}
        />
        <meshStandardMaterial
          color="#B7A58A"
          metalness={0.45}
          roughness={0.45}
          transparent
          opacity={isFocused ? 0.9 : 0.22}
        />
      </mesh>

      {/* Central Atrium Frame Cutout visual marker */}
      <mesh position={[0, 0.16, -0.7]}>
        <boxGeometry args={[10.0, 0.04, 5.6]} />
        <meshStandardMaterial
          color="#132A33"
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={isFocused ? 0.55 : 0.12}
        />
      </mesh>

      {/* Corridor skeleton segments synced directly to NavigationEdges */}
      {isFocused &&
        floorEdges.map((edge) => {
          const a = floorNodeMap.get(edge.fromNodeId);
          const b = floorNodeMap.get(edge.toNodeId);
          if (!a || !b) return null;
          const [ax, , az] = svgTo3D(a.x, a.y, 0, 0, 0);
          const [bx, , bz] = svgTo3D(b.x, b.y, 0, 0, 0);
          const len = Math.hypot(bx - ax, bz - az);
          if (len < 0.1) return null;
          const midX = (ax + bx) / 2;
          const midZ = (az + bz) / 2;
          const angle = Math.atan2(bx - ax, bz - az);
          return (
            <mesh key={edge.id} position={[midX, 0.17, midZ]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.32, 0.04, len]} />
              <meshStandardMaterial color="#9BA8A6" roughness={0.8} transparent opacity={0.45} />
            </mesh>
          );
        })}

      {/* Architectural Extruded Room / Department Zones (Cutaway Mode) */}
      {floorDestinations.map((dest) => {
        const { cx, cz, w, d } = zoneTo3DBox(dest.zone);
        const isEnd = dest.nodeId === endNodeId;
        const isStart = dest.nodeId === startNodeId;
        const isHovered = hoveredDestId === dest.id;
        const baseColor = isEnd
          ? '#B83227'
          : isStart
            ? '#174C50'
            : dest.isEmergency
              ? '#8B261D'
              : dest.zone.accentHex ?? '#174C50';

        const boxHeight = isEnd || isStart ? 1.85 : isHovered ? 1.6 : 1.25;

        return (
          <group
            key={dest.id}
            position={[cx, boxHeight / 2 + 0.15, cz]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredDestId(dest.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredDestId((cur) => (cur === dest.id ? null : cur));
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDestination?.(dest);
            }}
          >
            <mesh castShadow>
              <boxGeometry args={[w, boxHeight, d]} />
              <meshStandardMaterial
                color={baseColor}
                roughness={0.42}
                metalness={0.14}
                transparent
                opacity={isFocused ? (isEnd || isStart || isHovered ? 0.92 : 0.72) : 0.12}
              />
            </mesh>
            {isFocused && (
              <mesh position={[0, boxHeight / 2 + 0.03, 0]}>
                <boxGeometry args={[w + 0.06, 0.05, d + 0.06]} />
                <meshStandardMaterial
                  color={isEnd ? '#FBEAE8' : '#B7A58A'}
                  metalness={0.35}
                  roughness={0.4}
                />
              </mesh>
            )}
            {isFocused && (isEnd || isStart || isHovered) && (
              <Html
                position={[0, boxHeight / 2 + 0.65, 0]}
                center
                distanceFactor={26}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium shadow-sm ${
                    isEnd
                      ? 'bg-[#B83227] text-white'
                      : isStart
                        ? 'bg-[#174C50] text-white'
                        : 'border border-[#B7A58A]/70 bg-[#102C35]/95 text-[#F5F3EF]'
                  }`}
                >
                  <span className="mr-1 font-semibold opacity-80">{dest.roomCode}</span>
                  <span>{lang === 'ta' && dest.nameTa ? dest.nameTa : dest.name}</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* QR Checkpoints physical architectural totems */}
      {isFocused &&
        floorQrs.map((qr) => {
          const n = floorNodeMap.get(qr.nodeId);
          if (!n) return null;
          const [qx, , qz] = svgTo3D(n.x + 12, n.y - 12, 0, 0, 0);
          return (
            <mesh
              key={qr.id}
              position={[qx, 0.8, qz]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode?.(n);
              }}
            >
              <cylinderGeometry args={[0.22, 0.28, 1.3, 8]} />
              <meshStandardMaterial color="#B7A58A" metalness={0.5} roughness={0.3} />
            </mesh>
          );
        })}

      {/* Floor Level Margin Plate Label */}
      <Html
        position={[-BUILDING_3D_HALF_WIDTH - 1.5, 0.4, BUILDING_3D_HALF_DEPTH - 1.5]}
        center
        distanceFactor={30}
        style={{ pointerEvents: 'auto' }}
      >
        <button
          type="button"
          onClick={() => onSelectFloor?.(selectedFloorId === floor.id ? 'all' : floor.id)}
          className={`rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wider transition ${
            selectedFloorId === floor.id
              ? 'border-[#B7A58A] bg-[#B7A58A] text-[#102C35]'
              : 'border-[#B7A58A]/40 bg-[#102C35]/90 text-white hover:border-[#B7A58A]'
          }`}
        >
          {floor.code}
        </button>
      </Html>
    </group>
  );
}

/**
 * Multi-canopy botanical architectural tree with layered foliage volumes.
 */
function BotanicalTree({
  position,
  scale = 1,
  isDarkTheme,
}: {
  position: [number, number, number];
  scale?: number;
  isDarkTheme: boolean;
}) {
  const leafDark = isDarkTheme ? '#1F4239' : '#2E5E4E';
  const leafLight = isDarkTheme ? '#2D594B' : '#407A62';

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.24, 2.1, 8]} />
        <meshStandardMaterial color="#5E4B3B" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.75, 0]} castShadow>
        <sphereGeometry args={[1.15, 14, 12]} />
        <meshStandardMaterial color={leafDark} roughness={0.86} />
      </mesh>
      <mesh position={[-0.75, 2.4, 0.45]} castShadow>
        <sphereGeometry args={[0.82, 12, 10]} />
        <meshStandardMaterial color={leafLight} roughness={0.85} />
      </mesh>
      <mesh position={[0.72, 2.5, -0.38]} castShadow>
        <sphereGeometry args={[0.85, 12, 10]} />
        <meshStandardMaterial color={leafLight} roughness={0.85} />
      </mesh>
      <mesh position={[0.15, 3.45, 0.2]} castShadow>
        <sphereGeometry args={[0.78, 12, 10]} />
        <meshStandardMaterial color={leafDark} roughness={0.85} />
      </mesh>
    </group>
  );
}

/**
 * Parked 3D Emergency Ambulance at West Gate A Ramp.
 */
function EmergencyAmbulance3D({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      {/* Main medical cabin box */}
      <mesh position={[0, 1.05, -0.55]} castShadow>
        <boxGeometry args={[1.95, 1.55, 3.15]} />
        <meshStandardMaterial color="#F7F8F9" roughness={0.32} metalness={0.12} />
      </mesh>
      {/* Front sloped engine cab */}
      <mesh position={[0, 0.85, 1.48]} castShadow>
        <boxGeometry args={[1.86, 1.15, 1.15]} />
        <meshStandardMaterial color="#F7F8F9" roughness={0.32} metalness={0.12} />
      </mesh>
      {/* Tinted cab windshield */}
      <mesh position={[0, 1.25, 1.98]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.66, 0.56, 0.14]} />
        <meshStandardMaterial color="#182C33" metalness={0.7} roughness={0.15} />
      </mesh>
      {/* Crimson medical stripe down sides */}
      <mesh position={[0, 0.92, -0.55]}>
        <boxGeometry args={[2.0, 0.24, 3.18]} />
        <meshStandardMaterial color="#C8372D" roughness={0.35} />
      </mesh>
      {/* Glowing Red & Blue roof lightbar */}
      <mesh position={[-0.38, 1.92, 1.28]}>
        <boxGeometry args={[0.62, 0.18, 0.3]} />
        <meshStandardMaterial color="#E53E3E" emissive="#EF4444" emissiveIntensity={1.15} />
      </mesh>
      <mesh position={[0.38, 1.92, 1.28]}>
        <boxGeometry args={[0.62, 0.18, 0.3]} />
        <meshStandardMaterial color="#38BDF8" emissive="#0EA5E9" emissiveIntensity={1.0} />
      </mesh>
      {/* Wheels */}
      {[
        [-0.95, 0.34, 1.38],
        [0.95, 0.34, 1.38],
        [-0.95, 0.34, -1.38],
        [0.95, 0.34, -1.38],
      ].map(([wx, wy, wz], idx) => (
        <mesh key={`amb-wheel-${idx}`} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.24, 16]} />
          <meshStandardMaterial color="#1B2124" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Photorealistic Architectural Outer Building + Landscaped Hospital Campus
 * rendered when "Real Building" toggle is active.
 */
function RealBuildingExterior({
  totalFloors,
  isDarkTheme,
}: {
  totalFloors: number;
  isDarkTheme: boolean;
}) {
  const levels = Math.max(4, totalFloors);
  const totalHeight = levels * FLOOR_HEIGHT_METERS;
  const fullW = BUILDING_3D_HALF_WIDTH * 2;
  const fullD = BUILDING_3D_HALF_DEPTH * 2;

  const limestoneColor = isDarkTheme ? '#7B8789' : '#EBE4D8';
  const warmStoneAccent = isDarkTheme ? '#59666A' : '#D5CCB9';
  const spandrelColor = isDarkTheme ? '#1E3138' : '#283F47';
  const bronzeColor = '#B7A58A';
  const glassColor = isDarkTheme ? '#11303A' : '#2C5C68';
  const meadowColor = isDarkTheme ? '#182C23' : '#537359';
  const asphaltColor = isDarkTheme ? '#1C2428' : '#353E42';
  const walkwayColor = isDarkTheme ? '#313F44' : '#CFC7B8';

  const pilasterXs = [-21, -15, -9, -3, 3, 9, 15, 21];
  const sidePilasterZs = [-12, -6, 0, 6, 12];

  const campusTrees: [number, number, number][] = [
    [-31.5, -20.5, 1.25],
    [31.5, -20.5, 1.3],
    [-33.5, 0, 1.15],
    [31.5, 2.5, 1.2],
    [-31.5, 21.5, 1.15],
    [31.5, 21.5, 1.25],
    [-19.5, 22.8, 1.0],
    [19.5, 22.8, 1.05],
    [-19.5, -21.5, 1.1],
    [19.5, -21.5, 1.15],
  ];

  return (
    <group>
      {/* 1. Campus Grounds: Landscaped Meadow, Perimeter Asphalt Driveway Loop & Travertine Promenade */}
      <mesh position={[0, -0.58, 0]} receiveShadow>
        <boxGeometry args={[104, 0.25, 76]} />
        <meshStandardMaterial color={meadowColor} roughness={0.94} />
      </mesh>

      {/* Asphalt Driveway Perimeter Loop (South Drop-off Road + West ER Ramp Lane) */}
      <mesh position={[0, -0.43, 27.2]} receiveShadow>
        <boxGeometry args={[76, 0.06, 6.4]} />
        <meshStandardMaterial color={asphaltColor} roughness={0.86} />
      </mesh>
      <mesh position={[-33.2, -0.43, 6.5]} receiveShadow>
        <boxGeometry args={[6.4, 0.06, 47.6]} />
        <meshStandardMaterial color={asphaltColor} roughness={0.86} />
      </mesh>

      {/* Dashed Yellow/Champagne Centerline Markings on South Drop-off Road */}
      {[-28, -22, -16, -10, 10, 16, 22, 28].map((lx) => (
        <mesh key={`road-dash-${lx}`} position={[lx, -0.39, 27.2]}>
          <boxGeometry args={[3.2, 0.02, 0.18]} />
          <meshStandardMaterial color="#E2D5BA" roughness={0.6} />
        </mesh>
      ))}

      {/* Painted Pedestrian Zebra Crosswalk in front of South Main Entrance */}
      {[-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map((zx) => (
        <mesh key={`zebra-${zx}`} position={[zx, -0.39, 26.8]}>
          <boxGeometry args={[0.65, 0.025, 4.4]} />
          <meshStandardMaterial color="#F1EFEA" roughness={0.7} />
        </mesh>
      ))}

      {/* Landscaped Travertine Paver Campus Terrace */}
      <mesh position={[0, -0.26, 0]} receiveShadow>
        <boxGeometry args={[56, 0.35, 41.5]} />
        <meshStandardMaterial color={walkwayColor} roughness={0.82} />
      </mesh>

      {/* South Welcoming Entrance Steps & Raised Promenade */}
      <mesh position={[0, -0.02, 18.6]} receiveShadow>
        <boxGeometry args={[18.5, 0.18, 7.6]} />
        <meshStandardMaterial color={warmStoneAccent} roughness={0.74} />
      </mesh>

      {/* Pruned Courtyard Boxwood Hedges along Front & Back Terraces */}
      {[
        [-17.5, 17.2, 11.5, 1.2],
        [17.5, 17.2, 11.5, 1.2],
        [-16, -17.5, 13.5, 1.2],
        [16, -17.5, 13.5, 1.2],
      ].map(([hx, hz, hw, hd], idx) => (
        <mesh key={`hedge-${idx}`} position={[hx, 0.36, hz]} castShadow receiveShadow>
          <boxGeometry args={[hw, 0.72, hd]} />
          <meshStandardMaterial color={isDarkTheme ? '#1C3F33' : '#2E624D'} roughness={0.9} />
        </mesh>
      ))}

      {/* Illuminated Travertine Monument Campus Sign & Entrance Bollard Lights */}
      <group position={[12.5, 0, 21.8]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[4.4, 1.65, 0.48]} />
          <meshStandardMaterial color={limestoneColor} roughness={0.62} />
        </mesh>
        <mesh position={[0, 1.15, 0.25]}>
          <boxGeometry args={[3.9, 0.55, 0.06]} />
          <meshStandardMaterial
            color="#102C35"
            emissive="#1D4B57"
            emissiveIntensity={isDarkTheme ? 0.8 : 0.35}
          />
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[4.5, 0.1, 0.52]} />
          <meshStandardMaterial color={bronzeColor} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {[-7.2, -4.4, 4.4, 7.2].map((bx, idx) => (
        <group key={`bollard-${idx}`} position={[bx, 0, 22.8]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.9, 10]} />
            <meshStandardMaterial color={spandrelColor} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.14, 10]} />
            <meshStandardMaterial color="#FFF1CF" emissive="#FCE3A8" emissiveIntensity={1.1} />
          </mesh>
        </group>
      ))}

      {/* 2. Solid Opaque Architectural Interior Core Volume (Prevents seeing sky straight through glass) */}
      <mesh position={[0, totalHeight / 2 + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[fullW - 2.6, totalHeight - 0.3, fullD - 2.6]} />
        <meshStandardMaterial
          color={isDarkTheme ? '#17282E' : '#DAD4C8'}
          roughness={0.82}
        />
      </mesh>

      {/* Recessed Interior Warm Clinical Floor Ceilings Visible Through Glazed Bays */}
      {Array.from({ length: levels }).map((_, lvl) => (
        <mesh
          key={`interior-light-${lvl}`}
          position={[0, lvl * FLOOR_HEIGHT_METERS + FLOOR_HEIGHT_METERS - 0.72, 0]}
        >
          <boxGeometry args={[fullW - 1.15, 0.16, fullD - 1.15]} />
          <meshStandardMaterial
            color="#FFF5DE"
            emissive="#FCE3AC"
            emissiveIntensity={isDarkTheme ? 0.95 : 0.48}
          />
        </mesh>
      ))}

      {/* 3. Layered Curtain-Wall Facades, Limestone Cornices & Brise-Soleil Sunshade Louvers */}
      {Array.from({ length: levels }).map((_, lvl) => {
        const floorBaseY = lvl * FLOOR_HEIGHT_METERS;
        const wallCenterY = floorBaseY + FLOOR_HEIGHT_METERS * 0.5;
        const glassH = FLOOR_HEIGHT_METERS - 0.62;
        const isAtriumGap = lvl <= 1;

        return (
          <group key={`facade-story-${lvl}`}>
            {/* Protruding Carved Limestone Story Band */}
            <mesh position={[0, floorBaseY + FLOOR_HEIGHT_METERS - 0.22, 0]} castShadow receiveShadow>
              <boxGeometry args={[fullW + 0.72, 0.5, fullD + 0.72]} />
              <meshStandardMaterial color={limestoneColor} roughness={0.62} metalness={0.08} />
            </mesh>

            {/* Champagne Metallic Drip Edge Accent */}
            <mesh position={[0, floorBaseY + FLOOR_HEIGHT_METERS - 0.48, 0]}>
              <boxGeometry args={[fullW + 0.76, 0.08, fullD + 0.76]} />
              <meshStandardMaterial color={bronzeColor} metalness={0.55} roughness={0.32} />
            </mesh>

            {/* South Front Glazed Curtain Bays (with central open atrium bay on L0-L1) */}
            {isAtriumGap ? (
              <>
                <mesh position={[-14.5, wallCenterY, BUILDING_3D_HALF_DEPTH + 0.04]}>
                  <boxGeometry args={[17.2, glassH, 0.16]} />
                  <meshStandardMaterial
                    color={glassColor}
                    metalness={0.68}
                    roughness={0.14}
                    transparent
                    opacity={isDarkTheme ? 0.76 : 0.64}
                  />
                </mesh>
                <mesh position={[14.5, wallCenterY, BUILDING_3D_HALF_DEPTH + 0.04]}>
                  <boxGeometry args={[17.2, glassH, 0.16]} />
                  <meshStandardMaterial
                    color={glassColor}
                    metalness={0.68}
                    roughness={0.14}
                    transparent
                    opacity={isDarkTheme ? 0.76 : 0.64}
                  />
                </mesh>
                {/* Clear Double-Height Atrium Glass Wall showing Lobby Interior */}
                <mesh position={[0, wallCenterY, BUILDING_3D_HALF_DEPTH + 0.02]}>
                  <boxGeometry args={[11.4, glassH, 0.08]} />
                  <meshStandardMaterial
                    color={isDarkTheme ? '#1D444E' : '#8DBBC4'}
                    metalness={0.25}
                    roughness={0.08}
                    transparent
                    opacity={0.38}
                  />
                </mesh>
              </>
            ) : (
              <mesh position={[0, wallCenterY, BUILDING_3D_HALF_DEPTH + 0.04]}>
                <boxGeometry args={[fullW - 2.2, glassH, 0.16]} />
                <meshStandardMaterial
                  color={glassColor}
                  metalness={0.68}
                  roughness={0.14}
                  transparent
                  opacity={isDarkTheme ? 0.76 : 0.64}
                />
              </mesh>
            )}

            {/* North Back Glazed Curtain Facade */}
            <mesh position={[0, wallCenterY, -BUILDING_3D_HALF_DEPTH - 0.04]}>
              <boxGeometry args={[fullW - 2.2, glassH, 0.16]} />
              <meshStandardMaterial
                color={glassColor}
                metalness={0.68}
                roughness={0.14}
                transparent
                opacity={isDarkTheme ? 0.76 : 0.64}
              />
            </mesh>

            {/* West & East Glazed Curtain Facades */}
            <mesh position={[-BUILDING_3D_HALF_WIDTH - 0.04, wallCenterY, 0]}>
              <boxGeometry args={[0.16, glassH, fullD - 2.2]} />
              <meshStandardMaterial
                color={glassColor}
                metalness={0.68}
                roughness={0.14}
                transparent
                opacity={isDarkTheme ? 0.76 : 0.64}
              />
            </mesh>
            <mesh position={[BUILDING_3D_HALF_WIDTH + 0.04, wallCenterY, 0]}>
              <boxGeometry args={[0.16, glassH, fullD - 2.2]} />
              <meshStandardMaterial
                color={glassColor}
                metalness={0.68}
                roughness={0.14}
                transparent
                opacity={isDarkTheme ? 0.76 : 0.64}
              />
            </mesh>

            {/* Horizontal Architectural Transom Mullions separating upper and lower window panes */}
            <mesh position={[0, floorBaseY + glassH * 0.56, BUILDING_3D_HALF_DEPTH + 0.16]}>
              <boxGeometry args={[fullW - 2.4, 0.08, 0.16]} />
              <meshStandardMaterial color={spandrelColor} metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position={[0, floorBaseY + glassH * 0.56, -BUILDING_3D_HALF_DEPTH - 0.16]}>
              <boxGeometry args={[fullW - 2.4, 0.08, 0.16]} />
              <meshStandardMaterial color={spandrelColor} metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position={[-BUILDING_3D_HALF_WIDTH - 0.16, floorBaseY + glassH * 0.56, 0]}>
              <boxGeometry args={[0.16, 0.08, fullD - 2.4]} />
              <meshStandardMaterial color={spandrelColor} metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position={[BUILDING_3D_HALF_WIDTH + 0.16, floorBaseY + glassH * 0.56, 0]}>
              <boxGeometry args={[0.16, 0.08, fullD - 2.4]} />
              <meshStandardMaterial color={spandrelColor} metalness={0.5} roughness={0.35} />
            </mesh>

            {/* Architectural Cantilevered Sunshade Louvers (Brise-Soleil) casting real shadow on L1–L3 */}
            {lvl >= 1 && (
              <>
                <mesh position={[0, floorBaseY + glassH * 0.76, BUILDING_3D_HALF_DEPTH + 0.45]} castShadow>
                  <boxGeometry args={[fullW - 3.6, 0.12, 0.65]} />
                  <meshStandardMaterial color={spandrelColor} metalness={0.4} roughness={0.42} />
                </mesh>
                <mesh position={[0, floorBaseY + glassH * 0.76, -BUILDING_3D_HALF_DEPTH - 0.45]} castShadow>
                  <boxGeometry args={[fullW - 3.6, 0.12, 0.65]} />
                  <meshStandardMaterial color={spandrelColor} metalness={0.4} roughness={0.42} />
                </mesh>
                <mesh position={[-BUILDING_3D_HALF_WIDTH - 0.45, floorBaseY + glassH * 0.76, 0]} castShadow>
                  <boxGeometry args={[0.65, 0.12, fullD - 3.6]} />
                  <meshStandardMaterial color={spandrelColor} metalness={0.4} roughness={0.42} />
                </mesh>
                <mesh position={[BUILDING_3D_HALF_WIDTH + 0.45, floorBaseY + glassH * 0.76, 0]} castShadow>
                  <boxGeometry args={[0.65, 0.12, fullD - 3.6]} />
                  <meshStandardMaterial color={spandrelColor} metalness={0.4} roughness={0.42} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* 4. Travertine Structural Corner Pylons & Vertical Rhythm Pilasters */}
      {[
        [-BUILDING_3D_HALF_WIDTH - 0.15, -BUILDING_3D_HALF_DEPTH - 0.15],
        [BUILDING_3D_HALF_WIDTH + 0.15, -BUILDING_3D_HALF_DEPTH - 0.15],
        [-BUILDING_3D_HALF_WIDTH - 0.15, BUILDING_3D_HALF_DEPTH + 0.15],
        [BUILDING_3D_HALF_WIDTH + 0.15, BUILDING_3D_HALF_DEPTH + 0.15],
      ].map(([cx, cz], i) => (
        <mesh key={`corner-pylon-${i}`} position={[cx, totalHeight / 2 + 0.1, cz]} castShadow receiveShadow>
          <boxGeometry args={[2.8, totalHeight + 1.15, 2.8]} />
          <meshStandardMaterial color={limestoneColor} roughness={0.66} metalness={0.05} />
        </mesh>
      ))}

      {/* Vertical Limestone Structural Fin Pilasters on South & North Facades */}
      {pilasterXs.map((px) => (
        <group key={`pilaster-fb-${px}`}>
          <mesh position={[px, totalHeight / 2, BUILDING_3D_HALF_DEPTH + 0.24]} castShadow>
            <boxGeometry args={[0.58, totalHeight, 0.46]} />
            <meshStandardMaterial
              color={Math.abs(px) === 3 ? bronzeColor : limestoneColor}
              metalness={Math.abs(px) === 3 ? 0.45 : 0.08}
              roughness={Math.abs(px) === 3 ? 0.35 : 0.65}
            />
          </mesh>
          <mesh position={[px, totalHeight / 2, -BUILDING_3D_HALF_DEPTH - 0.24]} castShadow>
            <boxGeometry args={[0.58, totalHeight, 0.46]} />
            <meshStandardMaterial color={limestoneColor} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* Vertical Pilasters on West & East Facades */}
      {sidePilasterZs.map((pz) => (
        <group key={`pilaster-se-${pz}`}>
          <mesh position={[-BUILDING_3D_HALF_WIDTH - 0.24, totalHeight / 2, pz]} castShadow>
            <boxGeometry args={[0.46, totalHeight, 0.58]} />
            <meshStandardMaterial color={limestoneColor} roughness={0.65} />
          </mesh>
          <mesh position={[BUILDING_3D_HALF_WIDTH + 0.24, totalHeight / 2, pz]} castShadow>
            <boxGeometry args={[0.46, totalHeight, 0.58]} />
            <meshStandardMaterial color={limestoneColor} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* 5. Double-Height Lobby Reception Desk & Sliding Glass Vestibule inside South Entrance */}
      <group position={[0, 0, BUILDING_3D_HALF_DEPTH]}>
        {/* Interior Limestone & Oak Lobby Concierge Counter visible behind glass */}
        <mesh position={[0, 0.72, -1.85]}>
          <boxGeometry args={[6.4, 1.15, 1.1]} />
          <meshStandardMaterial color="#B7A58A" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.32, -1.85]}>
          <boxGeometry args={[6.6, 0.1, 1.25]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
        </mesh>

        {/* Protruding Glass Sliding Automatic Door Vestibule */}
        <mesh position={[0, 1.9, 0.9]}>
          <boxGeometry args={[5.8, 3.6, 1.55]} />
          <meshStandardMaterial
            color={spandrelColor}
            metalness={0.55}
            roughness={0.22}
          />
        </mesh>
        <mesh position={[0, 1.85, 1.7]}>
          <boxGeometry args={[4.4, 3.1, 0.08]} />
          <meshStandardMaterial color="#9ED0D8" metalness={0.3} roughness={0.08} transparent opacity={0.45} />
        </mesh>

        {/* Cantilevered Porte-Cochere Motor Drop-off Canopy */}
        <mesh position={[0, 4.35, 4.1]} castShadow>
          <boxGeometry args={[15.2, 0.52, 7.6]} />
          <meshStandardMaterial color={spandrelColor} metalness={0.42} roughness={0.36} />
        </mesh>
        <mesh position={[0, 4.65, 4.1]}>
          <boxGeometry args={[15.45, 0.14, 7.85]} />
          <meshStandardMaterial color={bronzeColor} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Warm Coffered Under-Canopy Lighting */}
        <mesh position={[0, 4.06, 4.1]}>
          <boxGeometry args={[11.8, 0.08, 4.8]} />
          <meshStandardMaterial color="#FFF3D6" emissive="#FCE4B0" emissiveIntensity={0.85} />
        </mesh>
        {/* Sculpted Porte-Cochere Support Columns */}
        {[-6.2, -2.5, 2.5, 6.2].map((px, i) => (
          <group key={`canopy-col-${i}`} position={[px, 0, 7.0]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <boxGeometry args={[0.72, 0.5, 0.72]} />
              <meshStandardMaterial color={warmStoneAccent} roughness={0.7} />
            </mesh>
            <mesh position={[0, 2.2, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, 3.9, 14]} />
              <meshStandardMaterial color={limestoneColor} roughness={0.55} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 6. West Emergency Gate A Ambulance Canopy, Red Curb & Parked 3D Ambulance */}
      <group position={[-BUILDING_3D_HALF_WIDTH, 0, 8.8]}>
        <mesh position={[-3.0, 3.8, 0]} castShadow>
          <boxGeometry args={[5.8, 0.52, 8.4]} />
          <meshStandardMaterial color="#1B2A30" metalness={0.38} roughness={0.42} />
        </mesh>
        <mesh position={[-5.88, 3.8, 0]}>
          <boxGeometry args={[0.22, 0.54, 8.46]} />
          <meshStandardMaterial color="#C8372D" emissive="#B83227" emissiveIntensity={0.55} />
        </mesh>
        {/* Illuminated White Medical Cross on Emergency Fascia */}
        <mesh position={[-6.02, 3.82, 0]}>
          <boxGeometry args={[0.1, 1.35, 0.38]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[-6.02, 3.82, 0]}>
          <boxGeometry args={[0.1, 0.38, 1.35]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.4} />
        </mesh>
        {/* Canopy Corner Steel Supports */}
        {[-3.4, 3.4].map((cz, i) => (
          <mesh key={`er-col-${i}`} position={[-5.3, 1.8, cz]} castShadow>
            <cylinderGeometry args={[0.18, 0.2, 3.6, 10]} />
            <meshStandardMaterial color="#25363D" metalness={0.5} />
          </mesh>
        ))}
        {/* Crimson Emergency Curb Pad */}
        <mesh position={[-4.5, -0.18, 0]} receiveShadow>
          <boxGeometry args={[8.5, 0.14, 9.6]} />
          <meshStandardMaterial color="#9E2D24" roughness={0.7} />
        </mesh>
        {/* Realistic Parked 3D Ambulance */}
        <EmergencyAmbulance3D position={[-4.2, -0.1, 0.6]} />
      </group>

      {/* 7. Architectural Rooftop Deck, Diagrid Skylight, Solar Panels, HVAC Chillers & Lit Helipad */}
      <mesh position={[0, totalHeight + 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[fullW + 1.15, 0.65, fullD + 1.15]} />
        <meshStandardMaterial color={limestoneColor} roughness={0.68} />
      </mesh>
      <mesh position={[0, totalHeight + 0.68, 0]}>
        <boxGeometry args={[fullW - 0.6, 0.14, fullD - 0.6]} />
        <meshStandardMaterial color="#22353B" roughness={0.88} />
      </mesh>

      {/* Glazed Diagrid Atrium Skylight Pavilion */}
      <group position={[0, totalHeight + 0.75, -0.7]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[12.8, 0.85, 6.8]} />
          <meshStandardMaterial color={glassColor} metalness={0.55} roughness={0.18} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[13.2, 0.14, 7.2]} />
          <meshStandardMaterial color={bronzeColor} metalness={0.55} roughness={0.3} />
        </mesh>
        {[-4.2, -1.4, 1.4, 4.2].map((sx) => (
          <mesh key={`sky-rib-${sx}`} position={[sx, 0.96, 0]}>
            <boxGeometry args={[0.14, 0.12, 7.25]} />
            <meshStandardMaterial color={spandrelColor} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Rooftop Photovoltaic Solar Panel Array (NE Quadrant) */}
      <group position={[11.5, totalHeight + 0.78, 7.2]}>
        {[0, 3.2].map((rowZ, rIdx) =>
          [-5.2, -2.6, 0, 2.6, 5.2].map((colX, cIdx) => (
            <group key={`solar-${rIdx}-${cIdx}`} position={[colX, 0.42, rowZ]} rotation={[0.38, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[2.25, 0.08, 1.65]} />
                <meshStandardMaterial color="#142C42" metalness={0.75} roughness={0.18} />
              </mesh>
              <mesh position={[0, -0.02, 0]}>
                <boxGeometry args={[2.32, 0.04, 1.72]} />
                <meshStandardMaterial color="#9CA3AF" metalness={0.6} roughness={0.35} />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* East Acoustic Louvered HVAC & Chiller Penthouse + Cooling Fans */}
      <group position={[13.5, totalHeight + 0.75, -7.2]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[10.5, 1.9, 7.2]} />
          <meshStandardMaterial color={spandrelColor} roughness={0.58} metalness={0.25} />
        </mesh>
        <mesh position={[0, 1.94, 0]}>
          <boxGeometry args={[10.8, 0.12, 7.5]} />
          <meshStandardMaterial color={bronzeColor} metalness={0.5} roughness={0.35} />
        </mesh>
        {[-3.0, 0, 3.0].map((fx, i) => (
          <mesh key={`hvac-fan-${i}`} position={[fx, 2.15, 0]}>
            <cylinderGeometry args={[0.92, 0.98, 0.35, 18]} />
            <meshStandardMaterial color="#4D6268" metalness={0.5} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* West Rooftop Air-Ambulance Helipad Deck with Lit Perimeter Beacons */}
      <group position={[-14.5, totalHeight + 0.75, -2]}>
        <mesh>
          <cylinderGeometry args={[4.6, 4.85, 0.18, 32]} />
          <meshStandardMaterial color="#27373C" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.45, 3.95, 32]} />
          <meshStandardMaterial color="#E6D2A7" emissive="#B7A58A" emissiveIntensity={0.35} />
        </mesh>
        {/* Crisp "H" Landing Emblem */}
        <mesh position={[-1.1, 0.12, 0]}>
          <boxGeometry args={[0.45, 0.04, 3.0]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[1.1, 0.12, 0]}>
          <boxGeometry args={[0.45, 0.04, 3.0]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[2.2, 0.04, 0.45]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* 4 Emerald Heliport Approach Beacons */}
        {[
          [-4.2, 0.16, 0],
          [4.2, 0.16, 0],
          [0, 0.16, -4.2],
          [0, 0.16, 4.2],
        ].map(([lx, ly, lz], i) => (
          <mesh key={`helipad-light-${i}`} position={[lx, ly, lz]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#34D399" emissive="#10B981" emissiveIntensity={1.3} />
          </mesh>
        ))}
      </group>

      {/* 8. Multi-Canopy Organic Architectural Trees around Campus Perimeter */}
      {campusTrees.map(([tx, tz, scale], idx) => (
        <BotanicalTree
          key={`botanical-tree-${idx}`}
          position={[tx, -0.35, tz]}
          scale={scale}
          isDarkTheme={isDarkTheme}
        />
      ))}
    </group>
  );
}

function ActiveDijkstraRouteMesh({
  floors,
  route,
  explodedGap,
  realisticMode,
}: {
  floors: Floor[];
  route: NavigationRouteResult | null | undefined;
  explodedGap: number;
  realisticMode: boolean;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const reducedMotion = usePrefersReducedMotion();

  const levelMap = useMemo(
    () => new Map(floors.map((f) => [f.id, f.levelNumber])),
    [floors],
  );

  const curveData = useMemo(() => {
    if (!route?.found || route.orderedNodes.length < 2) return null;
    const points = route.orderedNodes.map((n) => {
      const lvl = levelMap.get(n.floorId) ?? 0;
      const [x, y, z] = svgTo3D(n.x, n.y, lvl, explodedGap, 0.55);
      return new THREE.Vector3(x, y, z);
    });
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.14);
    const tubeGeometry = new THREE.TubeGeometry(curve, Math.max(64, points.length * 14), 0.24, 12, false);
    const startVec = points[0];
    const endVec = points[points.length - 1];
    return { curve, tubeGeometry, startVec, endVec };
  }, [route, levelMap, explodedGap]);

  useEffect(() => {
    return () => {
      curveData?.tubeGeometry.dispose();
    };
  }, [curveData]);

  useFrame((state) => {
    if (!curveData || !pulseRef.current) return;
    if (reducedMotion) {
      const mid = curveData.curve.getPointAt(0.5);
      pulseRef.current.position.copy(mid);
      return;
    }
    const t = (state.clock.getElapsedTime() * 0.18) % 1;
    const pt = curveData.curve.getPointAt(t);
    pulseRef.current.position.copy(pt);
  });

  if (!curveData) return null;

  return (
    <group>
      {/* Glowing calculated path ribbon */}
      <mesh geometry={curveData.tubeGeometry}>
        <meshStandardMaterial
          color="#D4B886"
          emissive="#B7A58A"
          emissiveIntensity={realisticMode ? 0.9 : 0.65}
          roughness={0.25}
          metalness={0.3}
        />
      </mesh>

      {/* Moving wayfinding guide sphere */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#4FD1C5" emissiveIntensity={1.1} />
      </mesh>

      {/* Origin Beacon */}
      <group position={curveData.startVec}>
        <mesh>
          <cylinderGeometry args={[0.6, 0.75, 0.5, 20]} />
          <meshStandardMaterial color="#174C50" emissive="#174C50" emissiveIntensity={0.45} />
        </mesh>
      </group>

      {/* Destination Architectural Beacon */}
      <group position={curveData.endVec}>
        <mesh position={[0, 1.1, 0]}>
          <octahedronGeometry args={[0.65, 0]} />
          <meshStandardMaterial color="#B83227" emissive="#B83227" emissiveIntensity={0.75} />
        </mesh>
      </group>
    </group>
  );
}

function VerticalCores({
  explodedGap,
  totalFloors,
}: {
  explodedGap: number;
  totalFloors: number;
}) {
  const topY = (Math.max(1, totalFloors) - 1) * (FLOOR_HEIGHT_METERS + explodedGap) + 2.6;
  const shaftHeight = topY + 0.6;
  const centerY = shaftHeight / 2 - 0.1;

  const cores = [
    { name: 'ELV-A', coords: svgTo3D(500, 190, 0, 0, 0), isElevator: true },
    { name: 'ELV-B', coords: svgTo3D(760, 320, 0, 0, 0), isElevator: true },
    { name: 'STR-W', coords: svgTo3D(180, 180, 0, 0, 0), isElevator: false },
    { name: 'STR-E', coords: svgTo3D(860, 460, 0, 0, 0), isElevator: false },
  ];

  return (
    <group>
      {cores.map((core) => (
        <mesh key={core.name} position={[core.coords[0], centerY, core.coords[2]]}>
          <boxGeometry
            args={[core.isElevator ? 1.85 : 1.6, shaftHeight, core.isElevator ? 1.85 : 1.6]}
          />
          <meshStandardMaterial
            color={core.isElevator ? '#4CA6A8' : '#B7A58A'}
            transparent
            opacity={core.isElevator ? 0.24 : 0.18}
            roughness={0.2}
            metalness={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

export function HospitalScene3D({
  floors,
  nodes,
  edges,
  destinations,
  qrCheckpoints = [],
  route,
  startNodeId,
  endNodeId,
  selectedFloorId,
  exploded,
  previewMode = false,
  onSelectFloor,
  onToggleExploded,
  onSelectDestination,
  onSelectNode,
  onSwitchTo2D,
}: HospitalScene3DProps) {
  const { t, lang } = useTranslation();
  const buildingStyle: BuildingStyleMode = useAppStore((s) => s.buildingStyle);
  const toggleBuildingStyle = useAppStore((s) => s.toggleBuildingStyle);
  const theme: ThemeMode = useAppStore((s) => s.theme);

  const [webGlSupported] = useState(() => detectWebGLSupport());
  const [sceneReady, setSceneReady] = useState(false);
  const [orbitDeg, setOrbitDeg] = useState(43);
  const [cameraGoal, setCameraGoal] = useState<{
    position: [number, number, number];
    target: [number, number, number];
  } | null>(null);

  const realisticMode = buildingStyle === 'realistic';
  const isDarkTheme = theme === 'dark';

  const sortedFloors = useMemo(
    () => [...floors].sort((a, b) => a.levelNumber - b.levelNumber),
    [floors],
  );

  const explodedGap = realisticMode ? 0 : exploded ? 3.2 : 0;
  const overviewTargetY = realisticMode ? 4.8 : exploded ? 10.2 : 6.2;

  const sceneBgColor = realisticMode
    ? isDarkTheme
      ? '#071319'
      : '#DAE7EE'
    : isDarkTheme
      ? '#071115'
      : '#0B161A';

  const focusFloorCamera = (floorId: string | 'all') => {
    if (floorId === 'all' || realisticMode) {
      setCameraGoal({
        position: realisticMode ? [58, 28, 70] : [48, exploded ? 33 : 26, 52],
        target: [0, overviewTargetY, realisticMode ? 2 : 0],
      });
      return;
    }
    const f = floors.find((fl) => fl.id === floorId);
    if (!f) return;
    const y = f.levelNumber * (FLOOR_HEIGHT_METERS + explodedGap);
    setCameraGoal({
      position: [26, y + 18, 30],
      target: [0, y + 0.5, 0],
    });
  };

  const handleFloorButtonClick = (floorId: string | 'all') => {
    if (realisticMode) {
      useAppStore.getState().setBuildingStyle('cutaway');
    }
    onSelectFloor?.(floorId);
    focusFloorCamera(floorId);
  };

  const handleToggleRealBuilding = () => {
    const nextRealistic = !realisticMode;
    toggleBuildingStyle();
    setCameraGoal({
      position: nextRealistic ? [58, 28, 70] : [48, exploded ? 33 : 26, 52],
      target: [0, nextRealistic ? 4.8 : exploded ? 10.2 : 6.2, nextRealistic ? 2 : 0],
    });
  };

  const active2DFallbackFloor =
    sortedFloors.find((f) => f.id === selectedFloorId) ?? sortedFloors[0];

  const fallback2DView = (
    <div className="space-y-3 rounded-architectural border border-champagne-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-champagne-border bg-ivory px-3 py-2 text-xs text-ink">
        <span>{t.wayfinding.webGlFallbackNote}</span>
        {onSelectFloor && (
          <div className="flex gap-1">
            {sortedFloors.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFloor(f.id)}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  active2DFallbackFloor?.id === f.id
                    ? 'bg-teal-deep text-white'
                    : 'bg-surface text-ink'
                }`}
              >
                {f.code}
              </button>
            ))}
          </div>
        )}
      </div>
      {active2DFallbackFloor && (
        <FloorPlan2DSVG
          floor={active2DFallbackFloor}
          nodes={nodes}
          edges={edges}
          destinations={destinations}
          qrCheckpoints={qrCheckpoints}
          route={route}
          startNodeId={startNodeId}
          endNodeId={endNodeId}
          onDestinationClick={onSelectDestination}
          onNodeClick={onSelectNode}
        />
      )}
    </div>
  );

  if (!webGlSupported) {
    return fallback2DView;
  }

  return (
    <SceneErrorBoundary fallback={fallback2DView}>
      <div
        data-theme="architectural"
        data-scene-ready={sceneReady ? 'true' : 'false'}
        data-building-style={buildingStyle}
        data-orbit-deg={orbitDeg}
        style={{ touchAction: 'none' }}
        className={`relative w-full cursor-grab select-none overflow-hidden rounded-architectural border border-champagne-border bg-architectural active:cursor-grabbing ${
          previewMode ? 'h-[430px] md:h-[520px]' : 'h-[490px] md:h-[640px]'
        }`}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{
            position: realisticMode ? [58, 28, 70] : [48, exploded ? 33 : 26, 52],
            fov: 42,
            near: 0.5,
            far: 290,
          }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={[sceneBgColor]} />
          <fog attach="fog" args={[sceneBgColor, 95, 210]} />
          <hemisphereLight
            args={[
              realisticMode && !isDarkTheme ? '#F0F6F9' : '#244650',
              realisticMode && !isDarkTheme ? '#6F7F6E' : '#101C20',
              realisticMode && !isDarkTheme ? 0.95 : 0.55,
            ]}
          />
          <ambientLight intensity={realisticMode && !isDarkTheme ? 0.55 : 0.45} />
          <directionalLight
            position={[38, 58, 42]}
            intensity={realisticMode && !isDarkTheme ? 1.65 : 1.35}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-45}
            shadow-camera-right={45}
            shadow-camera-top={45}
            shadow-camera-bottom={-45}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-32, 26, -28]} intensity={0.45} color="#B7A58A" />

          {/* Architectural Travertine Ground Plinth (Cutaway Mode) */}
          {!realisticMode && (
            <>
              <mesh position={[0, -0.35, 0]} receiveShadow>
                <boxGeometry args={[66, 0.35, 46]} />
                <meshStandardMaterial color="#132329" roughness={0.88} metalness={0.05} />
              </mesh>
              <mesh position={[0, -0.15, 18.8]}>
                <boxGeometry args={[12, 0.08, 8.2]} />
                <meshStandardMaterial color="#B7A58A" roughness={0.75} transparent opacity={0.48} />
              </mesh>
              <mesh position={[-26.5, -0.15, 8.8]}>
                <boxGeometry args={[6.5, 0.08, 7.2]} />
                <meshStandardMaterial color="#B83227" roughness={0.6} transparent opacity={0.68} />
              </mesh>
            </>
          )}

          {/* Structural Perimeter Glass Columns (Cutaway Mode) */}
          {!realisticMode &&
            [
              [-23.5, -14.5],
              [23.5, -14.5],
              [-23.5, 14.5],
              [23.5, 14.5],
              [0, -14.5],
              [0, 14.5],
            ].map(([colX, colZ], idx) => {
              const topY =
                (Math.max(1, sortedFloors.length) - 1) * (FLOOR_HEIGHT_METERS + explodedGap) + 2.4;
              return (
                <mesh key={`col-${idx}`} position={[colX, topY / 2 - 0.1, colZ]}>
                  <boxGeometry args={[0.42, topY, 0.42]} />
                  <meshStandardMaterial
                    color="#465E66"
                    metalness={0.4}
                    roughness={0.4}
                    transparent
                    opacity={0.65}
                  />
                </mesh>
              );
            })}

          {!realisticMode && (
            <VerticalCores explodedGap={explodedGap} totalFloors={sortedFloors.length} />
          )}

          {sortedFloors.map((floor) => (
            <FloorSlabGroup
              key={floor.id}
              floor={floor}
              destinations={destinations}
              nodes={nodes}
              edges={edges}
              qrCheckpoints={qrCheckpoints}
              explodedGap={explodedGap}
              selectedFloorId={selectedFloorId}
              startNodeId={startNodeId}
              endNodeId={endNodeId}
              previewMode={previewMode}
              realisticMode={realisticMode}
              lang={lang}
              onSelectFloor={(id) => handleFloorButtonClick(id)}
              onSelectDestination={onSelectDestination}
              onSelectNode={onSelectNode}
            />
          ))}

          {/* Full Real Building Envelope + Campus Grounds when toggled */}
          {realisticMode && (
            <RealBuildingExterior totalFloors={sortedFloors.length} isDarkTheme={isDarkTheme} />
          )}

          <ActiveDijkstraRouteMesh
            floors={sortedFloors}
            route={route}
            explodedGap={explodedGap}
            realisticMode={realisticMode}
          />

          <SceneFirstFrameSignal onReady={() => setSceneReady(true)} />
          <CameraController
            cameraGoal={cameraGoal}
            defaultTargetY={overviewTargetY}
            onClearGoal={() => setCameraGoal(null)}
            onOrbitChange={setOrbitDeg}
          />
        </Canvas>

        {/* Top Control Overlay Bar */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          {/* Floor Selector Stack */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-architectural border border-white/25 bg-[#0F242C]/95 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handleFloorButtonClick('all')}
              className={`min-h-[34px] rounded px-2 text-xs font-medium transition sm:px-2.5 ${
                selectedFloorId === 'all' && !realisticMode
                  ? 'bg-[#B7A58A] font-semibold text-[#102C35]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {t.wayfinding.allFloors}
            </button>
            {sortedFloors.map((floor) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => handleFloorButtonClick(floor.id)}
                className={`min-h-[34px] rounded px-2 text-xs font-medium transition sm:px-2.5 ${
                  selectedFloorId === floor.id && !realisticMode
                    ? 'bg-[#B7A58A] font-semibold text-[#102C35]'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {floor.code}
              </button>
            ))}
          </div>

          {/* Real Building Toggle & Spatial Controls (180° buttons cleanly removed for natural 360° orbit) */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleRealBuilding}
              aria-pressed={realisticMode}
              title="Switch between Real Building exterior and Inside Cutaway map"
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-architectural border px-2.5 text-xs font-semibold shadow-sm transition sm:px-3 ${
                realisticMode
                  ? 'border-[#B7A58A] bg-[#B7A58A] text-[#102C35]'
                  : 'border-white/25 bg-[#0F242C]/95 text-white hover:border-[#B7A58A]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {realisticMode ? t.wayfinding.cutawayLabel : t.wayfinding.realBuildingLabel}
              </span>
            </button>

            {onToggleExploded && !realisticMode && (
              <button
                type="button"
                aria-pressed={exploded}
                onClick={() => onToggleExploded(!exploded)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-architectural border px-2.5 text-xs font-medium shadow-sm transition sm:px-3 ${
                  exploded
                    ? 'border-[#B7A58A] bg-[#B7A58A] font-semibold text-[#102C35]'
                    : 'border-white/25 bg-[#0F242C]/95 text-white hover:border-white/50'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{t.wayfinding.explodedLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setCameraGoal({
                  position: [0, 62, 0.1],
                  target: [0, 4, 0],
                })
              }
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-architectural border border-white/25 bg-[#0F242C]/95 px-2.5 text-xs font-medium text-white shadow-sm hover:border-white/50"
              title="Top-down architectural view"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Top</span>
            </button>

            <button
              type="button"
              onClick={() => focusFloorCamera('all')}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-architectural border border-white/25 bg-[#0F242C]/95 px-2.5 text-xs font-medium text-white shadow-sm hover:border-white/50"
              title={t.wayfinding.resetCamera}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">{t.wayfinding.resetCamera}</span>
            </button>

            {onSwitchTo2D && (
              <button
                type="button"
                onClick={onSwitchTo2D}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-architectural border border-white/25 bg-[#0F242C]/95 px-2.5 text-xs font-medium text-white shadow-sm hover:border-white/50 sm:px-3"
              >
                <Maximize2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t.wayfinding.view2d}</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom 360° Compass Readout & Wayfinding Summary */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white sm:inset-x-3 sm:bottom-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-[#0B161A]/90 px-2.5 py-1 font-medium text-[#F5DFB5] tabular-nums backdrop-blur-sm">
              <Compass className="h-3.5 w-3.5 shrink-0 text-[#B7A58A]" aria-hidden="true" />
              <span>{getCardinalWingLabel(orbitDeg, lang)}</span>
            </span>
            <span className="rounded bg-[#0B161A]/85 px-2.5 py-1 text-white/95 backdrop-blur-sm">
              {t.wayfinding.orbitHint}
            </span>
          </div>
          {route?.found && (
            <span className="rounded border border-[#B7A58A]/50 bg-[#0B161A]/90 px-2.5 py-1 font-medium text-[#E5D5B8] tabular-nums">
              {route.totalDistanceMeters} {t.common.meters} · ~{route.estimatedDurationMinutes}{' '}
              {t.common.minutes}
            </span>
          )}
        </div>
      </div>
    </SceneErrorBoundary>
  );
}
