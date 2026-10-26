import { createEvent, fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import TimelineSvgWrapper from './timeline-svg-wrapper';

function ControlledCanvas() {
    const [viewport, setViewport] = React.useState({ x: 0, y: 0, zoom: 100 });
    return <TimelineSvgWrapper onSelect={vi.fn()} viewport={viewport} onViewportChange={setViewport} />;
}

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
        const { container } = render(<ControlledCanvas />, { store });

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

    it.each([
        { ctrlKey: false, metaKey: false, expectedScale: 1.16183424 },
        { ctrlKey: true, metaKey: false, expectedScale: 1.09417428 },
        { ctrlKey: false, metaKey: true, expectedScale: 1.09417428 },
    ])(
        'should zoom around the pointer and prevent browser scrolling or zooming on wheel (%o)',
        ({ expectedScale, ...modifiers }) => {
            const store = createStore();
            const { container } = render(<ControlledCanvas />, { store });

            const svg = container.querySelector('svg') as SVGSVGElement;
            const viewportGroup = container.querySelector('svg g[transform]') as SVGGElement;

            svg.getBoundingClientRect = () =>
                ({
                    x: 40,
                    y: 30,
                    top: 30,
                    left: 40,
                    bottom: 330,
                    right: 440,
                    width: 400,
                    height: 300,
                    toJSON: () => ({}),
                }) as DOMRect;

            const background = svg.querySelector('[data-timeline-background]') as SVGRectElement;
            const wheel = createEvent.wheel(background, {
                clientX: 240,
                clientY: 180,
                deltaY: -100,
                cancelable: true,
                ...modifiers,
            });
            fireEvent(background, wheel);

            expect(wheel.defaultPrevented).toBe(true);
            const transform = viewportGroup.getAttribute('transform')!;
            const [, translateX, translateY, scale] = transform
                .match(/^translate\(([^,]+), ([^)]+)\) scale\(([^)]+)\)$/)!
                .map(Number);
            expect(scale).toBeCloseTo(expectedScale);
            // The canvas point under the pointer must stay at the same screen position.
            expect(translateX + 200 * scale).toBeCloseTo(200);
            expect(translateY + 150 * scale).toBeCloseTo(150);
        }
    );
});
