import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
import { supportsParallelLinePath } from '../../../../util/parallel';
import { getLines } from '../../../../util/process-elements';
import { linePaths, lineStyles } from '../lines';

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

    it('registers freeform as a line path supported only by single-color', () => {
        expect(linePaths[LinePathType.Freeform]).toBeDefined();
        expect(linePaths[LinePathType.Freeform].overlayComponent).toBeDefined();
        expect(linePaths[LinePathType.Freeform].drawingBehavior).toBeDefined();
        expect(lineStyles[LineStyleType.SingleColor].metadata.supportLinePathType).toContain(LinePathType.Freeform);

        Object.entries(lineStyles)
            .filter(([style]) => style !== LineStyleType.SingleColor)
            .forEach(([, lineStyle]) =>
                expect(lineStyle.metadata.supportLinePathType).not.toContain(LinePathType.Freeform)
            );
    });

    it('uses its drawing behavior to collect points and build path attributes', () => {
        const session = linePaths[LinePathType.Freeform].drawingBehavior!.createSession(
            { x: 0, y: 0 },
            { x: 10, y: 10 }
        );

        session.pointerMove({ x: 10.5, y: 10 });
        session.pointerMove({ x: 40, y: 25 });
        expect(session.getPreview({ x: 70, y: 10 })).not.toBeNull();

        const attrs = session.createAttrs({ x: 100, y: 0 }, { x: 80, y: 20 });
        expect(attrs?.points.length).toBeGreaterThan(2);
        expect(attrs?.points).toEqual(expect.arrayContaining([expect.objectContaining({ x: 10, y: 10 })]));
        expect(attrs?.points).toEqual(expect.arrayContaining([expect.objectContaining({ x: 80, y: 20 })]));
        expect(attrs?.points.at(-1)).toMatchObject({ x: 100, y: 0 });
    });

    it('rejects drawing gestures that are too short to form a useful path', () => {
        const session = linePaths[LinePathType.Freeform].drawingBehavior!.createSession(
            { x: 0, y: 0 },
            { x: 0.5, y: 0.5 }
        );

        expect(session.createAttrs({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeUndefined();
    });

    it('does not support parallel line generation', () => {
        expect(supportsParallelLinePath(LinePathType.Freeform)).toBe(false);
    });

    it('resolves its area path without auto-simple or reconcile handling', () => {
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

        const generatePath = vi.spyOn(linePaths[LinePathType.Freeform], 'generatePath');
        const [line] = getLines(graph);
        expect(line.id).toBe('line_freeform');
        expect(line.line?.path.kind).toBe('closed-area');
        expect(line.line?.path.d).toMatch(/^M .* Z$/);
        expect(generatePath).toHaveBeenCalledOnce();
        generatePath.mockRestore();
    });
});
