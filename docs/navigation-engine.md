# MEDIPATH 3D Visualization & Dijkstra Navigation Engine

Implementation location: `shared/src/navigation.ts`, `frontend/src/components/navigation/HospitalScene3D.tsx`, and `frontend/src/components/navigation/FloorPlan2DSVG.tsx`.

---

## 1. Unified Spatial Coordinate System (2D SVG ↔ 3D Three.js)

Every hospital floor plan shares one authoritative `1000 × 640` 2D canvas mapped bijectively onto a `48m × 30m` structural pavilion slab (`-24m..+24m` in X, `-15m..+15m` in Z) with vertical floor pitch `4.2m`:

```text
x3d = ((svgX - 500) / 500) * 24
z3d = ((svgY - 320) / 320) * 15
y3d = levelNumber * (4.2 + explodedGapMeters) + yOffsetMeters
```

Because both `FloorPlan2DSVG` and `HospitalScene3D` consume the exact same database records (`Floor.svgPlan`, `Destination.zone`, `NavigationNode`, `NavigationEdge`, `QrCheckpoint`):
- Extruded 3D department volumes align pixel-to-meter with uploaded 2D architectural drawings.
- Vertical elevator shafts (`ELV-A` at `(500, 190)` and `ELV-B` at `(760, 320)`) and stairwells (`STR-W` at `(180, 180)`, `STR-E` at `(860, 460)`) stack along identical vertical axes across Levels `L0–L3`.

---

## 2. Multi-Floor Dijkstra Shortest-Path Engine

Implemented in `calculateShortestPath(params)` (`shared/src/navigation.ts`):

1. **Adjacency Filtering**:
   - Excludes inactive nodes (`!node.isActive`).
   - Strictly excludes restricted clinical/staff bypass corridors (`edge.isRestricted`).
   - When `accessibleOnly: true`, excludes `edgeType === 'staircase'`, any non-accessible edge (`!edge.isAccessible`), and any non-accessible intermediate node.
2. **Shortest Path Solver**:
   - Executes deterministic Dijkstra search over physical edge weights (`distanceMeters`).
   - Supports bidirectional traversal (`edge.bidirectional`) as well as one-way corridor/ramp graphs.
3. **Human-Readable Bilingual Guidance**:
   - Produces ordered nodes, traversed edge IDs, involved floor IDs, total walking distance (`m`), estimated walk duration (`max(1, round(distance / 55))` minutes), floor transitions (`elevator` | `staircase` | `ramp`), and turn-by-turn **English + Tamil** instructions.

---

## 3. Honest Indoor Positioning (Zero Fake GPS)

Smartphone GPS cannot reliably distinguish floor levels (`L0` vs `L3`) or narrow indoor corridors inside steel-reinforced healthcare pavilions. Instead of claiming indoor GPS/BLE magic, MEDIPATH uses:
- **Manual Starting Landmark Picker** (entrances, departments, lobbies, restrooms).
- **Scannable Lobby & Wing QR Checkpoints** (`/qr/:code`, generated via `qrcode`), resolving `MP-QR-ENTRANCE`, `MP-QR-RECEPTION`, `MP-QR-LIFT-L0`, `MP-QR-L1-LAB`, `MP-QR-L2-CARDIO` cleanly into exact origin nodes.

---

## 4. Pre-Publish Validation & Versioned Publishing

Before an administrator promotes edits in `/admin/map-editor`, `validateNavigationGraph()` verifies:
- At least one active ground entrance node exists.
- Every searchable destination is reachable along **both** standard corridors and step-free (`accessibleOnly`) elevator routes.
- No active node is completely orphaned from the graph.
- Adjacent multi-floor edges exist across active floor plates.

If critical connectivity errors exist, `POST /api/admin/map/publish` blocks publication cleanly (`400 Bad Request`) with exact offending node/destination diagnostics so patients never receive dead-end routes.

