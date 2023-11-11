import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';

const inRange = (x1: number, y1: number, x2: number, y2: number, xq: number, yq: number) => {
    return x1 <= xq && xq <= x2 && y1 <= yq && yq <= y2;
};

export const HandleSelectTool = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    x1: number,
    y1: number,
    x2: number,
    y2: number
) => {
    const sX = x1 <= x2 ? x1 : x2;
    const sY = y1 <= y2 ? y1 : y2;
    const eX = x1 <= x2 ? x2 : x1;
    const eY = y1 <= y2 ? y2 : y1;
    const result: string[] = [];
    graph.forEachNode(node => {
        // console.log(graph.getNodeAttributes(node));
        if (inRange(sX, sY, eX, eY, graph.getNodeAttributes(node).x, graph.getNodeAttributes(node).y)) {
            console.log(node);
            result.push(node);
        }
    });
    return result;
};
