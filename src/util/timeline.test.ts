import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import type { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { CityCode } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

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
    deduplicateTimeline,
    findPathByTheme,
    findThemesAtNode,
    getEdgeThemes,
    getNodeDisplayName,
    getTimeline,
    getUnaddedNodes,
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

const addStation = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, id: string, x = 0, y = 0) => {
    graph.addNode(id, { visible: true, zIndex: 0, x, y, type: StationType.ShmetroBasic } as NodeAttributes);
};

const addMiscNode = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, id: string, x = 0, y = 0) => {
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
            layers: themes.map((color, i) => ({ id: `layer_${i}`, color, width: 5, opacity: 1, linecap: 'butt' as const, dash: 0, gap: 0 })),
        },
    } as EdgeAttributes);
};

describe('getTimeline / setTimeline', () => {
    it('should return empty array when no timeline set', () => {
        const graph = makeGraph();
        expect(getTimeline(graph)).toEqual([]);
    });

    it('should round-trip timeline data', () => {
        const graph = makeGraph();
        const tl = ['stn_a' as const, 'line_1' as const, 'stn_b' as const];
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
