import { SerializedGraph } from 'graphology-types';
import { nanoid } from 'nanoid';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
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

/** Palette colours share their city/line identity; custom colours require exact background/foreground values. */
export const getThemeKey = (theme: Theme): string =>
    JSON.stringify(theme[0] === CityCode.Other ? ['custom', theme[2], theme[3]] : ['palette', theme[0], theme[1]]);

const themeKey = (edge: Edge) => {
    const theme = getLineTheme(edge);
    return theme ? getThemeKey(theme) : JSON.stringify(theme);
};
const station = (id: string) => id.startsWith('stn_');

interface LineGraphIndex {
    edges: Map<string, Edge>;
    edgeOrder: Map<string, number>;
    nodes: Map<string, NodeAttributes | undefined>;
    unassignedComponents?: Map<string, string[]>;
}

const graphIndexes = new WeakMap<Graph, LineGraphIndex>();

/** Redux snapshots are immutable; mutable exports must always reflect in-place edits. */
const getFrozenGraphIndex = (graph: Graph): LineGraphIndex | undefined => {
    const cached = graphIndexes.get(graph);
    if (cached) return cached;
    if (
        !Object.isFrozen(graph) ||
        !Object.isFrozen(graph.edges) ||
        !Object.isFrozen(graph.nodes) ||
        !graph.edges.every(Object.isFrozen) ||
        !graph.nodes.every(Object.isFrozen)
    )
        return;
    const index: LineGraphIndex = {
        edges: new Map(graph.edges.map(edge => [edge.key!, edge])),
        edgeOrder: new Map(graph.edges.map((edge, position) => [edge.key!, position])),
        nodes: new Map(graph.nodes.map(node => [node.key, node.attributes])),
    };
    graphIndexes.set(graph, index);
    return index;
};

const indexedEdges = (index: LineGraphIndex, ids: Iterable<string>): Edge[] =>
    [...new Set(ids)]
        .map(id => index.edges.get(id))
        .filter((edge): edge is Edge => !!edge)
        .sort((a, b) => index.edgeOrder.get(a.key!)! - index.edgeOrder.get(b.key!)!);

const adjacency = (edges: Edge[]): Adjacency => {
    const result: Adjacency = new Map();
    for (const edge of edges) {
        for (const [a, b] of [
            [edge.source, edge.target],
            [edge.target, edge.source],
        ]) {
            if (!result.has(a)) result.set(a, new Map());
            const neighbours = result.get(a)!;
            const bundle = neighbours.get(b);
            if (bundle) bundle.push(edge.key!);
            else neighbours.set(b, [edge.key!]);
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
        const group = groups.get(key);
        if (group) group.push(edge);
        else groups.set(key, [edge]);
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

const topologyFromEdges = (edges: Edge[], nodes: Map<string, NodeAttributes | undefined>): LineTopology => {
    const adj = adjacency(edges);
    const compare = (a: string, b: string) => {
        const aa = nodes.get(a),
            bb = nodes.get(b);
        return (aa?.x ?? 0) - (bb?.x ?? 0) || (aa?.y ?? 0) - (bb?.y ?? 0) || a.localeCompare(b);
    };
    const stationIds = [...adj.keys()].filter(station).sort(compare);
    const terminals = new Set<string>();
    const branchStations = new Set<string>();
    const virtualStations = new Map<string, Set<string>>();
    const nearestStations = (start: string) => {
        if (station(start)) return new Set([start]);
        const cached = virtualStations.get(start);
        if (cached) return cached;
        const found = new Set<string>();
        const visited = new Set<string>();
        const virtualNodes: string[] = [];
        const pending = [start];
        while (pending.length) {
            const node = pending.pop()!;
            if (visited.has(node)) continue;
            visited.add(node);
            if (station(node)) found.add(node);
            else {
                virtualNodes.push(node);
                for (const next of adj.get(node)?.keys() ?? []) pending.push(next);
            }
        }
        // Every node in a virtual-only component reaches the same boundary stations.
        virtualNodes.forEach(node => virtualStations.set(node, found));
        return found;
    };
    const terminalComponents = new Set<Set<string>>();
    const branchComponents = new Set<Set<string>>();
    const collectStations = (node: string, target: Set<string>, components: Set<Set<string>>) => {
        const found = nearestStations(node);
        if (components.has(found)) return;
        components.add(found);
        found.forEach(id => target.add(id));
    };
    let branching = false;
    let cycle = adj.size > 0;
    for (const [node, neighbours] of adj) {
        cycle &&= neighbours.size === 2;
        if (neighbours.size === 1) collectStations(node, terminals, terminalComponents);
        if (neighbours.size > 2) {
            branching = true;
            collectStations(node, branchStations, branchComponents);
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

export const getLineTopology = (graph: Graph, line: LineDefinition): LineTopology => {
    const index = getFrozenGraphIndex(graph);
    if (index) return topologyFromEdges(indexedEdges(index, line.edgeIds), index.nodes);
    const owned = new Set(line.edgeIds);
    return topologyFromEdges(
        graph.edges.filter(edge => owned.has(edge.key!)),
        new Map(graph.nodes.map(node => [node.key, node.attributes]))
    );
};

/** Repairs ownership when line data is requested or edited. Existing definitions never merge with each other. */
export const reconcileLineDefinitions = (graph: Graph): Graph => {
    const edges = graph.edges.filter(edge => getLineTheme(edge));
    const available = new Map(edges.map(edge => [edge.key!, edge]));
    const nodes = new Map(graph.nodes.map(node => [node.key, node.attributes]));
    const unassigned = new Set((graph.attributes?.unassignedLineEdgeIds ?? []).filter(id => available.has(id)));
    const claimed = new Set<string>();
    const definitions: LineDefinition[] = [];
    const original = graph.attributes?.lineDefinitions ?? [];
    for (const line of original) {
        const valid = line.edgeIds.filter(id => available.has(id) && !claimed.has(id) && !unassigned.has(id));
        const components = themedComponents(valid.map(id => available.get(id)!));
        const withStart = new Set(
            components.filter(ids =>
                ids.some(id => {
                    const edge = available.get(id)!;
                    return edge.source === line.exportStartStationId || edge.target === line.exportStartStationId;
                })
            )
        );
        components.sort(
            (a, b) =>
                Number(withStart.has(b)) - Number(withStart.has(a)) || b.length - a.length || a[0].localeCompare(b[0])
        );
        components.forEach((edgeIds, index) => {
            edgeIds.forEach(id => claimed.add(id));
            definitions.push(
                index === 0 ? { ...line, edgeIds, status: line.status || 'operating' } : emptyLineDefinition(edgeIds)
            );
        });
    }
    const touchingByTheme = new Map<string, Map<string, Set<LineDefinition>>>();
    const indexLine = (line: LineDefinition, ids = line.edgeIds) => {
        for (const id of ids) {
            const edge = available.get(id)!;
            const key = themeKey(edge);
            if (!touchingByTheme.has(key)) touchingByTheme.set(key, new Map());
            const touching = touchingByTheme.get(key)!;
            for (const node of [edge.source, edge.target]) {
                if (!touching.has(node)) touching.set(node, new Set());
                touching.get(node)!.add(line);
            }
        }
    };
    definitions.forEach(line => indexLine(line));
    for (const ids of themedComponents(edges.filter(edge => !claimed.has(edge.key!) && !unassigned.has(edge.key!)))) {
        const newEdges = ids.map(id => available.get(id)!);
        const touching = new Set<LineDefinition>();
        const neighbours = touchingByTheme.get(themeKey(newEdges[0]));
        for (const edge of newEdges) {
            for (const node of [edge.source, edge.target]) {
                neighbours?.get(node)?.forEach(line => touching.add(line));
            }
        }
        if (touching.size === 1) {
            const line = touching.values().next().value!;
            line.edgeIds = [...line.edgeIds, ...ids].sort();
            indexLine(line, ids);
        } else {
            const line = emptyLineDefinition(ids);
            definitions.push(line);
            indexLine(line);
        }
    }
    for (const line of definitions) {
        const candidates = topologyFromEdges(
            line.edgeIds.map(id => available.get(id)!),
            nodes
        ).startCandidates;
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

const unassignedComponents = (graph: Graph, index = getFrozenGraphIndex(graph)): Map<string, string[]> => {
    if (index?.unassignedComponents) return index.unassignedComponents;
    const unassigned = new Set(graph.attributes?.unassignedLineEdgeIds ?? []);
    const candidates = index ? indexedEdges(index, unassigned) : graph.edges.filter(edge => unassigned.has(edge.key!));
    const edges = candidates.filter(edge => getLineTheme(edge));
    const components = new Map(themedComponents(edges).map(ids => [`unassigned:${ids[0]}`, ids]));
    if (
        index &&
        Object.isFrozen(graph.attributes) &&
        (!graph.attributes?.unassignedLineEdgeIds || Object.isFrozen(graph.attributes.unassignedLineEdgeIds)) &&
        candidates.every(edge => {
            const attrs = edge.attributes;
            const style = attrs?.[attrs.style] as { color?: Theme } | undefined;
            return Object.isFrozen(attrs) && Object.isFrozen(style) && Object.isFrozen(style?.color);
        })
    )
        index.unassignedComponents = components;
    return components;
};

/** Temporary display records for removed sections. They are never exported as railway lines. */
export const getUnassignedLineSections = (graph: Graph): LineDefinition[] => {
    const index = getFrozenGraphIndex(graph);
    const components = unassignedComponents(graph, index);
    if (!components.size) return [];
    const available = index?.edges ?? new Map(graph.edges.map(edge => [edge.key!, edge]));
    const nodes = index?.nodes ?? new Map(graph.nodes.map(node => [node.key, node.attributes]));
    return [...components].map(([id, edgeIds]) => {
        const line = { ...emptyLineDefinition([...edgeIds]), id };
        line.exportStartStationId =
            topologyFromEdges(
                edgeIds.map(id => available.get(id)!),
                nodes
            ).startCandidates[0] ?? '';
        return line;
    });
};

export const getStationLabel = (graph: Graph, id: string): string => {
    const index = getFrozenGraphIndex(graph);
    const attrs = index ? index.nodes.get(id) : graph.nodes.find(node => node.key === id)?.attributes;
    const names = (attrs?.[attrs.type] as { names?: string[] } | undefined)?.names;
    return (
        names?.find(name => name.trim())?.replaceAll('\n', ' ') ?? (id ? i18n.t('header.lineInfo.unnamedStation') : '—')
    );
};

export const getLineEndpointsLabel = (
    graph: Graph,
    line: LineDefinition,
    topology = getLineTopology(graph, line)
): string => {
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
    if (!from || !to || !adj.has(from) || !adj.has(to)) return routes;
    const path = [from];
    const bundles: string[][] = [];
    const visited = new Set(path);
    const pending = [adj.get(from)!.entries()];
    while (pending.length) {
        const nextNeighbour = pending[pending.length - 1].next();
        if (nextNeighbour.done) {
            pending.pop();
            visited.delete(path.pop()!);
            bundles.pop();
            continue;
        }
        const [next, bundle] = nextNeighbour.value;
        if (visited.has(next) && !(next === to && next === from && path.length > 2)) continue;
        path.push(next);
        bundles.push(bundle);
        if (next !== to) {
            visited.add(next);
            pending.push(adj.get(next)!.entries());
            continue;
        }
        const stationIds: string[] = [];
        const segments: string[][] = [];
        let segment: string[] = [];
        path.forEach((id, index) => {
            if (index > 0) bundles[index - 1].forEach(edgeId => segment.push(edgeId));
            if (station(id)) {
                if (stationIds.length) segments.push(segment);
                stationIds.push(id);
                segment = [];
            }
        });
        if (stationIds.length >= 2) routes.push({ key: path.join('/'), nodeIds: [...path], stationIds, segments });
        path.pop();
        bundles.pop();
    }
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

/** Only connected sections with the same colour identity can share a line without changing its drawing. */
export const getLineAssignmentTargets = (graph: Graph, sectionId: string): LineDefinition[] => {
    const index = getFrozenGraphIndex(graph);
    const section = unassignedComponents(graph, index).get(sectionId);
    if (!section) return [];
    const edges = index?.edges ?? new Map(graph.edges.map(edge => [edge.key!, edge]));
    const selectedNodes = new Set(section.flatMap(id => [edges.get(id)!.source, edges.get(id)!.target]));
    const theme = themeKey(edges.get(section[0])!);
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
