# Real Map Display and Line Access Design

## Goal

Rail Map Painter has one project model. A project may show or hide the geographic
map layer, and that display context determines which known line paths a free user
may author and see. The graph remains the source of truth: switching the map does
not convert, delete, move, or rewrite elements.

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

## Central Line Policy

The only contextual path classifications are two explicit, disjoint sets:

```text
MAP_NATIVE_LINE_PATHS:
  Bezier
  Freeform

DIAGRAM_NATIVE_LINE_PATHS:
  Diagonal
  Perpendicular
  RotatePerpendicular
  RayGuided
```

`Simple` belongs to neither set. A test asserts both exact membership and
disjointness.

For a known path, subscription is required when either condition is true:

```text
linePaths[path].isPro
mapEnabled ? DIAGRAM_NATIVE_LINE_PATHS.has(path)
           : MAP_NATIVE_LINE_PATHS.has(path)
```

A known line style independently requires subscription when
`lineStyles[style].isPro` is true. A subscriber may use every known compatible
path/style combination. The six legacy `Simple` combinations with
`ShmetroVirtualInt`, `GzmtrVirtualInt`, `River`, `MTRPaidArea`,
`MTRUnpaidArea`, or `MRTTapeOut` remain free in both map-display contexts. This
pair-specific exception does not make `Simple` available with any other style.
There is no `availableIn`, `restrictionMode`, future availability state,
node-type policy, or source/target visibility coupling.

The policy exposes one authoring-access operation, `canUseLine`, for a known
path/style pair. A caller checking only one axis supplies a permitted default
for the other axis: `SingleColor` for a path-only check, or the current
context's default path for a style-only check. Path/style rendering
compatibility remains a separate metadata check.

Existing-line visibility remains a separate operation because it preserves
unknown types for fallback rendering rather than authoring them.

Unknown existing paths and styles remain renderable through existing fallbacks
so forward-compatible or partially understood saves are not destroyed. Unknown
types cannot be newly authored.

## Visibility

`visible` is mandatory on every line, station, and miscellaneous node. Rendering
never defaults it with `?? true`.

For lines:

```text
effectiveEdgeVisible =
  edge.visible &&
  isLinePolicyVisible(edge, mapEnabled, isSubscriber)
```

For nodes and stations, effective visibility is exactly their own `visible`
attribute. An edge never inherits visibility from either endpoint. Policy
evaluation is derived at render time and never mutates graph attributes.

`SvgLayer` keeps hidden elements mounted with the existing `removeMe` class and
invisible SVG filter. This preserves selection/details behavior while ensuring
exports omit hidden content. Export bounds ignore `removeMe`, including the
all-hidden fallback to a 100-by-100 canvas.

## Authoring Enforcement

The central policy is enforced at every mutation boundary, not only in disabled
buttons:

- line path and style tools;
- keyboard restoration of the last line tool;
- pointer-down previews and the final pointer-up edge commit;
- contextual prediction;
- Fill-node line creation;
- edge splitting;
- details-panel path/style conversion;
- bulk conversion procedures;
- any path/style fallback chosen by a UI.

When map context or subscription changes, a now-restricted active drawing mode
returns to free mode. A stale mode therefore cannot commit a restricted line.

Conversion validates the target combination only. This lets a free user convert
an existing restricted line to an allowed target while preventing conversion
into a restricted target.

Paste, project import, RMG import, and AARC import preserve known restricted
existing elements rather than silently dropping them. Their policy visibility
is derived in the destination context. Existing quota behavior, such as
generic-style layer clamping, remains independent.

Fill quick shapes choose a context-native boundary: map-hidden shapes keep their
existing Diagonal/Perpendicular construction, while map-visible shapes use
straight Bezier segments for polygons and four outward Bezier arcs for circles.
Freeform is not used because its generated filled-area path cannot be
concatenated by the open-path Fill boundary pipeline.

## Context-Driven Editor Behavior

Behavior formerly selected by project kind reads `mapEnabled` directly:

- map layer lifecycle and overview/editor visibility;
- desktop and touch zoom limits;
- Bezier versus Diagonal prediction defaults;
- map style settings;
- map inclusion in export.

RMG import is always available and continues to preserve its Diagonal plus
SingleColor representation. If that combination is restricted in the current
map/subscription context, the imported edges remain in the graph and derive as
hidden through the same policy as opened or pasted content.

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
- selection and interaction-only markup is removed;
- graph bounds exclude every `.removeMe` top-level element;
- an all-hidden or empty graph uses the 100-by-100 fallback.

Thus an explicitly hidden or policy-hidden element affects neither pixels nor
export dimensions.

## Verification

Focused tests cover:

- exact and disjoint native-path sets;
- free/subscriber policy matrices, legacy `Simple` combinations, static Pro
  paths/styles, and unknown types;
- map toggle persistence without graph, element visibility, viewport, or history
  mutation;
- `effectiveEdgeVisible` changing with context without modifying `visible`;
- no visibility fallback for nodes or stations;
- restricted-target rejection and restricted-to-allowed conversion;
- stale tool and final canvas commit guards;
- prediction, Fill, split, and bulk conversion guards;
- unconditional RMG import and AARC map-display preservation;
- paste retention of every known path;
- unknown path fallback, including inherited object-property names;
- hidden export omission and bounds exclusion;
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
- Free users see and author only the permitted line combinations for the current
  context; subscribers may use all known combinations.
- Every authoring mutation boundary enforces the same centralized policy.
- Existing restricted and unknown content remains intact, with effective
  visibility derived at render time.
- Nodes are governed only by their own mandatory `visible` attribute.
- Hidden content is absent from export output and export bounds.
- Map and graph remain aligned through the existing shared viewport.
