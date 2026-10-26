import type { SerializedGraph } from 'graphology-types';
import type { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import type { LineDefinition } from '../constants/line-definitions';
import { getStationLabel, LineRoute } from './line-definitions';

type Graph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Point = { x: number; y: number };

export const INTERVAL_PADDING = 40;
export const INTERVAL_STATION_GAP = 100;
export const INTERVAL_ROUTE_Y = 90;

export interface LineIntervalDiagram {
    width: number;
    height: number;
    stations: (Point & { key: string; stationId: string; onRoute: boolean })[];
    junctions: (Point & { id: string })[];
    branches: { key: string; edgeIds: string[]; path: string }[];
}

/** Keep the editable path straight and lay out all remaining branches below their actual junctions. */
export const getLineIntervalDiagram = (graph: Graph, line: LineDefinition, route: LineRoute): LineIntervalDiagram => {
    const owned = new Set(line.edgeIds);
    const edges = graph.edges.filter(edge => owned.has(edge.key!));
    const neighbours = new Map<string, Set<string>>();
    for (const edge of edges) {
        for (const [a, b] of [
            [edge.source, edge.target],
            [edge.target, edge.source],
        ]) {
            if (!neighbours.has(a)) neighbours.set(a, new Set());
            neighbours.get(a)!.add(b);
        }
    }
    const station = (id: string) => id.startsWith('stn_');
    const labelWidth = (id: string) =>
        [...getStationLabel(graph, id)].reduce((width, char) => width + (char.charCodeAt(0) < 128 ? 7 : 12), 0);
    const maxLabelWidth = Math.max(0, ...[...neighbours.keys()].filter(station).map(labelWidth));
    const rowGap = Math.max(110, maxLabelWidth * Math.sin((Math.PI / 180) * 25) + 80);
    const positions = new Map<string, Point>();
    let stationIndex = -1;
    route.nodeIds.forEach((id, index) => {
        if (station(id)) stationIndex++;
        if (positions.has(id)) return;
        let x = INTERVAL_PADDING + Math.max(0, stationIndex) * INTERVAL_STATION_GAP;
        if (!station(id)) {
            let before = index - 1,
                after = index + 1;
            while (before >= 0 && !station(route.nodeIds[before])) before--;
            while (after < route.nodeIds.length && !station(route.nodeIds[after])) after++;
            x += ((index - before) / (after - before)) * INTERVAL_STATION_GAP;
        }
        positions.set(id, { x, y: INTERVAL_ROUTE_Y });
    });

    const onRoute = new Set(route.nodeIds);
    const visited = new Set(onRoute);
    const treeConnections = new Set<string>();
    const connectionKey = (a: string, b: string) => JSON.stringify([a, b].sort());
    let row = 0;
    const placeBranch = (id: string, parentId: string, lane: number) => {
        visited.add(id);
        const parent = positions.get(parentId)!;
        treeConnections.add(connectionKey(id, parentId));
        const point = {
            x: parent.x + (station(id) ? INTERVAL_STATION_GAP : INTERVAL_STATION_GAP / 2),
            y: INTERVAL_ROUTE_Y + lane * rowGap,
        };
        positions.set(id, point);
        const children = [...(neighbours.get(id) ?? [])].filter(next => !visited.has(next)).sort();
        let first = true;
        for (const next of children) {
            if (visited.has(next)) continue;
            placeBranch(next, id, first ? lane : ++row);
            first = false;
        }
    };
    // Rightmost branches occupy the upper lanes so later stems cannot pass through an earlier branch's stations.
    for (const id of [...route.nodeIds].reverse()) {
        for (const next of [...(neighbours.get(id) ?? [])].sort()) {
            if (!visited.has(next)) placeBranch(next, id, ++row);
        }
    }

    const routeEdges = new Set(route.segments.flat());
    const bundles = new Map<string, { source: string; target: string; edgeIds: string[] }>();
    for (const edge of edges) {
        if (routeEdges.has(edge.key!)) continue;
        const [source, target] = [edge.source, edge.target].sort();
        const key = connectionKey(source, target);
        if (!bundles.has(key)) bundles.set(key, { source, target, edgeIds: [] });
        bundles.get(key)!.edgeIds.push(edge.key!);
    }
    const branches = [...bundles.entries()].map(([key, bundle]) => {
        let a = positions.get(bundle.source)!,
            b = positions.get(bundle.target)!;
        if (a.y > b.y) [a, b] = [b, a];
        const bend = Math.min(24, Math.abs(b.x - a.x)) * Math.sign(b.x - a.x);
        let path: string;
        if (a.y === b.y && !treeConnections.has(key)) {
            const arcY = INTERVAL_ROUTE_Y + ++row * rowGap;
            path = `M ${a.x} ${a.y} V ${arcY - 24} Q ${a.x} ${arcY} ${a.x + bend} ${arcY} H ${b.x - bend} Q ${b.x} ${arcY} ${b.x} ${arcY - 24} V ${b.y}`;
        } else {
            path =
                a.y === b.y
                    ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
                    : `M ${a.x} ${a.y} V ${b.y - 24} Q ${a.x} ${b.y} ${a.x + bend} ${b.y} H ${b.x}`;
        }
        return { key, edgeIds: bundle.edgeIds, path };
    });
    const stations = route.stationIds.map((stationId, index) => ({
        key: `${stationId}/${index}`,
        stationId,
        onRoute: true,
        x: INTERVAL_PADDING + index * INTERVAL_STATION_GAP,
        y: INTERVAL_ROUTE_Y,
    }));
    for (const [id, point] of positions) {
        if (station(id) && !onRoute.has(id)) stations.push({ key: id, stationId: id, onRoute: false, ...point });
    }
    return {
        width: Math.max(
            440,
            ...stations.map(point => point.x + labelWidth(point.stationId) * Math.cos((Math.PI / 180) * 25) + 60),
            ...[...positions.values()].map(point => point.x + INTERVAL_PADDING)
        ),
        height: Math.max(210, INTERVAL_ROUTE_Y + (row + 1) * rowGap - 20),
        stations,
        junctions: [...neighbours.entries()]
            .filter(([, adjacent]) => adjacent.size > 2)
            .map(([id]) => ({ id, ...positions.get(id)! })),
        branches,
    };
};
