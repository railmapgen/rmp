import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { beforeAll, describe, expect, it } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';

describe('freeform line path registration', () => {
    beforeAll(() => {
        if (!window.localStorage) {
            const store = new Map<string, string>();
            Object.defineProperty(window, 'localStorage', {
                value: {
                    getItem: (key: string) => store.get(key) ?? null,
                    setItem: (key: string, value: string) => store.set(key, value),
                    removeItem: (key: string) => store.delete(key),
                    clear: () => store.clear(),
                },
                configurable: true,
            });
        }
    });

    it('registers freeform as a line path supported only by single-color', async () => {
        const { linePaths, lineStyles } = await import('../lines');

        expect(linePaths[LinePathType.Freeform]).toBeDefined();
        expect(lineStyles[LineStyleType.SingleColor].metadata.supportLinePathType).toContain(LinePathType.Freeform);

        Object.entries(lineStyles)
            .filter(([style]) => style !== LineStyleType.SingleColor)
            .forEach(([, lineStyle]) =>
                expect(lineStyle.metadata.supportLinePathType).not.toContain(LinePathType.Freeform)
            );
    });

    it('does not support parallel line generation', async () => {
        const { supportsParallelLinePath } = await import('../../../../util/parallel');

        expect(supportsParallelLinePath(LinePathType.Freeform)).toBe(false);
    });

    it('resolves centerline and area path without auto-simple or reconcile handling', async () => {
        const { getLines } = await import('../../../../util/process-elements');
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
            [LineStyleType.SingleColor]: {
                color: ['shanghai', 'sh1', '#E3002B', MonoColour.white],
            },
            reconcileId: 'ignored-for-freeform',
            parallelIndex: 3,
        });

        const [line] = getLines(graph);
        expect(line.id).toBe('line_freeform');
        expect(line.line?.path.d).toMatch(/^M 0 0/);
        expect(line.line?.areaPathD).toMatch(/^M .* Z$/);
    });
});
