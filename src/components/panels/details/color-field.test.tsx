import { fireEvent, screen } from '@testing-library/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, NodeId, Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { StationType } from '../../../constants/stations';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import { defaultBezierPathAttributes } from '../../svgs/lines/paths/bezier-model';
import { ColorField, ColorFieldContext } from './color-field';
import { LineSpecificAttributes } from './specific-attrs';

type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const realState = store.getState();
const NEXT_THEME: Theme = [CityCode.Other, 'next', '#123456', MonoColour.white];
const CURRENT_THEME: Theme = [CityCode.Other, 'current', '#654321', MonoColour.white];

const addNode = (graph: Graph, id: NodeId, x: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y: 0,
        type: StationType.ShmetroBasic,
    });
};

const makeBezierEdgeAttrs = (color: Theme, sourceOffset: { x: number; y: number }): EdgeAttributes => ({
    visible: true,
    zIndex: 0,
    type: LinePathType.Bezier,
    [LinePathType.Bezier]: {
        ...structuredClone(defaultBezierPathAttributes),
        sourceOffset,
        targetOffset: { x: 0, y: 0 },
    },
    style: LineStyleType.SingleColor,
    [LineStyleType.SingleColor]: { color },
    reconcileId: '',
    parallelIndex: -1,
});

vi.mock('../../../util/hooks', () => ({
    usePaletteTheme: ({ theme, onThemeApplied }: { theme: Theme; onThemeApplied?: (theme: Theme) => void }) => ({
        theme,
        requestThemeChange: () => onThemeApplied?.(NEXT_THEME),
    }),
}));

describe('ColorField', () => {
    it('returns the complete updated attributes through its specific-attributes context', () => {
        const handleAttrsUpdate = vi.fn();

        render(
            <ColorFieldContext.Provider
                value={{
                    type: LineStyleType.SingleColor,
                    attrs: { color: CURRENT_THEME, width: 8 },
                    handleAttrsUpdate,
                }}
            >
                <ColorField type={LineStyleType.SingleColor} defaultTheme={CURRENT_THEME} />
            </ColorFieldContext.Provider>
        );

        fireEvent.click(screen.getByRole('button'));

        expect(handleAttrsUpdate).toHaveBeenCalledWith({ color: NEXT_THEME, width: 8 });
    });

    it('normalizes a color-edited Bezier edge before saving its undo snapshot', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_left', -100);
        addNode(graph, 'stn_center', 0);
        addNode(graph, 'stn_right', 100);
        graph.addDirectedEdgeWithKey(
            'line_peer',
            'stn_left',
            'stn_center',
            makeBezierEdgeAttrs(NEXT_THEME, { x: 0, y: 0 })
        );
        graph.setEdgeAttribute('line_peer', LinePathType.Bezier, {
            ...graph.getEdgeAttribute('line_peer', LinePathType.Bezier)!,
            targetOffset: { x: 11, y: 12 },
        });
        graph.addDirectedEdgeWithKey(
            'line_selected',
            'stn_center',
            'stn_right',
            makeBezierEdgeAttrs(CURRENT_THEME, { x: 31, y: 32 })
        );
        window.graph = graph;
        const testStore = createStore({
            param: {
                ...realState.param,
                present: graph.export(),
            },
            runtime: {
                ...realState.runtime,
                selected: new Set(['line_selected']),
            },
        });

        render(<LineSpecificAttributes />, { store: testStore });
        const enabledButtons = screen.getAllByRole('button').filter(button => !button.hasAttribute('disabled'));
        expect(enabledButtons).toHaveLength(1);
        fireEvent.click(enabledButtons[0]);

        expect(graph.getEdgeAttribute('line_selected', LinePathType.Bezier)?.sourceOffset).toEqual({
            x: 11,
            y: 12,
        });
        const savedGraph = MultiDirectedGraph.from(testStore.getState().param.present) as Graph;
        expect(savedGraph.getEdgeAttribute('line_selected', LinePathType.Bezier)?.sourceOffset).toEqual({
            x: 11,
            y: 12,
        });
        expect(testStore.getState().param.past).toHaveLength(1);
    });
});
