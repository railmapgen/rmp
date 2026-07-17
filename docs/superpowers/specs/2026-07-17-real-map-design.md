# Real Map Project Design

## Problem

Rail Map Painter needs an opt-in project kind that keeps the existing editor and graph model but places a mandatory geographic map below every canvas element. Existing projects must retain their current behavior. Map projects must use the existing pan and zoom interaction, keep diagram elements geographically aligned with the map, and avoid React reconciliation for individual map tiles.

## Project Model

- Add `type: 'diagram' | 'map'` to `ParamState` and `RMPSave`.
- Bump the save version and migrate every older save to `type: 'diagram'`.
- The existing New Project action creates a diagram project.
- Add New Map Project immediately beside it. It clears the graph, sets `type: 'map'`, and applies configurable Shanghai-centered initial viewport values.
- Loading a save restores its type. Diagram projects do not initialize the map loader or issue tile requests.
- A map project always has the map enabled. The map cannot be selected or disabled.

### Project Replacement And Undo History

- Graph edits continue to use `saveGraph` and retain the existing graph-only undo history.
- New projects and full-project imports use a dedicated `replaceGraph` action. It replaces `present` and clears both `past` and `future` instead of making the previous project undoable.
- Changing the project type invalidates `past` and `future` immediately. Undo history must never cross the `diagram`/`map` boundary.
- File imports and Gallery imports restore the saved project type and replace the graph without retaining history from the previous project.
- AARC import remains a diagram-producing full replacement. It explicitly sets `type: 'diagram'` and replaces the graph with cleared history.

## Coordinate System

Map projects continue to store ordinary graph node `x` and `y` coordinates. No latitude, longitude, map center, or per-project geographic anchor is added.

The fixed mapping is:

```text
graphPoint = (webMercatorZ13WorldPixel - MAP_WORLD_ORIGIN) / MAP_WORLD_PIXELS_PER_GRAPH_UNIT
```

The inverse maps the current RMP viewport to visible z7 or z13 tiles. `MAP_WORLD_ORIGIN`, `MAP_WORLD_PIXELS_PER_GRAPH_UNIT`, the Shanghai initial center and zoom, and the overview/detail switch threshold are centralized configuration values so they can be tuned without changing loader code.

The effective map zoom is derived from the existing RMP canvas scale (`100 / svgViewBoxZoom`) and the fixed coordinate ratio. The product-level overview/detail threshold remains a separate constant.

## Canvas Integration

The existing transformed SVG world group remains the single camera:

```text
viewport group
  map layer group
  editor layer group
    grid and interaction overlays
    graph canvas
    selection UI
```

The map group is the first child, has `pointer-events: none`, and is never selectable. The existing canvas children move under a stable editor group. The existing viewport controller continues to update the parent group transform imperatively, so the map and graph share the same pan and zoom transform without a second camera.

The map controller receives the latest viewport whenever the existing viewport controller previews or commits it. These notifications are imperative and are coalesced with `requestAnimationFrame`; they do not publish high-frequency map state through Redux.

At overview scale, the editor group is hidden, leaving only the map. At the configured threshold, the editor group is shown immediately. Tools are not disabled; users are assumed not to edit at overview scale.

## Tile Runtime

The new map implementation is split into framework-independent modules:

- Configuration contains the CDN base URL, coordinate constants, initial viewport, switch threshold, cache budgets, and fetch concurrency.
- Pure binary utilities validate and parse the availability bitmap and RMPB1 bundles.
- A byte-aware LRU caches parsed bundles and imported SVG tile templates.
- `MapTileController` owns visible tile calculation, request deduplication, bounded fetching, generation cancellation, SVG parsing, DOM cloning, and mounting.
- A small React shell creates stable SVG groups, starts and disposes the controller for map projects, and renders the non-interactive loading status.

The controller loads `manifest.json` from a configured independent CDN. Availability files, bundle indexes, and bundle URLs are resolved relative to the manifest URL. The CDN must allow cross-origin JSON and binary fetches from RMP deployments.

The existing demo behavior is retained where useful: manifest validation, availability checks, bundle address validation, in-flight request sharing, byte-bounded caches, `DOMParser`, cached templates, `cloneNode`, and batched `DocumentFragment` mounting. Tile nodes are never represented as React children.

## Level Switching

- The two data levels are overview z7 and zoomed z13.
- Crossing from overview to zoomed immediately removes or hides overview; no enlarged overview tiles remain visible during the transition.
- The editor group becomes visible as soon as the viewport crosses the zoomed threshold, independent of network completion.
- A small `pointer-events: none` loading status appears when a level switch starts and disappears when all target-level tiles required by the current viewport are settled.
- No blocking overlay is shown, and camera or editor input is not intercepted.
- Ordinary panning within the same level does not show the global switching status.
- A generation token prevents requests from a superseded viewport or level from mounting stale tiles.
- Failed bundles are treated as settled so loading cannot remain stuck. Failed areas stay blank, errors are logged, and one non-blocking partial-load notification may be emitted.

Because outgoing levels are not displayed during a transition, the production controller uses one visible level container rather than the demo's double-slot handoff.

## Export

Map SVG and PNG exports use the current canvas DOM as a snapshot:

- Already mounted map tiles are included.
- Tiles that are pending, unavailable, or failed remain blank.
- Export does not wait for map loading, disable actions, or show an export-specific message.
- Attribution from the manifest is displayed on the map canvas and retained in exports.
- Diagram exports remain unchanged.

The map controller has no dependency on the export implementation.

## Existing-Code Impact

Integration changes are intentionally narrow:

- Param and save types gain the project type plus one migration.
- New/open actions set or restore the project type and viewport.
- The viewport controller gains one imperative viewport observer seam.
- The SVG wrapper adds stable map and editor groups plus the loading status.
- Export code changes only if required to retain the map group or attribution in the existing DOM clone.

Tile parsing, caching, scheduling, and DOM operations stay in new map-owned modules. Existing graph interaction and rendering code must not learn tile concepts.

## Error Handling

- Invalid manifest, availability, bundle index, bundle headers, tile metadata, and SVG payloads fail closed for the affected map content.
- Initialization failure leaves the map blank and surfaces the existing non-blocking global alert mechanism.
- Tile and bundle failures do not block later camera updates or future retries after cache eviction.
- Disposal invalidates pending generations and prevents DOM writes after switching to a diagram project or unmounting.

## Verification

Focused tests cover:

- Old-save migration to diagram and round trips for both project types.
- New diagram and new map project actions, including map initial viewport values.
- Coordinate conversion and visible tile selection at both levels.
- Availability and RMPB1 validation and parsing.
- LRU byte and entry limits, request deduplication, and stale generation rejection.
- Diagram projects issuing no map requests.
- Overview hiding all editor content and zoomed scale showing it.
- Immediate overview removal, loading status settlement, and failure settlement.
- Map DOM being non-interactive and below every editor element.
- Export snapshots containing mounted map content and attribution without waiting for pending requests.

Before completion, the repository gate must pass:

```text
npx tsc --noEmit
npm run lint
npm test
```

## Acceptance Criteria

- Existing saves and new diagram projects behave as before.
- A new map project opens centered on configurable Shanghai defaults and always shows the CDN-backed map.
- Map tiles and graph elements remain aligned under pan and zoom using a configurable fixed ratio.
- Overview shows only the map; zoomed scale shows map plus editor elements.
- Switching to zoomed never keeps overview visible and immediately shows a non-blocking loading status.
- No individual tile participates in React reconciliation.
- Existing modules receive only the minimal integration changes described above.
- Exports reflect exactly the map content mounted at export time.
