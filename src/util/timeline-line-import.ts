import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../constants/constants';
import { LineDefinition } from '../constants/line-definitions';
import { createEmptyTimelineDocument, TimelineDocument, TimelineElementEntry } from '../constants/timeline';
import { getLineRoutes, getLineTopology, isOpeningDateValid } from './line-definitions';
import { createTimelineEntry } from './timeline';

type Graph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Edge = Graph['edges'][number];

/** Ignore stale memberships while retaining the order of equally dated lines. */
export const getTimelineImportLines = (graph: Graph): LineDefinition[] => {
    const edgeIds = new Set(graph.edges.map(edge => edge.key));
    const date = (line: LineDefinition) =>
        line.openingDate && isOpeningDateValid(line.openingDate) ? line.openingDate : '\uffff';
    return (graph.attributes?.lineDefinitions ?? [])
        .map(line => ({ ...line, edgeIds: line.edgeIds.filter(id => edgeIds.has(id)) }))
        .filter(line => line.edgeIds.length > 0)
        .sort((a, b) => date(a).localeCompare(date(b)));
};

/**
 * Fill the visual track in opening order, following each saved line origin.
 * Shared stations, junctions and parallel edge bundles are entered only once.
 * Unassigned drawing elements follow the lines so the imported map is complete.
 */
export const populateTimelineFromLineInformation = (
    graph: Graph,
    document: TimelineDocument = createEmptyTimelineDocument()
): TimelineDocument => {
    const track: TimelineElementEntry[] = [];
    const added = new Set<string>();
    const nodes = new Map(graph.nodes.map(node => [node.key, node]));
    const edges = new Map(graph.edges.map((edge, index) => [edge.key!, { edge, index }]));
    const add = (id: string) => {
        if (added.has(id)) return;
        if (!nodes.has(id) && !edges.has(id)) return;
        added.add(id);
        track.push(createTimelineEntry(id as Id));
    };

    for (const line of getTimelineImportLines(graph)) {
        const lineEdges = line.edgeIds.map(id => edges.get(id)!.edge);
        const neighbours = new Map<string, Map<string, Edge[]>>();
        for (const edge of lineEdges) {
            for (const [from, to] of [
                [edge.source, edge.target],
                [edge.target, edge.source],
            ]) {
                if (!neighbours.has(from)) neighbours.set(from, new Map());
                const next = neighbours.get(from)!;
                if (!next.has(to)) next.set(to, []);
                next.get(to)!.push(edge);
            }
        }
        const ownedGraph: Graph = {
            options: graph.options,
            attributes: graph.attributes,
            nodes: [...neighbours.keys()]
                .map(id => nodes.get(id))
                .filter((node): node is Graph['nodes'][number] => !!node),
            // Route order around a loop follows the original drawing edge order.
            edges: [...lineEdges].sort((a, b) => edges.get(a.key!)!.index - edges.get(b.key!)!.index),
        };
        const topology = getLineTopology(ownedGraph, line);
        const start = neighbours.has(line.exportStartStationId)
            ? line.exportStartStationId
            : (topology.startCandidates[0] ?? neighbours.keys().next().value);
        if (!start) continue;
        add(start);

        // All terminal routes share one breadth-first tree. Keeping its drawn
        // prefix avoids repeatedly visiting a long trunk for every branch.
        const previous = new Map<string, string | undefined>([[start, undefined]]);
        if (topology.type === 'BRANCH') {
            const pending = [start];
            for (let index = 0; index < pending.length; index++) {
                for (const next of neighbours.get(pending[index])?.keys() ?? []) {
                    if (previous.has(next)) continue;
                    previous.set(next, pending[index]);
                    pending.push(next);
                }
            }
        }
        const routed = new Set([start]);
        const shortestRoute = (to: string): string[] => {
            if (!previous.has(to)) return [];
            const path = [to];
            while (!routed.has(path[path.length - 1])) path.push(previous.get(path[path.length - 1])!);
            return path.reverse();
        };
        const endpoints = topology.type === 'LOOP' ? [start] : topology.terminalIds.filter(id => id !== start);
        for (const endpoint of endpoints) {
            // A breadth-first route keeps cyclic branches bounded; enumerating
            // every simple path through a railway mesh can grow exponentially.
            const routes =
                topology.type === 'BRANCH'
                    ? [shortestRoute(endpoint)]
                    : getLineRoutes(ownedGraph, line, start, endpoint)
                          .slice(0, 1)
                          .map(route => route.nodeIds);
            for (const route of routes) {
                route.forEach((node, index) => {
                    if (index > 0) {
                        neighbours
                            .get(route[index - 1])
                            ?.get(node)
                            ?.forEach(edge => add(edge.key!));
                    }
                    add(node);
                    routed.add(node);
                });
            }
        }

        // Covers virtual-only lines, disconnected legacy memberships and branches
        // attached to a loop that are not on a station-to-terminal route.
        const visited = new Set<string>();
        const walk = (node: string) => {
            if (visited.has(node)) return;
            visited.add(node);
            add(node);
            const pending: Iterator<[string, Edge[]]>[] = [(neighbours.get(node) ?? new Map()).entries()];
            while (pending.length > 0) {
                const entry = pending[pending.length - 1].next();
                if (entry.done) {
                    pending.pop();
                    continue;
                }
                const [next, bundle] = entry.value;
                bundle.forEach(edge => add(edge.key!));
                add(next);
                if (visited.has(next)) continue;
                visited.add(next);
                pending.push((neighbours.get(next) ?? new Map()).entries());
            }
        };
        walk(start);
        for (const node of neighbours.keys()) walk(node);
    }

    for (const edge of graph.edges) {
        if (added.has(edge.key!)) continue;
        add(edge.source);
        add(edge.key!);
        add(edge.target);
    }
    graph.nodes.forEach(node => add(node.key));
    return { ...document, track };
};
