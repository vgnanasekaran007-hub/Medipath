import type { DestinationCategory, EdgeType, NodeType } from '@medipath/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, ErrorBanner, LoadingState, StatusBadge, SuccessBanner } from '../../components/ui/Primitives';
import { QrBadge } from '../../components/ui/QrBadge';
import { api } from '../../lib/api';

export function AdminBuildingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-buildings'], queryFn: api.admin.getBuildings });
  const buildings = query.data?.buildings ?? [];
  const first = buildings[0];

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [widthMeters, setWidthMeters] = useState(48);
  const [depthMeters, setDepthMeters] = useState(30);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (first && !name) {
      setName(first.name);
      setCode(first.code);
      setWidthMeters(first.widthMeters);
      setDepthMeters(first.depthMeters);
    }
  }, [first, name]);

  const mut = useMutation({
    mutationFn: api.admin.upsertBuilding,
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['admin-buildings'] });
    },
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Building Management</h1>
      {saved && <SuccessBanner message="Architectural building dimensions updated." />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          mut.mutate({
            id: first?.id,
            name,
            code,
            widthMeters: Number(widthMeters),
            depthMeters: Number(depthMeters),
            totalFloors: first?.totalFloors ?? 4,
          });
        }}
        className="grid gap-4 rounded-architectural border border-champagne-border bg-surface p-6 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="bld-name" className="mb-1 block text-xs font-medium text-ink">Building Name</label>
          <input id="bld-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        </div>
        <div>
          <label htmlFor="bld-code" className="mb-1 block text-xs font-medium text-ink">Code</label>
          <input id="bld-code" type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        </div>
        <div>
          <label htmlFor="bld-w" className="mb-1 block text-xs font-medium text-ink">Footprint Width (m)</label>
          <input id="bld-w" type="number" value={widthMeters} onChange={(e) => setWidthMeters(Number(e.target.value))} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink tabular-nums" />
        </div>
        <div>
          <label htmlFor="bld-d" className="mb-1 block text-xs font-medium text-ink">Footprint Depth (m)</label>
          <input id="bld-d" type="number" value={depthMeters} onChange={(e) => setDepthMeters(Number(e.target.value))} className="min-h-[44px] w-full rounded border border-champagne-border bg-surface px-3 text-sm text-ink tabular-nums" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" loading={mut.isPending}>Save Building Dimensions</Button>
        </div>
      </form>
    </div>
  );
}

export function AdminFloorsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-floors'], queryFn: api.admin.getFloors });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [levelNumber, setLevelNumber] = useState(4);
  const [svgPlan, setSvgPlan] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: api.admin.upsertFloor,
    onSuccess: ({ floor }) => {
      setMsg(`Saved floor ${floor.code} (${floor.name}).`);
      setCode('');
      setName('');
      setSvgPlan('');
      qc.invalidateQueries({ queryKey: ['admin-floors'] });
      qc.invalidateQueries({ queryKey: ['admin-map-graph'] });
    },
  });

  const handleSvgUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSvgPlan(String(reader.result ?? ''));
    };
    reader.readAsText(file);
  };

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Floor Management &amp; SVG Upload</h1>
      {msg && <SuccessBanner message={msg} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ code, name, levelNumber: Number(levelNumber), svgPlan: svgPlan || undefined, isPublished: true });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-4"
      >
        <input type="text" required placeholder="Code (e.g. L4)" value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <input type="text" required placeholder="Floor Name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink sm:col-span-2" />
        <input type="number" value={levelNumber} onChange={(e) => setLevelNumber(Number(e.target.value))} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink tabular-nums" />

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-4">
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded border border-champagne-border bg-ivory px-3 py-2 text-xs font-medium text-ink">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{svgPlan ? 'SVG File Loaded' : 'Upload Architectural SVG Floor Plan'}</span>
            <input type="file" accept=".svg,image/svg+xml" onChange={handleSvgUpload} className="sr-only" />
          </label>
          <Button type="submit" variant="primary" size="sm" loading={mut.isPending}>
            Save Floor Level
          </Button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {(query.data?.floors ?? []).map((fl) => (
          <div key={fl.id} className="rounded-architectural border border-champagne-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-ink">
                {fl.code} — {fl.name}
              </h2>
              <StatusBadge tone="teal">Level {fl.levelNumber} · {fl.elevationMeters}m</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-ink">{fl.subtitle}</p>
            <div className="mt-3 h-36 overflow-hidden rounded border border-champagne-border bg-ivory p-2">
              <div className="dark:dark-svg-floor h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: fl.svgPlan }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminDestinationsPage() {
  const qc = useQueryClient();
  const graphQuery = useQuery({ queryKey: ['admin-map-graph'], queryFn: api.admin.getMapGraph });
  const graph = graphQuery.data;

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [floorId, setFloorId] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [category, setCategory] = useState<DestinationCategory>('clinical');

  useEffect(() => {
    if (graph && !floorId && graph.floors.length > 0) setFloorId(graph.floors[0].id);
    if (graph && !nodeId && graph.nodes.length > 0) setNodeId(graph.nodes[0].id);
  }, [graph, floorId, nodeId]);

  const mut = useMutation({
    mutationFn: api.admin.upsertDestination,
    onSuccess: () => {
      setName('');
      setRoomCode('');
      qc.invalidateQueries({ queryKey: ['admin-map-graph'] });
    },
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteDestination,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-map-graph'] }),
  });

  if (graphQuery.isLoading || !graph) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Destination Management</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({
            name: name.trim(),
            slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            roomCode: roomCode.trim() || 'RM',
            floorId,
            nodeId,
            category,
          });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-6"
      >
        <input type="text" required placeholder="Destination Name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <input type="text" required placeholder="Room Code" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <select aria-label="Destination Category" value={category} onChange={(e) => setCategory(e.target.value as DestinationCategory)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink">
          <option value="clinical">Clinical</option>
          <option value="diagnostics">Diagnostics</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="emergency">Emergency</option>
          <option value="billing">Billing</option>
          <option value="amenity">Amenity</option>
          <option value="help_desk">Help Desk</option>
        </select>
        <select value={floorId} onChange={(e) => setFloorId(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink">
          {graph.floors.map((f) => <option key={f.id} value={f.id}>{f.code}</option>)}
        </select>
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink">
          {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.code} — {n.label}</option>)}
        </select>
        <Button type="submit" variant="primary" size="sm" loading={mut.isPending}>Add Destination</Button>
      </form>

      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Room</th>
              <th className="p-3.5">Destination</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Floor</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {graph.destinations.map((dest) => {
              const fl = graph.floors.find((f) => f.id === dest.floorId);
              return (
                <tr key={dest.id}>
                  <td className="p-3.5 font-mono text-xs font-semibold text-ink">{dest.roomCode}</td>
                  <td className="p-3.5 font-medium text-ink">{dest.name}</td>
                  <td className="p-3.5 text-xs"><StatusBadge tone="champagne">{dest.category}</StatusBadge></td>
                  <td className="p-3.5 text-xs">{fl?.code}</td>
                  <td className="p-3.5 text-right">
                    <button type="button" onClick={() => delMut.mutate(dest.id)} className="rounded p-2 text-emergency hover:bg-emergency-soft" aria-label={`Delete ${dest.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminNodesPage() {
  const qc = useQueryClient();
  const graphQuery = useQuery({ queryKey: ['admin-map-graph'], queryFn: api.admin.getMapGraph });

  const [floorId, setFloorId] = useState('');
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [type] = useState<NodeType>('corridor');
  const [x, setX] = useState(400);
  const [y, setY] = useState(300);

  const graph = graphQuery.data;
  useEffect(() => {
    if (graph && !floorId && graph.floors.length > 0) setFloorId(graph.floors[0].id);
  }, [graph, floorId]);

  const mut = useMutation({
    mutationFn: api.admin.upsertNode,
    onSuccess: () => {
      setLabel('');
      setCode('');
      qc.invalidateQueries({ queryKey: ['admin-map-graph'] });
    },
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteNode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-map-graph'] }),
  });

  if (graphQuery.isLoading || !graph) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Navigation Node Editor</h1>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          mut.mutate({ floorId, label, code: code || 'NODE', type, x: Number(x), y: Number(y), isAccessible: true, isActive: true });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-6"
      >
        <select value={floorId} onChange={(e) => setFloorId(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink">
          {graph.floors.map((f) => <option key={f.id} value={f.id}>{f.code}</option>)}
        </select>
        <input type="text" required placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <input type="text" required placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <input type="number" min={0} max={1000} value={x} onChange={(e) => setX(Number(e.target.value))} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink tabular-nums" />
        <input type="number" min={0} max={640} value={y} onChange={(e) => setY(Number(e.target.value))} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink tabular-nums" />
        <Button type="submit" variant="primary" size="sm" loading={mut.isPending}>Add Node</Button>
      </form>

      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">Code</th>
              <th className="p-3.5">Label</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">SVG (X, Y)</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {graph.nodes.map((n) => (
              <tr key={n.id}>
                <td className="p-3.5 font-mono text-xs font-semibold text-ink">{n.code}</td>
                <td className="p-3.5 font-medium text-ink">{n.label}</td>
                <td className="p-3.5 text-xs">{n.type}</td>
                <td className="p-3.5 text-xs tabular-nums">({n.x}, {n.y})</td>
                <td className="p-3.5 text-right">
                  <button type="button" onClick={() => delMut.mutate(n.id)} className="rounded p-2 text-emergency hover:bg-emergency-soft" aria-label={`Delete ${n.code}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminPathwaysPage() {
  const qc = useQueryClient();
  const graphQuery = useQuery({ queryKey: ['admin-map-graph'], queryFn: api.admin.getMapGraph });
  const graph = graphQuery.data;

  const [fromNodeId, setFromNodeId] = useState('');
  const [toNodeId, setToNodeId] = useState('');
  const [edgeType, setEdgeType] = useState<EdgeType>('corridor');
  const [distanceMeters, setDistanceMeters] = useState(8);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    if (graph && !fromNodeId && graph.nodes.length >= 2) {
      setFromNodeId(graph.nodes[0].id);
      setToNodeId(graph.nodes[1].id);
    }
  }, [graph, fromNodeId]);

  const mut = useMutation({
    mutationFn: api.admin.upsertEdge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-map-graph'] }),
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteEdge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-map-graph'] }),
  });

  if (graphQuery.isLoading || !graph) return <LoadingState />;

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Pathway Management</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({
            fromNodeId,
            toNodeId,
            edgeType,
            distanceMeters: Number(distanceMeters),
            isAccessible: edgeType !== 'staircase',
            isRestricted,
            bidirectional: true,
          });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-6"
      >
        <select value={fromNodeId} onChange={(e) => setFromNodeId(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-xs text-ink">
          {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.code}</option>)}
        </select>
        <select value={toNodeId} onChange={(e) => setToNodeId(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-xs text-ink">
          {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.code}</option>)}
        </select>
        <select value={edgeType} onChange={(e) => setEdgeType(e.target.value as EdgeType)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-xs text-ink">
          <option value="corridor">Corridor</option>
          <option value="elevator">Elevator</option>
          <option value="staircase">Staircase</option>
          <option value="ramp">Ramp</option>
        </select>
        <input type="number" min={1} value={distanceMeters} onChange={(e) => setDistanceMeters(Number(e.target.value))} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-xs text-ink tabular-nums" />
        <label className="flex items-center gap-1.5 text-xs text-ink">
          <input type="checkbox" checked={isRestricted} onChange={(e) => setIsRestricted(e.target.checked)} />
          <span>Restricted</span>
        </label>
        <Button type="submit" variant="primary" size="sm" loading={mut.isPending}>Connect</Button>
      </form>

      <div className="overflow-x-auto rounded-architectural border border-champagne-border bg-surface">
        <table className="w-full text-left text-sm text-ink">
          <thead className="border-b border-champagne-border bg-ivory text-xs uppercase text-ink">
            <tr>
              <th className="p-3.5">From → To</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Distance</th>
              <th className="p-3.5">Flags</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-border">
            {graph.edges.map((e) => (
              <tr key={e.id}>
                <td className="p-3.5 text-xs font-medium text-ink">
                  {nodeMap.get(e.fromNodeId)?.code} ↔ {nodeMap.get(e.toNodeId)?.code}
                </td>
                <td className="p-3.5 text-xs">{e.edgeType}</td>
                <td className="p-3.5 text-xs tabular-nums">{e.distanceMeters} m</td>
                <td className="p-3.5 text-xs">
                  <div className="flex gap-1">
                    {e.isAccessible && <StatusBadge tone="teal">Accessible</StatusBadge>}
                    {e.isRestricted && <StatusBadge tone="emergency">Restricted</StatusBadge>}
                  </div>
                </td>
                <td className="p-3.5 text-right">
                  <button type="button" onClick={() => delMut.mutate(e.id)} className="rounded p-2 text-emergency hover:bg-emergency-soft" aria-label="Delete pathway">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminQrCheckpointsPage() {
  const qc = useQueryClient();
  const qrQuery = useQuery({ queryKey: ['admin-qr'], queryFn: api.admin.getQrCheckpoints });
  const graphQuery = useQuery({ queryKey: ['admin-map-graph'], queryFn: api.admin.getMapGraph });
  const graph = graphQuery.data;

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [nodeId, setNodeId] = useState('');

  useEffect(() => {
    if (graph && !nodeId && graph.nodes.length > 0) setNodeId(graph.nodes[0].id);
  }, [graph, nodeId]);

  const mut = useMutation({
    mutationFn: api.admin.upsertQrCheckpoint,
    onSuccess: () => {
      setCode('');
      setLabel('');
      qc.invalidateQueries({ queryKey: ['admin-qr'] });
      qc.invalidateQueries({ queryKey: ['admin-map-graph'] });
    },
  });

  const delMut = useMutation({
    mutationFn: api.admin.deleteQrCheckpoint,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-qr'] }),
  });

  if (qrQuery.isLoading || !graph) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">QR Checkpoint Management</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = graph.nodes.find((x) => x.id === nodeId);
          if (!n) return;
          mut.mutate({ code: code.trim(), label: label.trim(), nodeId: n.id, floorId: n.floorId, isActive: true });
        }}
        className="grid gap-3 rounded-architectural border border-champagne-border bg-surface p-5 sm:grid-cols-4"
      >
        <input type="text" required placeholder="Code (MP-QR-...)" value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <input type="text" required placeholder="Totem Label" value={label} onChange={(e) => setLabel(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-3 text-sm text-ink" />
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="min-h-[42px] rounded border border-champagne-border bg-surface px-2 text-sm text-ink">
          {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.code} — {n.label}</option>)}
        </select>
        <Button type="submit" variant="primary" size="sm" loading={mut.isPending}>Generate QR Totem</Button>
      </form>

      {mut.error && <ErrorBanner message={(mut.error as Error).message} />}

      <div className="grid gap-4 md:grid-cols-2">
        {(qrQuery.data?.checkpoints ?? []).map((qr) => (
          <div key={qr.id} className="flex flex-col justify-between gap-3 rounded-architectural border border-champagne-border bg-surface p-4">
            <QrBadge code={qr.code} label={qr.label} />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => delMut.mutate(qr.id)}>
                <Trash2 className="h-3.5 w-3.5 text-emergency" aria-hidden="true" />
                <span>Remove Totem</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
