import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { act, fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { StationType } from '../../../constants/stations';
import store, { createStore } from '../../../redux';
import { undoAction } from '../../../redux/project-history';
import { render } from '../../../test-utils';
import londonTubeBasicStation, { LondonTubeBasicStationAttributes } from './london-tube-basic';

const Station = londonTubeBasicStation.component;
const AttrsComponent = londonTubeBasicStation.attrsComponent!;
const realState = store.getState();

const createGraph = (terminal: boolean, terminalNameRotate: number) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_test', {
        x: 0,
        y: 0,
        type: StationType.LondonTubeBasic,
        visible: true,
        zIndex: 0,
        [StationType.LondonTubeBasic]: {
            ...structuredClone(londonTubeBasicStation.defaultAttrs),
            terminal,
            terminalNameRotate,
        },
    });
    return graph;
};

const getAttrs = () =>
    window.graph.getNodeAttribute('stn_test', StationType.LondonTubeBasic) as LondonTubeBasicStationAttributes;

const renderAttrs = (terminal: boolean, terminalNameRotate: number) => {
    window.graph = createGraph(terminal, terminalNameRotate);
    const mockStore = createStore({
        param: {
            ...realState.param,
            present: {
                ...realState.param.present,
                graph: window.graph.export(),
                mapEnabled: true,
            },
            past: [],
            future: [],
        },
        runtime: {
            ...realState.runtime,
            selected: new Set(['stn_test']),
            isDetailsOpen: 'show',
        },
    });
    const attrs = getAttrs();
    const { container } = render(<AttrsComponent id="stn_test" attrs={attrs} handleAttrsUpdate={vi.fn()} />, {
        store: mockStore,
    });
    const slider = container.querySelector<SVGSVGElement>('[role="slider"][aria-valuemax="359"]');
    expect(slider).not.toBeNull();
    vi.spyOn(slider!, 'getBoundingClientRect').mockReturnValue({
        bottom: 150,
        height: 150,
        left: 0,
        right: 150,
        top: 0,
        width: 150,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    });
    return { mockStore, slider: slider! };
};

const dragToRightThenBottom = (slider: SVGSVGElement) => {
    act(() => fireEvent.mouseDown(slider, { clientX: 150, clientY: 75 }));
    act(() => fireEvent.mouseMove(window, { clientX: 75, clientY: 150 }));
};

describe('LondonTubeBasicStation', () => {
    it('uses a nearby text layout template for a freely rotated terminal name', () => {
        const { container } = render(
            <svg>
                <Station
                    id="stn_test"
                    x={0}
                    y={0}
                    attrs={{
                        [StationType.LondonTubeBasic]: {
                            names: ['Station'],
                            transfer: [[[CityCode.London, 'central', '#DC241F', MonoColour.white, 0]]],
                            rotate: 23,
                            terminal: true,
                            terminalNameRotate: 113,
                            stepFreeAccess: 'none',
                        },
                    }}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                />
            </svg>
        );

        expect(container.querySelector('#stn_core_stn_test')?.parentElement).toHaveAttribute('transform', 'rotate(23)');
        expect(container.querySelector('#stn_name_stn_test')).toHaveAttribute('text-anchor', 'start');
    });

    it('previews terminal rotation continuously and saves one undo entry when dragging ends', () => {
        const { mockStore, slider } = renderAttrs(true, 0);

        dragToRightThenBottom(slider);

        expect(getAttrs().rotate).toBe(180);
        expect(mockStore.getState().param.past).toHaveLength(0);
        expect(getAttrs().terminalNameRotate).toBe(180);

        act(() => fireEvent.mouseUp(window));

        expect(mockStore.getState().param.past).toHaveLength(1);
        expect(getAttrs().rotate).toBe(180);
        expect(getAttrs().terminalNameRotate).toBe(180);

        act(() => {
            mockStore.dispatch(undoAction());
        });
        expect(getAttrs().rotate).toBe(0);
        expect(getAttrs().terminalNameRotate).toBe(0);
    });

    it('does not overwrite the saved terminal name rotation for a non-terminal station', () => {
        const { mockStore, slider } = renderAttrs(false, 270);

        act(() => fireEvent.mouseDown(slider, { clientX: 150, clientY: 75 }));
        act(() => fireEvent.mouseUp(window));

        expect(mockStore.getState().param.past).toHaveLength(1);
        expect(getAttrs().rotate).toBe(90);
        expect(getAttrs().terminalNameRotate).toBe(270);
    });
});
