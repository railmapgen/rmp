import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
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
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 40, y: 20 },
                { id: 'end', x: 100, y: 0 },
            ],
            widthStops: [{ id: 'w', t: 0.5, width: 5 }],
            smoothing: 0.5,
            startCap: 'round',
            endCap: 'round',
        },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: {},
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
};

const getAttrs = (graph: ReturnType<typeof makeGraph>) =>
    graph.getEdgeAttribute('line_freeform', LinePathType.Freeform);

describe('FreeformLineEditorController', () => {
    it('edits middle control points without detaching endpoint anchors', () => {
        const graph = makeGraph();
        const controller = new FreeformLineEditorController({
            graph,
            selected: new Set(['line_freeform']),
            svgViewBoxZoom: 100,
        });

        expect(controller.moveControlPoint('line_freeform', 'start', { x: 5, y: 5 })).toBe(false);
        expect(controller.moveControlPoint('line_freeform', 'mid', { x: 50, y: 25 })).toBe(true);
        expect(getAttrs(graph).points[1]).toMatchObject({ id: 'mid', x: 50, y: 25 });

        expect(controller.insertControlPoint('line_freeform', { x: 75, y: 10 }, 'inserted')).toBe(true);
        expect(getAttrs(graph).points.map((point: { id: string }) => point.id)).toContain('inserted');

        expect(controller.removeControlPoint('line_freeform', 'mid')).toBe(true);
        expect(getAttrs(graph).points.map((point: { id: string }) => point.id)).not.toContain('mid');
    });

    it('adds, moves, resizes, and preserves at least one width stop', () => {
        const graph = makeGraph();
        const controller = new FreeformLineEditorController({
            graph,
            selected: new Set(['line_freeform']),
            svgViewBoxZoom: 100,
        });

        expect(controller.addWidthStopAtPoint('line_freeform', 'mid', 'w2')).toBe(true);
        expect(getAttrs(graph).widthStops).toHaveLength(2);

        expect(controller.moveWidthStop('line_freeform', 'w2', { x: 100, y: 0 })).toBe(true);
        expect(getAttrs(graph).widthStops.find((stop: { id: string }) => stop.id === 'w2').t).toBe(1);

        expect(controller.resizeWidthStop('line_freeform', 'w2', { x: 100, y: 0.05 })).toBe(true);
        expect(getAttrs(graph).widthStops.find((stop: { id: string }) => stop.id === 'w2').width).toBe(0.5);

        expect(controller.removeWidthStop('line_freeform', 'w2')).toBe(true);
        expect(controller.removeWidthStop('line_freeform', 'w')).toBe(false);
        expect(getAttrs(graph).widthStops).toHaveLength(1);
    });
});
