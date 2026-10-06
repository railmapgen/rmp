import { OpenPath } from '../constants/path';
import { getOpenPathPrimitives, primitiveToBezier } from '../util/open-path-primitives';
import { graphToWorldPixel, MAP_COMMON_ZOOM, MAP_TILE_SIZE, MAP_WORLD_PIXELS_PER_GRAPH_UNIT } from './map-config';

const WORLD_SIZE = MAP_TILE_SIZE * 2 ** MAP_COMMON_ZOOM;
const EARTH_RADIUS_KM = 6371.0088;

const geographicPoint = (point: { x: number; y: number }) => {
    const world = graphToWorldPixel(point);
    return {
        longitude: (world.x / WORLD_SIZE) * 2 * Math.PI - Math.PI,
        latitude: Math.atan(Math.sinh(Math.PI - (world.y / WORLD_SIZE) * 2 * Math.PI)),
    };
};

const distanceKm = (a: ReturnType<typeof geographicPoint>, b: ReturnType<typeof geographicPoint>) => {
    const haversine =
        Math.sin((b.latitude - a.latitude) / 2) ** 2 +
        Math.cos(a.latitude) * Math.cos(b.latitude) * Math.sin((b.longitude - a.longitude) / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
};

/** Sample the authored route, retaining projected arc length for forward/reverse drawing progress. */
export const createGeographicLengthProfile = (path: OpenPath) => {
    const samples = [{ projected: 0, km: 0 }];
    let projected = 0;
    let km = 0;
    for (const primitive of getOpenPathPrimitives(path)) {
        const points =
            primitive.kind === 'line'
                ? [primitive.start, primitive.end]
                : [primitive.start, primitive.c1, primitive.c2, primitive.end];
        const controlLength = points.slice(1).reduce((sum, point, index) => {
            const previous = points[index];
            return sum + Math.hypot(point.x - previous.x, point.y - previous.y);
        }, 0);
        if (!Number.isFinite(controlLength)) continue;
        // Short curves still need enough samples to follow their shape; long segments
        // also sample changing latitude instead of treating map pixels as metres.
        const count = Math.max(
            primitive.kind === 'cubic' ? 32 : 1,
            Math.ceil((controlLength * MAP_WORLD_PIXELS_PER_GRAPH_UNIT) / 64)
        );
        const curve = primitive.kind === 'cubic' ? primitiveToBezier(primitive) : undefined;
        let previous = primitive.start;
        let previousGeo = geographicPoint(previous);
        for (let index = 1; index <= count; index++) {
            const t = index / count;
            const point = curve
                ? curve.get(t)
                : {
                      x: primitive.start.x + (primitive.end.x - primitive.start.x) * t,
                      y: primitive.start.y + (primitive.end.y - primitive.start.y) * t,
                  };
            const geo = geographicPoint(point);
            projected += Math.hypot(point.x - previous.x, point.y - previous.y);
            km += distanceKm(previousGeo, geo);
            samples.push({ projected, km });
            previous = point;
            previousGeo = geo;
        }
    }
    const prefixKm = (progress: number) => {
        const target = Math.max(0, Math.min(1, progress)) * projected;
        let low = 1;
        let high = samples.length - 1;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (samples[middle].projected < target) low = middle + 1;
            else high = middle;
        }
        const a = samples[low - 1];
        const b = samples[low];
        if (!b || b.projected === a.projected) return 0;
        return a.km + ((target - a.projected) / (b.projected - a.projected)) * (b.km - a.km);
    };
    return {
        totalKm: km,
        lengthAt: (progress = 1, reverse = false) => (reverse ? km - prefixKm(1 - progress) : prefixKm(progress)),
    };
};
