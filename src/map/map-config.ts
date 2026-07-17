import { map_tile_base_url } from '../constants/server';
import type { LiveViewport } from '../redux/viewport/viewport-slice';

export const MAP_TILE_SIZE = 256;
export const MAP_COMMON_ZOOM = 13;
export const MAP_BUNDLE_SIDES = [8, 4, 2, 1] as const;

export const MAP_WORLD_ORIGIN = {
    x: 1_756_211.5913955555,
    y: 856_904.1184932864,
} as const;

export const MAP_WORLD_PIXELS_PER_GRAPH_UNIT = 1;
export const MAP_ZOOMED_SWITCH_THRESHOLD = 200;
export const MAP_INITIAL_VIEWBOX_ZOOM = 390;
export const MAP_TILE_BUFFER = 1;
export const MAP_MAX_FETCHES = 16;
export const MAP_BUNDLE_CACHE_MAX_BYTES = 64 * 1024 * 1024;
export const MAP_TILE_CACHE_MAX_BYTES = 32 * 1024 * 1024;
export const MAP_TILE_CACHE_MAX_ENTRIES = 512;

export const MAP_TILE_BASE_URL = map_tile_base_url;

export const getMapInitialViewport = (width: number, height: number): LiveViewport => ({
    x: (-width * MAP_INITIAL_VIEWBOX_ZOOM) / 200,
    y: (-height * MAP_INITIAL_VIEWBOX_ZOOM) / 200,
    zoom: MAP_INITIAL_VIEWBOX_ZOOM,
});

export const graphToWorldPixel = (point: { x: number; y: number }) => ({
    x: point.x * MAP_WORLD_PIXELS_PER_GRAPH_UNIT + MAP_WORLD_ORIGIN.x,
    y: point.y * MAP_WORLD_PIXELS_PER_GRAPH_UNIT + MAP_WORLD_ORIGIN.y,
});

export const worldPixelToGraph = (point: { x: number; y: number }) => ({
    x: (point.x - MAP_WORLD_ORIGIN.x) / MAP_WORLD_PIXELS_PER_GRAPH_UNIT,
    y: (point.y - MAP_WORLD_ORIGIN.y) / MAP_WORLD_PIXELS_PER_GRAPH_UNIT,
});

export const isMapZoomed = (viewportZoom: number) => viewportZoom <= MAP_ZOOMED_SWITCH_THRESHOLD;
