import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import type { EdgeAttributes, GraphAttributes, NodeAttributes, Theme, TimelineEntry } from '../constants/constants';
import { CityCode } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import type { ActionRow } from '../constants/timeline';

// Mock the color-field module to avoid pulling in UI/i18n/runtime dependencies
vi.mock('../components/panels/details/color-field', () => ({
    dynamicColorInjection: new Set([
        'single-color',
        'bjsubway-single-color',
        'bjsubway-tram',
        'bjsubway-dotted',
        'china-railway',
        'mtr-race-day',
        'mtr-light-rail',
        'mrt-under-construction',
        'jr-east-single-color',
        'jr-east-single-color-pattern',
        'lrt-single-color',
        'london-sandwich',
        'london-luton-airport-dart',
        'london-ifs-cloud-cable-car',
        'gzmtr-loop',
        'chongqingrt-loop',
        'chongqingrt-line-badge',
    ]),
}));

import {
    addNodeVersion,
    applyNodeVersion,
    calculateAutoReverseForPath,
    deduplicateTimeline,
    deduplicateTimelineEntries,
    findPathByTheme,
    findThemesAtNode,
    getActionConstraintState,
    getCurrentNodeVersion,
    getEdgeThemes,
    getLineDirection,
    getNodeDisplayName,
    getNodeVersion,
    getTimeline,
    getUnaddedNodes,
    removeNodeVersion,
    setTimeline,
} from './timeline';

const RED_THEME: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
const BLUE_THEME: Theme = [CityCode.Shanghai, 'sh2', '#0000FF', MonoColour.white];
const GREEN_THEME: Theme = [CityCode.Shanghai, 'sh3', '#00FF00', MonoColour.white];

/** Helper: create a graph with nodes and SingleColor edges for testing. */
const makeGraph = () => {
    const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    return graph;
};

const addStation = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    x = 0,
    y = 0
) => {
    graph.addNode(id, { visible: true, zIndex: 0, x, y, type: StationType.ShmetroBasic } as NodeAttributes);
};

const addMiscNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    x = 0,
    y = 0
) => {
    graph.addNode(id, { visible: true, zIndex: 0, x, y, type: MiscNodeType.Virtual } as NodeAttributes);
};

const addSingleColorEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    theme: Theme
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Simple,
        style: LineStyleType.SingleColor,
        reconcileId: '',
        parallelIndex: -1,
        [LineStyleType.SingleColor]: { color: theme },
    } as EdgeAttributes);
};

const addDualColorEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    colorA: Theme,
    colorB: Theme
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Simple,
        style: LineStyleType.DualColor,
        reconcileId: '',
        parallelIndex: -1,
        [LineStyleType.DualColor]: { colorA, colorB },
    } as EdgeAttributes);
};

const addGenericEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    themes: Theme[]
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Simple,
        style: LineStyleType.Generic,
        reconcileId: '',
        parallelIndex: -1,
        [LineStyleType.Generic]: {
            layers: themes.map((color, i) => ({
                id: `layer_${i}`,
                color,
                width: 5,
                opacity: 1,
                linecap: 'butt' as const,
                dash: 0,
                gap: 0,
            })),
        },
    } as EdgeAttributes);
};

/** Helper: add a diagonal edge with optional startFrom attribute for testing auto-reverse. */
const addDiagonalEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    theme: Theme,
    startFrom?: 'from' | 'to'
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Diagonal,
        style: LineStyleType.SingleColor,
        reconcileId: '',
        parallelIndex: -1,
        [LineStyleType.SingleColor]: { color: theme },
        [LinePathType.Diagonal]: {
            startFrom: startFrom ?? 'from',
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 10,
        },
    } as unknown as EdgeAttributes);
};

/** Helper: add a perpendicular edge with optional startFrom attribute for testing auto-reverse. */
const addPerpendicularEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    theme: Theme,
    startFrom?: 'from' | 'to'
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Perpendicular,
        style: LineStyleType.SingleColor,
        reconcileId: '',
        parallelIndex: -1,
        [LineStyleType.SingleColor]: { color: theme },
        [LinePathType.Perpendicular]: {
            startFrom: startFrom ?? 'from',
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 10,
        },
    } as unknown as EdgeAttributes);
};

describe('getTimeline / setTimeline', () => {
    it('should return empty array when no timeline set', () => {
        const graph = makeGraph();
        expect(getTimeline(graph)).toEqual([]);
    });

    it('should round-trip timeline data', () => {
        const graph = makeGraph();
        const tl: TimelineEntry[] = [{ id: 'stn_a' }, { id: 'line_1' }, { id: 'stn_b' }];
        setTimeline(graph, tl);
        expect(getTimeline(graph)).toEqual(tl);
    });
});

describe('getEdgeThemes', () => {
    it('should extract theme from SingleColor edge', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addSingleColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME);
        expect(getEdgeThemes(graph, 'line_1')).toEqual([RED_THEME]);
    });

    it('should extract both themes from DualColor edge', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addDualColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, BLUE_THEME);
        const themes = getEdgeThemes(graph, 'line_1');
        expect(themes).toHaveLength(2);
        expect(themes).toContainEqual(RED_THEME);
        expect(themes).toContainEqual(BLUE_THEME);
    });

    it('should extract themes from Generic edge layers', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addGenericEdge(graph, 'line_1', 'stn_a', 'stn_b', [RED_THEME, GREEN_THEME]);
        const themes = getEdgeThemes(graph, 'line_1');
        expect(themes).toHaveLength(2);
        expect(themes).toContainEqual(RED_THEME);
        expect(themes).toContainEqual(GREEN_THEME);
    });

    it('should return empty for unsupported style', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        graph.addDirectedEdgeWithKey('line_1', 'stn_a', 'stn_b', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            style: LineStyleType.River,
            reconcileId: '',
            parallelIndex: -1,
        } as EdgeAttributes);
        expect(getEdgeThemes(graph, 'line_1')).toEqual([]);
    });
});

describe('findThemesAtNode', () => {
    it('should return unique themes from connected edges', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addStation(graph, 'stn_c');
        addSingleColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME);
        addSingleColorEdge(graph, 'line_2', 'stn_a', 'stn_c', RED_THEME);
        addSingleColorEdge(graph, 'line_3', 'stn_a', 'stn_c', BLUE_THEME);

        const themes = findThemesAtNode(graph, 'stn_a' as any);
        expect(themes).toHaveLength(2);
    });

    it('should return empty for isolated node', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        expect(findThemesAtNode(graph, 'stn_a' as any)).toEqual([]);
    });

    it('should include DualColor themes', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addDualColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, BLUE_THEME);

        const themes = findThemesAtNode(graph, 'stn_a' as any);
        expect(themes).toHaveLength(2);
    });
});

describe('findPathByTheme', () => {
    it('should find a simple path A -> B -> C', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 0);
        addSingleColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME);
        addSingleColorEdge(graph, 'line_2', 'stn_b', 'stn_c', RED_THEME);

        const path = findPathByTheme(graph, 'stn_a' as any, 'stn_c' as any, RED_THEME);
        expect(path).toEqual(['stn_a', 'line_1', 'stn_b', 'line_2', 'stn_c']);
    });

    it('should return interleaved [node, edge, node] structure', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addSingleColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME);

        const path = findPathByTheme(graph, 'stn_a' as any, 'stn_b' as any, RED_THEME)!;
        expect(path).toHaveLength(3);
        expect(path[0]).toBe('stn_a');
        expect((path[1] as string).startsWith('line_')).toBe(true);
        expect(path[2]).toBe('stn_b');
    });

    it('should ignore edges with different theme', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addStation(graph, 'stn_c');
        addSingleColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME);
        addSingleColorEdge(graph, 'line_2', 'stn_b', 'stn_c', BLUE_THEME);

        const path = findPathByTheme(graph, 'stn_a' as any, 'stn_c' as any, RED_THEME);
        expect(path).toBeUndefined();
    });

    it('should return [startNode] when start equals end', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        expect(findPathByTheme(graph, 'stn_a' as any, 'stn_a' as any, RED_THEME)).toEqual(['stn_a']);
    });

    it('should return undefined for non-existent nodes', () => {
        const graph = makeGraph();
        expect(findPathByTheme(graph, 'stn_x' as any, 'stn_y' as any, RED_THEME)).toBeUndefined();
    });

    it('should return undefined when no path exists', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        // No edges
        expect(findPathByTheme(graph, 'stn_a' as any, 'stn_b' as any, RED_THEME)).toBeUndefined();
    });

    it('should respect maxNodes cutoff', () => {
        const graph = makeGraph();
        // Create a chain: stn_0 -> stn_1 -> ... -> stn_10
        for (let i = 0; i <= 10; i++) addStation(graph, `stn_${i}`);
        for (let i = 0; i < 10; i++) addSingleColorEdge(graph, `line_${i}`, `stn_${i}`, `stn_${i + 1}`, RED_THEME);

        // With maxNodes=3, should not find path to stn_10
        const path = findPathByTheme(graph, 'stn_0' as any, 'stn_10' as any, RED_THEME, 3);
        expect(path).toBeUndefined();

        // Without limit, should find path
        const fullPath = findPathByTheme(graph, 'stn_0' as any, 'stn_10' as any, RED_THEME);
        expect(fullPath).toBeDefined();
        expect(fullPath![0]).toBe('stn_0');
        expect(fullPath![fullPath!.length - 1]).toBe('stn_10');
    });

    it('should follow DualColor edges when matching either color', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addDualColorEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, BLUE_THEME);

        expect(findPathByTheme(graph, 'stn_a' as any, 'stn_b' as any, RED_THEME)).toBeDefined();
        expect(findPathByTheme(graph, 'stn_a' as any, 'stn_b' as any, BLUE_THEME)).toBeDefined();
        expect(findPathByTheme(graph, 'stn_a' as any, 'stn_b' as any, GREEN_THEME)).toBeUndefined();
    });
});

describe('deduplicateTimeline', () => {
    it('should append new path to existing timeline', () => {
        const existing = ['stn_a', 'line_1', 'stn_b'] as any[];
        const newPath = ['stn_c', 'line_2', 'stn_d'] as any[];
        const result = deduplicateTimeline(existing, newPath);
        expect(result).toEqual(['stn_a', 'line_1', 'stn_b', 'stn_c', 'line_2', 'stn_d']);
    });

    it('should skip duplicate nodes and their adjacent edges', () => {
        const existing = ['stn_a', 'line_1', 'stn_b'] as any[];
        const newPath = ['stn_b', 'line_2', 'stn_c'] as any[];
        const result = deduplicateTimeline(existing, newPath);
        // stn_b is duplicate, skip it and line_2; stn_c is new
        expect(result).toEqual(['stn_a', 'line_1', 'stn_b', 'stn_c']);
    });

    it('should skip duplicate edges', () => {
        const existing = ['stn_a', 'line_1', 'stn_b'] as any[];
        const newPath = ['stn_c', 'line_1', 'stn_d'] as any[];
        const result = deduplicateTimeline(existing, newPath);
        // line_1 is duplicate, skip it; stn_c and stn_d are new
        expect(result).toEqual(['stn_a', 'line_1', 'stn_b', 'stn_c', 'stn_d']);
    });

    it('should handle empty existing timeline', () => {
        const result = deduplicateTimeline([], ['stn_a', 'line_1', 'stn_b'] as any[]);
        expect(result).toEqual(['stn_a', 'line_1', 'stn_b']);
    });

    it('should handle empty new path', () => {
        const existing = ['stn_a'] as any[];
        expect(deduplicateTimeline(existing, [])).toEqual(['stn_a']);
    });

    it('should handle adding a single node', () => {
        const existing = ['stn_a', 'line_1', 'stn_b'] as any[];
        const result = deduplicateTimeline(existing, ['stn_c'] as any[]);
        expect(result).toEqual(['stn_a', 'line_1', 'stn_b', 'stn_c']);
    });

    it('should skip single duplicate node', () => {
        const existing = ['stn_a'] as any[];
        const result = deduplicateTimeline(existing, ['stn_a'] as any[]);
        expect(result).toEqual(['stn_a']);
    });

    it('should preserve [node, edge, node] structure after dedup', () => {
        const existing = ['stn_a', 'line_1', 'stn_b', 'line_2', 'stn_c'] as any[];
        const newPath = ['stn_d', 'line_3', 'stn_b', 'line_4', 'stn_e'] as any[];
        const result = deduplicateTimeline(existing, newPath);
        // stn_d is new, line_3 is new, stn_b is dup (skip stn_b + line_4), stn_e is new
        expect(result).toEqual(['stn_a', 'line_1', 'stn_b', 'line_2', 'stn_c', 'stn_d', 'line_3', 'stn_e']);
    });
});

describe('getNodeDisplayName', () => {
    it('should return names[0] for station with names', () => {
        const graph = makeGraph();
        graph.addNode('stn_a', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: { names: ['Station A', 'A站'] },
        } as unknown as NodeAttributes);
        expect(getNodeDisplayName(graph, 'stn_a' as any)).toBe('Station A');
    });

    it('should return nodeId for node without names', () => {
        const graph = makeGraph();
        addMiscNode(graph, 'misc_node_x');
        expect(getNodeDisplayName(graph, 'misc_node_x' as any)).toBe('misc_node_x');
    });

    it('should return nodeId for non-existent node', () => {
        const graph = makeGraph();
        expect(getNodeDisplayName(graph, 'stn_nonexistent' as any)).toBe('stn_nonexistent');
    });
});

describe('getUnaddedNodes', () => {
    it('should return stations and misc nodes not in timeline', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addMiscNode(graph, 'misc_node_c');

        const unadded = getUnaddedNodes(graph, ['stn_a'] as any[]);
        expect(unadded).toContain('stn_b');
        expect(unadded).toContain('misc_node_c');
        expect(unadded).not.toContain('stn_a');
    });

    it('should return all nodes when timeline is empty', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addMiscNode(graph, 'misc_node_b');
        expect(getUnaddedNodes(graph, [])).toHaveLength(2);
    });

    it('should return empty when all nodes are in timeline', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        expect(getUnaddedNodes(graph, ['stn_a'] as any[])).toHaveLength(0);
    });
});

describe('getLineDirection', () => {
    it('should return [source, target] when startFrom is "from"', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'from');

        const direction = getLineDirection(graph, 'line_1' as any);
        expect(direction).toEqual(['stn_a', 'stn_b']);
    });

    it('should return [source, target] even when startFrom is "to"', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'to');

        // Path generators always emit a path starting from the graph source,
        // so the natural drawing direction stays source -> target.
        const direction = getLineDirection(graph, 'line_1' as any);
        expect(direction).toEqual(['stn_a', 'stn_b']);
    });

    it('should return [source, target] when startFrom is undefined', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME);

        const direction = getLineDirection(graph, 'line_1' as any);
        expect(direction).toEqual(['stn_a', 'stn_b']);
    });

    it('should return undefined for non-existent edge', () => {
        const graph = makeGraph();
        expect(getLineDirection(graph, 'line_nonexistent' as any)).toBeUndefined();
    });
});

describe('calculateAutoReverseForPath', () => {
    it('should set reverse=false when line direction matches path direction (startFrom=from)', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        // Line direction: stn_a -> stn_b (startFrom=from)
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'from');

        // Path direction: stn_a -> stn_b (matches line direction)
        const path = ['stn_a', 'line_1', 'stn_b'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: 'stn_a' });
        expect(result[1]).toEqual({ id: 'line_1', reverse: false });
        expect(result[2]).toEqual({ id: 'stn_b' });
    });

    it('should set reverse=true when line direction is opposite to path direction (startFrom=from)', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        // Line direction: stn_a -> stn_b (startFrom=from)
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'from');

        // Path direction: stn_b -> stn_a (opposite to line direction)
        const path = ['stn_b', 'line_1', 'stn_a'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: 'stn_b' });
        expect(result[1]).toEqual({ id: 'line_1', reverse: true });
        expect(result[2]).toEqual({ id: 'stn_a' });
    });

    it('should set reverse=true when path traverses the edge against its natural direction (startFrom=to)', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        // Natural drawing direction is always source -> target: stn_a -> stn_b
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'to');

        // Path direction: stn_b -> stn_a (opposite to natural direction, need reverse)
        const path = ['stn_b', 'line_1', 'stn_a'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: 'stn_b' });
        expect(result[1]).toEqual({ id: 'line_1', reverse: true });
        expect(result[2]).toEqual({ id: 'stn_a' });
    });

    it('should set reverse=false when path matches natural direction (startFrom=to)', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        // Natural drawing direction is always source -> target: stn_a -> stn_b
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'to');

        // Path direction: stn_a -> stn_b (matches natural direction, no reverse)
        const path = ['stn_a', 'line_1', 'stn_b'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: 'stn_a' });
        expect(result[1]).toEqual({ id: 'line_1', reverse: false });
        expect(result[2]).toEqual({ id: 'stn_b' });
    });

    it('should handle multi-segment path with mixed directions', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addStation(graph, 'stn_c');
        addStation(graph, 'stn_d');

        // line_1: stn_a -> stn_b (natural direction: a->b)
        addDiagonalEdge(graph, 'line_1', 'stn_a', 'stn_b', RED_THEME, 'from');
        // line_2: source=stn_c, target=stn_b, startFrom=to (natural direction: c->b)
        addDiagonalEdge(graph, 'line_2', 'stn_c', 'stn_b', RED_THEME, 'to');
        // line_3: stn_c -> stn_d (natural direction: c->d)
        addDiagonalEdge(graph, 'line_3', 'stn_c', 'stn_d', RED_THEME, 'from');

        // Path: a -> b -> c -> d
        const path = ['stn_a', 'line_1', 'stn_b', 'line_2', 'stn_c', 'line_3', 'stn_d'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(7);
        expect(result[0]).toEqual({ id: 'stn_a' });
        expect(result[1]).toEqual({ id: 'line_1', reverse: false }); // a->b matches a->b
        expect(result[2]).toEqual({ id: 'stn_b' });
        expect(result[3]).toEqual({ id: 'line_2', reverse: true }); // path b->c, natural c->b, need reverse
        expect(result[4]).toEqual({ id: 'stn_c' });
        expect(result[5]).toEqual({ id: 'line_3', reverse: false }); // c->d matches c->d
        expect(result[6]).toEqual({ id: 'stn_d' });
    });

    it('should handle path where all edges need reversal', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');
        addStation(graph, 'stn_c');

        // line_1: stn_b -> stn_a (startFrom=from, direction: b->a)
        addDiagonalEdge(graph, 'line_1', 'stn_b', 'stn_a', RED_THEME, 'from');
        // line_2: stn_c -> stn_b (startFrom=from, direction: c->b)
        addDiagonalEdge(graph, 'line_2', 'stn_c', 'stn_b', RED_THEME, 'from');

        // Path: a -> b -> c (opposite to edge directions)
        const path = ['stn_a', 'line_1', 'stn_b', 'line_2', 'stn_c'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(5);
        expect(result[1]).toEqual({ id: 'line_1', reverse: true }); // b->a vs a->b, need reverse
        expect(result[3]).toEqual({ id: 'line_2', reverse: true }); // c->b vs b->c, need reverse
    });

    it('should handle single node path', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');

        const path = ['stn_a'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toEqual([{ id: 'stn_a' }]);
    });

    it('should handle path with non-existent edge', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a');
        addStation(graph, 'stn_b');

        const path = ['stn_a', 'line_nonexistent', 'stn_b'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(3);
        expect(result[1]).toEqual({ id: 'line_nonexistent' }); // No reverse for non-existent edge
    });

    it('should set reverse=true for Changzhou XinQiao -> North Railway Station case', () => {
        // Reproduce the exact case from changzhou.json:
        // line_juvmgb6Jdu: source=常州北站, target=新桥, startFrom=from
        // line direction = 常州北站 -> 新桥
        // 1号线 actual direction = 新桥 -> 常州北站
        const graph = makeGraph();
        addStation(graph, 'stn_Kp5jtLKkIg', 320, 540); // 常州北站
        addStation(graph, 'stn_9CtgvIY2Cl', 295, 515); // 新桥
        addPerpendicularEdge(graph, 'line_juvmgb6Jdu', 'stn_Kp5jtLKkIg', 'stn_9CtgvIY2Cl', RED_THEME, 'from');

        // Path: 新桥 -> 常州北站 (matches actual line direction)
        const path = ['stn_9CtgvIY2Cl', 'line_juvmgb6Jdu', 'stn_Kp5jtLKkIg'];
        const result = calculateAutoReverseForPath(graph, path as any);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: 'stn_9CtgvIY2Cl' });
        expect(result[1]).toEqual({ id: 'line_juvmgb6Jdu', reverse: true }); // Need reverse
        expect(result[2]).toEqual({ id: 'stn_Kp5jtLKkIg' });
    });
});

describe('deduplicateTimelineEntries', () => {
    it('should append new entries to existing timeline preserving reverse properties', () => {
        const existing = [{ id: 'stn_a' }, { id: 'line_1', reverse: false }, { id: 'stn_b' }] as any[];
        const newEntries = [{ id: 'stn_c' }, { id: 'line_2', reverse: true }, { id: 'stn_d' }] as any[];
        const result = deduplicateTimelineEntries(existing, newEntries);

        expect(result).toEqual([
            { id: 'stn_a' },
            { id: 'line_1', reverse: false },
            { id: 'stn_b' },
            { id: 'stn_c' },
            { id: 'line_2', reverse: true },
            { id: 'stn_d' },
        ]);
    });

    it('should skip duplicate edges and preserve existing reverse', () => {
        const existing = [{ id: 'stn_a' }, { id: 'line_1', reverse: false }, { id: 'stn_b' }] as any[];
        const newEntries = [{ id: 'stn_c' }, { id: 'line_1', reverse: true }, { id: 'stn_d' }] as any[];
        const result = deduplicateTimelineEntries(existing, newEntries);

        // line_1 is skipped, so its reverse from newEntries is not applied
        expect(result).toEqual([
            { id: 'stn_a' },
            { id: 'line_1', reverse: false },
            { id: 'stn_b' },
            { id: 'stn_c' },
            { id: 'stn_d' },
        ]);
    });

    it('should handle empty existing timeline', () => {
        const newEntries = [{ id: 'stn_a' }, { id: 'line_1', reverse: true }, { id: 'stn_b' }] as any[];
        const result = deduplicateTimelineEntries([], newEntries);

        expect(result).toEqual([{ id: 'stn_a' }, { id: 'line_1', reverse: true }, { id: 'stn_b' }]);
    });

    it('should handle empty new entries', () => {
        const existing = [{ id: 'stn_a' }, { id: 'line_1', reverse: false }] as any[];
        const result = deduplicateTimelineEntries(existing, []);

        expect(result).toEqual([{ id: 'stn_a' }, { id: 'line_1', reverse: false }]);
    });
});

describe('Node version management', () => {
    it('should return current node attributes as version 1', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);

        const version = getCurrentNodeVersion(graph, 'stn_a' as any);
        expect(version).toBeDefined();
        expect(version!.version).toBe(1);
        expect(version!.x).toBe(100);
        expect(version!.y).toBe(200);
        expect(version!.type).toBe(StationType.ShmetroBasic);
    });

    it('should get stored basic version', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);
        addNodeVersion(graph, 'stn_a' as any);

        const version = getNodeVersion(graph, 'stn_a' as any, 1);
        expect(version).toBeDefined();
        expect(version!.version).toBe(1);
        expect(version!.x).toBe(100);
        expect(version!.y).toBe(200);
    });

    it('should add and retrieve historical versions', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);

        const newVersionNumber = addNodeVersion(graph, 'stn_a' as any);
        expect(newVersionNumber).toBe(2);

        const version2 = getNodeVersion(graph, 'stn_a' as any, 2);
        expect(version2).toBeDefined();
        expect(version2!.version).toBe(2);
        expect(version2!.x).toBe(100);
        expect(version2!.y).toBe(200);
    });

    it('should apply a historical version to the node', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);
        addNodeVersion(graph, 'stn_a' as any);

        // Modify version 2 to have different coordinates
        const version2 = getNodeVersion(graph, 'stn_a' as any, 2)!;
        version2.x = 300;
        version2.y = 400;

        applyNodeVersion(graph, 'stn_a' as any, version2);

        expect(graph.getNodeAttribute('stn_a', 'x')).toBe(300);
        expect(graph.getNodeAttribute('stn_a', 'y')).toBe(400);
    });

    it('should update the applied version snapshot before reading it', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);
        const basic = getCurrentNodeVersion(graph, 'stn_a' as any)!;
        addNodeVersion(graph, 'stn_a' as any, basic);

        const version2 = getNodeVersion(graph, 'stn_a' as any, 2)!;
        applyNodeVersion(graph, 'stn_a' as any, version2);
        graph.mergeNodeAttributes('stn_a', { x: 300, y: 400 });

        const refreshedVersion2 = getNodeVersion(graph, 'stn_a' as any, 2)!;
        expect(refreshedVersion2.x).toBe(300);
        expect(refreshedVersion2.y).toBe(400);
        expect(getNodeVersion(graph, 'stn_a' as any, 1)!.x).toBe(100);
    });

    it('should restore the stored basic version after applying a historical version', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);
        const basic = getCurrentNodeVersion(graph, 'stn_a' as any)!;
        addNodeVersion(graph, 'stn_a' as any, basic);

        const version2 = getNodeVersion(graph, 'stn_a' as any, 2)!;
        version2.x = 300;
        version2.y = 400;
        applyNodeVersion(graph, 'stn_a' as any, version2);

        applyNodeVersion(graph, 'stn_a' as any, getNodeVersion(graph, 'stn_a' as any, 1)!);

        expect(graph.getNodeAttribute('stn_a', 'x')).toBe(100);
        expect(graph.getNodeAttribute('stn_a', 'y')).toBe(200);
        expect(graph.getNodeAttribute('stn_a', 'currentVersion')).toBe(1);
    });

    it('should remove a historical version', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);
        addNodeVersion(graph, 'stn_a' as any);

        expect(getNodeVersion(graph, 'stn_a' as any, 2)).toBeDefined();

        const removed = removeNodeVersion(graph, 'stn_a' as any, 2);
        expect(removed).toBe(true);
        expect(getNodeVersion(graph, 'stn_a' as any, 2)).toBeUndefined();
    });

    it('should not remove version 1', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);

        const removed = removeNodeVersion(graph, 'stn_a' as any, 1);
        expect(removed).toBe(false);
    });

    it('should return undefined for non-existent version', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 100, 200);

        expect(getNodeVersion(graph, 'stn_a' as any, 99)).toBeUndefined();
    });

    it('should preserve timeline version field in setTimeline/getTimeline', () => {
        const graph = makeGraph();
        const tl: TimelineEntry[] = [{ id: 'stn_a', version: 2 }, { id: 'line_1', reverse: true }, { id: 'stn_b' }];
        setTimeline(graph, tl);
        expect(getTimeline(graph)).toEqual(tl);
    });
});

describe('聚焦/全览互斥约束 getActionConstraintState', () => {
    // 便捷构造 ActionRow（只需关注 actionType）
    let seq = 0;
    const row = (actionType: ActionRow['actionType']): ActionRow => ({
        id: `action_row_${seq++}`,
        date: '',
        activeLineIds: [],
        remark: '',
        actionType,
    });

    // 规则（需求 2c）：
    // - 前面没有全览 或 最近全览之后已有聚焦 → 禁止聚焦（canAddFocus=false）
    // - 前面有全览 且 最近全览之后没有聚焦 → 禁止全览（canAddOverview=false）
    it('空列表 / 只有非全览动作：允许全览、禁止聚焦', () => {
        expect(getActionConstraintState([], 0)).toEqual({ canAddFocus: false, canAddOverview: true });
        expect(getActionConstraintState([row('open')], 1)).toEqual({
            canAddFocus: false,
            canAddOverview: true,
        });
        expect(getActionConstraintState([row('open'), row('wait'), row('close')], 3)).toEqual({
            canAddFocus: false,
            canAddOverview: true,
        });
    });

    it('全览后未聚焦：允许聚焦、禁止全览', () => {
        expect(getActionConstraintState([row('overview')], 1)).toEqual({
            canAddFocus: true,
            canAddOverview: false,
        });
        expect(getActionConstraintState([row('open'), row('overview')], 2)).toEqual({
            canAddFocus: true,
            canAddOverview: false,
        });
    });

    it('全览后已聚焦：禁止聚焦、允许全览', () => {
        expect(getActionConstraintState([row('overview'), row('focus')], 2)).toEqual({
            canAddFocus: false,
            canAddOverview: true,
        });
        expect(getActionConstraintState([row('open'), row('overview'), row('focus')], 3)).toEqual({
            canAddFocus: false,
            canAddOverview: true,
        });
    });

    it('回归：列表以非全览结尾时，不得误判为"没有全览"（原 map().at(-1) 实现的 bug）', () => {
        // 全览后跟了 open 但尚未聚焦：仍应允许插入聚焦（需求 2a 中间插入聚焦场景）
        const rows = [row('open'), row('overview'), row('open')];
        expect(getActionConstraintState(rows, rows.length)).toEqual({
            canAddFocus: true,
            canAddOverview: false,
        });
        // 在全览与后续 open 之间插入：同样允许聚焦
        expect(getActionConstraintState(rows, 2)).toEqual({ canAddFocus: true, canAddOverview: false });
    });

    it('全览后已有聚焦且末尾是 open：禁止聚焦、允许全览', () => {
        const rows = [row('open'), row('overview'), row('focus'), row('open')];
        expect(getActionConstraintState(rows, rows.length)).toEqual({
            canAddFocus: false,
            canAddOverview: true,
        });
    });

    it('多个全览：以最近一次全览为准', () => {
        // 第二次全览后尚未聚焦：允许聚焦
        const rows1 = [row('open'), row('overview'), row('focus'), row('overview')];
        expect(getActionConstraintState(rows1, rows1.length)).toEqual({
            canAddFocus: true,
            canAddOverview: false,
        });
        // 第二次全览后已有聚焦：允许全览
        const rows2 = [row('overview'), row('focus'), row('overview'), row('focus')];
        expect(getActionConstraintState(rows2, rows2.length)).toEqual({
            canAddFocus: false,
            canAddOverview: true,
        });
    });

    it('中间插入：只依据插入位置之前的动作', () => {
        const rows = [row('open'), row('overview'), row('focus'), row('open')];
        // 在全览（index=1）之后、focus（index=2）之前插入：
        // 此时全览后尚无聚焦 → 允许聚焦、禁止全览
        expect(getActionConstraintState(rows, 2)).toEqual({ canAddFocus: true, canAddOverview: false });
        // 在 focus 之后插入：全览后已有聚焦 → 禁止聚焦、允许全览
        expect(getActionConstraintState(rows, 3)).toEqual({ canAddFocus: false, canAddOverview: true });
    });
});
