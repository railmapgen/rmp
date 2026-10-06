import type { MultiDirectedGraph } from 'graphology';
import type { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType } from '../constants/lines';

export type ParallelLinePathType = Exclude<
    LinePathType,
    LinePathType.Simple | LinePathType.RayGuided | LinePathType.Freeform | LinePathType.Bezier
>;

export const supportsParallelLinePath = (type: LinePathType): type is ParallelLinePathType =>
    type !== LinePathType.Simple &&
    type !== LinePathType.RayGuided &&
    type !== LinePathType.Freeform &&
    type !== LinePathType.Bezier;

export const MAX_PARALLEL_LINES_FREE = 5;
export const MAX_PARALLEL_LINES_PRO = Infinity;

export const countParallelLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    let parallelLinesCount = 0;
    for (const lineEntry of graph.edgeEntries()) {
        if (supportsParallelLinePath(lineEntry.attributes.type) && lineEntry.attributes.parallelIndex >= 0) {
            parallelLinesCount += 1;
        }
    }
    return parallelLinesCount;
};
