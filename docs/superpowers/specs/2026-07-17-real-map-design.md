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

The policy exposes separate operations for:

- authoring a known path;
- authoring a known style;
- authoring a compatible path/style pair;
- deciding whether an existing line is policy-visible.

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

## Level Switching

- The two data levels are overview z7 and zoomed z13.
- Crossing from overview to zoomed immediately removes or hides overview; no enlarged overview tiles remain visible during the transition.
- The editor group becomes visible as soon as the viewport crosses the zoomed threshold, independent of network completion.
- One replaceable, dismissible global loading alert appears when a level switch starts, reports settled target tiles, and disappears when all target-level tiles required by the current viewport are settled.
- No blocking overlay is shown, and camera or editor input is not intercepted.
- Ordinary panning within the same level does not show the global switching status.
- A generation token prevents requests from a superseded viewport or level from mounting stale tiles.
- Failed bundles are treated as settled so loading cannot remain stuck. Failed areas stay blank and errors are logged.

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
- precise versus circular rotation controls;
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

At overview scale, the editor group and tool panel are hidden, leaving only the
map, and a dismissible informational alert asks the user to zoom in before
editing. At the configured threshold, the editor group and tools are shown
immediately and the overview alert is closed. Redux is the single source of
truth for this transient overview state.

Runtime responsibilities are split as follows:

- Configuration contains the CDN base URL, coordinate constants, switch
  threshold, cache budgets, and fetch concurrency.
- Pure binary utilities validate and parse the availability bitmap and RMPB1
  bundles.
- Byte-aware in-memory LRUs cache parsed bundles and imported SVG tile
  templates.
- An IndexedDB cache stores generated raster tiles against a source epoch,
  map-style key, tile key, and raster resolution. Source epochs expire after 30
  days, and periodic pruning keeps the raster cache within its configured byte
  budget.
- `MapTileController` owns visible tile calculation, request deduplication,
  bounded fetching, generation cancellation, SVG parsing, DOM cloning,
  mounting, detached export rendering, and optional raster replacement.
- A small React shell creates stable SVG groups, starts and disposes the
  controller when `mapEnabled` changes, publishes overview and loading state,
  and forwards style, interaction, and performance-preference changes.

## On-Demand Raster Optimization

SVG tiles remain the authoritative live representation and the fallback for every map tile. Unless the map-only performance preference disables the optimization, the controller replaces settled visible SVG tiles with raster images in the background:

- Raster work starts only after every desired tile is mounted, level switching and Redux-reported canvas dragging have stopped, and five seconds have elapsed since the latest controller activity. Wheel input explicitly extends the interaction window.
- Visible tiles are serialized one at a time with the current scoped map CSS and rendered through a reusable canvas as 4096-pixel WebP images. The work is UI-silent; newly rendered progress is written to the console and persistent-cache hits produce no progress output.
- A raster is initially hidden. Its SVG tile remains visible until the raster image has decoded, after which the SVG is hidden rather than discarded. Disabling the optimization, changing styles, changing source revision, or interrupting work restores SVG immediately and prevents stale results from being applied.
- Generated rasters are persisted in IndexedDB and reused only when source epoch, map style, tile key, and raster resolution all match. A raster image that fails to decode is stored as a `null` negative-cache entry for that exact key, so later mounts use SVG without retrying the same failed work; a new source or style key may try again. Cache and rasterizer failures degrade to live SVG tiles rather than making the map unavailable.
- Object URLs, canvas work, cache requests, and pending revisions remain controller-owned and are cleaned up or invalidated during disposal.

Raster replacement is an interactive rendering optimization only. Exports always serialize SVG map tiles.

## Export

Map-hidden export contains no geographic layer. Map-enabled SVG and PNG exports
start from the same deep canvas clone as map-hidden exports, then repopulate the
detached map layer for the visible graph export bounds:

- The live viewport and mounted map layer are not changed.
- The latest viewport selects one map level for the entire export. The controller calculates every tile intersecting the export bounds, reuses its metadata and in-memory caches, and waits for those tile requests to settle before serialization.
- Each tile failure is isolated: successful tiles remain in the export while unavailable or failed areas remain blank.
- Live raster overlays are removed from the clone and original SVG tiles are restored, preserving vector map content and scoped map-style CSS in both SVG and PNG export paths.
- Attribution from the manifest is displayed on the map canvas and retained in exports.
- Map-hidden exports remain unchanged.

The download pipeline locates the controller through the live map layer and asks it to populate only the detached export layer. This keeps export orchestration outside the controller while allowing the controller to reuse tile addressing, validation, fetching, parsing, and caches.

Before serialization:

- `.removeMe` content is removed;
- selection and interaction-only markup is removed;
- graph bounds exclude every `.removeMe` top-level element;
- an all-hidden or empty graph uses the 100-by-100 fallback.

Thus an explicitly hidden or policy-hidden element affects neither pixels nor
export dimensions.

## Existing-Code Impact

Integration changes are intentionally narrow:

- Param and save types persist `mapEnabled`, map style, and viewport.
- New/open actions set or restore map display and viewport state.
- The viewport controller gains one imperative viewport observer seam.
- The SVG wrapper adds stable map and editor groups and forwards wheel activity to the map controller.
- The app shell hides the tool panel in overview mode and uses keyed global alerts for overview guidance and map loading progress.
- Export code validates the cloned map layer, requests all tiles covering the graph bounds, restores vector tiles, and repositions attribution for the new view box.
- Settings expose a map-only switch that disables background raster replacement without disabling the SVG map.

Tile parsing, caching, scheduling, and DOM operations stay in new map-owned modules. Existing graph interaction and rendering code must not learn tile concepts.

## Error Handling

- Invalid manifest, availability, bundle index, bundle headers, tile metadata, and SVG payloads fail closed for the affected map content.
- Initialization failure leaves the map blank and surfaces the existing non-blocking global alert mechanism.
- Tile and bundle failures do not block later camera updates or future retries after cache eviction.
- Raster generation, raster decoding, and persistent-cache failures restore or retain SVG tiles and are logged without displaying a global raster-progress alert.
- A missing map layer during map export rejects the export instead of silently producing a file without a basemap.
- Disposal invalidates pending generations and prevents DOM writes after hiding the map or unmounting.

## Verification

Focused tests cover:

- old-save migration and `mapEnabled` round trips;
- new projects and map toggling without graph or viewport mutation;
- full-project replacement, undo, and redo, including graph, map display, map style, and persisted viewport restoration;
- Mixed graph/project history ordering, graph-only state preservation, and transient interaction-state reset for full-project changes.
- Coordinate conversion and visible tile selection at both levels.
- Availability and RMPB1 validation and parsing.
- LRU byte and entry limits, request deduplication, and stale generation rejection.
- Map-hidden projects issuing no map requests.
- Overview hiding editor content and the tool panel, publishing one dismissible edit hint, and zoomed scale restoring editing.
- Immediate overview removal, replaceable loading-alert progress, dismissal behavior, and failure settlement.
- Map DOM being non-interactive and below every editor element.
- Detached export rendering loading an export-only tile without changing the live mounted set.
- Export restoring vector tiles, retaining scoped map CSS and attribution, and rejecting a missing required map layer.
- Five-second raster deferral, raster serialization and style application, persistent source/style cache keys, cache reuse, style invalidation, interruption, and the disable-performance-optimization preference.
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

- Existing saves and new map-hidden projects behave as before.
- There is one persisted project shape and one New Project flow.
- The map can be shown or hidden without changing graph data or the current
  viewport.
- Full-project replacement remains undoable across map display states without carrying invalid selection or tool state across the boundary.
- Map tiles and graph elements remain aligned under pan and zoom using a configurable fixed ratio.
- Overview shows only the map, hides tools, and provides dismissible zoom-in guidance; zoomed scale shows map plus editor elements and tools.
- Switching to zoomed never keeps overview visible and immediately shows one non-blocking, dismissible loading alert with progress.
- Once the map is settled and the tracked interaction window has been idle for five seconds, optional background raster replacement runs silently and reuses source- and style-bound persistent cache entries.
- Disabling raster optimization or encountering raster/cache failures leaves the live SVG map available.
- No individual tile participates in React reconciliation.
- Existing modules receive only the minimal integration changes described above.
- Map exports load SVG tiles for the complete graph bounds without mutating the live viewport, preserve attribution and style, and isolate individual tile failures.
- Free users see and author only the permitted line combinations for the current
  context; subscribers may use all known combinations.
- Every authoring mutation boundary enforces the same centralized policy.
- Existing restricted and unknown content remains intact, with effective
  visibility derived at render time.
- Nodes are governed only by their own mandatory `visible` attribute.
- Hidden content is absent from export output and export bounds.
- Map and graph remain aligned through the existing shared viewport.
