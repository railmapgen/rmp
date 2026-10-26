import { utils } from '@railmapgen/svg-assets';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import SvgLayer from '../../components/svg-layer';
import { createSvgLayoutRegistry, SvgLayoutProvider } from '../../components/svg-layout';
import { RenderGraph, SvgRenderProvider } from '../../components/svg-render-context';
import { Id } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import i18n from '../../i18n/config';
import { Node2Font, TextLanguage, waitForFonts } from '../fonts';
import { Element as RenderElement } from '../process-elements';
import { throwIfVideoExportAborted, waitForVideoExportOperation } from './video-export-control';

interface LayoutOptions {
    languages?: TextLanguage[];
    mapEnabled?: boolean;
    isSubscriber?: boolean;
    isSystemFontsOnly?: boolean;
    signal?: AbortSignal;
    maxEntries?: number;
    maxBytes?: number;
}

const namespace = 'http://www.w3.org/2000/svg';
const batchSize = 48;
const noop = () => {};
const outlineCSS = '.rmp-name-outline{paint-order:stroke;stroke:#fff;stroke-linejoin:round}';

const resourceTree = (graph: RenderGraph, elements: RenderElement[], options: LayoutOptions) => (
    <I18nextProvider i18n={i18n}>
        <SvgRenderProvider
            value={{
                graph,
                graphRefresh: graph,
                imageRefresh: graph,
                getImage: async () => undefined,
                // Fonts are explicitly prepared before this tree is mounted.
                ensureFont: noop,
            }}
        >
            <utils.SvgAssetsContextProvider>
                <SvgLayer
                    elements={elements}
                    selected={new Set<Id>()}
                    mapEnabled={options.mapEnabled ?? false}
                    isSubscriber={options.isSubscriber ?? false}
                    handlePointerDown={noop}
                    handlePointerMove={noop}
                    handlePointerUp={noop}
                    handleEdgePointerDown={noop}
                    handleEdgeDoubleClick={noop}
                />
            </utils.SvgAssetsContextProvider>
        </SvgRenderProvider>
    </I18nextProvider>
);

/** Path-only updates need no DOM mount; all text-bearing templates use prepare(). */
export const renderStaticVideoElements = (graph: RenderGraph, elements: RenderElement[], options: LayoutOptions) =>
    renderToStaticMarkup(resourceTree(graph, elements, options));

export const getVideoResourceLanguages = (elements: RenderElement[], initial: TextLanguage[] = []) => {
    const languages = new Set(initial);
    for (const element of elements) {
        const attrs = element.station ?? element.miscNode;
        if (!attrs) continue;
        for (const language of Node2Font[attrs.type] ?? []) languages.add(language);
        if (attrs.type === MiscNodeType.Text || attrs.type === MiscNodeType.I18nText) {
            const language = attrs[attrs.type]?.language;
            if (language) languages.add(language);
        }
    }
    return [...languages];
};

const validateGeometry = (root: SVGElement) => {
    for (const element of root.querySelectorAll('*')) {
        for (const attribute of element.attributes) {
            if (/\b(?:NaN|Infinity)\b/.test(attribute.value))
                throw new Error(`Invalid SVG geometry: ${element.tagName}.${attribute.name}`);
            if (['width', 'height', 'r', 'rx', 'ry'].includes(attribute.name) && Number(attribute.value) < 0)
                throw new Error(`Negative SVG dimension: ${element.tagName}.${attribute.name}`);
        }
    }
};

/** Prepare unique layouts in a bounded queue; ordinary animation reuses their templates. */
export const createVideoResourceLayout = (options: LayoutOptions = {}) => {
    const controller = new AbortController();
    const { signal } = controller;
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const cache = new Map<string, string>();
    const metrics = new Map<string, DOMRect>();
    let metricBytes = 0;
    const inFlight = new Map<string, Promise<string>>();
    const hosts = new Set<HTMLElement>();
    const invalidationListeners = new Set<() => void>();
    let bytes = 0;
    let fontEpoch = 0;
    let queue: Promise<unknown> = Promise.resolve();
    const invalidateFonts = () => {
        fontEpoch++;
        cache.clear();
        bytes = 0;
        metrics.clear();
        metricBytes = 0;
        invalidationListeners.forEach(listener => listener());
    };
    const invalidateLanguage = () => {
        cache.clear();
        bytes = 0;
        // Actual text/style inputs already key the metrics, independent of UI language.
        invalidationListeners.forEach(listener => listener());
    };
    document.fonts?.addEventListener?.('loadingdone', invalidateFonts);
    i18n.on('languageChanged', invalidateLanguage);
    const measureBBox = (element: SVGGraphicsElement): DOMRect => {
        // Cache only text trees. Images/use/paths can depend on external geometry
        // absent from their markup and must retain the browser's native measurement.
        if (!element.matches('text,tspan,g') || element.querySelector(':not(text,tspan,g)')) return element.getBBox();
        const text = [element, ...element.querySelectorAll('text,tspan')];
        const styles = text.map(node => {
            const style = getComputedStyle(node);
            return [
                style.fontFamily,
                style.fontSize,
                style.fontWeight,
                style.fontStyle,
                style.fontStretch,
                style.fontVariant,
                style.fontSynthesis,
                style.fontKerning,
                style.fontFeatureSettings,
                style.fontVariationSettings,
                style.letterSpacing,
                style.wordSpacing,
                style.writingMode,
                style.textOrientation,
                style.direction,
                style.whiteSpace,
                style.textTransform,
                style.textAnchor,
                style.dominantBaseline,
            ];
        });
        const content = element.cloneNode(true) as SVGGraphicsElement;
        content.removeAttribute('id');
        content.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        const key = JSON.stringify([fontEpoch, content.outerHTML, styles]);
        const stored = metrics.get(key);
        if (stored) {
            metrics.delete(key);
            metrics.set(key, stored);
            return { ...stored };
        }
        const box = element.getBBox();
        const value = { x: box.x, y: box.y, width: box.width, height: box.height } as DOMRect;
        if (![value.x, value.y, value.width, value.height].every(Number.isFinite))
            throw new Error('SVG text measurement returned non-finite bounds');
        const size = key.length * 2 + 64;
        if (size <= 2 * 1024 * 1024) {
            metrics.set(key, value);
            metricBytes += size;
            while (metrics.size > 2048 || metricBytes > 2 * 1024 * 1024) {
                const oldest = metrics.keys().next().value!;
                metricBytes -= oldest.length * 2 + 64;
                metrics.delete(oldest);
            }
        }
        return { ...value };
    };

    const measure = async (graph: RenderGraph, elements: RenderElement[]) => {
        throwIfVideoExportAborted(signal);
        await waitForVideoExportOperation(
            waitForFonts(
                options.isSystemFontsOnly ? [] : getVideoResourceLanguages(elements, options.languages),
                signal
            ),
            signal
        );
        throwIfVideoExportAborted(signal);
        const epoch = fontEpoch;
        const language = i18n.language;
        const output = document.createElementNS(namespace, 'svg');
        output.innerHTML = renderStaticVideoElements(graph, elements, options);
        // Images are embedded by export preparation; mounting their async editor loader is unnecessary.
        const measurable = elements.filter(
            element => element.type !== 'line' && element.miscNode?.type !== MiscNodeType.Image
        );
        for (let offset = 0; offset < measurable.length; offset += batchSize) {
            throwIfVideoExportAborted(signal);
            const batch = measurable.slice(offset, offset + batchSize);
            const host = document.createElement('div');
            host.setAttribute('data-video-layout', '');
            Object.assign(host.style, {
                position: 'fixed',
                left: '-100000px',
                top: '0',
                opacity: '0',
                pointerEvents: 'none',
                width: '1280px',
                height: '720px',
            });
            const shadow = host.attachShadow({ mode: 'open' });
            document.body.append(host);
            hosts.add(host);
            const batchController = new AbortController();
            const abortBatch = () => batchController.abort(signal.reason);
            signal.addEventListener('abort', abortBatch, { once: true });
            const batchSignal = batchController.signal;
            let registry = createSvgLayoutRegistry(batchSignal, 0);
            const root = createRoot(shadow, {
                onUncaughtError: error => registry.fail(error),
                onCaughtError: error => registry.fail(error),
            });
            try {
                let previous: string | undefined;
                let settled = false;
                // Registered tasks establish readiness. Repeated passes also commit nested
                // svg-assets passive measurements before parent imperative-handle measurements.
                for (let pass = 0; pass < 8; pass++) {
                    registry.dispose();
                    registry = createSvgLayoutRegistry(batchSignal, pass);
                    registry.value.measureBBox = measureBBox;
                    flushSync(() =>
                        root.render(
                            <SvgLayoutProvider value={registry.value}>
                                <svg xmlns={namespace} width={1280} height={720}>
                                    <style>{outlineCSS}</style>
                                    <g data-layout-content="">{resourceTree(graph, batch, options)}</g>
                                </svg>
                            </SvgLayoutProvider>
                        )
                    );
                    registry.seal();
                    await waitForVideoExportOperation(registry.ready, signal);
                    throwIfVideoExportAborted(signal);
                    const content = shadow.querySelector<SVGGElement>('[data-layout-content]');
                    if (!content) throw new Error('SVG layout root was not mounted');
                    validateGeometry(content);
                    const markup = content.innerHTML;
                    if (markup === previous) {
                        for (const child of [...content.children]) {
                            const target = output.getElementById(child.id);
                            if (target) target.replaceWith(child.cloneNode(true));
                        }
                        settled = true;
                        break;
                    }
                    previous = markup;
                }
                if (!settled) throw new Error('SVG resource layout did not converge');
            } finally {
                batchController.abort();
                signal.removeEventListener('abort', abortBatch);
                registry.dispose();
                root.unmount();
                host.remove();
                hosts.delete(host);
            }
            // Yield between bounded batches so a large project cannot monopolize the main thread.
            if (offset + batchSize < measurable.length)
                await waitForVideoExportOperation(new Promise<void>(resolve => setTimeout(resolve, 0)), signal);
        }
        validateGeometry(output);
        return { markup: output.innerHTML, epoch, language };
    };

    const prepare = (graph: RenderGraph, elements: RenderElement[]): Promise<string> => {
        if (signal.aborted) return Promise.reject(signal.reason);
        const graphData = structuredClone(graph.export());
        const elementData = structuredClone(elements);
        const inputs = JSON.stringify([graphData, elementData]);
        const keyFor = (epoch = fontEpoch, language = i18n.language) => JSON.stringify([epoch, language, inputs]);
        const key = keyFor();
        const cached = cache.get(key);
        if (cached !== undefined) {
            cache.delete(key);
            cache.set(key, cached);
            return Promise.resolve(cached);
        }
        const existing = inFlight.get(key);
        if (existing) return existing;
        const snapshot = graph.nullCopy();
        snapshot.import(graphData);
        const operation = queue.then(async () => {
            for (let attempt = 0; attempt < 3; attempt++) {
                const result = await measure(snapshot, structuredClone(elementData));
                if (result.epoch === fontEpoch && result.language === i18n.language) return result;
            }
            throw new Error('Fonts or language changed repeatedly during SVG layout');
        });
        // Queue time is not a layout timeout. Cancellation stops this subscriber;
        // the queue itself follows the real operation through its cleanup.
        const cancellable = new Promise<Awaited<typeof operation>>((resolve, reject) => {
            const cancel = () => reject(signal.reason);
            signal.addEventListener('abort', cancel, { once: true });
            operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
            if (signal.aborted) cancel();
        });
        const task = cancellable
            .then(({ markup, epoch, language }) => {
                const finalKey = keyFor(epoch, language);
                const size = (finalKey.length + markup.length) * 2;
                const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
                const maxEntries = options.maxEntries ?? 128;
                if (size <= maxBytes && maxEntries > 0) {
                    const replaced = cache.get(finalKey);
                    if (replaced !== undefined) bytes -= (finalKey.length + replaced.length) * 2;
                    cache.set(finalKey, markup);
                    bytes += size;
                    while (cache.size > maxEntries || bytes > maxBytes) {
                        const oldest = cache.keys().next().value!;
                        bytes -= (oldest.length + cache.get(oldest)!.length) * 2;
                        cache.delete(oldest);
                    }
                }
                return markup;
            })
            .catch(error => {
                if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
                const resources = elementData
                    .slice(0, 5)
                    .map(element => element.id)
                    .join(', ');
                const message =
                    error instanceof Error
                        ? error.message.replace('Video encoding timed out', 'SVG layout timed out')
                        : String(error);
                throw new Error(`SVG layout failed for ${resources}: ${message}`, { cause: error });
            });
        queue = operation.catch(() => {});
        inFlight.set(key, task);
        void task.finally(() => inFlight.delete(key)).catch(() => {});
        return task;
    };

    return {
        prepare,
        get revision() {
            return `${fontEpoch}:${i18n.language}`;
        },
        subscribe: (listener: () => void) => {
            invalidationListeners.add(listener);
            return () => invalidationListeners.delete(listener);
        },
        dispose: () => {
            controller.abort(new DOMException('SVG layout disposed', 'AbortError'));
            options.signal?.removeEventListener('abort', abort);
            document.fonts?.removeEventListener?.('loadingdone', invalidateFonts);
            i18n.off('languageChanged', invalidateLanguage);
            invalidationListeners.clear();
            cache.clear();
            metrics.clear();
            inFlight.clear();
            bytes = 0;
            hosts.forEach(host => host.remove());
        },
    };
};
