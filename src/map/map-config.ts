import { map_tile_base_url } from '../constants/server';
import type { LiveViewport } from '../redux/viewport/viewport-slice';

export const MAP_TILE_SIZE = 256;

/**
 * All map levels are projected into one Web Mercator pixel space before they
 * enter the editor coordinate system. Keeping a single reference zoom avoids
 * making graph geometry depend on whichever tile level happens to be visible.
 */
export const MAP_COMMON_ZOOM = 13;

/**
 * Prefer the largest bundle containing a tile. The order is significant: it
 * reduces request count in dense areas while still allowing smaller bundles
 * around sparse dataset boundaries.
 */
export const MAP_BUNDLE_SIDES = [8, 4, 2, 1] as const;

/**
 * The editor origin expressed in the common Web Mercator pixel space.
 *
 * Together with `MAP_WORLD_PIXELS_PER_GRAPH_UNIT`, this is the contract between
 * editable graph coordinates and the independently generated map dataset.
 * Changing either value moves or rescales every map feature relative to every
 * station and line, so tile generation and existing map projects must use the
 * same values.
 */
export const MAP_WORLD_ORIGIN = {
    x: 1_756_211.5913955555,
    y: 856_904.1184932864,
} as const;

export const MAP_WORLD_PIXELS_PER_GRAPH_UNIT = 1;

/**
 * RMP viewport zoom grows when zooming out, so the detailed level is selected
 * at or below this threshold. This must stay consistent with any UI decision
 * that hides the editor layer while the map is in its overview level.
 */
export const MAP_ZOOMED_SWITCH_THRESHOLD = 200;

// The initial map view is intentionally wide enough to establish geographic context around the graph origin.
export const MAP_INITIAL_VIEWBOX_ZOOM = 390;

// One off-screen tile prevents blank edges while a pan is waiting for its next animation frame.
export const MAP_TILE_BUFFER = 1;

// Map data is fetched outside React; explicit limits keep rapid pans from exhausting network and memory resources.
export const MAP_MAX_FETCHES = 16;
export const MAP_BUNDLE_CACHE_MAX_BYTES = 64 * 1024 * 1024;
export const MAP_TILE_CACHE_MAX_BYTES = 32 * 1024 * 1024;
export const MAP_TILE_CACHE_MAX_ENTRIES = 512;

export const MAP_TILE_BASE_URL = map_tile_base_url;

/**
 * Centers graph coordinate (0, 0) in the initial viewport. Map projects use a
 * known geographic anchor, so centering the graph origin is more predictable
 * than inheriting the viewport of a diagram project.
 */
export const getMapInitialViewport = (width: number, height: number): LiveViewport => ({
    x: (-width * MAP_INITIAL_VIEWBOX_ZOOM) / 200,
    y: (-height * MAP_INITIAL_VIEWBOX_ZOOM) / 200,
    zoom: MAP_INITIAL_VIEWBOX_ZOOM,
});

/** Converts editable graph coordinates into the map dataset's stable reference space. */
export const graphToWorldPixel = (point: { x: number; y: number }) => ({
    x: point.x * MAP_WORLD_PIXELS_PER_GRAPH_UNIT + MAP_WORLD_ORIGIN.x,
    y: point.y * MAP_WORLD_PIXELS_PER_GRAPH_UNIT + MAP_WORLD_ORIGIN.y,
});

/** Inverse of `graphToWorldPixel`; keep the two formulas symmetric to avoid tile seams and drift. */
export const worldPixelToGraph = (point: { x: number; y: number }) => ({
    x: (point.x - MAP_WORLD_ORIGIN.x) / MAP_WORLD_PIXELS_PER_GRAPH_UNIT,
    y: (point.y - MAP_WORLD_ORIGIN.y) / MAP_WORLD_PIXELS_PER_GRAPH_UNIT,
});

/** Returns whether the viewport should use the detailed map level rather than the geographic overview. */
export const isMapZoomed = (viewportZoom: number) => viewportZoom <= MAP_ZOOMED_SWITCH_THRESHOLD;
