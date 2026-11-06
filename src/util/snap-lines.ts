import { MultiDirectedGraph } from 'graphology';
import { SnapLine, SnapPoint } from '../constants/canvas';
import { EdgeAttributes, GraphAttributes, MiscNodeId, NodeAttributes, NodeId, StnId } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { PathPoint } from '../constants/path';
import { getViewpointSize } from './helpers';

/**
 * Supported: station, virtual node, master node (station only)
 */
export const isNodeSupportSnapLine = (
    node: NodeId,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): boolean =>
    node.startsWith('stn') ||
    (node.startsWith('misc_node') && graph.getNodeAttribute(node, 'type') === MiscNodeType.Virtual) ||
    (node.startsWith('misc_node') &&
        graph.getNodeAttribute(node, 'type') === MiscNodeType.Master &&
        graph.getNodeAttributes(node)[MiscNodeType.Master]!.nodeType === 'Station');

/**
 * Get snap lines in the range of nodes
 */
export const getSnapLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[]
): SnapLine[] => {
    const snapLines: SnapLine[] = [];
    nodes
        .filter(node => isNodeSupportSnapLine(node as NodeId, graph))
        .forEach(node => {
            const x = graph.getNodeAttribute(node, 'x');
            const y = graph.getNodeAttribute(node, 'y');
            snapLines.push({ a: 1, b: 0, c: -x, node, x, y });
            snapLines.push({ a: 0, b: 1, c: -y, node, x, y });
            snapLines.push({ a: 1, b: -1, c: -x + y, node, x, y });
            snapLines.push({ a: 1, b: 1, c: -x - y, node, x, y });
        });
    return snapLines;
};

export const getSnapLineDistance = (line: SnapLine, x: number, y: number): number => {
    return Math.abs(line.a * x + line.b * y + line.c) / Math.sqrt(line.a ** 2 + line.b ** 2);
};

/**
 * Find the nearest snap line to the point (x, y) in the snap lines.
 * The nearest snap line is the one which minimizes the sum of lineDis and pointDis.
 * - lineDis: the distance from the point (x, y) to the snap line.
 * - pointDis: the distance from the point (x, y) to the node of the snap line (l.node).
 */
export const getNearestSnapLine = (
    x: number,
    y: number,
    snapLines: SnapLine[],
    nodes: NodeId[]
): { l: SnapLine; d: number } => {
    let minDistance = Infinity,
        minLine = { a: 0, b: 0, c: 0, node: 'stn_null', x: 0, y: 0 } as SnapLine;
    snapLines
        .filter(l => nodes.includes(l.node))
        .forEach(line => {
            const lineDis = getSnapLineDistance(line, x, y);
            if (lineDis < minDistance) {
                minDistance = lineDis;
                minLine = line;
            }
        });
    return { l: minLine, d: minDistance };
};

/**
 * Find nearest snap point to the point (x, y) in an active snap line.
 * Time complexity: O(n^2)           n is the number of nodes on the active snap line
 *
 * Snap points (S) contain:
 * - the mid point of A and B        A---S---B
 * - Doubling points of A and B      A---B---S and S---A---B
 * (A and B are two nodes in the active snap line)
 */
export const getNearestSnapPoints = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: (MiscNodeId | StnId)[],
    x: number,
    y: number,
    activeSnapLine: SnapLine
): { snapPoint: SnapPoint; distance: number } => {
    const nodesInLine = nodes.filter(node => {
        const nodeX = graph.getNodeAttribute(node, 'x');
        const nodeY = graph.getNodeAttribute(node, 'y');
        return Math.abs(activeSnapLine.a * nodeX + activeSnapLine.b * nodeY + activeSnapLine.c) <= 0.01;
    });

    // functions to calculate snap point coordinate
    const funcs = [
        (x1: number, y1: number, x2: number, y2: number) => [(x1 + x2) / 2, (y1 + y2) / 2],
        (x1: number, y1: number, x2: number, y2: number) => [2 * x1 - x2, 2 * y1 - y2],
        (x1: number, y1: number, x2: number, y2: number) => [2 * x2 - x1, 2 * y2 - y1],
    ];

    let minDistance: number = Infinity;
    let minPoint: SnapPoint = {
        x: 0,
        y: 0,
        originalNodesPos: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ],
    };
    for (let i = 0; i < nodesInLine.length; i++) {
        const n1 = nodesInLine[i];
        const n1x = graph.getNodeAttribute(n1, 'x');
        const n1y = graph.getNodeAttribute(n1, 'y');
        for (let j = i + 1; j < nodesInLine.length; j++) {
            const n2 = nodesInLine[j];
            const n2x = graph.getNodeAttribute(n2, 'x');
            const n2y = graph.getNodeAttribute(n2, 'y');
            funcs.forEach(func => {
                const [px, py] = func(n1x, n1y, n2x, n2y);
                const distance = Math.hypot(x - px, y - py);
                if (distance < minDistance) {
                    minDistance = distance;
                    minPoint = {
                        x: px,
                        y: py,
                        originalNodesPos: [
                            { x: n1x, y: n1y },
                            { x: n2x, y: n2y },
                        ],
                    };
                }
            });
        }
    }
    return { snapPoint: minPoint, distance: minDistance };
};

/** Resolve a dragged node against nearby guide lines and points without mutating its active guides. */
export const getSnappedNodePosition = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    position: PathPoint,
    snapLines: SnapLine[],
    nodes: NodeId[],
    activeSnapLines: SnapLine[],
    activeSnapPoint?: SnapPoint
): PathPoint & { activeSnapLines: SnapLine[]; activeSnapPoint: SnapPoint | undefined } => {
    const { x: toX, y: toY } = position;
    let newX = toX;
    let newY = toY;
    // Previous move operation may have active guides. Keep the caller's state immutable.
    let nowSnapLines = [...activeSnapLines];
    let nowSnapPoint = activeSnapPoint;

    // Check if the cursor left the guide and remove it from the active guides.
    if (nowSnapLines.length !== 0) {
        nowSnapLines = nowSnapLines.filter(l => getSnapLineDistance(l, toX, toY) <= 6);
    }

    // Check if the current snap point should be removed.
    if (nowSnapPoint) {
        if (nowSnapLines.length === 0) {
            nowSnapPoint = undefined;
        } else if (Math.hypot(toX - nowSnapPoint.x, toY - nowSnapPoint.y) > 6) {
            nowSnapPoint = undefined;
        }
    }

    // When only one guide is active, offer a nearby midpoint or doubling point.
    if (!nowSnapPoint && nowSnapLines.length === 1) {
        const snapLine = nowSnapLines[0];
        const { snapPoint, distance } = getNearestSnapPoints(graph, nodes, toX, toY, snapLine);
        if (distance <= 3) {
            nowSnapPoint = snapPoint;
        }
    }

    // Find the nearest guide to the cursor and add it to the active guides.
    if ((nowSnapLines.length === 1 && !nowSnapPoint) || nowSnapLines.length === 0) {
        const { l, d } = getNearestSnapLine(
            toX,
            toY,
            snapLines,
            nodes.filter(node => !nowSnapLines.some(ap => ap.node === node))
        );
        // Two parallel lines cannot intersect at a point.
        const flag = nowSnapLines.length === 0 || !nowSnapLines.some(ap => ap.a === l.a && ap.b === l.b);
        if (d < 3 && nowSnapLines.length < 2 && flag) {
            nowSnapLines.push(l);
        }
    }

    // Calculate the final position based on the active guides.
    if (nowSnapLines.length === 1) {
        if (nowSnapPoint) {
            newX = nowSnapPoint.x;
            newY = nowSnapPoint.y;
        } else {
            const l = nowSnapLines[0];
            if (l.a == 0) {
                newY = -l.c / l.b;
            } else if (l.b == 0) {
                newX = -l.c / l.a;
            } else {
                const k = -l.a / l.b;
                const b = -l.c / l.b;
                newY = k * newX + b;
            }
        }
    } else if (nowSnapLines.length === 2) {
        const l1 = nowSnapLines[0];
        const l2 = nowSnapLines[1];
        const determinant = l1.a * l2.b - l2.a * l1.b;
        if (determinant !== 0) {
            newX = -(l1.c * l2.b - l2.c * l1.b) / determinant;
            newY = -(l1.a * l2.c - l2.a * l1.c) / determinant;
        }
    }

    return { x: newX, y: newY, activeSnapLines: nowSnapLines, activeSnapPoint: nowSnapPoint };
};

export const makeSnapLinesPath = (
    p: SnapLine,
    viewpointSize: ReturnType<typeof getViewpointSize>
): [number, number, number, number] => {
    const { xMin, yMin, xMax, yMax } = viewpointSize;
    if (p.a === 0) {
        return [xMin, xMax, -p.c / p.b, -p.c / p.b];
    } else if (p.b === 0) {
        return [-p.c / p.a, -p.c / p.a, yMin, yMax];
    } else {
        const k = -p.a / p.b;
        const b = -p.c / p.b;
        return [xMin, xMax, k * xMin + b, k * xMax + b];
    }
};
