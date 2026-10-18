import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bjsubwayTextLineBadge from './bjsubway-text-line-badge';

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(yes => {
        resolve = yes;
    });
    return { promise, resolve };
};

class GeometryObserver {
    static instances: GeometryObserver[] = [];
    target?: Element;
    observe = vi.fn((target: Element) => {
        this.target = target;
    });
    unobserve = vi.fn();
    disconnect = vi.fn();

    constructor(private callback: ResizeObserverCallback) {
        GeometryObserver.instances.push(this);
    }

    report(width: number, height = 12) {
        this.callback(
            [{ target: this.target!, contentRect: new DOMRect(0, 0, width, height) } as ResizeObserverEntry],
            this as unknown as ResizeObserver
        );
    }
}

const Badge = bjsubwayTextLineBadge.component;
// Reuse the same restored attributes throughout: recovery must not require editing the name.
const restoredAttrs = {
    ...bjsubwayTextLineBadge.defaultAttrs,
    names: ['深大城际', 'Shenda Intercity'] as [string, string],
};
const tree = () => (
    <svg>
        <Badge
            id="misc_node_restored_badge"
            x={0}
            y={0}
            attrs={restoredAttrs}
            handlePointerDown={vi.fn()}
            handlePointerMove={vi.fn()}
            handlePointerUp={vi.fn()}
        />
    </svg>
);
const badgeWidth = (container: HTMLElement) => Number(container.querySelector('rect')?.getAttribute('width'));

describe('Beijing text line badge editor layout recovery', () => {
    let originalFonts: PropertyDescriptor | undefined;
    let originalGetBBox: PropertyDescriptor | undefined;
    let fonts: EventTarget;
    let ready: ReturnType<typeof deferred>;
    let measuredWidth: number;
    const getBBox = vi.fn(() => new DOMRect(0, 0, measuredWidth, 12));

    beforeEach(() => {
        ready = deferred();
        fonts = Object.assign(new EventTarget(), { ready: ready.promise });
        originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
        Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
        originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
        Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: getBBox });
        measuredWidth = 64;
        getBBox.mockClear();
        GeometryObserver.instances = [];
        vi.stubGlobal('ResizeObserver', GeometryObserver);
    });

    afterEach(() => {
        cleanup();
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else delete (document as { fonts?: unknown }).fonts;
        if (originalGetBBox) Object.defineProperty(SVGElement.prototype, 'getBBox', originalGetBBox);
        else delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
        vi.unstubAllGlobals();
    });

    it('corrects the restored label after initial font layout becomes ready without editing its names', async () => {
        const { container } = render(tree());
        expect(badgeWidth(container)).toBe(68);
        expect(container.querySelector('text')?.getAttribute('font-family')).toContain('SimHei');

        measuredWidth = 32;
        await act(async () => ready.resolve());

        expect(badgeWidth(container)).toBe(36);
        expect(Array.from(container.querySelectorAll('text'), text => text.textContent)).toEqual(restoredAttrs.names);
        expect(getBBox).toHaveBeenCalledTimes(2);
    });

    it.each(['loadingdone', 'loadingerror'])('updates an unchanged label after a later %s event', async event => {
        const { container } = render(tree());
        measuredWidth = 40;

        await act(async () => {
            fonts.dispatchEvent(new Event(event));
        });

        expect(badgeWidth(container)).toBe(44);
        expect(getBBox).toHaveBeenCalledTimes(2);
    });

    it('recovers from geometry changes without font events and ignores repeated identical notifications', async () => {
        const { container, unmount } = render(tree());
        const observer = GeometryObserver.instances[0];
        expect(observer.target).toBe(container.querySelector('text')?.parentElement);
        expect(observer.target?.querySelector('rect')).toBeNull();

        measuredWidth = 32;
        await act(async () => observer.report(32));
        expect(badgeWidth(container)).toBe(36);
        const measurements = getBBox.mock.calls.length;

        await act(async () => {
            observer.report(32);
            observer.report(32);
            observer.report(Number.NaN);
        });
        expect(getBBox).toHaveBeenCalledTimes(measurements);
        expect(badgeWidth(container)).toBe(36);

        unmount();
        expect(observer.disconnect).toHaveBeenCalledOnce();
        await act(async () => ready.resolve());
        expect(getBBox).toHaveBeenCalledTimes(measurements);
    });

    it('remeasures the same cached attributes when remounted after fonts were already ready', async () => {
        const first = render(tree());
        measuredWidth = 32;
        await act(async () => ready.resolve());
        expect(badgeWidth(first.container)).toBe(36);
        first.unmount();

        measuredWidth = 64;
        const restored = render(tree());
        expect(badgeWidth(restored.container)).toBe(68);
        measuredWidth = 32;
        await act(async () => Promise.resolve());

        expect(badgeWidth(restored.container)).toBe(36);
        expect(restored.container.querySelector('text')?.textContent).toBe(restoredAttrs.names[0]);
        expect(GeometryObserver.instances[0].disconnect).toHaveBeenCalledOnce();
    });

    it('cleans up StrictMode subscriptions while still recovering the unchanged label', async () => {
        const { container, unmount } = render(<React.StrictMode>{tree()}</React.StrictMode>);
        expect(GeometryObserver.instances).toHaveLength(2);
        expect(GeometryObserver.instances[0].disconnect).toHaveBeenCalledOnce();
        measuredWidth = 32;

        await act(async () => ready.resolve());

        expect(badgeWidth(container)).toBe(36);
        expect(getBBox.mock.calls.length).toBeLessThanOrEqual(3);
        unmount();
        expect(GeometryObserver.instances[1].disconnect).toHaveBeenCalledOnce();
    });
});
