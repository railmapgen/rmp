import { MultiDirectedGraph } from 'graphology';
import { SnapLine, SnapPoint } from '../constants/canvas';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { PathPoint } from '../constants/path';
import { getViewpointSize } from '../util/helpers';
import { getNearestSnapLine, getNearestSnapPoints, getSnapLineDistance, makeSnapLinesPath } from '../util/snap-lines';
import SnapPointGuideLines from './snap-point-guide-lines';
import { linePaths } from './svgs/lines/lines';

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

interface NodeSnapGuidesProps {
    activeSnapLines: SnapLine[];
    activeSnapPoint?: SnapPoint;
    viewport: { x: number; y: number; zoom: number };
    width: number;
    height: number;
}

const NodeSnapGuides = ({ activeSnapLines, activeSnapPoint, viewport, width, height }: NodeSnapGuidesProps) => (
    <>
        {activeSnapLines.map(line => (
            <path
                key={`snap_line_${line.a}_${line.b}_${line.c}_${line.node}`}
                d={
                    linePaths[LinePathType.Simple].generatePath(
                        ...makeSnapLinesPath(line, getViewpointSize(viewport, viewport.zoom, width, height)),
                        linePaths[LinePathType.Simple].defaultAttrs
                    ).d
                }
                stroke="cyan"
                strokeWidth={viewport.zoom / 75}
            />
        ))}
        {activeSnapPoint && <SnapPointGuideLines activeSnapPoint={activeSnapPoint} />}
    </>
);

export default NodeSnapGuides;
