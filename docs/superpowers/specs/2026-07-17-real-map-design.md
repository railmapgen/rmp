# Real Map Display Design

## Goal

Rail Map Painter has one project model. A project may show or hide the geographic
map layer while the graph remains the source of truth. Switching the map does not
convert, delete, move, or rewrite elements.

## Persisted Project Model

`ParamState`, project history snapshots, and `RMPSave` persist:

- `mapEnabled: boolean`
- `mapStyle`
- the serialized graph
- the existing viewport zoom and origin

There is no `ProjectType`, `type: 'diagram' | 'map'`, authoring context enum, or
compatibility shim for the unreleased type-based schema. New projects start with
`mapEnabled: false`. The ordinary New Project action is the only new-project
flow.

The Preferences panel exposes a map-layer switch. Changing it only changes
`mapEnabled`; it preserves the graph, every element's `visible` attribute, the
persisted viewport, and undo/redo stacks. Enabling the map starts its controller
at the current viewport. Disabling it disposes the controller without recentering
the canvas.

## Project Replacement and History

`past` and `future` retain ordered `graph` and `project` entries:

- A graph entry stores only the graph. Graph-only undo and redo do not roll back
  map display, map style, viewport, or runtime interaction state.
- A project entry stores `mapEnabled`, map style, graph, and viewport.
- New projects and file, Gallery, or AARC imports replace the complete project.
  AARC preserves the current `mapEnabled` value instead of selecting a display
  context on the user's behalf.
- Full-project undo/redo restores the complete snapshot and resets transient
  selection and tool state so element IDs and stale drawing modes cannot leak
  between projects.

## Visibility

`visible` is mandatory on every line, station, and miscellaneous node. Rendering
never defaults it with `?? true`. Lines, stations, and miscellaneous nodes each
read their own `visible` attribute; an edge never inherits visibility from either
endpoint.

`SvgLayer` keeps hidden elements mounted with the existing `removeMe` class and
invisible SVG filter. This preserves selection and details behavior while
ensuring the hidden markup is removed from serialized exports.

## Context-Driven Editor Behavior

Behavior formerly selected by project kind reads `mapEnabled` directly:

- map layer lifecycle and overview/editor visibility;
- desktop and touch zoom limits;
- Bezier versus Diagonal prediction defaults;
- map style settings;
- map inclusion in export.

Prediction and Fill quick shapes choose geometry that fits the display context.
Map-hidden prediction uses Diagonal paths and Fill keeps its existing
Diagonal/Perpendicular boundaries. Map-visible prediction and Fill use Bezier
paths; polygons use straight Bezier segments and circles use four outward arcs.
Freeform is not used for Fill because its generated filled-area path cannot be
concatenated by the open-path Fill boundary pipeline.

RMG import is always available and continues to preserve its Diagonal plus
SingleColor representation.

## Map Coordinate and Runtime

Graph nodes continue to store ordinary `x` and `y` coordinates. No latitude,
longitude, map center, or per-project geographic anchor is added.

```text
graphPoint =
  (webMercatorZ13WorldPixel - MAP_WORLD_ORIGIN) /
  MAP_WORLD_PIXELS_PER_GRAPH_UNIT
```

The existing transformed SVG world group remains the single camera. The
non-interactive map group is its first child and the editor group follows it.
The map and graph therefore share the same imperative pan/zoom transform.

The framework-independent map controller owns visible tile calculation,
availability and bundle parsing, bounded fetching, request deduplication,
cancellation, caches, DOM cloning, and mounting. Tile nodes are never React
children. At overview scale the editor group is hidden; at detail scale it is
shown immediately even while target tiles are loading.

## Export

Map-hidden export contains no geographic layer. Map-enabled export populates the
detached map clone over the visible graph bounds and retains attribution.

Before serialization:

- `.removeMe` content is removed;
- selection and interaction-only markup is removed.

An empty graph uses the existing 100-by-100 bounds fallback.

## Verification

Focused tests cover:

- map toggle persistence without graph, element visibility, viewport, or history
  mutation;
- mandatory visibility for lines, nodes, and stations;
- context-driven prediction and Fill geometry;
- unconditional RMG import and AARC map-display preservation;
- hidden export omission;
- map controller lifecycle, coordinate mapping, tile switching, and export.

Repository completion gates:

```text
npx tsc --noEmit
npm run lint
npm test
git diff --check
```

## Acceptance Criteria

- There is one persisted project shape and one New Project flow.
- The map can be shown or hidden without changing graph data or the current
  viewport.
- Lines and nodes are governed by their own mandatory `visible` attribute.
- Prediction and Fill use context-appropriate geometry without changing existing
  graph elements.
- Hidden content is absent from export output.
- Map and graph remain aligned through the existing shared viewport.
