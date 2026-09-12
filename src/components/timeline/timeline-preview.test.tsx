import { fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { TimelineDocument, TimelineKeyframeEntry } from '../../constants/timeline';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import TimelinePreview from './timeline-preview';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_a', {
        visible: true,
        zIndex: 0,
        x: 10,
        y: 20,
        type: 'shmetro-basic',
        'shmetro-basic': { names: ['Alpha', 'Alpha'], nameOffsetX: 'right', nameOffsetY: 'top' },
    } as unknown as NodeAttributes);
    return graph;
};

const keyframe = (x: number, y: number): TimelineKeyframeEntry => ({
    id: 'key_a',
    kind: 'keyframe',
    refId: 'stn_a',
    x,
    y,
});

describe('TimelinePreview', () => {
    beforeEach(() => {
        window.graph = makeGraph();
    });

    it('keeps a station visible on its exit card and hides it after the card', () => {
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [
                { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'clip_a_exit', kind: 'node', refId: 'stn_a', phase: 'exit', showAnimation: true },
            ],
        };

        const { container, rerender } = render(
            <TimelinePreview
                document={document}
                cursor={0}
                viewport={{ x: 0, y: 0, zoom: 100 }}
                onKeyframeMove={vi.fn()}
                onViewportChange={vi.fn()}
            />,
            { store: createStore() }
        );

        expect(container.querySelector('#stn_core_stn_a')).not.toBeNull();

        rerender(
            <TimelinePreview
                document={document}
                cursor={1}
                viewport={{ x: 0, y: 0, zoom: 100 }}
                onKeyframeMove={vi.fn()}
                onViewportChange={vi.fn()}
            />
        );

        expect(container.querySelector('#stn_core_stn_a')).not.toBeNull();

        rerender(
            <TimelinePreview
                document={document}
                cursor={2}
                viewport={{ x: 0, y: 0, zoom: 100 }}
                onKeyframeMove={vi.fn()}
                onViewportChange={vi.fn()}
            />
        );

        expect(container.querySelector('#stn_core_stn_a')).toBeNull();
    });

    it('renders only the entered portions of reconciled lines without changing the source graph', () => {
        const graph = window.graph;
        graph.mergeNodeAttributes('stn_a', { x: 0, y: 0 });
        graph.addNode('stn_b', { ...graph.getNodeAttributes('stn_a'), x: 100 });
        graph.addNode('stn_c', { ...graph.getNodeAttributes('stn_a'), x: 200 });
        const attrs: EdgeAttributes = {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: { offset: 0 },
            style: LineStyleType.SingleColor,
            reconcileId: 'chain',
            parallelIndex: -1,
        };
        graph.addDirectedEdgeWithKey('line_a', 'stn_a', 'stn_b', attrs);
        graph.addDirectedEdgeWithKey('line_b', 'stn_b', 'stn_c', attrs);
        const original = structuredClone(graph.export());
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [
                { id: 'clip_a', kind: 'edge', refId: 'line_a', phase: 'enter', showAnimation: true },
                { id: 'clip_b', kind: 'edge', refId: 'line_b', phase: 'enter', showAnimation: true },
                { id: 'exit_a', kind: 'edge', refId: 'line_a', phase: 'exit', showAnimation: true },
            ],
        };
        const props = {
            document,
            viewport: { x: 0, y: 0, zoom: 100 },
            onKeyframeMove: vi.fn(),
            onViewportChange: vi.fn(),
        };
        const { container, rerender } = render(<TimelinePreview {...props} cursor={0} />, { store: createStore() });

        expect(container.querySelector('#line_a path')?.getAttribute('d')).toBe('M 0 0 L 100 0');
        expect(container.querySelector('#line_b')).toBeNull();
        rerender(<TimelinePreview {...props} cursor={1} />);
        expect(container.querySelector('#line_a path')?.getAttribute('d')).toContain('200');
        rerender(<TimelinePreview {...props} cursor={2} />);
        expect(container.querySelector('#line_a path')?.getAttribute('d')).toContain('200');
        rerender(<TimelinePreview {...props} cursor={3} />);
        expect(container.querySelector('#line_a')).toBeNull();
        expect(container.querySelector('#line_b path')?.getAttribute('d')).toBe('M 100 0 L 200 0');
        expect(graph.export()).toEqual(original);
    });

    it('drags the node referenced by the selected keyframe', () => {
        const onKeyframeMove = vi.fn();
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [
                { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                keyframe(10, 20),
            ],
        };

        const { container } = render(
            <TimelinePreview
                document={document}
                cursor={1}
                viewport={{ x: 0, y: 0, zoom: 100 }}
                editableKeyframe={keyframe(10, 20)}
                onKeyframeMove={onKeyframeMove}
                onViewportChange={vi.fn()}
            />,
            { store: createStore() }
        );

        const core = container.querySelector('#stn_core_stn_a') as SVGCircleElement;
        const svg = container.querySelector('svg') as SVGSVGElement;
        let coreLeft = 0;
        core.setPointerCapture = vi.fn();
        core.releasePointerCapture = vi.fn();
        core.getBoundingClientRect = () => ({ left: coreLeft, top: 0 }) as DOMRect;
        svg.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;

        fireEvent.pointerDown(core, { clientX: 0, clientY: 0, pointerId: 1 });
        fireEvent.pointerMove(core, { clientX: 30, clientY: 40, pointerId: 1 });
        coreLeft = 30;
        fireEvent.pointerMove(core, { clientX: 60, clientY: 80, pointerId: 1 });
        fireEvent.pointerUp(core, { clientX: 60, clientY: 80, pointerId: 1 });

        expect(onKeyframeMove).toHaveBeenCalledWith('key_a', 70, 100);
    });

    it('pans and zooms the preview canvas from its background', () => {
        const onViewportChange = vi.fn();
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [{ id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true }],
        };
        const { container } = render(
            <TimelinePreview
                document={document}
                cursor={0}
                viewport={{ x: 0, y: 0, zoom: 100 }}
                onKeyframeMove={vi.fn()}
                onViewportChange={onViewportChange}
            />,
            { store: createStore() }
        );
        const svg = container.querySelector('svg') as SVGSVGElement;
        svg.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
        svg.setPointerCapture = vi.fn();
        svg.releasePointerCapture = vi.fn();

        fireEvent.pointerDown(svg, { clientX: 10, clientY: 20, pointerId: 1 });
        fireEvent.pointerMove(svg, { clientX: 30, clientY: 50, pointerId: 1 });
        fireEvent.pointerUp(svg, { clientX: 30, clientY: 50, pointerId: 1 });
        fireEvent.wheel(svg, { clientX: 100, clientY: 100, deltaY: -100 });

        expect(onViewportChange).toHaveBeenCalledWith({ x: -20, y: -30, zoom: 100 });
        expect(onViewportChange).toHaveBeenCalledTimes(2);
    });
});
