import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../../constants/constants';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { StationType } from '../../constants/stations';
import { createStore } from '..';
import { defaultBezierPathAttributes } from '../../components/svgs/lines/paths/bezier-model';
import { commitEdgesThunk } from './commit-edges-thunk';

type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const RED: Theme = [CityCode.Other, 'red', '#ff0000', MonoColour.white];
const BLUE: Theme = [CityCode.Other, 'blue', '#0000ff', MonoColour.white];

const addNode = (graph: Graph, id: `stn_${string}`, x: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y: 0,
        type: StationType.ShmetroBasic,
    });
};

const makeBezierEdgeAttrs = (
    color: Theme,
    sourceOffset: { x: number; y: number },
    targetOffset: { x: number; y: number }
): EdgeAttributes => ({
    visible: true,
    zIndex: 0,
    type: LinePathType.Bezier,
    [LinePathType.Bezier]: {
        ...structuredClone(defaultBezierPathAttributes),
        sourceOffset,
        targetOffset,
    },
    style: LineStyleType.SingleColor,
    [LineStyleType.SingleColor]: { color },
    reconcileId: '',
    parallelIndex: -1,
});

describe('commitEdgesThunk', () => {
    it('normalizes changed edge endpoint offsets before saving the graph', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_left', -100);
        addNode(graph, 'stn_center', 0);
        addNode(graph, 'stn_right', 100);
        graph.addDirectedEdgeWithKey(
            'line_peer',
            'stn_left',
            'stn_center',
            makeBezierEdgeAttrs(RED, { x: 0, y: 0 }, { x: 10, y: 20 })
        );
        graph.addDirectedEdgeWithKey(
            'line_changed',
            'stn_center',
            'stn_right',
            makeBezierEdgeAttrs(BLUE, { x: 30, y: 40 }, { x: 0, y: 0 })
        );
        graph.setEdgeAttribute('line_changed', LineStyleType.SingleColor, { color: RED });
        window.graph = graph;
        const store = createStore();

        await store.dispatch(commitEdgesThunk({ edgeIds: ['line_changed'] }));

        expect(graph.getEdgeAttribute('line_changed', LinePathType.Bezier)?.sourceOffset).toEqual({
            x: 10,
            y: 20,
        });
        const savedGraph = MultiDirectedGraph.from(store.getState().param.present) as Graph;
        expect(savedGraph.getEdgeAttribute('line_changed', LinePathType.Bezier)?.sourceOffset).toEqual({
            x: 10,
            y: 20,
        });
        expect(store.getState().param.past).toHaveLength(1);
    });

    it('preserves edges whose path type is not registered', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_left', -100);
        addNode(graph, 'stn_right', 100);
        graph.addDirectedEdgeWithKey('line_unknown', 'stn_left', 'stn_right', {
            visible: true,
            zIndex: 0,
            type: 'future-line-path' as LinePathType,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color: RED },
            reconcileId: '',
            parallelIndex: -1,
        });
        window.graph = graph;
        const store = createStore();

        await store.dispatch(commitEdgesThunk({ edgeIds: ['line_unknown'] })).unwrap();

        expect(graph.getEdgeAttribute('line_unknown', 'type')).toBe('future-line-path');
        const savedGraph = MultiDirectedGraph.from(store.getState().param.present) as Graph;
        expect(savedGraph.getEdgeAttribute('line_unknown', 'type')).toBe('future-line-path');
        expect(store.getState().param.past).toHaveLength(1);
    });

    it('rejects when refreshing the committed graph fails', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        window.graph = graph;
        vi.spyOn(graph, 'edgeEntries').mockImplementation(() => {
            throw new Error('refresh failed');
        });
        const store = createStore();

        await expect(store.dispatch(commitEdgesThunk({ edgeIds: [] })).unwrap()).rejects.toMatchObject({
            message: 'refresh failed',
        });
    });
});
