import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Id } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makePoint } from '../constants/path';
import { createStore } from '../redux';
import { LinePathOverlayLayer } from './line-path-overlay-layer';
import { linePaths, lineStyles } from './svgs/lines/lines';

const addLine = (id: string, type: LinePathType) => {
    window.graph.addDirectedEdgeWithKey(id, 'misc_node_a', 'misc_node_b', {
        visible: true,
        zIndex: 0,
        type,
        [type]: structuredClone(linePaths[type].defaultAttrs),
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs),
        reconcileId: '',
        parallelIndex: -1,
    });
};

describe('LinePathOverlayLayer', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        window.graph.addNode('misc_node_a', {
            x: 0,
            y: 0,
            visible: true,
            zIndex: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
        });
        window.graph.addNode('misc_node_b', {
            x: 100,
            y: 0,
            visible: true,
            zIndex: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
        });
    });

    it('renders the overlay registered by the selected line path', () => {
        addLine('line_freeform', LinePathType.Freeform);

        const overlay = LinePathOverlayLayer({
            selected: new Set<Id>(['line_freeform']),
            svgViewBoxZoom: 125,
            svgViewBoxMin: makePoint(10, 20),
        }) as React.ReactElement;

        expect(overlay.type).toBe(linePaths[LinePathType.Freeform].overlayComponent);
        expect(overlay.props).toMatchObject({
            id: 'line_freeform',
            svgViewBoxZoom: 125,
            svgViewBoxMin: makePoint(10, 20),
        });
    });

    it('renders the selected path overlay component', async () => {
        addLine('line_freeform', LinePathType.Freeform);

        const { container } = render(
            <Provider store={createStore()}>
                <svg id="canvas">
                    <LinePathOverlayLayer
                        selected={new Set<Id>(['line_freeform'])}
                        svgViewBoxZoom={100}
                        svgViewBoxMin={makePoint(0, 0)}
                    />
                </svg>
            </Provider>
        );

        await waitFor(() => expect(container.querySelectorAll('circle')).toHaveLength(6));
    });

    it('renders nothing when the selected path has no registered overlay', () => {
        addLine('line_simple', LinePathType.Simple);

        expect(
            LinePathOverlayLayer({
                selected: new Set<Id>(['line_simple']),
                svgViewBoxZoom: 100,
                svgViewBoxMin: makePoint(0, 0),
            })
        ).toBeNull();
    });

    it('renders nothing for multiple selections', () => {
        addLine('line_freeform', LinePathType.Freeform);

        expect(
            LinePathOverlayLayer({
                selected: new Set<Id>(['line_freeform', 'misc_node_a']),
                svgViewBoxZoom: 100,
                svgViewBoxMin: makePoint(0, 0),
            })
        ).toBeNull();
    });
});
