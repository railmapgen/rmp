import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LinePathAttributes, LinePathDrawingSession, LinePathType, LineStyleType } from '../constants/lines';
import { makeLinearPath, makePoint } from '../constants/path';
import { StationType } from '../constants/stations';
import { createStore } from '../redux';
import { render } from '../test-utils';
import { LineCreationPreview, LineDrawingGesture } from './line-creation-preview';

const RED: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_source', {
        visible: true,
        zIndex: 0,
        x: 10,
        y: 20,
        type: StationType.ShmetroInt,
    });
    return graph;
};

const renderPreview = (linePath: LinePathType, gesture?: LineDrawingGesture) => {
    window.graph = makeGraph();
    const initialState = createStore().getState();
    const store = createStore({
        runtime: {
            ...initialState.runtime,
            active: 'stn_source',
            mode: `line-${linePath}/${LineStyleType.SingleColor}`,
            theme: RED,
        },
    });
    return render(
        <svg>
            <LineCreationPreview pointerOffset={{ dx: -100, dy: 0 }} gesture={gesture} />
        </svg>,
        { store }
    );
};

describe('LineCreationPreview', () => {
    it('renders an endpoint-derived path with the selected style and theme', () => {
        const { container } = renderPreview(LinePathType.Simple);

        const path = container.querySelector('path');
        expect(path).toHaveAttribute('d', 'M 10 20 L 110 20');
        expect(path).toHaveAttribute('stroke', RED[2]);
        expect(path).toHaveAttribute('pointer-events', 'none');
    });

    it('renders a drawing session path as a translucent preview', () => {
        const pointer = makePoint(80, 90);
        const previewPath = makeLinearPath(makePoint(10, 20), makePoint(75, 85));
        const session: LinePathDrawingSession<LinePathAttributes> = {
            pointerMove: vi.fn(),
            createAttrs: vi.fn(),
            getPreviewPath: vi.fn(() => previewPath),
        };
        const { container } = renderPreview(LinePathType.Freeform, {
            type: LinePathType.Freeform,
            source: 'stn_source',
            sourcePoint: makePoint(10, 20),
            pointer,
            session,
        });

        expect(session.getPreviewPath).toHaveBeenCalledWith(pointer);
        expect(container.querySelector('g')).toHaveAttribute('opacity', '0.65');
        expect(container.querySelector('path')).toHaveAttribute('d', previewPath.d);
    });
});
