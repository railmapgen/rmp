import { MultiDirectedGraph } from 'graphology';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../constants/constants';

/**
 * Only lines have a reconcileId will be considered.
 */
const getAllLinesNeedToReconcile = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const linesNeedToReconcile = graph.filterDirectedEdges(
        (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
            edge.startsWith('line') && attr.reconcileId !== ''
    ) as LineId[];

    const lineGroupToReconcile: { [reconcileId: string]: LineId[] } = {};
    for (const lineNeedReconcile of linesNeedToReconcile) {
        const reconcileId = graph.getEdgeAttribute(lineNeedReconcile, 'reconcileId');
        if (reconcileId in lineGroupToReconcile) lineGroupToReconcile[reconcileId].push(lineNeedReconcile);
        else lineGroupToReconcile[reconcileId] = [lineNeedReconcile];
    }

    return lineGroupToReconcile;
};

/**
 * Reconcile lines to a single path.
 *
 * It will try to find a path from one source to one target if
 * the lines are set correctly. All the lines need to implement
 * the generatePath function.
 */
const reconcileLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const lineGroupToReconcile = getAllLinesNeedToReconcile(graph);
    // console.log(lineGroupToReconcile);

    const allReconciledLines: LineId[][] = [];
    const danglingLines: LineId[] = [];
    Object.values(lineGroupToReconcile).forEach(linesNeedToReconcile => {
        // it is not possible to reconcile a single line
        if (linesNeedToReconcile.length === 1) {
            danglingLines.push(...linesNeedToReconcile);
            return;
        }

        // all the lines in linesNeedToReconcile should be the same type and style
        const type = graph.getEdgeAttribute(linesNeedToReconcile.at(0), 'type');
        if (!linesNeedToReconcile.every(line => graph.getEdgeAttribute(line, 'type') === type)) {
            danglingLines.push(...linesNeedToReconcile);
            return;
        }
        const style = graph.getEdgeAttribute(linesNeedToReconcile.at(0), 'style');
        if (!linesNeedToReconcile.every(line => graph.getEdgeAttribute(line, 'style') === style)) {
            danglingLines.push(...linesNeedToReconcile);
            return;
        }

        // find the source and target for the whole line
        const count: { [node: string]: number } = {}; // count on every nodes' occurrence
        const sources: Set<string> = new Set();
        const targets: Set<string> = new Set();
        const extremities = Object.fromEntries(
            linesNeedToReconcile.map(line => {
                const [source, target] = graph.extremities(line);
                count[source] = (count[source] ?? 0) + 1;
                count[target] = (count[target] ?? 0) + 1;
                sources.add(source);
                targets.add(target);
                return [source, [line, target] as [LineId, string]];
            })
        );

        // source need to be the node appear only once in all sources and targets
        // and there must be only one.
        const source_ = Array.from(sources).filter(s => count[s] === 1);
        const target_ = Array.from(targets).filter(t => count[t] === 1);
        // console.log(source_, target_, count);
        if (source_.length !== 1 || target_.length !== 1) {
            danglingLines.push(...linesNeedToReconcile);
            return;
        }
        const source = source_[0];
        const target = target_[0];
        if (source === target) {
            danglingLines.push(...linesNeedToReconcile);
            return;
        }

        // start from source, find each consecutive line
        const reconciledLines: LineId[] = [extremities[source][0]];
        let currentNode = extremities[source][1];
        for (let i = 1; i < linesNeedToReconcile.length; i = i + 1) {
            const currentTarget = extremities[currentNode]?.at(1);
            // console.log(currentNode, extremities[currentNode]?.at(0), currentTarget);
            if (!currentTarget) {
                danglingLines.push(...linesNeedToReconcile);
                return;
            }

            reconciledLines.push(extremities[currentNode][0]);
            currentNode = currentTarget;
        }
        // console.log(currentNode, reconciledLines);
        if (currentNode !== target || reconciledLines.length !== linesNeedToReconcile.length) {
            danglingLines.push(...linesNeedToReconcile);
            return;
        }
        allReconciledLines.push(reconciledLines);
    });

    return { allReconciledLines, danglingLines };
};

export default reconcileLines;

/**
 * Call each lines' `generatePath` and merge all the paths to a single path.
 */
export const generateReconciledPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    reconciledLines: LineId[]
) => {
    if (!reconciledLines.every(line => graph.hasEdge(line))) return undefined;

    // call each line's generatePath to generate its own path
    const paths = reconciledLines.map(line => {
        const [source, target] = graph.extremities(line);
        const sourceAttr = graph.getNodeAttributes(source);
        const targetAttr = graph.getNodeAttributes(target);
        const type = graph.getEdgeAttribute(line, 'type');
        const attr = graph.getEdgeAttribute(line, type) ?? linePaths[type].defaultAttrs;
        return (
            // @ts-ignore-error
            linePaths[type]?.generatePath(sourceAttr.x, targetAttr.x, sourceAttr.y, targetAttr.y, attr) ??
            `M ${sourceAttr.x} ${sourceAttr.y} L ${targetAttr.x} ${targetAttr.y}`
        );
    });

    // merge paths to one
    let path = `${paths[0]} `;
    for (let i = 1; i < reconciledLines.length; i = i + 1) {
        path += paths[i].replace(/M\s*-?\d+(\.\d+)?(\s*|,)-?\d+(\.*\d+)?\s*/i, '');
    }
    // console.log(reconciledLines, paths, path);

    return path as `${'m' | 'M'}${string}`;
};
