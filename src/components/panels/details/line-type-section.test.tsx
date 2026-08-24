import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { beforeEach, describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { MiscNodeType } from '../../../constants/nodes';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import LineTypeSection from './line-type-section';

const realState = store.getState();
const FUTURE_LINE_PATH = 'future-line-path' as LinePathType;

const createFuturePathGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    for (const [id, x] of [
        ['misc_node_a', 0],
        ['misc_node_b', 100],
    ] as const) {
        graph.addNode(id, {
            visible: true,
            zIndex: 0,
            x,
            y: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
        });
    }
    graph.addDirectedEdgeWithKey('line_future', 'misc_node_a', 'misc_node_b', {
        visible: true,
        zIndex: 0,
        type: FUTURE_LINE_PATH,
        [FUTURE_LINE_PATH]: { futureGeometry: true },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: {
            color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
        },
        reconcileId: '',
        parallelIndex: -1,
    } as unknown as EdgeAttributes);
    return graph;
};

describe('LineTypeSection', () => {
    beforeEach(() => {
        window.graph = createFuturePathGraph();
    });

    it('allows an unknown future path to be changed to a supported path', async () => {
        const mockStore = createStore({
            app: {
                ...realState.app,
                preference: {
                    ...realState.app.preference,
                    disableWarning: {
                        ...realState.app.preference.disableWarning,
                        changeType: true,
                    },
                },
            },
            param: {
                ...realState.param,
                present: {
                    ...realState.param.present,
                    graph: window.graph.export(),
                    mapEnabled: false,
                },
            },
            runtime: {
                ...realState.runtime,
                selected: new Set(['line_future']),
            },
        });

        render(<LineTypeSection />, { store: mockStore });
        const [pathTypeSelect] = screen.getAllByRole('combobox');
        fireEvent.change(pathTypeSelect, { target: { value: LinePathType.Diagonal } });

        await waitFor(() => expect(window.graph.getEdgeAttribute('line_future', 'type')).toBe(LinePathType.Diagonal));
        expect(window.graph.hasEdgeAttribute('line_future', FUTURE_LINE_PATH)).toBe(false);
    });
});
