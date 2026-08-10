import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, MiscNodeId, NodeAttributes } from '../../../constants/constants';
import { LinePathType } from '../../../constants/lines';
import { MiscNodeType } from '../../../constants/nodes';
import { createStore } from '../../../redux';
import { setActiveSubscriptions } from '../../../redux/account/account-slice';
import { setMapEnabled } from '../../../redux/param/param-slice';
import { render } from '../../../test-utils';
import { generateClosedPath } from '../../../util/generate-closed-path';
import { findShortestClosedPath } from '../../../util/graph-find-shortest-closed-path';
import { getBezierControlPoint } from '../lines/paths/bezier-geometry';
import type { BezierPathAttributes } from '../lines/paths/bezier-model';
import fill, { defaultFillAttributes } from './fill';

const FILL_ID = 'misc_node_fill' as MiscNodeId;
const FillAttrsComponent = fill.attrsComponent;

const renderFillAttrs = (mapEnabled: boolean) => {
    const store = createStore();
    store.dispatch(setMapEnabled(mapEnabled));
    store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: false }));
    render(
        <RmgThemeProvider>
            <FillAttrsComponent id={FILL_ID} attrs={defaultFillAttributes} handleAttrsUpdate={() => undefined} />
        </RmgThemeProvider>,
        { store }
    );
};

describe('Fill map-native quick shapes', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: false,
                media: '',
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })
        );
        window.graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        window.graph.addNode(FILL_ID, {
            x: 0,
            y: 0,
            visible: true,
            zIndex: 0,
            type: MiscNodeType.Fill,
            [MiscNodeType.Fill]: defaultFillAttributes,
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it.each([
        ['square', 'Create square', 4, 0],
        ['triangle', 'Create triangle', 3, 0],
        ['circle', 'Create circle', 4, -0.5],
    ])('creates a visible Bezier %s for a free user with the map enabled', (_shape, label, edgeCount, normal) => {
        renderFillAttrs(true);

        fireEvent.click(screen.getByRole('button', { name: label }));

        expect(window.graph.size).toBe(edgeCount);
        for (const edgeId of window.graph.edges()) {
            expect(window.graph.getEdgeAttribute(edgeId, 'type')).toBe(LinePathType.Bezier);
            expect((window.graph.getEdgeAttribute(edgeId, LinePathType.Bezier) as BezierPathAttributes).normal).toBe(
                normal
            );
        }

        const closedPath = findShortestClosedPath(window.graph, FILL_ID);
        expect(closedPath).toBeDefined();
        expect(generateClosedPath(window.graph, closedPath!.nodes, closedPath!.edges)).toBeDefined();

        if (_shape === 'circle') {
            const controls = window.graph.edges().map(edgeId => {
                const [sourceId, targetId] = window.graph.extremities(edgeId);
                const source = window.graph.getNodeAttributes(sourceId);
                const target = window.graph.getNodeAttributes(targetId);
                const attrs = window.graph.getEdgeAttribute(edgeId, LinePathType.Bezier) as BezierPathAttributes;
                return getBezierControlPoint(source, target, attrs);
            });
            expect(controls).toEqual(
                expect.arrayContaining([
                    { x: 0, y: -100 },
                    { x: 200, y: -100 },
                    { x: 200, y: 100 },
                    { x: 0, y: 100 },
                ])
            );
        }
    });

    it.each([
        ['square', 'Create square', LinePathType.Perpendicular],
        ['triangle', 'Create triangle', LinePathType.Diagonal],
        ['circle', 'Create circle', LinePathType.Perpendicular],
    ])('keeps the existing diagram-native %s construction while the map is hidden', (_shape, label, type) => {
        renderFillAttrs(false);

        fireEvent.click(screen.getByRole('button', { name: label }));

        expect(window.graph.size).toBeGreaterThan(0);
        window.graph.forEachEdge((_edgeId, attrs) => expect(attrs.type).toBe(type));
    });
});
