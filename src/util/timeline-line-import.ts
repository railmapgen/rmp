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
    const nodes = new Set(graph.nodes.map(node => node.key));
    const edges = new Map(graph.edges.map(edge => [edge.key!, edge]));
    const add = (id: string) => {
        if (added.has(id)) return;
        if (!nodes.has(id) && !edges.has(id)) return;
        added.add(id);
        track.push(createTimelineEntry(id as Id));
    };

    for (const line of getTimelineImportLines(graph)) {
        const lineEdges = line.edgeIds.map(id => edges.get(id)!);
        const neighbours = new Map<string, Map<string, Edge[]>>();
        for (const edge of lineEdges) {
            for (const [from, to] of [
                [edge.source, edge.target],
                [edge.target, edge.source],
            ]) {
                if (!neighbours.has(from)) neighbours.set(from, new Map());
                const next = neighbours.get(from)!;
                next.set(to, [...(next.get(to) ?? []), edge]);
            }
        }
        const topology = getLineTopology(graph, line);
        const start = neighbours.has(line.exportStartStationId)
            ? line.exportStartStationId
            : (topology.startCandidates[0] ?? neighbours.keys().next().value);
        if (!start) continue;
        add(start);

        const shortestRoute = (to: string): string[] => {
            const previous = new Map<string, string | undefined>([[start, undefined]]);
            const pending = [start];
            for (let index = 0; index < pending.length; index++) {
                const node = pending[index];
                if (node === to) break;
                for (const next of neighbours.get(node)?.keys() ?? []) {
                    if (previous.has(next)) continue;
                    previous.set(next, node);
                    pending.push(next);
                }
            }
            if (!previous.has(to)) return [];
            const path = [to];
            while (path[0] !== start) path.unshift(previous.get(path[0])!);
            return path;
        };
        const endpoints = topology.type === 'LOOP' ? [start] : topology.terminalIds.filter(id => id !== start);
        for (const endpoint of endpoints) {
            // A breadth-first route keeps cyclic branches bounded; enumerating
            // every simple path through a railway mesh can grow exponentially.
            const routes =
                topology.type === 'BRANCH'
                    ? [shortestRoute(endpoint)]
                    : getLineRoutes(graph, line, start, endpoint)
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
            for (const [next, bundle] of neighbours.get(node) ?? []) {
                bundle.forEach(edge => add(edge.key!));
                add(next);
                walk(next);
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
