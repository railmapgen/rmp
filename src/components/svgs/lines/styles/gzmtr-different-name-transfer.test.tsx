import { MultiDirectedGraph } from 'graphology';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { StationType } from '../../../../constants/stations';
import { canUseLineCombination } from '../../../../util/line-path-availability';
import { getLines, getNodes } from '../../../../util/process-elements';
import SvgLayer from '../../../svg-layer';
import { SvgRenderProvider } from '../../../svg-render-context';
import gzmtrInt2024 from '../../stations/gzmtr-int-2024';
import { linePaths } from '../lines';
import { GZMTR_2024_SCALE, transferJunction } from './gzmtr-transfer-geometry';

function drawing() {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_a', { x: 0, y: 0, visible: true, zIndex: 0, type: StationType.GzmtrInt2024 });
    graph.addNode('stn_b', { x: 0, y: 50, visible: true, zIndex: 0, type: StationType.GzmtrInt2024 });
    graph.addNode('stn_near', { x: 0, y: 25, visible: true, zIndex: 0, type: StationType.GzmtrInt2024 });
    graph.addDirectedEdgeWithKey('line_transfer', 'stn_a', 'stn_b', {
        type: LinePathType.Simple,
        [LinePathType.Simple]: { offset: 0 },
        style: LineStyleType.GzmtrDifferentNameTransfer,
        [LineStyleType.GzmtrDifferentNameTransfer]: {},
        zIndex: 0,
        visible: true,
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
}

function renderDrawing(graph: ReturnType<typeof drawing>) {
    const noop = () => {};
    const svg = renderToStaticMarkup(
        <svg>
            <SvgRenderProvider value={{ graph, getImage: async () => undefined, ensureFont: noop }}>
                <SvgLayer
                    elements={[...getLines(graph), ...getNodes(graph)]}
                    selected={new Set()}
                    mapEnabled={false}
                    isSubscriber={true}
                    handlePointerDown={noop}
                    handlePointerMove={noop}
                    handlePointerUp={noop}
                    handleEdgePointerDown={noop}
                    handleEdgeDoubleClick={noop}
                />
            </SvgRenderProvider>
        </svg>
    );
    return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

describe('Guangzhou transfer line style', () => {
    it.each(Object.values(LinePathType))('follows the authored %s path and opens both capsule ends', type => {
        expect(canUseLineCombination(type, LineStyleType.GzmtrDifferentNameTransfer, false, true)).toBe(true);
        const graph = drawing();
        graph.setNodeAttribute('stn_b', 'x', 85);
        const [start, end] = linePaths[LinePathType.Freeform].defaultAttrs.points;
        const attrs =
            type === LinePathType.Freeform
                ? { ...linePaths[type].defaultAttrs, points: [start, { id: 'bend', x: 0.45, y: 0.3 }, end] }
                : linePaths[type].defaultAttrs;
        graph.mergeEdgeAttributes('line_transfer', { type, [type]: attrs });
        const doc = renderDrawing(graph);
        const band = doc.getElementById('line_transfer')!;
        const centerline = getLines(graph)[0].line!.path.d;
        expect(band.querySelector('path[stroke="white"]')!.getAttribute('d')).toBe(centerline);
        const mouths = doc.getElementById('line_transfer.post')!;
        for (const end of ['stn_a', 'stn_b']) {
            const mouth = mouths.querySelector(`[data-transfer-mouth="${end}"]`)!;
            expect(mouth.querySelector('path[fill="#aaa"]')!.getAttribute('d')).toContain('Q');
            expect(mouth.querySelector('path[fill="white"]')!.getAttribute('d')).toContain('Q');
        }
    });

    it('paints only the connected mouths at the line z-index and leaves the station hit targets available', () => {
        const graph = drawing();
        graph.setNodeAttribute('stn_b', 'zIndex', 1);
        const doc = renderDrawing(graph);
        const line = doc.getElementById('line_transfer')!;
        const mouths = doc.getElementById('line_transfer.post')!;
        expect(line.querySelectorAll('clipPath')).toHaveLength(2);
        expect(mouths.querySelectorAll('path[fill="white"]')).toHaveLength(2);
        expect(mouths.querySelector('[pointer-events="none"]')).not.toBeNull();
        expect(doc.getElementById('stn_a')!.compareDocumentPosition(mouths)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(doc.getElementById('stn_b')!.compareDocumentPosition(mouths)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it.each([true, false])('matches an anchored, uneven capsule layout (topHeavy=%s)', topHeavy => {
        const graph = drawing();
        const attrs = structuredClone(gzmtrInt2024.defaultAttrs);
        attrs.transfer[0].push([...attrs.transfer[0][0]]);
        attrs.columns = 2;
        attrs.anchorAt = 2;
        attrs.topHeavy = topHeavy;
        graph.setNodeAttribute('stn_a', StationType.GzmtrInt2024, attrs);
        const doc = renderDrawing(graph);
        // Take the reference positions from the station actually painted by svg-assets.
        const shells = Array.from(doc.getElementById('stn_a')!.querySelectorAll('path[stroke="#aaa"][transform]'));
        expect(shells).toHaveLength(3);
        const translate = (el: Element) =>
            el.getAttribute('transform')!.slice('translate('.length, -1).split(',').map(Number);
        const [dx, dy] = translate(shells[0].parentElement!);
        const badges = shells.map(shell => {
            const [x, y] = translate(shell);
            return { x: (dx + x) * GZMTR_2024_SCALE, y: (dy + y) * GZMTR_2024_SCALE, foshan: false };
        });
        const { inner } = transferJunction(getLines(graph)[0].line!.path, badges, { x: 0, y: 0 });
        expect(inner).toContain('Q');
        expect(doc.getElementById('line_transfer.post')!.querySelector('path[fill="white"]')!.getAttribute('d')).toBe(
            inner
        );
    });

    it('keeps a plain band at other or hidden endpoints', () => {
        const graph = drawing();
        graph.setNodeAttribute('stn_b', 'type', StationType.GzmtrBasic);
        const mixed = renderDrawing(graph);
        expect(mixed.getElementById('line_transfer')!.querySelectorAll('clipPath')).toHaveLength(1);
        expect(mixed.getElementById('line_transfer.post')!.querySelectorAll('path[fill="white"]')).toHaveLength(1);
        graph.setNodeAttribute('stn_a', 'visible', false);
        const hidden = renderDrawing(graph);
        expect(hidden.getElementById('line_transfer.post')!.querySelectorAll('path')).toHaveLength(0);
        expect(hidden.getElementById('line_transfer')!.querySelector('path[stroke="white"]')!.getAttribute('d')).toBe(
            'M 0 0 L 0 50'
        );
    });
});
