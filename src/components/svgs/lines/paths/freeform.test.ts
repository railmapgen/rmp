import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
import { supportsParallelLinePath } from '../../../../util/parallel';
import { getLines } from '../../../../util/process-elements';
import { linePaths, lineStyles } from '../lines';
import { defaultFreeformPathAttributes } from './freeform-model';

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

    it('keeps Freeform compatible with ordinary OpenPath styles', () => {
        expect(linePaths[LinePathType.Freeform].overlayComponent).toBeDefined();
        expect(linePaths[LinePathType.Freeform].drawingBehavior).toBeDefined();

        const unsupportedStyles = new Set([LineStyleType.Unknown, LineStyleType.MRTTapeOut]);
        Object.entries(lineStyles)
            .filter(([style]) => !unsupportedStyles.has(style as LineStyleType))
            .forEach(([, lineStyle]) => {
                expect(lineStyle.metadata.supportLinePathType).toContain(LinePathType.Freeform);
            });
        unsupportedStyles.forEach(style => {
            expect(lineStyles[style].metadata.supportLinePathType).not.toContain(LinePathType.Freeform);
        });
    });

    it('creates complete attributes and previews an OpenPath', () => {
        const session = linePaths[LinePathType.Freeform].drawingBehavior!.createSession(
            { x: 0, y: 0 },
            { x: 10, y: 10 }
        );

        session.pointerMove({ x: 40, y: 25 });
        expect(session.getPreviewPath({ x: 70, y: 10 })?.kind).toBe('complex-open');

        const attrs = session.createAttrs({ x: 100, y: 0 }, { x: 80, y: 20 });
        expect(attrs?.points.length).toBeGreaterThan(2);
        expect(attrs?.widthStops.length).toBeGreaterThan(0);
        expect(attrs).toMatchObject({ startCap: 'round', endCap: 'round' });
    });

    it('rejects drawing gestures that are too short', () => {
        const session = linePaths[LinePathType.Freeform].drawingBehavior!.createSession(
            { x: 0, y: 0 },
            { x: 0.5, y: 0.5 }
        );

        expect(session.createAttrs({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeUndefined();
    });

    it('always generates an OpenPath or EmptyOpenPath', () => {
        const open = linePaths[LinePathType.Freeform].generatePath(0, 100, 0, 0, {
            ...structuredClone(defaultFreeformPathAttributes),
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 0.4, y: 0.2 },
                { id: 'end', x: 1, y: 0 },
            ],
        });
        const empty = linePaths[LinePathType.Freeform].generatePath(0, 0, 0, 0, defaultFreeformPathAttributes);

        expect(open.kind).toBe('complex-open');
        expect(open.d).not.toMatch(/ Z$/);
        expect(empty.kind).toBe('empty-open');
    });

    it('does not support parallel line generation', () => {
        expect(supportsParallelLinePath(LinePathType.Freeform)).toBe(false);
    });

    it('feeds the generated OpenPath directly into normal rendering', () => {
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
            [LineStyleType.SingleColor]: {
                color: ['shanghai', 'sh1', '#E3002B', MonoColour.white],
            },
            reconcileId: 'ignored-for-freeform',
            parallelIndex: 3,
        });

        const generatePath = vi.spyOn(linePaths[LinePathType.Freeform], 'generatePath');
        const [line] = getLines(graph);
        expect(line.line?.path.kind).toBe('complex-open');
        expect(generatePath).toHaveBeenCalledOnce();
        generatePath.mockRestore();
    });
});
