import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSvgLayoutRegistry, SvgLayoutProvider, useSvgLayoutEffect, waitForSvgImage } from './svg-layout';

const deferred = () => {
    let resolve!: () => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
};

const AsyncMeasurement = ({ measurement, label = 'measured' }: { measurement: Promise<void>; label?: string }) => {
    const [value, setValue] = React.useState('pending');
    useSvgLayoutEffect(async () => {
        await measurement;
        setValue(label);
    }, [measurement, label]);
    return <text>{value}</text>;
};

describe('SVG layout readiness protocol', () => {
    const registries: ReturnType<typeof createSvgLayoutRegistry>[] = [];
    const createRegistry = (signal = new AbortController().signal, pass = 0) => {
        const registry = createSvgLayoutRegistry(signal, pass);
        registries.push(registry);
        return registry;
    };

    afterEach(() => {
        cleanup();
        registries.splice(0).forEach(registry => registry.dispose());
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('resolves only after asynchronous measurement state is committed to the SVG', async () => {
        const measurement = deferred();
        const registry = createRegistry();
        const { container } = render(
            <SvgLayoutProvider value={registry.value}>
                <svg>
                    <AsyncMeasurement measurement={measurement.promise} />
                </svg>
            </SvgLayoutProvider>
        );
        const onReady = vi.fn(() => expect(container.querySelector('text')?.textContent).toBe('measured'));
        const ready = registry.ready.then(onReady);
        registry.seal();
        await Promise.resolve();
        expect(onReady).not.toHaveBeenCalled();

        await act(async () => measurement.resolve());
        await ready;
        expect(onReady).toHaveBeenCalledOnce();
    });

    it('waits for a nested measurement mounted by an earlier measurement', async () => {
        const parentMeasurement = deferred();
        const childMeasurement = deferred();
        const registry = createRegistry();
        const ParentMeasurement = () => {
            const [showChild, setShowChild] = React.useState(false);
            useSvgLayoutEffect(async () => {
                await parentMeasurement.promise;
                setShowChild(true);
            }, []);
            return showChild ? <AsyncMeasurement measurement={childMeasurement.promise} /> : null;
        };
        const { container } = render(
            <SvgLayoutProvider value={registry.value}>
                <svg>
                    <ParentMeasurement />
                </svg>
            </SvgLayoutProvider>
        );
        const onReady = vi.fn();
        const ready = registry.ready.then(onReady);
        registry.seal();

        await act(async () => parentMeasurement.resolve());
        expect(container.querySelector('text')?.textContent).toBe('pending');
        expect(onReady).not.toHaveBeenCalled();
        await act(async () => childMeasurement.resolve());
        await ready;
        expect(container.querySelector('text')?.textContent).toBe('measured');
    });

    it('ignores stale completion until the latest measurement commits', async () => {
        const first = deferred();
        const second = deferred();
        const registry = createRegistry();
        const tree = (measurement: Promise<void>, label: string) => (
            <SvgLayoutProvider value={registry.value}>
                <svg>
                    <AsyncMeasurement measurement={measurement} label={label} />
                </svg>
            </SvgLayoutProvider>
        );
        const { container, rerender } = render(tree(first.promise, 'old'));
        const onReady = vi.fn();
        const ready = registry.ready.then(onReady);
        registry.seal();
        rerender(tree(second.promise, 'current'));

        await act(async () => first.resolve());
        expect(onReady).not.toHaveBeenCalled();
        await act(async () => second.resolve());
        await ready;
        expect(container.querySelector('text')?.textContent).toBe('current');
    });

    it('propagates asynchronous measurement errors without reporting readiness', async () => {
        const measurement = deferred();
        const registry = createRegistry();
        render(
            <SvgLayoutProvider value={registry.value}>
                <svg>
                    <AsyncMeasurement measurement={measurement.promise} />
                </svg>
            </SvgLayoutProvider>
        );
        registry.seal();
        const rejection = expect(registry.ready).rejects.toThrow('Could not measure resource');

        await act(async () => measurement.reject(new Error('Could not measure resource')));
        await rejection;
    });

    it('rejects an unfinished measurement when its owner is canceled', async () => {
        const controller = new AbortController();
        const measurement = deferred();
        const registry = createRegistry(controller.signal);
        const { unmount } = render(
            <SvgLayoutProvider value={registry.value}>
                <svg>
                    <AsyncMeasurement measurement={measurement.promise} />
                </svg>
            </SvgLayoutProvider>
        );
        registry.seal();
        const rejection = expect(registry.ready).rejects.toMatchObject({ name: 'AbortError' });

        controller.abort();
        await rejection;
        unmount();
        await act(async () => measurement.resolve());
    });

    it('clears image handlers and abort listeners when an image request is canceled', async () => {
        const loader = { src: '', onload: null, onerror: null };
        vi.stubGlobal(
            'Image',
            class {
                constructor() {
                    return loader;
                }
            }
        );
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', '/rmp/images/facilities/test.svg');
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const loading = waitForSvgImage(image, controller.signal);
        const rejection = expect(loading).rejects.toMatchObject({ name: 'AbortError' });
        expect(loader.src).toBe('/rmp/images/facilities/test.svg');

        controller.abort();
        await rejection;
        expect(loader.onload).toBeNull();
        expect(loader.onerror).toBeNull();
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });
});

describe('visible SVG resource readiness', () => {
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    let fonts: EventTarget;
    let ready: ReturnType<typeof deferred>;

    beforeEach(() => {
        ready = deferred();
        fonts = Object.assign(new EventTarget(), { ready: ready.promise });
        Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
    });

    it('shares font listeners and coalesces font changes without changing resource names', async () => {
        const addListener = vi.spyOn(fonts, 'addEventListener');
        const removeListener = vi.spyOn(fonts, 'removeEventListener');
        const measure = vi.fn();
        const Measurement = () => {
            useSvgLayoutEffect(measure, []);
            return null;
        };
        const { unmount } = render(
            <>
                <Measurement />
                <Measurement />
            </>
        );
        expect(measure).toHaveBeenCalledTimes(2);
        expect(addListener).toHaveBeenCalledTimes(2);

        await act(async () => ready.resolve());
        expect(measure).toHaveBeenCalledTimes(4);
        await act(async () => {
            fonts.dispatchEvent(new Event('loadingdone'));
            fonts.dispatchEvent(new Event('loadingdone'));
        });
        expect(measure).toHaveBeenCalledTimes(6);
        await act(async () => fonts.dispatchEvent(new Event('loadingerror')));
        expect(measure).toHaveBeenCalledTimes(8);

        unmount();
        expect(removeListener).toHaveBeenCalledTimes(2);
        await act(async () => fonts.dispatchEvent(new Event('loadingdone')));
        expect(measure).toHaveBeenCalledTimes(8);
    });

    it('ignores stale ready callbacks after StrictMode cleanup and after unmount', async () => {
        const measure = vi.fn();
        const Measurement = () => {
            useSvgLayoutEffect(measure, []);
            return null;
        };
        const { unmount } = render(
            <React.StrictMode>
                <Measurement />
            </React.StrictMode>
        );
        const initialCalls = measure.mock.calls.length;
        await act(async () => ready.resolve());
        expect(measure).toHaveBeenCalledTimes(initialCalls + 1);
        unmount();
        await act(async () => fonts.dispatchEvent(new Event('loadingdone')));
        expect(measure).toHaveBeenCalledTimes(initialCalls + 1);
    });

    it('does not subscribe offscreen layouts to the visible font lifecycle', async () => {
        const addListener = vi.spyOn(fonts, 'addEventListener');
        const measure = vi.fn();
        const registry = createSvgLayoutRegistry(new AbortController().signal, 0);
        const Measurement = () => {
            useSvgLayoutEffect(measure, []);
            return null;
        };
        const { unmount } = render(
            <SvgLayoutProvider value={registry.value}>
                <Measurement />
            </SvgLayoutProvider>
        );
        await act(async () => {
            ready.resolve();
            fonts.dispatchEvent(new Event('loadingdone'));
        });
        expect(measure).toHaveBeenCalledOnce();
        expect(addListener).not.toHaveBeenCalled();
        unmount();
        registry.dispose();
    });

    it('aborts stale asynchronous measurements on dependency changes and unmount', async () => {
        const signals: AbortSignal[] = [];
        const Measurement = ({ name }: { name: string }) => {
            useSvgLayoutEffect(
                signal => {
                    signals.push(signal);
                    return new Promise<void>((_resolve, reject) => {
                        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
                    });
                },
                [name]
            );
            return null;
        };
        const { rerender, unmount } = render(<Measurement name="first" />);
        rerender(<Measurement name="second" />);
        expect(signals).toHaveLength(2);
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
        unmount();
        await act(async () => ready.resolve());
        expect(signals[1].aborted).toBe(true);
        expect(signals).toHaveLength(2);
    });
});
