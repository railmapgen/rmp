import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';

export const getMousePosition = (e: React.MouseEvent) => {
    const bbox = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bbox.left;
    const y = e.clientY - bbox.top;
    // console.log(e.clientX, bbox.left, e.clientY, bbox.top, x, y);
    return { x, y };
};

export const calculateCanvasSize = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    let [xMin, yMin, xMax, yMax] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    graph.forEachNode((node, attr) => {
        xMin = Math.min(attr.x, xMin);
        yMin = Math.min(attr.y, yMin);
        xMax = Math.max(attr.x, xMax);
        yMax = Math.max(attr.y, yMax);
    });

    xMin -= 150;
    yMin -= 150;
    xMax += 150;
    yMax += 150;

    return { xMin, yMin, xMax, yMax };
};

