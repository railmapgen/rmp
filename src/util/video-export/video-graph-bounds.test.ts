import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { createVideoGraphBounds } from './video-graph-bounds';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('misc_node_a', { x: 100, y: 200, visible: true, zIndex: 0, type: MiscNodeType.Virtual });
    graph.addNode('misc_node_b', { x: 300, y: 400, visible: true, zIndex: 0, type: MiscNodeType.Virtual });
    graph.addEdgeWithKey('line_ab', 'misc_node_a', 'misc_node_b', { visible: true } as EdgeAttributes);
    return graph;
};
const makeGeometry = () => {
    const geometry = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    geometry.innerHTML = `
        <g id="misc_node_a" transform="translate(100,200)" data-box="-10 -20 40 30" />
        <g id="misc_node_a.pre" transform="translate(100,200)" data-box="-60 -25 5 5" />
        <g id="misc_node_a.post" transform="translate(100,200)" data-box="20 10 100 20" />
        <g id="misc_node_b" transform="translate(300,400)" data-box="-3 -4 6 8" />
        <g id="line_ab" data-box="100 200 200 200" />
    `;
    return geometry;
};

describe('isolated video graph bounds', () => {
    const originalBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
    let measure: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        measure = vi.fn(function (this: SVGGraphicsElement) {
            expect(this.getRootNode()).toBeInstanceOf(ShadowRoot);
            expect(this.isConnected).toBe(true);
            const [x, y, width, height] = this.getAttribute('data-box')!.split(' ').map(Number);
            return { x, y, width, height };
        });
        Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: measure });
    });
    afterEach(() => {
        if (originalBBox) Object.defineProperty(SVGElement.prototype, 'getBBox', originalBBox);
        else Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
        vi.restoreAllMocks();
        expect(document.querySelector('[data-video-bounds]')).toBeNull();
    });

    it('measures all prepared station layers without querying mounted copies of their IDs', () => {
        const graph = makeGraph();
        const geometry = makeGeometry();
        const original = geometry.outerHTML;
        const foreign = document.createElementNS(geometry.namespaceURI, 'svg');
        foreign.innerHTML = '<g id="misc_node_a" transform="translate(99999,99999)" />';
        document.body.append(foreign);
        const lookup = vi.spyOn(document, 'getElementById');
        try {
            const bounds = createVideoGraphBounds(graph, geometry);
            expect(bounds()).toEqual({ xMin: -10, yMin: 125, xMax: 353, yMax: 454 });
            expect(lookup).not.toHaveBeenCalled();
            expect(measure).toHaveBeenCalledTimes(5);
            expect(geometry.outerHTML).toBe(original);
        } finally {
            foreign.remove();
        }
    });

    it('uses frame positions and reuses the measured bounds for forward and backward seeks', () => {
        const graph = makeGraph();
        const bounds = createVideoGraphBounds(graph, makeGeometry());
        const baseline = bounds();
        const frame = graph.copy();
        frame.mergeNodeAttributes('misc_node_a', { x: 1100, y: 1200 });
        expect(bounds(frame)).toEqual({ xMin: 247, yMin: 346, xMax: 1270, yMax: 1280 });
        expect(bounds()).toEqual(baseline);
        expect(measure).toHaveBeenCalledTimes(5);
        expect(graph.getNodeAttribute('misc_node_a', 'x')).toBe(100);
    });

    it('contracts line bounds with moving endpoints instead of retaining the original line extent', () => {
        const graph = makeGraph();
        graph.mergeNodeAttributes('misc_node_a', { x: 0, y: 0 });
        graph.mergeNodeAttributes('misc_node_b', { x: 1000, y: 0 });
        const geometry = makeGeometry();
        for (const suffix of ['', '.pre', '.post'])
            geometry.getElementById('misc_node_a' + suffix)?.setAttribute('data-box', '0 0 0 0');
        geometry.getElementById('misc_node_b')!.setAttribute('data-box', '0 0 0 0');
        geometry.getElementById('line_ab')!.setAttribute('data-box', '0 0 1000 0');
        const bounds = createVideoGraphBounds(graph, geometry);
        const frame = graph.copy();
        frame.setNodeAttribute('misc_node_a', 'x', 900);
        expect(bounds(frame)).toEqual({ xMin: 850, yMin: -50, xMax: 1050, yMax: 50 });
        expect(bounds()).toEqual({ xMin: -50, yMin: -50, xMax: 1050, yMax: 50 });
        expect(measure).toHaveBeenCalledTimes(5);
    });

    it('excludes hidden and policy-hidden resources and their auxiliary layers', () => {
        const graph = makeGraph();
        graph.setNodeAttribute('misc_node_a', 'visible', false);
        const geometry = makeGeometry();
        geometry.getElementById('line_ab')!.classList.add('removeMe');
        expect(createVideoGraphBounds(graph, geometry)()).toEqual({ xMin: 247, yMin: 346, xMax: 353, yMax: 454 });
        expect(measure).toHaveBeenCalledTimes(1);
    });

    it('falls back to graph coordinates when SVG measurement is unavailable', () => {
        measure.mockImplementation(() => {
            throw new Error('No SVG measurement');
        });
        expect(createVideoGraphBounds(makeGraph(), makeGeometry())()).toEqual({
            xMin: 50,
            yMin: 150,
            xMax: 350,
            yMax: 450,
        });
    });

    it('uses coordinates for an empty geometry source and the established empty-map bounds', () => {
        const geometry = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        expect(createVideoGraphBounds(makeGraph(), geometry)()).toEqual({ xMin: 50, yMin: 150, xMax: 350, yMax: 450 });
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        expect(createVideoGraphBounds(graph, geometry)()).toEqual({ xMin: 0, yMin: 0, xMax: 100, yMax: 100 });
    });

    it('does not restore resources omitted by the prepared geometry policy', () => {
        const graph = makeGraph();
        const geometry = makeGeometry();
        for (const suffix of ['', '.pre', '.post']) geometry.getElementById('misc_node_a' + suffix)?.remove();
        geometry.getElementById('line_ab')!.remove();
        expect(createVideoGraphBounds(graph, geometry)()).toEqual({ xMin: 247, yMin: 346, xMax: 353, yMax: 454 });
    });
});
