import React from 'react';

interface LayoutTask {
    complete: () => void;
    fail: (error: unknown) => void;
}

export interface SvgLayoutContextValue {
    signal: AbortSignal;
    pass: number;
    register: () => LayoutTask;
    measureBBox?: (element: SVGGraphicsElement) => DOMRect;
}

const SvgLayoutContext = React.createContext<SvgLayoutContextValue | null>(null);
export const SvgLayoutProvider = SvgLayoutContext.Provider;

interface SvgLayoutEffectContext {
    signal: AbortSignal;
    measureBBox: (element: SVGGraphicsElement) => DOMRect;
    offscreen: boolean;
}

// Visible text resources share the browser font subscription. Offscreen video
// layouts have their own explicit preparation and invalidation lifecycle.
const fontLayoutStores = new WeakMap<FontFaceSet, ReturnType<typeof createFontLayoutStore>>();
const createFontLayoutStore = (fonts: FontFaceSet) => {
    let revision = 0;
    let generation = 0;
    let notification: object | undefined;
    const listeners = new Set<() => void>();
    const notify = () => {
        if (notification) return;
        const currentNotification = (notification = {});
        const currentGeneration = generation;
        queueMicrotask(() => {
            if (notification !== currentNotification) return;
            notification = undefined;
            if (currentGeneration !== generation || !listeners.size) return;
            revision++;
            listeners.forEach(listener => listener());
        });
    };
    return {
        getSnapshot: () => revision,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            if (listeners.size === 1) {
                const currentGeneration = ++generation;
                fonts.addEventListener('loadingdone', notify);
                fonts.addEventListener('loadingerror', notify);
                void fonts.ready?.then(() => {
                    if (currentGeneration === generation) notify();
                });
            }
            return () => {
                listeners.delete(listener);
                if (!listeners.size) {
                    generation++;
                    notification = undefined;
                    fonts.removeEventListener('loadingdone', notify);
                    fonts.removeEventListener('loadingerror', notify);
                }
            };
        },
    };
};
const idleFontLayoutStore = { subscribe: () => () => {}, getSnapshot: () => 0 };
const getFontLayoutStore = (fonts?: FontFaceSet) => {
    if (!fonts) return idleFontLayoutStore;
    let store = fontLayoutStores.get(fonts);
    if (!store) {
        store = createFontLayoutStore(fonts);
        fontLayoutStores.set(fonts, store);
    }
    return store;
};

/** A task is ready only after the state written by its measurement has committed. */
export const useSvgLayoutEffect = (
    effect: (context: SvgLayoutEffectContext) => void | Promise<void>,
    deps: React.DependencyList,
    geometryRef?: React.RefObject<SVGGraphicsElement | null>,
    watchFonts = true
) => {
    const layout = React.useContext(SvgLayoutContext);
    const fontStore = getFontLayoutStore(
        !layout && watchFonts && typeof document !== 'undefined' ? document.fonts : undefined
    );
    const fontRevision = React.useSyncExternalStore(
        fontStore.subscribe,
        fontStore.getSnapshot,
        idleFontLayoutStore.getSnapshot
    );
    const [geometryRevision, setGeometryRevision] = React.useState(0);
    React.useEffect(() => {
        const element = geometryRef?.current;
        if (layout || !element || typeof ResizeObserver === 'undefined') return;
        let active = true;
        let previous: { width: number; height: number } | undefined;
        const observer = new ResizeObserver(entries => {
            if (!active) return;
            const bounds = entries.find(entry => entry.target === element)?.contentRect;
            if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return;
            if (previous?.width === bounds.width && previous.height === bounds.height) return;
            previous = { width: bounds.width, height: bounds.height };
            setGeometryRevision(value => value + 1);
        });
        observer.observe(element);
        return () => {
            active = false;
            observer.disconnect();
        };
    }, [layout, geometryRef]);
    const effectRef = React.useRef(effect);
    effectRef.current = effect;
    // The caller's dependencies describe the measurement, just as for useEffect.
    const request = React.useMemo(() => ({}), [...deps, layout?.pass, fontRevision, geometryRevision]);
    const taskRef = React.useRef<LayoutTask | undefined>(undefined);
    const [committed, setCommitted] = React.useState<object>();
    const [failure, setFailure] = React.useState<{ error: unknown }>();

    React.useLayoutEffect(() => {
        taskRef.current = layout?.register();
        return () => taskRef.current?.complete();
    }, [request, layout]);

    React.useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const abort = () => controller.abort(layout?.signal.reason);
        layout?.signal.addEventListener('abort', abort, { once: true });
        if (layout?.signal.aborted) abort();
        const task = taskRef.current;
        const finish = () => {
            if (!cancelled && layout && !layout.signal.aborted) setCommitted(request);
        };
        try {
            const result = effectRef.current({
                signal: controller.signal,
                measureBBox: element => layout?.measureBBox?.(element) ?? element.getBBox(),
                offscreen: !!layout,
            });
            if (result instanceof Promise) {
                void result.then(finish, error => {
                    if (!cancelled) {
                        if (task) task.fail(error);
                        else setFailure({ error });
                    }
                });
            } else finish();
        } catch (error) {
            if (task) task.fail(error);
            else throw error;
        }
        return () => {
            cancelled = true;
            layout?.signal.removeEventListener('abort', abort);
            controller.abort();
        };
    }, [request, layout]);

    React.useLayoutEffect(() => {
        if (committed === request) taskRef.current?.complete();
    }, [committed, request]);
    if (failure) throw failure.error;
};

export const createSvgLayoutRegistry = (signal: AbortSignal, pass: number) => {
    const pending = new Set<object>();
    let sealed = false;
    let failed = false;
    let checking = false;
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const ready = new Promise<void>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    // Observe an early mount error even before the caller starts awaiting ready.
    void ready.catch(() => {});
    const check = () => {
        if (!sealed || failed || pending.size !== 0 || checking) return;
        checking = true;
        // React cleans up a previous request before registering its replacement
        // in the same commit. Only inspect readiness after all registrations.
        queueMicrotask(() => {
            checking = false;
            if (sealed && !failed && pending.size === 0) resolve();
        });
    };
    const fail = (error: unknown) => {
        failed = true;
        reject(error);
    };
    const abort = () => fail(signal.reason ?? new DOMException('SVG layout canceled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    const value: SvgLayoutContextValue = {
        signal,
        pass,
        register: () => {
            const task = {};
            pending.add(task);
            return {
                complete: () => {
                    pending.delete(task);
                    check();
                },
                fail,
            };
        },
    };
    return {
        value,
        ready,
        fail,
        seal: () => {
            sealed = true;
            if (signal.aborted) abort();
            else check();
        },
        dispose: () => signal.removeEventListener('abort', abort),
    };
};

/** SVGImageElement has no complete/decode API; a shared browser image supplies readiness. */
export const waitForSvgImage = (image: SVGImageElement, signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        const source = image.getAttribute('href');
        if (!source) return resolve();
        const loader = new Image();
        const cleanup = () => {
            loader.onload = null;
            loader.onerror = null;
            signal?.removeEventListener('abort', abort);
        };
        const abort = () => {
            cleanup();
            reject(signal?.reason ?? new DOMException('SVG image canceled', 'AbortError'));
        };
        loader.onload = () => {
            cleanup();
            resolve();
        };
        loader.onerror = () => {
            cleanup();
            reject(new Error(`Could not load SVG image: ${source}`));
        };
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
        else loader.src = source;
    });
