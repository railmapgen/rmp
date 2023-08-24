import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

export const getMousePosition = (e: React.MouseEvent) => {
    const bbox = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bbox.left;
    const y = e.clientY - bbox.top;
    // console.log(e.clientX, bbox.left, e.clientY, bbox.top, x, y);
    return { x, y };
};

export const roundToNearestN = (x: number, n: number) => Math.round(x / n) * n;

/**
 * Calculate the canvas size from DOMRect of each node.
 * @param graph The graph.
 * @param svgViewBoxMin The viewport relative to each DOMRect.
 * @returns The canvas size.
 */
export const calculateCanvasSize = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    svgViewBoxMin: { x: number; y: number }
) => {
    let [xMin, yMin, xMax, yMax] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    graph.forEachNode((node, _) => {
        const nodeElm = document.getElementById(node);
        const rect = nodeElm?.getBoundingClientRect();
        if (rect) {
            xMin = Math.min(svgViewBoxMin.x + rect.x, xMin);
            yMin = Math.min(svgViewBoxMin.y + rect.y, yMin);
            xMax = Math.max(svgViewBoxMin.x + rect.x + rect.width, xMax);
            yMax = Math.max(svgViewBoxMin.y + rect.y + rect.height, yMax);
        }
    });

    xMin -= 100;
    yMin -= 100;
    xMax += 100;
    yMax += 100;

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

export const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
