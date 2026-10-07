import { MultiDirectedGraph } from 'graphology';
import type { SerializedGraph } from 'graphology-types';
import type { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import type { LineDefinition } from '../constants/line-definitions';
import type { RMGParam } from '../constants/rmg';
import { getLineTheme, getLineTopology, LineTopology } from './line-definitions';
import { toRmg } from './to-rmg';

type Graph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Transfer = { id: string; theme: Theme; name: [string, string] };

const getTransfers = (graph: Graph, edges: Map<string, Graph['edges'][number]>): Map<string, Transfer[]> => {
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

interface LineExportContext {
    graph: Graph;
    edges: Map<string, Graph['edges'][number]>;
    edgeOrder: Map<string, number>;
    nodes: Map<string, Graph['nodes'][number]>;
    transfers: Map<string, Transfer[]>;
}

const prepareLineExports = (graph: Graph): LineExportContext => {
    const edges = new Map(graph.edges.map(edge => [edge.key!, edge]));
    return {
        graph,
        edges,
        edgeOrder: new Map(graph.edges.map((edge, index) => [edge.key!, index])),
        nodes: new Map(graph.nodes.map(node => [node.key, node])),
        transfers: getTransfers(graph, edges),
    };
};

/** Convert one owned subgraph, then resolve transfers by stable line identity, including same-colour lines. */
const buildLineExport = (context: LineExportContext, line: LineDefinition): LineExport => {
    const { graph, transfers } = context;
    const edges = line.edgeIds
        .map(id => context.edges.get(id))
        .filter((edge): edge is Graph['edges'][number] => !!edge)
        .sort((a, b) => context.edgeOrder.get(a.key!)! - context.edgeOrder.get(b.key!)!);
    const nodeIds = new Set(edges.flatMap(edge => [edge.source, edge.target]));
    const subset = {
        ...graph,
        attributes: {},
        nodes: [...nodeIds].map(id => context.nodes.get(id)).filter((node): node is Graph['nodes'][number] => !!node),
        edges,
    };
    const topology = getLineTopology(subset, line);
    if (topology.stationIds.length < 2)
        return { line, topology, startCandidates: topology.startCandidates, error: 'insufficientStations' };
    // Branch directions can have different RMG compatibility. A simple line/loop only needs the saved direction.
    const requestedStarts = topology.type === 'BRANCH' ? topology.startCandidates : [line.exportStartStationId];
    let converted: ReturnType<typeof toRmg>[number]['param'];
    try {
        converted = toRmg(MultiDirectedGraph.from(subset), requestedStarts)
            .flatMap(result => result.param)
            .filter(([param]) => topology.stationIds.every(id => id in param.stn_list));
    } catch {
        return { line, topology, startCandidates: [], error: 'unsupportedTopology' };
    }
    const availableStarts = new Set(converted.map(([param]) => param.current_stn_idx));
    const startCandidates =
        topology.type === 'BRANCH'
            ? topology.startCandidates.filter(id => availableStarts.has(id))
            : converted.length
              ? topology.startCandidates
              : [];
    const source = converted.find(([param]) => param.current_stn_idx === line.exportStartStationId)?.[0];
    if (!source) return { line, topology, startCandidates, error: 'unsupportedTopology' };
    const param = source;
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
    buildLineExport(prepareLineExports(graph), line);

export const getLineExports = (graph: Graph): LineExport[] => {
    const context = prepareLineExports(graph);
    return (graph.attributes?.lineDefinitions ?? []).map(line => buildLineExport(context, line));
};

/** Let a pending loading state paint before starting (or continuing) line calculations. */
export const yieldLineCalculation = (signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        const abortReason = () => signal?.reason ?? new DOMException('Line calculation aborted', 'AbortError');
        if (signal?.aborted) {
            reject(abortReason());
            return;
        }
        let frame: number | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const cleanup = () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            if (timer !== undefined) clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
        };
        const onAbort = () => {
            cleanup();
            reject(abortReason());
        };
        const finish = () => {
            cleanup();
            resolve();
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        if (typeof requestAnimationFrame === 'function' && (typeof document === 'undefined' || !document.hidden))
            frame = requestAnimationFrame(() => {
                frame = undefined;
                timer = setTimeout(finish, 0);
            });
        else timer = setTimeout(finish, 0);
    });

/** Compute on demand and update loading feedback between short batches of lines. */
export const getLineExportsAsync = async (graph: Graph, signal?: AbortSignal): Promise<LineExport[]> => {
    await yieldLineCalculation(signal);
    let sliceStart = performance.now();
    const context = prepareLineExports(graph);
    const result: LineExport[] = [];
    for (const line of graph.attributes?.lineDefinitions ?? []) {
        if (signal?.aborted) throw signal.reason ?? new DOMException('Line calculation aborted', 'AbortError');
        if (performance.now() - sliceStart >= 8) {
            await yieldLineCalculation(signal);
            sliceStart = performance.now();
        }
        result.push(buildLineExport(context, line));
    }
    return result;
};
