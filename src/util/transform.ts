import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';

type TransformGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export type FlipDirection = 'vertical' | 'horizontal' | 'diagonal45' | 'diagonal135';

const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;

const getSelectedNodes = (graph: TransformGraph, selected: Set<string>): NodeId[] =>
    [...selected].filter(id => graph.hasNode(id)) as NodeId[];

const getSelectionCenter = (graph: TransformGraph, nodes: NodeId[]) => {
    const xs = nodes.map(id => graph.getNodeAttribute(id, 'x'));
    const ys = nodes.map(id => graph.getNodeAttribute(id, 'y'));

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
    };
};

const updateRotateAttribute = (graph: TransformGraph, node: NodeId, updater: (angle: number) => number) => {
    const type = graph.getNodeAttribute(node, 'type');
    const typeAttr = graph.getNodeAttribute(node, type) as Record<string, unknown> | undefined;
    if (typeAttr && typeof typeAttr.rotate === 'number') {
        const nextRotate = updater(typeAttr.rotate);
        graph.mergeNodeAttributes(node, { [type]: { ...typeAttr, rotate: normalizeAngle(nextRotate) } });
    }
};

/**
 * Rotate selected nodes around the selection center.
 * @param angleDegClockwise angle in degrees, clockwise positive
 */
export const rotateSelectedNodes = (
    graph: TransformGraph,
    selected: Set<string>,
    angleDegClockwise: number
): boolean => {
    const nodes = getSelectedNodes(graph, selected);
    if (nodes.length === 0) return false;

    const { cx, cy } = getSelectionCenter(graph, nodes);
    const rad = (-angleDegClockwise * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);

    nodes.forEach(node => {
        const x = graph.getNodeAttribute(node, 'x');
        const y = graph.getNodeAttribute(node, 'y');
        const dx = x - cx;
        const dy = y - cy;
        const newX = cx + dx * cos - dy * sin;
        const newY = cy + dx * sin + dy * cos;
        graph.mergeNodeAttributes(node, { x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) });
        updateRotateAttribute(graph, node, angle => angle + angleDegClockwise);
    });

    return true;
};

const flipRotate = (angle: number, direction: FlipDirection) => {
    switch (direction) {
        case 'vertical':
            return 180 - angle;
        case 'horizontal':
            return -angle;
        case 'diagonal45':
            return 90 - angle;
        case 'diagonal135':
            return 270 - angle;
        default:
            return angle;
    }
};

export const flipSelectedNodes = (graph: TransformGraph, selected: Set<string>, direction: FlipDirection): boolean => {
    const nodes = getSelectedNodes(graph, selected);
    if (nodes.length === 0) return false;

    const { cx, cy } = getSelectionCenter(graph, nodes);

    nodes.forEach(node => {
        const x = graph.getNodeAttribute(node, 'x');
        const y = graph.getNodeAttribute(node, 'y');

        let newX = x;
        let newY = y;

        switch (direction) {
            case 'vertical':
                newX = 2 * cx - x;
                break;
            case 'horizontal':
                newY = 2 * cy - y;
                break;
            case 'diagonal45': {
                const dx = x - cx;
                const dy = y - cy;
                newX = cx + dy;
                newY = cy + dx;
                break;
            }
            case 'diagonal135': {
                const dx = x - cx;
                const dy = y - cy;
                newX = cx - dy;
                newY = cy - dx;
                break;
            }
        }

        graph.mergeNodeAttributes(node, { x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) });
        updateRotateAttribute(graph, node, angle => flipRotate(angle, direction));
    });

    return true;
};
