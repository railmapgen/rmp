import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MonoColour, updateTheme } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultBezierPathAttributes } from '../../svgs/lines/paths/bezier-model';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { StationType } from '../../../constants/stations';
import { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import { UpdateColorModal } from './update-color-modal';

vi.mock('@railmapgen/rmg-palette-resources', async importOriginal => {
    const actual = await importOriginal<typeof import('@railmapgen/rmg-palette-resources')>();
    return { ...actual, updateTheme: vi.fn() };
});

type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const RED: Theme = [CityCode.Other, 'red', '#ff0000', MonoColour.white];

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
    [LineStyleType.SingleColor]: { color: RED },
    reconcileId: '',
    parallelIndex: -1,
});

describe('UpdateColorModal', () => {
    beforeEach(() => {
        vi.mocked(updateTheme).mockImplementation(async theme => theme);
    });

    it('updates palette themes without normalizing Bezier geometry', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_left', -100);
        addNode(graph, 'stn_center', 0);
        addNode(graph, 'stn_right', 100);
        graph.addDirectedEdgeWithKey(
            'line_first',
            'stn_left',
            'stn_center',
            makeBezierEdgeAttrs({ x: 0, y: 0 }, { x: 10, y: 20 })
        );
        graph.addDirectedEdgeWithKey(
            'line_second',
            'stn_center',
            'stn_right',
            makeBezierEdgeAttrs({ x: 30, y: 40 }, { x: 0, y: 0 })
        );
        window.graph = graph;
        const store = createStore();
        const onClose = vi.fn();

        render(<UpdateColorModal isOpen={true} onClose={onClose} />, { store });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => expect(onClose).toHaveBeenCalledOnce());

        expect(graph.getEdgeAttribute('line_first', LinePathType.Bezier)?.targetOffset).toEqual({
            x: 10,
            y: 20,
        });
        expect(graph.getEdgeAttribute('line_second', LinePathType.Bezier)?.sourceOffset).toEqual({
            x: 30,
            y: 40,
        });
        expect(store.getState().param.past).toHaveLength(1);
    });
});
