import { ICON_FULL_HEIGHT, ICON_FULL_WIDTH } from '@railmapgen/svg-assets/gzmtr';
import { contours } from 'd3-contour';
import { Path, PathPoint, makePoint } from '../../../../constants/path';
import { distanceToSegment } from '../../../../util/geometry';
import { formatNumber } from '../../../../util/number';
import { getOpenPathLength } from '../../../../util/open-path-length';
import { getOpenPathPrimitives, primitiveToBezier } from '../../../../util/open-path-primitives';
import { isOpenPath } from '../../../../util/path';

// Map units. Match the grey and white layers of the Guangzhou 2024 icon.
export const GZMTR_2024_SCALE = 0.56;
const ICON_STROKE = 2 * ICON_FULL_HEIGHT - ICON_FULL_WIDTH;
export const BAND_WIDTH = ICON_STROKE * 7 * GZMTR_2024_SCALE;
export const CHANNEL_WIDTH = ICON_STROKE * 2.6 * GZMTR_2024_SCALE;
const TRANSFER_RIM_WIDTH = (BAND_WIDTH - CHANNEL_WIDTH) / 2;
export const SMOOTHNESS = 3;
const GRID = 0.25;
const HALF_HEIGHT = ((ICON_FULL_HEIGHT - ICON_STROKE) * GZMTR_2024_SCALE) / 2;

type Ring = readonly PathPoint[];

// Marching squares samples an entire row at a time. Crossings give the sign;
// only edges within the finite blend range can change the zero contour.
function distancesOnRow(points: Ring, y: number, range: number, closed = true) {
    const segments: { start: PathPoint; end: PathPoint; left: number; right: number }[] = [];
    const crossings: number[] = [];
    for (let i = closed ? 0 : 1; i < points.length; i++) {
        const start = points[i === 0 ? points.length - 1 : i - 1];
        const end = points[i];
        if (closed && start.y > y !== end.y > y) {
            crossings.push(start.x + ((end.x - start.x) * (y - start.y)) / (end.y - start.y));
        }
        if (Math.min(start.y, end.y) - range < y && y < Math.max(start.y, end.y) + range) {
            segments.push({ start, end, left: Math.min(start.x, end.x), right: Math.max(start.x, end.x) });
        }
    }
    return (x: number) => {
        const point = makePoint(x, y);
        let distance = range;
        for (const { start, end, left, right } of segments) {
            if (x < left - distance || x > right + distance) continue;
            distance = Math.min(distance, distanceToSegment(point, start, end).distance);
        }
        let inside = false;
        for (const crossing of crossings) if (x < crossing) inside = !inside;
        return inside ? -distance : distance;
    };
}

function makeRibbon(path: Path) {
    if (!isOpenPath(path) || getOpenPathLength(path) < 1e-6) return;
    // SVG paints the original centreline at a fixed width. Sample that same curve
    // for the local distance field, including round joins and round caps.
    const points = [path.commands[0].to];
    for (const segment of getOpenPathPrimitives(path)) {
        if (segment.kind === 'line') {
            points.push(segment.end);
            continue;
        }
        const curve = primitiveToBezier(segment);
        // The linear interpolation error is bounded by max |B''| / (8 n²).
        const acceleration = Math.max(...curve.dpoints[1].map(({ x, y }) => Math.hypot(x, y)));
        points.push(...curve.getLUT(Math.max(2, Math.ceil(Math.sqrt(acceleration / (GRID / 2))))).slice(1));
    }
    const bounds = {
        left: Math.min(...points.map(p => p.x)) - BAND_WIDTH / 2,
        top: Math.min(...points.map(p => p.y)) - BAND_WIDTH / 2,
        right: Math.max(...points.map(p => p.x)) + BAND_WIDTH / 2,
        bottom: Math.max(...points.map(p => p.y)) + BAND_WIDTH / 2,
    };
    const frame = `M${bounds.left - 1} ${bounds.top - 1} H${bounds.right + 1} V${bounds.bottom + 1} H${bounds.left - 1} Z`;
    return { points, bounds, frame };
}

// Both mouths and the band use the same resolved centreline.
const ribbons = new WeakMap<Path, ReturnType<typeof makeRibbon>>();
export function transferRibbon(path: Path) {
    if (!ribbons.has(path)) ribbons.set(path, makeRibbon(path));
    return ribbons.get(path);
}

export interface TransferBadge extends PathPoint {
    foshan: boolean;
}

// Offset the eight straight sides of svg-assets' Foshan station number, including its miter joins.
function foshanRing(badge: PathPoint, padding: number): Ring {
    const w = 2 * HALF_HEIGHT,
        h = HALF_HEIGHT;
    const dx = 5 * GZMTR_2024_SCALE,
        dy = 5.625 * GZMTR_2024_SCALE;
    const bevel = Math.hypot(dx, dy);
    const topX = w - dx + (padding * (bevel - dx)) / dy;
    const sideY = h - dy + (padding * (bevel - dy)) / dx;
    return [
        [-topX, -h - padding],
        [topX, -h - padding],
        [w + padding, -sideY],
        [w + padding, sideY],
        [topX, h + padding],
        [-topX, h + padding],
        [-w - padding, sideY],
        [-w - padding, -sideY],
    ].map(([x, y]) => makePoint(badge.x + x, badge.y + y));
}

function smoothMin(a: number, b: number) {
    const u = Math.abs(a - b) / SMOOTHNESS;
    if (u >= 1) return Math.min(a, b);
    const u2 = u * u;
    return (a + b - (SMOOTHNESS * (5 + 15 * u2 - 5 * u2 * u2 + u2 * u2 * u2)) / 16) / 2;
}

function contourRings(values: number[], width: number, height: number, left: number, top: number) {
    return contours()
        .size([width, height])
        .contour(values, 0)
        .coordinates.flat()
        .map(ring => ring.slice(0, -1).map(([x, y]) => makePoint(left + (x - 0.5) * GRID, top + (y - 0.5) * GRID)));
}

// Midpoint quadratics give the sampled contour a continuous tangent, including at the closing point.
function contourPath(values: number[], width: number, height: number, left: number, top: number) {
    const midpoint = (a: PathPoint, b: PathPoint) =>
        `${formatNumber((a.x + b.x) / 2)} ${formatNumber((a.y + b.y) / 2)}`;
    const result: string[] = [];
    for (const points of contourRings(values, width, height, left, top)) {
        result.push(`M${midpoint(points[points.length - 1], points[0])}`);
        for (const [i, point] of points.entries()) {
            const end = midpoint(point, points[(i + 1) % points.length]);
            result.push(`Q${formatNumber(point.x)} ${formatNumber(point.y)} ${end}`);
        }
        result.push('Z');
    }
    return result.join(' ');
}

/** Paint only the mouth of the passage over the original station shell. */
export function transferJunction(path: Path, badges: readonly TransferBadge[], station: PathPoint, osi?: PathPoint) {
    const band = transferRibbon(path);
    const empty = { outer: '', inner: '', clip: band?.frame ?? '' };
    if (!band || !badges.length) return empty;
    const outerPad = BAND_WIDTH / 2,
        innerPad = CHANNEL_WIDTH / 2;
    // Leave a rim-width halo around both paint limits. The artificial edges where
    // marching squares closes the sampled region must stay outside the inset.
    const margin = SMOOTHNESS + 2 * TRANSFER_RIM_WIDTH + 6 * GRID;
    const reach = 2 * HALF_HEIGHT + outerPad + margin;
    // Only badges close enough to the ribbon can contribute a junction.
    const nearby = badges.filter(
        badge =>
            distancesOnRow(band.points, station.y + badge.y, reach * 1.5 + outerPad, false)(station.x + badge.x) <
            reach * 1.5 + outerPad
    );
    if (!nearby.length) return empty;
    const shapes = nearby.map(badge => ({
        badge,
        outer: badge.foshan ? foshanRing(badge, outerPad) : undefined,
        inner: badge.foshan ? foshanRing(badge, innerPad) : undefined,
    }));
    const { bounds } = band;
    const layoutMinY = Math.min(...badges.map(b => b.y));
    const layoutMaxY = Math.max(...badges.map(b => b.y));
    const layoutMidX = (Math.min(...badges.map(b => b.x)) + Math.max(...badges.map(b => b.x))) / 2;
    const centres = osi ? [...nearby, osi] : nearby;
    const left = Math.max(bounds.left - station.x - margin, Math.min(...centres.map(b => b.x)) - reach);
    const top = Math.max(bounds.top - station.y - margin, Math.min(...centres.map(b => b.y)) - reach);
    const right = Math.min(bounds.right - station.x + margin, Math.max(...centres.map(b => b.x)) + reach);
    const bottom = Math.min(bounds.bottom - station.y + margin, Math.max(...centres.map(b => b.y)) + reach);
    if (left >= right || top >= bottom) return empty;
    const width = Math.ceil((right - left) / GRID) + 1,
        height = Math.ceil((bottom - top) / GRID) + 1;
    const unionValues: number[] = [];
    const outerValues: number[] = [];
    const innerLimits: number[] = [];
    const clipValues: number[] = [];
    for (let j = 0; j < height; j++) {
        const y = top + j * GRID;
        const centreline = distancesOnRow(band.points, station.y + y, reach + outerPad, false);
        const rowShapes = shapes
            .filter(({ badge }) => Math.abs(badge.y - y) <= reach)
            .map(({ badge, outer, inner }) => ({
                badge,
                grey: outer && distancesOnRow(outer, y, reach),
                white: inner && distancesOnRow(inner, y, reach),
            }));
        for (let i = 0; i < width; i++) {
            const point = makePoint(left + i * GRID, y);
            let outer = reach,
                inner = reach;
            for (const { badge, grey, white } of rowShapes) {
                if (grey && white) {
                    outer = Math.min(outer, grey(point.x));
                    inner = Math.min(inner, white(point.x));
                } else {
                    const pill =
                        Math.hypot(Math.max(0, Math.abs(point.x - badge.x) - HALF_HEIGHT), point.y - badge.y) -
                        HALF_HEIGHT;
                    outer = Math.min(outer, pill - outerPad);
                    inner = Math.min(inner, pill - innerPad);
                }
            }
            // InterchangeStation2024 also fills the centre between the first and last row.
            if (layoutMaxY > layoutMinY) {
                const dx = Math.abs(point.x - layoutMidX) - 12 * GZMTR_2024_SCALE;
                const dy = Math.max(layoutMinY - y, y - layoutMaxY);
                const bridge = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(0, Math.max(dx, dy));
                inner = Math.min(inner, bridge);
                outer = Math.min(outer, bridge);
            }
            if (osi) {
                const d = Math.hypot(point.x - osi.x, point.y - osi.y) - (ICON_FULL_WIDTH * GZMTR_2024_SCALE) / 2.9;
                outer = Math.min(outer, d - ICON_STROKE * 1.1 * GZMTR_2024_SCALE);
                inner = Math.min(inner, d + ICON_STROKE * 1.1 * GZMTR_2024_SCALE);
            }
            // Clip the band and its hit target where the line’s post component paints the mouth.
            clipValues.push(SMOOTHNESS - outer);
            const bandOuter = centreline(station.x + point.x) - outerPad;
            const union = smoothMin(outer, bandOuter);
            unionValues.push(-union);
            // Overlap the underlying shell/body slightly to avoid antialiasing cracks.
            outerValues.push(-Math.max(union, -outer - GRID, outer - SMOOTHNESS - 3 * GRID, bandOuter - SMOOTHNESS));
            innerLimits.push(
                Math.max(
                    -inner - GRID,
                    // Extend the white past the grey patch so their antialiased ends cannot form a hairline.
                    outer - SMOOTHNESS - 6 * GRID,
                    bandOuter - SMOOTHNESS - TRANSFER_RIM_WIDTH
                )
            );
        }
    }
    // smoothMin's zero contour rounds the shoulder, but its magnitude is no
    // longer a Euclidean distance there. Measure from the fused outer boundary
    // before clipping the patch, so the white edge is its parallel curve.
    const rings = contourRings(unionValues, width, height, left, top);
    const innerValues: number[] = [];
    const range = TRANSFER_RIM_WIDTH + 2 * GRID;
    for (let j = 0; j < height; j++) {
        const row = rings.map(ring => distancesOnRow(ring, top + j * GRID, range));
        for (let i = 0; i < width; i++) {
            const index = j * width + i;
            const x = left + i * GRID;
            let distance = range;
            for (const sample of row) distance = Math.min(distance, Math.abs(sample(x)));
            const inset = (unionValues[index] > 0 ? distance : -distance) - TRANSFER_RIM_WIDTH;
            innerValues.push(Math.min(inset, -innerLimits[index]));
        }
    }
    return {
        clip: band.frame + ' ' + contourPath(clipValues, width, height, left + station.x, top + station.y),
        outer: contourPath(outerValues, width, height, left, top),
        inner: contourPath(innerValues, width, height, left, top),
    };
}
