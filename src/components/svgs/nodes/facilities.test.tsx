import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSvgLayoutRegistry, SvgLayoutProvider, useSvgLayoutEffect, waitForSvgImage } from '../../svg-layout';
import facilities, { FacilitiesType } from './facilities';

vi.mock('../../svg-layout', async importOriginal => ({
    ...(await importOriginal<typeof import('../../svg-layout')>()),
    waitForSvgImage: vi.fn(),
}));
const waitForImage = vi.mocked(waitForSvgImage);

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(yes => {
        resolve = yes;
    });
    return { promise, resolve };
};

const Facilities = facilities.component;
const tree = (type = facilities.defaultAttrs.type) => (
    <svg>
        <Facilities
            id="misc_node_facilities"
            x={0}
            y={0}
            attrs={{ type }}
            handlePointerDown={vi.fn()}
            handlePointerMove={vi.fn()}
            handlePointerUp={vi.fn()}
        />
    </svg>
);
const finishLayout = async () => act(async () => {});

describe('Facilities image layout', () => {
    let originalGetBBox: PropertyDescriptor | undefined;
    let originalFonts: PropertyDescriptor | undefined;
    let fonts: EventTarget;
    let fontsReady: ReturnType<typeof deferred>;
    const getBBox = vi.fn();
    let nextFrame: FrameRequestCallback | undefined;
    const registries: ReturnType<typeof createSvgLayoutRegistry>[] = [];
    const createRegistry = (signal = new AbortController().signal) => {
        const registry = createSvgLayoutRegistry(signal, 0);
        registries.push(registry);
        return registry;
    };

    beforeEach(() => {
        waitForImage.mockReset().mockResolvedValue(undefined);
        getBBox.mockReset().mockReturnValue({ width: 120, height: 40 });
        originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
        Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: getBBox });
        fontsReady = deferred();
        fonts = Object.assign(new EventTarget(), { ready: fontsReady.promise });
        originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
        Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
        nextFrame = undefined;
        vi.stubGlobal(
            'requestAnimationFrame',
            vi.fn((callback: FrameRequestCallback) => {
                nextFrame = callback;
                return 1;
            })
        );
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        cleanup();
        registries.splice(0).forEach(registry => registry.dispose());
        if (originalGetBBox) Object.defineProperty(SVGElement.prototype, 'getBBox', originalGetBBox);
        else delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
        vi.unstubAllGlobals();
    });

    it('waits for the image before measuring an offscreen layout', async () => {
        const registry = createRegistry();
        const loading = deferred();
        waitForImage.mockReturnValue(loading.promise);

        const { container } = render(<SvgLayoutProvider value={registry.value}>{tree()}</SvgLayoutProvider>);
        const onReady = vi.fn(() =>
            expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(-60, -20)')
        );
        const ready = registry.ready.then(onReady);
        registry.seal();
        const image = container.querySelector('image')!;
        expect(waitForImage).toHaveBeenCalledTimes(1);
        expect(waitForImage.mock.calls[0][0]).toBe(image);
        expect(getBBox).not.toHaveBeenCalled();
        expect(image.parentElement?.getAttribute('transform')).toBe('translate(-12.5, -12.5)');
        await finishLayout();
        expect(onReady).not.toHaveBeenCalled();

        await act(async () => loading.resolve());
        await ready;

        expect(getBBox).toHaveBeenCalledTimes(1);
        expect(onReady).toHaveBeenCalledOnce();
        expect(image.parentElement?.getAttribute('transform')).toBe('translate(-60, -20)');
    });

    it('retries intrinsic layout when a cached image initially measures zero', async () => {
        getBBox.mockReturnValueOnce({ width: 0, height: 0 });
        const { container } = render(tree());
        await act(async () => Promise.resolve());
        expect(getBBox).toHaveBeenCalledTimes(1);
        expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(-12.5, -12.5)');

        await act(async () => nextFrame!(0));

        expect(getBBox).toHaveBeenCalledTimes(2);
        expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(-60, -20)');
    });

    it.each([
        { width: 0, height: 0 },
        { width: Number.NaN, height: 20 },
    ])('keeps the valid position when the next image size is invalid: %j', async box => {
        const { container, rerender } = render(tree());
        await finishLayout();
        getBBox.mockReturnValue(box);
        rerender(tree(FacilitiesType.Disney));
        await act(async () => Promise.resolve());
        await act(async () => nextFrame!(0));

        expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(-60, -20)');
    });

    it('ignores superseded and unmounted image requests', async () => {
        const previous = deferred();
        const current = deferred();
        waitForImage.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
        const { rerender, unmount } = render(tree());
        const previousSignal = waitForImage.mock.calls[0][1] as AbortSignal;
        rerender(tree(FacilitiesType.Disney));
        expect(previousSignal.aborted).toBe(true);

        await act(async () => previous.resolve());
        expect(getBBox).not.toHaveBeenCalled();
        const currentSignal = waitForImage.mock.calls[1][1] as AbortSignal;
        unmount();
        expect(currentSignal.aborted).toBe(true);
        await act(async () => current.resolve());
        expect(getBBox).not.toHaveBeenCalled();
    });

    it('cancels a pending intrinsic layout retry on unmount', async () => {
        getBBox.mockReturnValue({ width: 0, height: 0 });
        const { unmount } = render(tree());
        await act(async () => Promise.resolve());
        unmount();
        await finishLayout();

        expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
        expect(getBBox).toHaveBeenCalledTimes(1);
    });

    it('keeps the editor position when the next image fails to load', async () => {
        const { container, rerender } = render(tree());
        await finishLayout();
        waitForImage.mockRejectedValue(new Error('Missing facility'));
        rerender(tree(FacilitiesType.Disney));
        await finishLayout();

        expect(getBBox).toHaveBeenCalledTimes(1);
        expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(-60, -20)');
    });

    it('reports image failures to the video layout registry', async () => {
        const registry = createRegistry();
        waitForImage.mockRejectedValue(new Error('Missing facility'));
        render(<SvgLayoutProvider value={registry.value}>{tree()}</SvgLayoutProvider>);
        registry.seal();

        await expect(registry.ready).rejects.toThrow('Missing facility');
        expect(getBBox).not.toHaveBeenCalled();
    });

    it('cancels image preparation through the video layout signal', async () => {
        const controller = new AbortController();
        const registry = createRegistry(controller.signal);
        const loading = deferred();
        waitForImage.mockReturnValue(loading.promise);
        render(<SvgLayoutProvider value={registry.value}>{tree()}</SvgLayoutProvider>);
        registry.seal();
        const signal = waitForImage.mock.calls[0][1] as AbortSignal;
        const rejected = expect(registry.ready).rejects.toMatchObject({ name: 'AbortError' });

        controller.abort();
        await rejected;
        expect(signal.aborted).toBe(true);
        await act(async () => loading.resolve());
        expect(getBBox).not.toHaveBeenCalled();
    });

    it('rejects an invalid video image measurement instead of accepting a misplaced template', async () => {
        const registry = createRegistry();
        getBBox.mockReturnValue({ width: 0, height: 0 });
        render(<SvgLayoutProvider value={registry.value}>{tree()}</SvgLayoutProvider>);
        registry.seal();

        await expect(registry.ready).rejects.toThrow('Could not measure facility image');
        expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('does not prepare images again when the shared font lifecycle changes', async () => {
        const measureText = vi.fn();
        const TextMeasurement = () => {
            useSvgLayoutEffect(measureText, []);
            return null;
        };
        const { container } = render(
            <>
                <TextMeasurement />
                {tree()}
            </>
        );
        await finishLayout();
        expect(waitForImage).toHaveBeenCalledOnce();
        expect(getBBox).toHaveBeenCalledOnce();

        await act(async () => fontsReady.resolve());
        await act(async () => fonts.dispatchEvent(new Event('loadingdone')));
        await act(async () => fonts.dispatchEvent(new Event('loadingerror')));

        expect(measureText).toHaveBeenCalledTimes(4);
        expect(waitForImage).toHaveBeenCalledOnce();
        expect(getBBox).toHaveBeenCalledOnce();
        expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(-60, -20)');
    });
});
