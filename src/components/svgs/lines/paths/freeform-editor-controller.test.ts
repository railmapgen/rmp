import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
import { defaultFreeformPathAttributes } from './freeform-model';
import { FreeformLineEditorController } from './freeform-editor-controller';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<any, any, any>();
    graph.addNode('misc_node_a', {
        x: 0,
        y: 0,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
        visible: true,
        zIndex: 0,
    });
    graph.addNode('misc_node_b', {
        x: 100,
        y: 0,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
        visible: true,
        zIndex: 0,
    });
    graph.addDirectedEdgeWithKey('line_freeform', 'misc_node_a', 'misc_node_b', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Freeform,
        [LinePathType.Freeform]: {
            ...structuredClone(defaultFreeformPathAttributes),
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 0.4, y: 0.2 },
                { id: 'end', x: 1, y: 0 },
            ],
        },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: {},
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
};

describe('FreeformLineEditorController', () => {
    it('edits control points while preserving dormant outline attributes', () => {
        const graph = makeGraph();
        const controller = new FreeformLineEditorController({ graph, svgViewBoxZoom: 100 });

        expect(controller.moveControlPoint('line_freeform', 'start', { x: 5, y: 5 })).toBe(false);
        expect(controller.moveControlPoint('line_freeform', 'mid', { x: 50, y: 25 })).toBe(true);
        expect(controller.insertControlPoint('line_freeform', { x: 75, y: 10 }, 'inserted')).toBe(true);
        expect(controller.removeControlPoint('line_freeform', 'mid')).toBe(true);

        const attrs = graph.getEdgeAttribute('line_freeform', LinePathType.Freeform);
        expect(attrs.points.map((point: { id: string }) => point.id)).toEqual(['start', 'inserted', 'end']);
        expect(attrs.widthStops).toEqual(defaultFreeformPathAttributes.widthStops);
    });

    it('ignores non-Freeform edges', () => {
        const graph = makeGraph();
        graph.setEdgeAttribute('line_freeform', 'type', LinePathType.Simple);
        const controller = new FreeformLineEditorController({ graph, svgViewBoxZoom: 100 });

        expect(controller.getFreeformEditableById('line_freeform')).toBeUndefined();
    });
});
