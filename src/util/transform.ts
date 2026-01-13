import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';

type TransformGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export type FlipDirection = 'vertical' | 'horizontal' | 'diagonal45' | 'diagonal135';

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
    });

    return true;
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
    });

    return true;
};
