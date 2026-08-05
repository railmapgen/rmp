import { MultiDirectedGraph } from 'graphology';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import {
    ClosedAreaPath,
    MultiSegmentOpenPathCommands,
    OpenPath,
    makeClosedAreaPathFromOpenCommands,
    makeLinearPath,
    makePoint,
} from '../constants/path';
import { reverseEdgePathAttrs } from './edge-path-attrs';
import { dropInitialMoveTo } from './path';

/**
 * Generate a closed SVG area path by concatenating the line paths along a loop.
 */
export const generateClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[],
    edges: LineId[]
): ClosedAreaPath | undefined => {
    if (nodes.length !== edges.length + 1 || nodes.length < 3) return undefined;

    type OpenMove = OpenPath['commands'][0];
    type OpenDraw = ReturnType<typeof dropInitialMoveTo>[number];
    let commands: [OpenMove, ...OpenDraw[]] | undefined;

    for (let i = 0; i < edges.length; i++) {
        const sourceNodeId = nodes[i];
        const targetNodeId = nodes[i + 1];
        const edgeId = edges[i];

        const sourceAttrs = graph.getNodeAttributes(sourceNodeId);
        const targetAttrs = graph.getNodeAttributes(targetNodeId);
        const edgeAttrs = graph.getEdgeAttributes(edgeId);
        const pathType = edgeAttrs.type;
        const initialPathAttr = edgeAttrs[pathType]!;

        const x1 = sourceAttrs.x,
            y1 = sourceAttrs.y,
            x2 = targetAttrs.x,
            y2 = targetAttrs.y;
        const finalPathAttr = structuredClone(initialPathAttr);

        if (graph.source(edgeId) !== sourceNodeId) {
            reverseEdgePathAttrs(pathType, finalPathAttr);
        }

        const segment =
            linePaths[pathType]?.generatePath(x1, x2, y1, y2, finalPathAttr as any) ||
            makeLinearPath(makePoint(x1, y1), makePoint(x2, y2));

        if (i === 0) {
            commands = [segment.commands[0], ...dropInitialMoveTo(segment)];
        } else {
            commands!.push(...dropInitialMoveTo(segment));
        }
    }

    if (!commands || commands.length < 3) return undefined;

    const closedCommands = [
        commands[0],
        commands[1]!,
        commands[2]!,
        ...commands.slice(3),
    ] as MultiSegmentOpenPathCommands;

    return makeClosedAreaPathFromOpenCommands(closedCommands);
};
