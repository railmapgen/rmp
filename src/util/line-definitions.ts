import { SerializedGraph } from 'graphology-types';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LineDefinition } from '../constants/line-definitions';
import i18n from '../i18n/config';

type Graph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Edge = Graph['edges'][number];
type Adjacency = Map<string, Map<string, string[]>>;

export const emptyLineDefinition = (edgeIds: string[]): LineDefinition => ({
    id: nanoid(10),
    edgeIds,
    name: ['', ''],
    lineNumber: '',
    openingDate: '',
    operator: '',
    status: 'operating',
    notes: '',
    exportStartStationId: '',
});

/** Matches the single-theme styles used by the RMG converter without importing React registries. */
export const getLineTheme = (edge: Edge | undefined): Theme | undefined => {
    if (!edge) return undefined;
    const attrs = edge.attributes;
    const color = (attrs?.[attrs.style] as { color?: Theme } | undefined)?.color;
    if (edge.key?.startsWith('line_') && edge.source !== edge.target && Array.isArray(color) && color.length === 4)
        return color;
};

const themeKey = (edge: Edge) => JSON.stringify(getLineTheme(edge));
const station = (id: string) => id.startsWith('stn_');

const adjacency = (edges: Edge[]): Adjacency => {
    const result: Adjacency = new Map();
    for (const edge of edges) {
        for (const [a, b] of [
            [edge.source, edge.target],
            [edge.target, edge.source],
        ]) {
            if (!result.has(a)) result.set(a, new Map());
            const neighbours = result.get(a)!;
            neighbours.set(b, [...(neighbours.get(b) ?? []), edge.key!]);
        }
    }
    return result;
};

/** Connectivity includes virtual nodes, and parallel edges stay in the same component. */
export const lineEdgeComponents = (edges: Edge[]): string[][] => {
    const adj = adjacency(edges);
    const visited = new Set<string>();
    const result: string[][] = [];
    for (const start of adj.keys()) {
        if (visited.has(start)) continue;
        const pending = [start];
        const ids = new Set<string>();
        while (pending.length) {
            const node = pending.pop()!;
            if (visited.has(node)) continue;
            visited.add(node);
            for (const [next, bundle] of adj.get(node) ?? []) {
                bundle.forEach(id => ids.add(id));
                pending.push(next);
            }
        }
        result.push([...ids].sort());
    }
    return result;
};

const themedComponents = (edges: Edge[]) => {
    const groups = new Map<string, Edge[]>();
    for (const edge of edges) {
        const key = themeKey(edge);
        groups.set(key, [...(groups.get(key) ?? []), edge]);
    }
    return [...groups.values()].flatMap(lineEdgeComponents);
};

export interface LineTopology {
    theme: Theme;
    stationIds: string[];
    terminalIds: string[];
    startCandidates: string[];
    branchStations: Set<string>;
    type: 'LINE' | 'BRANCH' | 'LOOP';
}

export const getLineTopology = (graph: Graph, line: LineDefinition): LineTopology => {
    const owned = new Set(line.edgeIds);
    const edges = graph.edges.filter(edge => owned.has(edge.key!));
    const adj = adjacency(edges);
    const nodes = new Map(graph.nodes.map(node => [node.key, node.attributes]));
    const compare = (a: string, b: string) => {
        const aa = nodes.get(a),
            bb = nodes.get(b);
        return (aa?.x ?? 0) - (bb?.x ?? 0) || (aa?.y ?? 0) - (bb?.y ?? 0) || a.localeCompare(b);
    };
    const stationIds = [...adj.keys()].filter(station).sort(compare);
    const terminals = new Set<string>();
    const branchStations = new Set<string>();
    const nearestStations = (start: string) => {
        const found = new Set<string>();
        const visited = new Set<string>();
        const pending = [start];
        while (pending.length) {
            const node = pending.pop()!;
            if (visited.has(node)) continue;
            visited.add(node);
            if (station(node)) found.add(node);
            else for (const next of adj.get(node)?.keys() ?? []) pending.push(next);
        }
        return found;
    };
    let branching = false;
    let cycle = adj.size > 0;
    for (const [node, neighbours] of adj) {
        cycle &&= neighbours.size === 2;
        if (neighbours.size === 1) nearestStations(node).forEach(id => terminals.add(id));
        if (neighbours.size > 2) {
            branching = true;
            nearestStations(node).forEach(id => branchStations.add(id));
        }
    }
    const terminalIds = [...terminals].sort(compare);
    return {
        theme: getLineTheme(edges[0])!,
        stationIds,
        terminalIds,
        startCandidates: cycle || terminalIds.length === 0 ? stationIds : terminalIds,
        branchStations,
        type: branching ? 'BRANCH' : cycle ? 'LOOP' : 'LINE',
    };
};

/** Repairs ownership at the commit boundary. Existing definitions never merge with each other. */
export const reconcileLineDefinitions = (graph: Graph): Graph => {
    const edges = graph.edges.filter(edge => getLineTheme(edge));
    const available = new Map(edges.map(edge => [edge.key!, edge]));
    const unassigned = new Set((graph.attributes?.unassignedLineEdgeIds ?? []).filter(id => available.has(id)));
    const claimed = new Set<string>();
    const definitions: LineDefinition[] = [];
    const original = graph.attributes?.lineDefinitions ?? [];
    for (const line of original) {
        const valid = line.edgeIds.filter(id => available.has(id) && !claimed.has(id) && !unassigned.has(id));
        const components = themedComponents(valid.map(id => available.get(id)!));
        components.sort((a, b) => {
            const hasStart = (ids: string[]) =>
                ids.some(id => {
                    const edge = available.get(id)!;
                    return edge.source === line.exportStartStationId || edge.target === line.exportStartStationId;
                });
            return Number(hasStart(b)) - Number(hasStart(a)) || b.length - a.length || a[0].localeCompare(b[0]);
        });
        components.forEach((edgeIds, index) => {
            edgeIds.forEach(id => claimed.add(id));
            definitions.push(
                index === 0 ? { ...line, edgeIds, status: line.status || 'operating' } : emptyLineDefinition(edgeIds)
            );
        });
    }
    for (const ids of themedComponents(edges.filter(edge => !claimed.has(edge.key!) && !unassigned.has(edge.key!)))) {
        const newEdges = ids.map(id => available.get(id)!);
        const nodes = new Set(newEdges.flatMap(edge => [edge.source, edge.target]));
        const touching = definitions.filter(line =>
            line.edgeIds.some(id => {
                const edge = available.get(id)!;
                return themeKey(edge) === themeKey(newEdges[0]) && (nodes.has(edge.source) || nodes.has(edge.target));
            })
        );
        if (touching.length === 1) touching[0].edgeIds = [...touching[0].edgeIds, ...ids].sort();
        else definitions.push(emptyLineDefinition(ids));
    }
    for (const line of definitions) {
        const candidates = getLineTopology(graph, line).startCandidates;
        if (!candidates.includes(line.exportStartStationId)) line.exportStartStationId = candidates[0] ?? '';
    }
    if (definitions.length === 0 && !graph.attributes?.lineDefinitions && !graph.attributes?.unassignedLineEdgeIds)
        return graph;
    return {
        ...graph,
        attributes: {
            ...graph.attributes,
            lineDefinitions: definitions,
            ...(graph.attributes?.unassignedLineEdgeIds ? { unassignedLineEdgeIds: [...unassigned].sort() } : {}),
        },
    };
};

/** Temporary display records for removed sections. They are never exported as railway lines. */
export const getUnassignedLineSections = (graph: Graph): LineDefinition[] => {
    const unassigned = new Set(graph.attributes?.unassignedLineEdgeIds ?? []);
    return themedComponents(graph.edges.filter(edge => unassigned.has(edge.key!) && getLineTheme(edge))).map(
        edgeIds => {
            const line = { ...emptyLineDefinition(edgeIds), id: `unassigned:${edgeIds[0]}` };
            line.exportStartStationId = getLineTopology(graph, line).startCandidates[0] ?? '';
            return line;
        }
    );
};

export const getStationLabel = (graph: Graph, id: string): string => {
    const attrs = graph.nodes.find(node => node.key === id)?.attributes;
    const names = (attrs?.[attrs.type] as { names?: string[] } | undefined)?.names;
    return (
        names?.find(name => name.trim())?.replaceAll('\n', ' ') ?? (id ? i18n.t('header.lineInfo.unnamedStation') : '—')
    );
};

export const getLineEndpointsLabel = (graph: Graph, line: LineDefinition): string => {
    const topology = getLineTopology(graph, line);
    const start = line.exportStartStationId;
    const ends = topology.type === 'LOOP' ? [start] : topology.terminalIds.filter(id => id !== start);
    return `${getStationLabel(graph, start)} — ${ends.map(id => getStationLabel(graph, id)).join(' / ')}`;
};

export interface LineRoute {
    key: string;
    /** Ordered topology nodes, including virtual junctions, along this path. */
    nodeIds: string[];
    stationIds: string[];
    /** Physical edges between successive real stations, including virtual connectors and parallel bundles. */
    segments: string[][];
}

/** Enumerates simple paths for an explicitly chosen pair, or both directions around a simple loop. */
export const getLineRoutes = (graph: Graph, line: LineDefinition, from: string, to: string): LineRoute[] => {
    const owned = new Set(line.edgeIds);
    const adj = adjacency(graph.edges.filter(edge => owned.has(edge.key!)));
    const routes: LineRoute[] = [];
    const walk = (node: string, path: string[], bundles: string[][]) => {
        if (node === to && path.length > 1) {
            const stationIds: string[] = [];
            const segments: string[][] = [];
            let segment: string[] = [];
            path.forEach((id, index) => {
                if (index > 0) segment.push(...bundles[index - 1]);
                if (station(id)) {
                    if (stationIds.length) segments.push(segment);
                    stationIds.push(id);
                    segment = [];
                }
            });
            if (stationIds.length >= 2) routes.push({ key: path.join('/'), nodeIds: path, stationIds, segments });
            return;
        }
        for (const [next, bundle] of adj.get(node) ?? []) {
            if (path.includes(next) && !(next === to && next === from && path.length > 2)) continue;
            walk(next, [...path, next], [...bundles, bundle]);
        }
    };
    if (from && to && adj.has(from) && adj.has(to)) walk(from, [from], []);
    return routes;
};

/** Returns a preview without touching graph geometry. Throws for empty/full selections. */
export const splitLineDefinition = (
    graph: Graph,
    lineId: string,
    route: LineRoute,
    start: number,
    end: number
): Graph => {
    const definitions = graph.attributes?.lineDefinitions ?? [];
    const line = definitions.find(item => item.id === lineId);
    if (
        !line ||
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end >= route.stationIds.length ||
        start >= end
    )
        throw new Error('Invalid line interval');
    const selected = new Set(route.segments.slice(start, end).flat());
    if (!selected.size || selected.size === line.edgeIds.length || [...selected].some(id => !line.edgeIds.includes(id)))
        throw new Error('Select a proper subinterval');
    const remainder = new Set(line.edgeIds.filter(id => !selected.has(id)));
    const components = lineEdgeComponents(graph.edges.filter(edge => remainder.has(edge.key!)));
    const extracted = { ...line, edgeIds: [...selected].sort(), exportStartStationId: route.stationIds[start] };
    const next = definitions.flatMap(item =>
        item.id === lineId ? [extracted, ...components.map(emptyLineDefinition)] : [item]
    );
    return reconcileLineDefinitions({ ...graph, attributes: { ...graph.attributes, lineDefinitions: next } });
};

/** Only connected sections with the same complete theme can share a line without changing its drawing. */
export const getLineAssignmentTargets = (graph: Graph, sectionId: string): LineDefinition[] => {
    const section = getUnassignedLineSections(graph).find(item => item.id === sectionId);
    if (!section) return [];
    const edges = new Map(graph.edges.map(edge => [edge.key!, edge]));
    const selectedNodes = new Set(section.edgeIds.flatMap(id => [edges.get(id)!.source, edges.get(id)!.target]));
    const theme = themeKey(edges.get(section.edgeIds[0])!);
    return (graph.attributes?.lineDefinitions ?? []).filter(
        item =>
            item.edgeIds.length > 0 &&
            item.edgeIds.every(id => themeKey(edges.get(id)!) === theme) &&
            item.edgeIds.some(
                id => selectedNodes.has(edges.get(id)!.source) || selectedNodes.has(edges.get(id)!.target)
            )
    );
};

/** The card's × removes the whole membership, including every branch; the drawing stays untouched. */
export const unassignLineDefinition = (graph: Graph, lineId: string): Graph => {
    const line = (graph.attributes?.lineDefinitions ?? []).find(item => item.id === lineId);
    if (!line) throw new Error('Line no longer exists');
    return reconcileLineDefinitions({
        ...graph,
        attributes: {
            ...graph.attributes,
            lineDefinitions: graph.attributes!.lineDefinitions!.filter(item => item.id !== lineId),
            unassignedLineEdgeIds: [
                ...new Set([...(graph.attributes?.unassignedLineEdgeIds ?? []), ...line.edgeIds]),
            ].sort(),
        },
    });
};

/** Assign a whole pending section in one commit, including off-route branches and virtual connectors. */
export const assignLineSection = (graph: Graph, sectionId: string, targetId?: string): Graph => {
    const section = getUnassignedLineSections(graph).find(item => item.id === sectionId);
    if (!section) throw new Error('Unassigned section no longer exists');
    const selected = new Set(section.edgeIds);
    if (targetId && !getLineAssignmentTargets(graph, sectionId).some(item => item.id === targetId))
        throw new Error('Choose a connected line with the same theme');
    const definitions = (graph.attributes?.lineDefinitions ?? []).map(item => {
        if (item.id === targetId) return { ...item, edgeIds: [...item.edgeIds, ...selected].sort() };
        return item;
    });
    if (!targetId) definitions.push(emptyLineDefinition([...selected].sort()));
    return reconcileLineDefinitions({
        ...graph,
        attributes: {
            ...graph.attributes,
            lineDefinitions: definitions,
            unassignedLineEdgeIds: (graph.attributes?.unassignedLineEdgeIds ?? []).filter(id => !selected.has(id)),
        },
    });
};

export const isOpeningDateValid = (date: string): boolean => {
    if (!date) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
};
