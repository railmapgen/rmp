import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes, NodeType } from '../constants/constants';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/nodes';

export const getMousePosition = (e: React.MouseEvent) => {
    const bbox = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bbox.left;
    const y = e.clientY - bbox.top;
    // console.log(e.clientX, bbox.left, e.clientY, bbox.top, x, y);
    return { x, y };
};

export const roundToNearestN = (x: number, n: number) => Math.round(x / n) * n;

export const calculateCanvasSize = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    let [xMin, yMin, xMax, yMax] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    graph.forEachNode((node, attr) => {
        xMin = Math.min(attr.x, xMin);
        yMin = Math.min(attr.y, yMin);
        xMax = Math.max(attr.x, xMax);
        yMax = Math.max(attr.y, yMax);
    });

    xMin -= 100;
    yMin -= 100;
    xMax += 150;
    yMax += 150;

    return { xMin, yMin, xMax, yMax };
};

export const isMacClient = navigator.platform.startsWith('Mac');

export const findNodesExist = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const nodesExist: { [key in NodeType]: boolean } = Object.fromEntries(
        [...Object.values(StationType), Object.values(MiscNodeType)].map(type => [type, false])
    );
    graph.forEachNode(node => {
        const type = graph.getNodeAttribute(node, 'type');
        nodesExist[type] = true;
    });
    return nodesExist;
};
