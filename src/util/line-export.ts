import { MultiDirectedGraph } from 'graphology';
import type { SerializedGraph } from 'graphology-types';
import type { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import type { LineDefinition } from '../constants/line-definitions';
import type { RMGParam } from '../constants/rmg';
import { getLineTheme, getLineTopology, LineTopology } from './line-definitions';
import { toRmg } from './to-rmg';

type Graph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Transfer = { id: string; theme: Theme; name: [string, string] };

const getTransfers = (graph: Graph): Map<string, Transfer[]> => {
    const edges = new Map(graph.edges.map(edge => [edge.key!, edge]));
    const result = new Map<string, Transfer[]>();
    for (const line of graph.attributes?.lineDefinitions ?? []) {
        const stations = new Set(
            line.edgeIds.flatMap(id => {
                const edge = edges.get(id);
                return edge ? [edge.source, edge.target].filter(node => node.startsWith('stn_')) : [];
            })
        );
        const theme = getLineTheme(edges.get(line.edgeIds[0])!);
        if (!theme) continue;
        for (const id of stations) result.set(id, [...(result.get(id) ?? []), { id: line.id, theme, name: line.name }]);
    }
    return result;
};
export interface LineExport {
    line: LineDefinition;
    topology: LineTopology;
    startCandidates: string[];
    param?: RMGParam;
    error?: 'insufficientStations' | 'unsupportedTopology';
}

/** Convert one owned subgraph, then resolve transfers by stable line identity, including same-colour lines. */
const buildLineExport = (graph: Graph, line: LineDefinition, transfers: Map<string, Transfer[]>): LineExport => {
    const topology = getLineTopology(graph, line);
    if (topology.stationIds.length < 2)
        return { line, topology, startCandidates: topology.startCandidates, error: 'insufficientStations' };
    const owned = new Set(line.edgeIds);
    const edges = graph.edges.filter(edge => owned.has(edge.key!));
    const nodeIds = new Set(edges.flatMap(edge => [edge.source, edge.target]));
    const subset = { ...graph, attributes: {}, nodes: graph.nodes.filter(node => nodeIds.has(node.key)), edges };
    let converted: ReturnType<typeof toRmg>[number]['param'];
    try {
        converted = toRmg(MultiDirectedGraph.from(structuredClone(subset)))
            .flatMap(result => result.param)
            .filter(([param]) => topology.stationIds.every(id => id in param.stn_list));
    } catch {
        return { line, topology, startCandidates: [], error: 'unsupportedTopology' };
    }
    const availableStarts = new Set(converted.map(([param]) => param.current_stn_idx));
    const startCandidates = topology.startCandidates.filter(id => availableStarts.has(id));
    const source = converted.find(([param]) => param.current_stn_idx === line.exportStartStationId)?.[0];
    if (!source) return { line, topology, startCandidates, error: 'unsupportedTopology' };
    const param = structuredClone(source);
    param.line_name = [...line.name];
    param.line_num = line.lineNumber;
    for (const [id, info] of Object.entries(param.stn_list)) {
        if (!id.startsWith('stn_')) continue;
        const otherLines = (transfers.get(id) ?? [])
            .filter(other => other.id !== line.id)
            .map(other => ({ theme: other.theme, name: [...other.name] as [string, string] }));
        if (otherLines.length) info.transfer.groups[0].lines = otherLines;
    }
    return { line, topology, startCandidates, param };
};

export const getLineExport = (graph: Graph, line: LineDefinition): LineExport =>
    buildLineExport(graph, line, getTransfers(graph));

export const getLineExports = (graph: Graph): LineExport[] => {
    const transfers = getTransfers(graph);
    return (graph.attributes?.lineDefinitions ?? []).map(line => buildLineExport(graph, line, transfers));
};
