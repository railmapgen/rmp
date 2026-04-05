import { fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import TimelineSvgWrapper from './timeline-svg-wrapper';

describe('TimelineSvgWrapper', () => {
    const resizeObservers: Array<(entries: ResizeObserverEntry[]) => void> = [];

    beforeEach(() => {
        window.graph = new MultiDirectedGraph();

        vi.stubGlobal(
            'ResizeObserver',
            class {
                private readonly callback: (entries: ResizeObserverEntry[]) => void;

                constructor(callback: (entries: ResizeObserverEntry[]) => void) {
                    this.callback = callback;
                    resizeObservers.push(callback);
                }

                observe(target: Element) {
                    this.callback([
                        {
                            target,
                            contentRect: {
                                width: 400,
                                height: 300,
                                x: 0,
                                y: 0,
                                top: 0,
                                left: 0,
                                bottom: 300,
                                right: 400,
                                toJSON: () => ({}),
                            } as DOMRectReadOnly,
                        } as ResizeObserverEntry,
                    ]);
                }

                disconnect() {}
                unobserve() {}
            }
        );
    });

    afterEach(() => {
        resizeObservers.length = 0;
        vi.unstubAllGlobals();
    });

    it('should pan the viewport when dragging the background', () => {
        const store = createStore();
        const { container } = render(<TimelineSvgWrapper onSelect={vi.fn()} />, { store });

        const svg = container.querySelector('svg') as SVGSVGElement;
        const viewportGroup = container.querySelector('svg g[transform]') as SVGGElement;

        expect(viewportGroup.getAttribute('transform')).toBe('translate(0, 0) scale(1)');

        svg.setPointerCapture = vi.fn();
        svg.releasePointerCapture = vi.fn();
        svg.getBoundingClientRect = () =>
            ({
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                bottom: 300,
                right: 400,
                width: 400,
                height: 300,
                toJSON: () => ({}),
            }) as DOMRect;

        fireEvent.pointerDown(svg, { clientX: 120, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(svg, { clientX: 170, clientY: 140, pointerId: 1 });
        fireEvent.pointerUp(svg, { clientX: 170, clientY: 140, pointerId: 1 });

        expect(viewportGroup.getAttribute('transform')).toBe('translate(50, 40) scale(1)');
    });

    it('should zoom the viewport on wheel', () => {
        const store = createStore();
        const { container } = render(<TimelineSvgWrapper onSelect={vi.fn()} />, { store });

        const svg = container.querySelector('svg') as SVGSVGElement;
        const viewportGroup = container.querySelector('svg g[transform]') as SVGGElement;

        svg.getBoundingClientRect = () =>
            ({
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                bottom: 300,
                right: 400,
                width: 400,
                height: 300,
                toJSON: () => ({}),
            }) as DOMRect;

        fireEvent.wheel(svg, { clientX: 200, clientY: 150, deltaY: -100 });

        const transform = viewportGroup.getAttribute('transform');
        expect(transform).not.toBe('translate(0, 0) scale(1)');
        expect(transform).toContain('scale(');
    });
});
