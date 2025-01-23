import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../constants/constants';
import { LinePathType, Path } from '../constants/lines';
import { checkSimplePathAvailability, reconcileSimplePathWithParallel } from './auto-simple';

/**
 * Only lines have a reconcileId will be considered.
 */
export const getAllLinesNeedToReconcile = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
) => {
    const lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] } = {};
    for (const lineEntry of graph.edgeEntries()) {
        if (lineEntry.edge.startsWith('line') && lineEntry.attributes.reconcileId !== '') {
            const reconcileId = lineEntry.attributes.reconcileId;
            if (reconcileId in lineGroupsToReconcile) lineGroupsToReconcile[reconcileId].push(lineEntry);
            else lineGroupsToReconcile[reconcileId] = [lineEntry];
        }
    }
    return lineGroupsToReconcile;
};

/**
 * Reconcile lines to a single path.
 *
 * It will try to find a path from one source to one target if the lines are set correctly.
 * All the lines need to implement the generatePath function.
 */
export const reconcileLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] }
) => {
    // console.log(lineGroupToReconcile);
    const allReconciledLines: LineId[][] = [];
    const danglingLines: LineId[] = [];
    Object.values(lineGroupsToReconcile).forEach(linesNeedToReconcile => {
        // it is not possible to reconcile a single line
        if (linesNeedToReconcile.length === 1) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }

        // all the lines in linesNeedToReconcile should be the same type and style
        const type = graph.getEdgeAttribute(linesNeedToReconcile.at(0), 'type');
        if (!linesNeedToReconcile.every(line => graph.getEdgeAttribute(line, 'type') === type)) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }
        const style = graph.getEdgeAttribute(linesNeedToReconcile.at(0), 'style');
        if (!linesNeedToReconcile.every(line => graph.getEdgeAttribute(line, 'style') === style)) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
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
                return [source, [line.edge, target] as [LineId, string]];
            })
        );

        // source need to be the node appear only once in all sources and targets
        // and there must be only one.
        const source_ = Array.from(sources).filter(s => count[s] === 1);
        const target_ = Array.from(targets).filter(t => count[t] === 1);
        // console.log(source_, target_, count);
        if (source_.length !== 1 || target_.length !== 1) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }
        const source = source_[0];
        const target = target_[0];
        if (source === target) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }

        // start from source, find each consecutive line
        const reconciledLines: LineId[] = [extremities[source][0]];
        let currentNode = extremities[source][1];
        for (let i = 1; i < linesNeedToReconcile.length; i = i + 1) {
            const currentTarget = extremities[currentNode]?.at(1);
            // console.log(currentNode, extremities[currentNode]?.at(0), currentTarget);
            if (!currentTarget) {
                danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
                return;
            }

            reconciledLines.push(extremities[currentNode][0]);
            currentNode = currentTarget;
        }
        // console.log(currentNode, reconciledLines);
        if (currentNode !== target || reconciledLines.length !== linesNeedToReconcile.length) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }
        allReconciledLines.push(reconciledLines);
    });

    return { allReconciledLines, danglingLines };
};

/**
 * Call each lines' `generatePath` and merge all the paths to a single path.
 */
export const makeReconciledPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    reconciledLines: LineId[]
): Path | undefined => {
    if (!reconciledLines.every(line => graph.hasEdge(line))) return undefined;

    // call each line's generatePath to generate its own path
    const paths = reconciledLines.map(line => {
        const [source, target] = graph.extremities(line);
        const sourceAttr = graph.getNodeAttributes(source);
        const targetAttr = graph.getNodeAttributes(target);
        const { type } = graph.getEdgeAttributes(line);
        const attr = graph.getEdgeAttribute(line, type) ?? linePaths[type].defaultAttrs;

        // TODO: disable parallel on reconciled lines, use offsetFrom to offsetTo instead
        const simplePathAvailability = checkSimplePathAvailability(
            type,
            sourceAttr.x,
            sourceAttr.y,
            targetAttr.x,
            targetAttr.y,
            attr
        );
        if (simplePathAvailability) {
            // simple path hook on matched situation
            const { x1, y1, x2, y2, offset } = simplePathAvailability;
            return linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset });
        }

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

    return path as Path;
};
