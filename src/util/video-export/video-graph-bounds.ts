import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { getOpenPathPrimitives, primitiveToBezier } from '../open-path-primitives';
import { isOpenPath } from '../path';
import { getLines } from '../process-elements';

type VideoGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
export interface VideoGraphBounds {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
}
type Rect = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;
const emptyBounds = (): VideoGraphBounds => ({ xMin: 0, yMin: 0, xMax: 100, yMax: 100 });

const lineBounds = (graph: VideoGraph) =>
    new Map<string, Rect | undefined>(
        getLines(graph, { showReconcileWarnings: false }).map(element => {
            const path = element.line?.path;
            const boxes =
                path && isOpenPath(path)
                    ? getOpenPathPrimitives(path).map(primitive => primitiveToBezier(primitive).bbox())
                    : [];
            const x = Math.min(...boxes.map(box => box.x.min)),
                y = Math.min(...boxes.map(box => box.y.min));
            const rect = boxes.length
                ? {
                      x,
                      y,
                      width: Math.max(...boxes.map(box => box.x.max)) - x,
                      height: Math.max(...boxes.map(box => box.y.max)) - y,
                  }
                : undefined;
            return [element.id, rect];
        })
    );

/** Measure the full prepared map once; animation frames only translate cached bounds. */
export const createVideoGraphBounds = (graph: VideoGraph, geometry: SVGSVGElement) => {
    const nodes = new Map<string, Rect[]>();
    const edges = new Map<string, { rects: Rect[]; source: string; target: string }>();
    const origins = new Map<string, { x: number; y: number }>();
    graph.forEachNode((id, attrs) => origins.set(id, { x: attrs.x, y: attrs.y }));
    const originalPaths = lineBounds(graph);
    const framePaths = new Map<string, ReturnType<typeof lineBounds>>();
    const host = document.createElement('div');
    host.setAttribute('data-video-bounds', '');
    Object.assign(host.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        width: '1280px',
        height: '720px',
        opacity: '0',
        pointerEvents: 'none',
    });
    const shadow = host.attachShadow({ mode: 'open' });
    const measurable = geometry.cloneNode(true) as SVGSVGElement;
    measurable.setAttribute('width', '1280');
    measurable.setAttribute('height', '720');
    shadow.append(measurable);
    document.body.append(host);
    const hasGeometry = [...graph.nodes(), ...graph.edges()].some(id => measurable.getElementById(id));
    const measure = (id: string): Rect[] => {
        const rects: Rect[] = [];
        for (const suffix of ['', '.pre', '.post']) {
            const group = measurable.getElementById(id + suffix) as SVGGraphicsElement | null;
            if (!group || group.classList.contains('removeMe')) continue;
            try {
                const { x, y, width, height } = group.getBBox();
                if ([x, y, width, height].every(Number.isFinite) && width >= 0 && height >= 0)
                    rects.push({ x, y, width, height });
            } catch {
                // A DOM implementation without SVG layout still uses graph coordinates below.
            }
        }
        return rects;
    };
    try {
        graph.forEachNode((id, attrs) => {
            if (attrs.visible === false) return;
            const group = measurable.getElementById(id);
            if (group?.classList.contains('removeMe') || (!group && hasGeometry)) return;
            const rects = measure(id);
            nodes.set(id, rects.length ? rects : [{ x: 0, y: 0, width: 0, height: 0 }]);
        });
        graph.forEachEdge((id, attrs, source, target) => {
            if (attrs.visible === false) return;
            const group = measurable.getElementById(id);
            if (group?.classList.contains('removeMe') || (!group && hasGeometry)) return;
            const rects = measure(id);
            if (rects.length) edges.set(id, { rects, source, target });
        });
    } finally {
        host.remove();
    }

    return (frameGraph: VideoGraph = graph): VideoGraphBounds => {
        let paths: ReturnType<typeof lineBounds> | undefined;
        const currentPaths = () => {
            if (paths) return paths;
            const key = JSON.stringify(
                [...frameGraph.nodeEntries()].map(({ node, attributes }) => [node, attributes.x, attributes.y])
            );
            paths = framePaths.get(key);
            if (!paths) {
                paths = lineBounds(frameGraph);
                framePaths.set(key, paths);
                if (framePaths.size > 3) framePaths.delete(framePaths.keys().next().value!);
            }
            return paths;
        };
        let xMin = Infinity,
            yMin = Infinity,
            xMax = -Infinity,
            yMax = -Infinity;
        const include = (rect: Rect, minX = 0, minY = 0, maxX = minX, maxY = minY) => {
            xMin = Math.min(xMin, rect.x + minX);
            yMin = Math.min(yMin, rect.y + minY);
            xMax = Math.max(xMax, rect.x + rect.width + maxX);
            yMax = Math.max(yMax, rect.y + rect.height + maxY);
        };
        for (const [id, rects] of nodes) {
            if (!frameGraph.hasNode(id)) continue;
            const { x, y, visible } = frameGraph.getNodeAttributes(id);
            if (visible !== false) rects.forEach(rect => include(rect, x, y));
        }
        for (const [id, { rects, source, target }] of edges) {
            if (!frameGraph.hasEdge(id) || frameGraph.getEdgeAttribute(id, 'visible') === false) continue;
            const a = frameGraph.getNodeAttributes(source),
                b = frameGraph.getNodeAttributes(target);
            const originA = origins.get(source)!,
                originB = origins.get(target)!;
            const dxA = a.x - originA.x,
                dyA = a.y - originA.y,
                dxB = b.x - originB.x,
                dyB = b.y - originB.y;
            if (dxA || dyA || dxB || dyB) {
                const before = originalPaths.get(id),
                    after = currentPaths().get(id);
                if (before && after) {
                    // Refit the current curve, retaining the prepared style's extra decorations.
                    rects.forEach(rect => {
                        const left = Math.max(0, before.x - rect.x),
                            top = Math.max(0, before.y - rect.y),
                            right = Math.max(0, rect.x + rect.width - before.x - before.width),
                            bottom = Math.max(0, rect.y + rect.height - before.y - before.height);
                        include({
                            x: after.x - left,
                            y: after.y - top,
                            width: after.width + left + right,
                            height: after.height + top + bottom,
                        });
                    });
                    continue;
                }
            }
            // Unsupported filled outlines retain a conservative bound during movement.
            rects.forEach(rect =>
                include(rect, Math.min(dxA, dxB), Math.min(dyA, dyB), Math.max(dxA, dxB), Math.max(dyA, dyB))
            );
        }
        return Number.isFinite(xMin)
            ? { xMin: xMin - 50, yMin: yMin - 50, xMax: xMax + 50, yMax: yMax + 50 }
            : emptyBounds();
    };
};
