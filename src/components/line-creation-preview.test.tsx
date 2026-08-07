import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LinePathAttributes, LinePathDrawingSession, LinePathType, LineStyleType } from '../constants/lines';
import { makeLinearPath, makePoint } from '../constants/path';
import { StationType } from '../constants/stations';
import { render } from '../test-utils';
import { LineCreationPreview } from './line-creation-preview';

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

describe('LineCreationPreview', () => {
    it('renders an endpoint-derived path with the selected style and theme', () => {
        const { container } = render(
            <svg>
                <LineCreationPreview
                    graph={makeGraph()}
                    linePath={LinePathType.Simple}
                    lineStyle={LineStyleType.SingleColor}
                    theme={RED}
                    source="stn_source"
                    pointerOffset={{ dx: -100, dy: 0 }}
                />
            </svg>
        );

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
        const { container } = render(
            <svg>
                <LineCreationPreview
                    graph={makeGraph()}
                    linePath={LinePathType.Freeform}
                    lineStyle={LineStyleType.SingleColor}
                    theme={RED}
                    source="stn_source"
                    pointerOffset={{ dx: -100, dy: 0 }}
                    gesture={{
                        type: LinePathType.Freeform,
                        source: 'stn_source',
                        pointer,
                        session,
                    }}
                />
            </svg>
        );

        expect(session.getPreviewPath).toHaveBeenCalledWith(pointer);
        expect(container.querySelector('g')).toHaveAttribute('opacity', '0.65');
        expect(container.querySelector('path')).toHaveAttribute('d', previewPath.d);
    });
});
