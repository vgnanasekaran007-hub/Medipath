import {
  calculateShortestPath,
  computeEdgeMetersFromNodes,
  type EdgeType,
  type GraphValidationResult,
  type NavigationNode,
  type NodeType,
} from '@medipath/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Plus,
  Route,
  Upload,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FloorPlan2DSVG } from '../../components/navigation/FloorPlan2DSVG';
import {
  Button,
  ErrorBanner,
  LoadingState,
  SuccessBanner,
} from '../../components/ui/Primitives';
import { api } from '../../lib/api';

const HospitalScene3D = lazy(() =>
  import('../../components/navigation/HospitalScene3D').then((m) => ({
    default: m.HospitalScene3D,
  })),
);

export function AdminMapEditorPage() {
  const queryClient = useQueryClient();

  const graphQuery = useQuery({
    queryKey: ['admin-map-graph'],
    queryFn: api.admin.getMapGraph,
  });

  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [editorMode, setEditorMode] = useState<'inspect' | 'add_node' | 'connect_edge' | 'test_route'>('inspect');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingEdgeFromId, setPendingEdgeFromId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'split' | '2d' | '3d'>('split');

  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeCode, setNodeCode] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('corridor');
  const [nodeX, setNodeX] = useState(500);
  const [nodeY, setNodeY] = useState(320);
  const [nodeAccessible, setNodeAccessible] = useState(true);

  const [edgeType, setEdgeType] = useState<EdgeType>('corridor');
  const [edgeAccessible, setEdgeAccessible] = useState(true);
  const [edgeRestricted, setEdgeRestricted] = useState(false);

  const [testStartId, setTestStartId] = useState('');
  const [testEndId, setTestEndId] = useState('');
  const [testAccessible, setTestAccessible] = useState(false);
  const [validationResult, setValidationResult] = useState<GraphValidationResult | null>(null);
  const [publishLabel, setPublishLabel] = useState('');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const graph = graphQuery.data;

  useEffect(() => {
    if (graph && !selectedFloorId && graph.floors.length > 0) {
      setSelectedFloorId(graph.floors[0].id);
    }
    if (graph && !testStartId && graph.nodes.length > 1) {
      setTestStartId(graph.nodes[0].id);
      setTestEndId(graph.destinations[0]?.nodeId ?? graph.nodes[1].id);
    }
  }, [graph, selectedFloorId, testStartId]);

  const invalidateMap = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-map-graph'] });
    queryClient.invalidateQueries({ queryKey: ['navigation-graph'] });
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const upsertNodeMut = useMutation({
    mutationFn: api.admin.upsertNode,
    onSuccess: ({ node }) => {
      setBannerMsg(`Saved node ${node.code} (${node.label}).`);
      setSelectedNodeId(node.id);
      setNodeLabel('');
      setNodeCode('');
      invalidateMap();
    },
  });

  const upsertEdgeMut = useMutation({
    mutationFn: api.admin.upsertEdge,
    onSuccess: () => {
      setBannerMsg('Saved pathway edge cleanly.');
      setPendingEdgeFromId(null);
      invalidateMap();
    },
  });

  const validateMut = useMutation({
    mutationFn: api.admin.validateMap,
    onSuccess: ({ validation }) => {
      setValidationResult(validation);
    },
  });

  const publishMut = useMutation({
    mutationFn: api.admin.publishMap,
    onSuccess: ({ version }) => {
      setBannerMsg(`Published ${version.label} (#${version.versionNumber}) to public portal!`);
      setPublishLabel('');
      invalidateMap();
    },
  });

  const testRoute = useMemo(() => {
    if (!graph || !testStartId || !testEndId) return null;
    return calculateShortestPath({
      nodes: graph.nodes,
      edges: graph.edges,
      floors: graph.floors,
      startNodeId: testStartId,
      endNodeId: testEndId,
      accessibleOnly: testAccessible,
    });
  }, [graph, testStartId, testEndId, testAccessible]);

  if (graphQuery.isLoading || !graph) return <LoadingState />;

  const activeFloor = graph.floors.find((f) => f.id === selectedFloorId) ?? graph.floors[0];
  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleCanvasClick = ({ x, y }: { x: number; y: number }) => {
    setNodeX(x);
    setNodeY(y);
    if (editorMode === 'add_node') {
      setBannerMsg(`Picked floor coordinates (${x}, ${y}). Fill label and click Save Node.`);
    }
  };

  const handleNodeClick = (node: NavigationNode) => {
    if (editorMode === 'connect_edge') {
      if (!pendingEdgeFromId) {
        setPendingEdgeFromId(node.id);
        setBannerMsg(`Selected origin node ${node.code}. Click target node to connect pathway.`);
        return;
      }
      if (pendingEdgeFromId === node.id) {
        setPendingEdgeFromId(null);
        return;
      }
      const fromNode = graph.nodes.find((n) => n.id === pendingEdgeFromId);
      if (fromNode) {
        const dist = computeEdgeMetersFromNodes(fromNode, node);
        upsertEdgeMut.mutate({
          fromNodeId: fromNode.id,
          toNodeId: node.id,
          edgeType: fromNode.floorId !== node.floorId ? 'elevator' : edgeType,
          distanceMeters: dist,
          isAccessible: edgeType === 'staircase' ? false : edgeAccessible,
          isRestricted: edgeRestricted,
          bidirectional: true,
        });
      }
      return;
    }

    setSelectedNodeId(node.id);
    if (editorMode === 'test_route') {
      if (!testStartId) setTestStartId(node.id);
      else setTestEndId(node.id);
    }
  };

  const handleCreateNode = (e: FormEvent) => {
    e.preventDefault();
    if (!activeFloor || !nodeLabel.trim()) return;
    upsertNodeMut.mutate({
      floorId: activeFloor.id,
      code: nodeCode.trim() || `${activeFloor.code}-N-${Math.floor(Math.random() * 900 + 100)}`,
      label: nodeLabel.trim(),
      labelTa: nodeLabel.trim(),
      type: nodeType,
      x: Number(nodeX),
      y: Number(nodeY),
      isAccessible: nodeAccessible,
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Toolbar */}
      <div className="flex flex-col justify-between gap-4 border-b border-champagne-border pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
            Unified 2D + 3D Architectural Editor · Active {graph.activeMapVersion.label}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            3D Hospital Map &amp; Graph Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded border border-champagne-border bg-surface p-1 text-xs">
            {(['split', '2d', '3d'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewLayout(m)}
                className={`min-h-[36px] rounded px-3 py-1.5 font-semibold uppercase ${
                  viewLayout === m ? 'bg-teal-deep text-white' : 'text-ink'
                }`}
              >
                {m} View
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            loading={validateMut.isPending}
            onClick={() => validateMut.mutate()}
          >
            <CheckCircle2 className="h-4 w-4 text-ink" aria-hidden="true" />
            <span>Validate Connectivity</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            loading={publishMut.isPending}
            onClick={() =>
              publishMut.mutate({
                label: publishLabel.trim() || undefined,
              })
            }
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Publish New Map Version</span>
          </Button>
        </div>
      </div>

      {bannerMsg && <SuccessBanner message={bannerMsg} />}
      {(upsertNodeMut.error || upsertEdgeMut.error || publishMut.error) && (
        <ErrorBanner
          message={
            (upsertNodeMut.error as Error)?.message ||
            (upsertEdgeMut.error as Error)?.message ||
            (publishMut.error as Error)?.message ||
            'Map operation failed'
          }
        />
      )}

      {/* Connectivity Validation Diagnostics */}
      {validationResult && (
        <div
          className={`rounded-architectural border p-4 text-sm ${
            validationResult.valid
              ? 'border-champagne-border bg-teal-mist text-ink'
              : 'border-emergency/40 bg-emergency-soft text-emergency'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-semibold">
              {validationResult.valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Graph Validation: {validationResult.valid ? 'Passed (Ready to Publish)' : 'Issues Detected'}
            </span>
            <span className="text-xs tabular-nums">
              {validationResult.activeNodeCount} active nodes · {validationResult.edgeCount} edges ·{' '}
              {validationResult.destinationCount} destinations
            </span>
          </div>
          {validationResult.issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink">
              {validationResult.issues.map((issue, idx) => (
                <li key={idx}>
                  <strong>[{issue.severity.toUpperCase()}]</strong> {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Editor Mode Bar & Floor Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-architectural border border-champagne-border bg-surface p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {graph.floors.map((fl) => (
            <button
              key={fl.id}
              type="button"
              onClick={() => setSelectedFloorId(fl.id)}
              className={`min-h-[38px] rounded px-3 text-xs font-semibold ${
                activeFloor?.id === fl.id
                  ? 'bg-teal-deep text-white'
                  : 'border border-champagne-border bg-ivory text-ink'
              }`}
            >
              {fl.code} — {fl.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'inspect', label: 'Inspect' },
            { id: 'add_node', label: 'Click Floor to Add Node' },
            { id: 'connect_edge', label: 'Connect 2 Nodes' },
            { id: 'test_route', label: 'Test Route' },
          ].map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setEditorMode(tool.id as typeof editorMode);
                setPendingEdgeFromId(null);
              }}
              className={`min-h-[38px] rounded px-3 text-xs font-semibold ${
                editorMode === tool.id
                  ? 'bg-champagne text-[#102C35]'
                  : 'border border-champagne-border bg-surface text-ink hover:bg-ivory'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Canvas Workspace */}
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-8">
          <div className={`grid gap-4 ${viewLayout === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(viewLayout === 'split' || viewLayout === '2d') && activeFloor && (
              <div className="min-w-0">
                <FloorPlan2DSVG
                  floor={activeFloor}
                  nodes={graph.nodes}
                  edges={graph.edges}
                  destinations={graph.destinations}
                  qrCheckpoints={graph.qrCheckpoints}
                  route={testRoute}
                  startNodeId={testStartId}
                  endNodeId={testEndId}
                  highlightedNodeId={selectedNodeId ?? undefined}
                  pendingEdgeFromId={pendingEdgeFromId}
                  editable
                  onCanvasClick={handleCanvasClick}
                  onNodeClick={handleNodeClick}
                />
              </div>
            )}

            {(viewLayout === 'split' || viewLayout === '3d') && (
              <div className="min-w-0">
                <Suspense
                  fallback={
                    <div className="flex h-[480px] items-center justify-center rounded-architectural border border-champagne-border bg-architectural text-sm text-white md:h-[620px]">
                      Syncing 3D studio…
                    </div>
                  }
                >
                  <HospitalScene3D
                    floors={graph.floors}
                    nodes={graph.nodes}
                    edges={graph.edges}
                    destinations={graph.destinations}
                    qrCheckpoints={graph.qrCheckpoints}
                    route={testRoute}
                    startNodeId={testStartId}
                    endNodeId={testEndId}
                    selectedFloorId={activeFloor?.id ?? 'all'}
                    exploded
                    onSelectFloor={(id) => {
                      if (id !== 'all') setSelectedFloorId(id);
                    }}
                    onSelectNode={handleNodeClick}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Studio Panels */}
        <aside className="min-w-0 space-y-4 xl:col-span-4">
          <form
            onSubmit={handleCreateNode}
            className="space-y-3 rounded-architectural border border-champagne-border bg-surface p-4"
          >
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              <Plus className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Add Navigation Node ({activeFloor?.code})</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Node Label (e.g., West Lobby)"
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                className="col-span-2 min-h-[40px] rounded border border-champagne-border bg-surface px-2.5 text-xs text-ink"
              />
              <input
                type="text"
                placeholder="Code (auto)"
                value={nodeCode}
                onChange={(e) => setNodeCode(e.target.value)}
                className="min-h-[40px] rounded border border-champagne-border bg-surface px-2.5 text-xs text-ink"
              />
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as NodeType)}
                className="min-h-[40px] rounded border border-champagne-border bg-surface px-2 text-xs text-ink"
              >
                <option value="corridor">Corridor</option>
                <option value="junction">Junction</option>
                <option value="department_entrance">Dept Entrance</option>
                <option value="room">Room</option>
                <option value="elevator">Elevator</option>
                <option value="staircase">Staircase</option>
                <option value="qr_checkpoint">QR Checkpoint</option>
              </select>
              <input
                type="number"
                min={0}
                max={1000}
                value={nodeX}
                onChange={(e) => setNodeX(Number(e.target.value))}
                aria-label="SVG X coordinate"
                className="min-h-[40px] rounded border border-champagne-border bg-surface px-2.5 text-xs text-ink tabular-nums"
              />
              <input
                type="number"
                min={0}
                max={640}
                value={nodeY}
                onChange={(e) => setNodeY(Number(e.target.value))}
                aria-label="SVG Y coordinate"
                className="min-h-[40px] rounded border border-champagne-border bg-surface px-2.5 text-xs text-ink tabular-nums"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={nodeAccessible}
                onChange={(e) => setNodeAccessible(e.target.checked)}
              />
              <span>Wheelchair accessible node</span>
            </label>
            <Button type="submit" variant="primary" size="sm" className="w-full" loading={upsertNodeMut.isPending}>
              Save Node
            </Button>
          </form>

          <div className="space-y-3 rounded-architectural border border-champagne-border bg-surface p-4 text-xs text-ink">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              <GitBranch className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Pathway Options (Connect Mode)</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={edgeType}
                onChange={(e) => setEdgeType(e.target.value as EdgeType)}
                className="min-h-[38px] rounded border border-champagne-border bg-surface px-2 text-ink"
              >
                <option value="corridor">Corridor</option>
                <option value="elevator">Elevator</option>
                <option value="staircase">Staircase</option>
                <option value="ramp">Ramp</option>
              </select>
              <div className="flex flex-col justify-center gap-1">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={edgeAccessible}
                    onChange={(e) => setEdgeAccessible(e.target.checked)}
                  />
                  <span>Accessible</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={edgeRestricted}
                    onChange={(e) => setEdgeRestricted(e.target.checked)}
                  />
                  <span>Staff Restricted</span>
                </label>
              </div>
            </div>
            {selectedNode && (
              <div className="rounded border border-champagne-border bg-ivory p-2.5">
                <span className="font-semibold text-ink">
                  Selected: {selectedNode.code} ({selectedNode.label})
                </span>
                <p className="text-ink tabular-nums">
                  SVG ({selectedNode.x}, {selectedNode.y}) · {selectedNode.type}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-architectural border border-champagne-border bg-surface p-4 text-xs text-ink">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              <Route className="h-4 w-4 text-ink" aria-hidden="true" />
              <span>Live Dijkstra Route Tester</span>
            </h2>
            <select
              value={testStartId}
              onChange={(e) => setTestStartId(e.target.value)}
              className="min-h-[38px] w-full rounded border border-champagne-border bg-surface px-2 text-ink"
            >
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Start: {n.code} — {n.label}
                </option>
              ))}
            </select>
            <select
              value={testEndId}
              onChange={(e) => setTestEndId(e.target.value)}
              className="min-h-[38px] w-full rounded border border-champagne-border bg-surface px-2 text-ink"
            >
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  End: {n.code} — {n.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={testAccessible}
                onChange={(e) => setTestAccessible(e.target.checked)}
              />
              <span>Enforce Wheelchair Accessible Route</span>
            </label>
            {testRoute && (
              <div className="rounded border border-champagne-border bg-ivory p-2.5">
                {testRoute.found ? (
                  <p className="font-semibold text-ink tabular-nums">
                    Found: {testRoute.totalDistanceMeters}m · {testRoute.estimatedDurationMinutes} min
                    · {testRoute.steps.length} steps
                  </p>
                ) : (
                  <p className="font-semibold text-emergency">{testRoute.errorMessage}</p>
                )}
              </div>
            )}

            <div className="border-t border-champagne-border pt-2">
              <label htmlFor="pub-label" className="mb-1 block font-medium text-ink">
                Release Label (Optional)
              </label>
              <input
                id="pub-label"
                type="text"
                placeholder="e.g., v2.0 — Wing Update"
                value={publishLabel}
                onChange={(e) => setPublishLabel(e.target.value)}
                className="min-h-[38px] w-full rounded border border-champagne-border bg-surface px-2.5 text-ink"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
