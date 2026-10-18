import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import miscNodes from '../../components/svgs/nodes/misc-nodes';
import stations from '../../components/svgs/stations/stations';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { StationType } from '../../constants/stations';
import i18n from '../../i18n/config';
import { waitForFonts } from '../fonts';
import { getNodes } from '../process-elements';
import { createVideoResourceLayout } from './video-resource-layout';

vi.mock('../fonts', async importOriginal => ({
    ...(await importOriginal<typeof import('../fonts')>()),
    waitForFonts: vi.fn(async () => undefined),
    loadFont: vi.fn(async () => undefined),
}));

const deferred = <T = void,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

const makeGraph = (japanese = '東京', chinese = '八通线', vertical = false) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_jr', {
        visible: true,
        zIndex: 0,
        x: 0,
        y: 0,
        type: StationType.JREastImportant,
        [StationType.JREastImportant]: {
            ...structuredClone(stations[StationType.JREastImportant].defaultAttrs),
            names: [japanese, 'Tokyo'],
            textVertical: vertical,
        },
    });
    graph.addNode('misc_node_bj', {
        visible: true,
        zIndex: 0,
        x: 100,
        y: 0,
        type: MiscNodeType.BjsubwayTextLineBadge,
        [MiscNodeType.BjsubwayTextLineBadge]: {
            ...structuredClone(miscNodes[MiscNodeType.BjsubwayTextLineBadge].defaultAttrs),
            names: [chinese, 'Line'],
        },
    });
    return graph;
};

// jsdom has no SVG layout. This deterministic metric exercises the real resource
// components and their commit protocol; browser coverage verifies actual fonts.
const measureText = (element: SVGElement): DOMRect => {
    if (element.tagName.toLowerCase() === 'text') {
        const fontSize = Number(element.getAttribute('font-size') ?? 10);
        const length = [...(element.textContent ?? '')].length * fontSize;
        const vertical = element.getAttribute('writing-mode') === 'vertical-rl';
        return { x: 0, y: 0, width: vertical ? fontSize : length, height: vertical ? length : fontSize } as DOMRect;
    }
    const boxes = [...element.querySelectorAll<SVGTextElement>('text')].map(measureText);
    return {
        x: 0,
        y: 0,
        width: Math.max(0, ...boxes.map(box => box.width)),
        height: Math.max(0, ...boxes.map(box => box.height)),
    } as DOMRect;
};

const parseMarkup = (markup: string) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = markup;
    return svg;
};

const dimensions = (markup: string, id: string) => {
    const rect = parseMarkup(markup).getElementById(id)?.querySelector('rect');
    expect(rect).not.toBeNull();
    return { width: Number(rect!.getAttribute('width')), height: Number(rect!.getAttribute('height')) };
};

describe('video resource layout preparation', () => {
    const layouts: ReturnType<typeof createVideoResourceLayout>[] = [];
    const originalBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    let getBBox: ReturnType<typeof vi.fn>;
    let bodyChildren: number;
    let fontSet: EventTarget;

    const createLayout = (options: Parameters<typeof createVideoResourceLayout>[0] = {}) => {
        const layout = createVideoResourceLayout(options);
        layouts.push(layout);
        return layout;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(waitForFonts).mockResolvedValue(undefined);
        bodyChildren = document.body.children.length;
        fontSet = new EventTarget();
        Object.defineProperty(document, 'fonts', { configurable: true, value: fontSet });
        getBBox = vi.fn(function (this: SVGElement) {
            return measureText(this);
        });
        Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: getBBox });
    });

    afterEach(() => {
        layouts.splice(0).forEach(layout => layout.dispose());
        if (originalBBox) Object.defineProperty(SVGElement.prototype, 'getBBox', originalBBox);
        else Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
        vi.restoreAllMocks();
        expect(document.body.children).toHaveLength(bodyChildren);
    });

    it('commits measured JR and Beijing resource dimensions before returning markup', async () => {
        const layout = createLayout();
        const shortGraph = makeGraph();
        const longGraph = makeGraph('東京品川新宿池袋', '北京地铁自适应文字线路');
        const shortMarkup = await layout.prepare(shortGraph, getNodes(shortGraph));
        const longMarkup = await layout.prepare(longGraph, getNodes(longGraph));

        expect(getBBox).toHaveBeenCalled();
        expect(dimensions(shortMarkup, 'stn_jr')).toEqual({ width: 27, height: 11 });
        expect(dimensions(longMarkup, 'stn_jr').width).toBeGreaterThan(dimensions(shortMarkup, 'stn_jr').width);
        expect(dimensions(shortMarkup, 'misc_node_bj').width).toBeCloseTo(32.84375);
        expect(dimensions(longMarkup, 'misc_node_bj').width).toBeGreaterThan(32.84375);
        const width = dimensions(longMarkup, 'stn_jr').width;
        expect(parseMarkup(longMarkup).getElementById('stn_name_stn_jr')?.getAttribute('transform')).toBe(
            `translate(${-width / 2 - 1}, 0)`
        );
    });

    it('handles vertical JR text and permits zero-width empty text', async () => {
        const layout = createLayout();
        const verticalGraph = makeGraph('東京品川新宿池袋', '', true);
        verticalGraph.updateNodeAttribute('misc_node_bj', MiscNodeType.BjsubwayTextLineBadge, attrs => ({
            ...attrs!,
            names: ['', ''],
        }));
        const markup = await layout.prepare(verticalGraph, getNodes(verticalGraph));

        expect(dimensions(markup, 'stn_jr')).toEqual({ width: 11, height: 76 });
        expect(dimensions(markup, 'misc_node_bj').width).toBeCloseTo(32.84375);
        expect(markup).not.toMatch(/NaN|Infinity/);
    });

    it('waits for fonts before mounting and measuring resources', async () => {
        const fonts = deferred();
        vi.mocked(waitForFonts).mockReturnValueOnce(fonts.promise);
        const layout = createLayout();
        const graph = makeGraph();
        const preparation = layout.prepare(graph, getNodes(graph));

        await vi.waitFor(() => expect(waitForFonts).toHaveBeenCalled());
        expect(getBBox).not.toHaveBeenCalled();
        fonts.resolve();
        await preparation;
        expect(getBBox).toHaveBeenCalled();
    });

    it('measures system-font resources without requesting downloadable resource fonts', async () => {
        const layout = createLayout({ isSystemFontsOnly: true });
        const graph = makeGraph('東京品川新宿池袋', '北京地铁自适应文字线路');
        const markup = await layout.prepare(graph, getNodes(graph));

        expect(waitForFonts).toHaveBeenCalledOnce();
        expect(vi.mocked(waitForFonts).mock.calls[0][0]).toEqual([]);
        expect(vi.mocked(waitForFonts).mock.calls[0][1]?.aborted).toBe(false);
        expect(dimensions(markup, 'stn_jr')).toEqual({ width: 87, height: 11 });
        expect(dimensions(markup, 'misc_node_bj').width).toBe(81);
    });

    it('isolates duplicate resource IDs from the visible editor DOM', async () => {
        const editor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        editor.innerHTML = '<g id="stn_jr"><rect width="999" height="999" /></g>';
        document.body.append(editor);
        const measurementRoots = new Set<Node>();
        getBBox.mockImplementation(function (this: SVGElement) {
            measurementRoots.add(this.getRootNode());
            return measureText(this);
        });
        try {
            const layout = createLayout();
            const graph = makeGraph();
            const markup = await layout.prepare(graph, getNodes(graph));

            expect(measurementRoots.size).toBeGreaterThan(0);
            expect([...measurementRoots].every(root => root instanceof ShadowRoot)).toBe(true);
            expect(document.getElementById('stn_jr')).toBe(editor.firstElementChild);
            expect(editor.querySelector('rect')?.getAttribute('width')).toBe('999');
            expect(dimensions(markup, 'stn_jr').width).toBe(27);
        } finally {
            editor.remove();
        }
    });

    it('merges concurrent requests and reuses successful markup without measuring again', async () => {
        const layout = createLayout();
        const graph = makeGraph();
        const [first, concurrent] = await Promise.all([
            layout.prepare(graph, getNodes(graph)),
            layout.prepare(graph, getNodes(graph)),
        ]);
        const count = getBBox.mock.calls.length;
        expect(count).toBeGreaterThan(0);
        expect(concurrent).toBe(first);
        expect(await layout.prepare(graph, getNodes(graph))).toBe(first);
        expect(getBBox).toHaveBeenCalledTimes(count);
    });

    it('invalidates cached markup when text or graph dependencies change', async () => {
        const layout = createLayout();
        const graph = makeGraph();
        await layout.prepare(graph, getNodes(graph));
        const count = getBBox.mock.calls.length;
        graph.updateNodeAttribute('misc_node_bj', MiscNodeType.BjsubwayTextLineBadge, attrs => ({
            ...attrs!,
            names: ['北京地铁自适应文字线路', 'Line'],
        }));
        expect(dimensions(await layout.prepare(graph, getNodes(graph)), 'misc_node_bj').width).toBeGreaterThan(
            32.84375
        );
        expect(getBBox.mock.calls.length).toBeGreaterThan(count);

        const changedTextCount = getBBox.mock.calls.length;
        const preparations = vi.mocked(waitForFonts).mock.calls.length;
        const elements = getNodes(graph);
        graph.addNode('misc_node_dependency', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: MiscNodeType.Virtual,
            virtual: {},
        });
        await layout.prepare(graph, elements);
        expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
        expect(getBBox).toHaveBeenCalledTimes(changedTextCount);
    });

    it('remeasures after fonts change and then reuses the refreshed template', async () => {
        const layout = createLayout();
        const graph = makeGraph();
        await layout.prepare(graph, getNodes(graph));
        const previousCount = getBBox.mock.calls.length;

        fontSet.dispatchEvent(new Event('loadingdone'));
        await layout.prepare(graph, getNodes(graph));
        expect(getBBox.mock.calls.length).toBeGreaterThan(previousCount);
        const refreshedCount = getBBox.mock.calls.length;
        await layout.prepare(graph, getNodes(graph));
        expect(getBBox).toHaveBeenCalledTimes(refreshedCount);
    });

    it('retries a layout affected by a font change before caching its result', async () => {
        const layout = createLayout();
        const graph = makeGraph();
        getBBox.mockImplementationOnce(function (this: SVGElement) {
            fontSet.dispatchEvent(new Event('loadingdone'));
            return measureText(this);
        });

        await layout.prepare(graph, getNodes(graph));
        expect(waitForFonts).toHaveBeenCalledTimes(2);
        const count = getBBox.mock.calls.length;
        await layout.prepare(graph, getNodes(graph));
        expect(getBBox).toHaveBeenCalledTimes(count);
    });

    it('invalidates cached templates when the rendering language changes', async () => {
        const layout = createLayout();
        const graph = makeGraph();
        const language = i18n.language;
        await layout.prepare(graph, getNodes(graph));
        const count = getBBox.mock.calls.length;
        const preparations = vi.mocked(waitForFonts).mock.calls.length;
        try {
            await i18n.changeLanguage(language === 'ja' ? 'en' : 'ja');
            await layout.prepare(graph, getNodes(graph));
            expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
            expect(getBBox).toHaveBeenCalledTimes(count);
        } finally {
            await i18n.changeLanguage(language);
        }
    });

    it('evicts old templates when its entry budget is exceeded', async () => {
        const layout = createLayout({ maxEntries: 1 });
        const firstGraph = makeGraph();
        const secondGraph = makeGraph('品川');
        await layout.prepare(firstGraph, getNodes(firstGraph));
        await layout.prepare(secondGraph, getNodes(secondGraph));
        const count = getBBox.mock.calls.length;
        const preparations = vi.mocked(waitForFonts).mock.calls.length;
        await layout.prepare(firstGraph, getNodes(firstGraph));
        expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
        expect(getBBox).toHaveBeenCalledTimes(count);
    });

    it('does not retain templates exceeding its byte budget', async () => {
        const layout = createLayout({ maxBytes: 1 });
        const graph = makeGraph();
        await layout.prepare(graph, getNodes(graph));
        const count = getBBox.mock.calls.length;
        const preparations = vi.mocked(waitForFonts).mock.calls.length;
        await layout.prepare(graph, getNodes(graph));
        expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
        expect(getBBox).toHaveBeenCalledTimes(count);
    });

    it('shares text metrics across templates for different nodes containing the same text', async () => {
        const layout = createLayout();
        const firstGraph = makeGraph('東京品川新宿池袋', '北京地铁自适应文字线路');
        firstGraph.addNode('stn_intercity', {
            visible: true,
            zIndex: 0,
            x: 200,
            y: 0,
            type: StationType.GuangdongIntercityRailway,
            [StationType.GuangdongIntercityRailway]: structuredClone(
                stations[StationType.GuangdongIntercityRailway].defaultAttrs
            ),
        });
        const secondGraph = firstGraph.nullCopy();
        firstGraph.forEachNode((id, attributes) => {
            secondGraph.addNode(`${id}_copy`, { ...structuredClone(attributes), x: attributes.x + 200 });
        });
        const firstMarkup = await layout.prepare(firstGraph, getNodes(firstGraph));
        const count = getBBox.mock.calls.length;
        expect(count).toBeGreaterThan(0);
        const preparations = vi.mocked(waitForFonts).mock.calls.length;
        const secondMarkup = await layout.prepare(secondGraph, getNodes(secondGraph));

        expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
        expect(getBBox).toHaveBeenCalledTimes(count);
        expect(parseMarkup(secondMarkup).getElementById('stn_jr')).toBeNull();
        expect(dimensions(secondMarkup, 'stn_jr_copy')).toEqual(dimensions(firstMarkup, 'stn_jr'));
        expect(dimensions(secondMarkup, 'misc_node_bj_copy')).toEqual(dimensions(firstMarkup, 'misc_node_bj'));
        expect(parseMarkup(firstMarkup).getElementById('stn_name_stn_intercity')).not.toBeNull();
        expect(parseMarkup(secondMarkup).getElementById('stn_name_stn_intercity_copy')).not.toBeNull();
    });

    it('keeps literal id attributes in text distinct when caching text metrics', async () => {
        const layout = createLayout();
        const firstGraph = makeGraph('站 id="a"');
        const secondGraph = makeGraph('站 id="long-long"');
        const firstMarkup = await layout.prepare(firstGraph, getNodes(firstGraph));
        const count = getBBox.mock.calls.length;
        const secondMarkup = await layout.prepare(secondGraph, getNodes(secondGraph));

        expect(getBBox.mock.calls.length).toBeGreaterThan(count);
        expect(dimensions(firstMarkup, 'stn_jr').width).toBe(87);
        expect(dimensions(secondMarkup, 'stn_jr').width).toBe(167);
        expect(parseMarkup(secondMarkup).getElementById('stn_jr')?.textContent).toContain('站 id="long-long"');
    });

    it('rejects measurement failures, removes temporary DOM and allows a retry', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const layout = createLayout();
        const graph = makeGraph();
        getBBox.mockImplementation(() => {
            throw new Error('Text measurement failed');
        });

        await expect(layout.prepare(graph, getNodes(graph))).rejects.toThrow('Text measurement failed');
        expect(document.body.children).toHaveLength(bodyChildren);
        getBBox.mockImplementation(function (this: SVGElement) {
            return measureText(this);
        });
        expect(dimensions(await layout.prepare(graph, getNodes(graph)), 'stn_jr').width).toBe(27);
    });

    it('rejects non-finite geometry instead of caching a broken template', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const layout = createLayout();
        const graph = makeGraph();
        getBBox.mockReturnValue({ x: 0, y: 0, width: Number.NaN, height: 10 });

        await expect(layout.prepare(graph, getNodes(graph))).rejects.toThrow();
        expect(document.body.children).toHaveLength(bodyChildren);
        getBBox.mockImplementation(function (this: SVGElement) {
            return measureText(this);
        });
        expect(dimensions(await layout.prepare(graph, getNodes(graph)), 'stn_jr').width).toBe(27);
    });

    it('aborts in-flight work and releases the measurement host', async () => {
        const controller = new AbortController();
        const layout = createLayout({ signal: controller.signal });
        const graph = makeGraph();
        getBBox.mockImplementation(function (this: SVGElement) {
            controller.abort();
            return measureText(this);
        });

        await expect(layout.prepare(graph, getNodes(graph))).rejects.toMatchObject({ name: 'AbortError' });
        expect(document.body.children).toHaveLength(bodyChildren);
    });

    it('rejects an already aborted service without starting measurement', async () => {
        const controller = new AbortController();
        controller.abort();
        const layout = createLayout({ signal: controller.signal });
        const graph = makeGraph();

        await expect(layout.prepare(graph, getNodes(graph))).rejects.toMatchObject({ name: 'AbortError' });
        expect(getBBox).not.toHaveBeenCalled();
    });

    it('disposes pending requests and prevents work from starting after font completion', async () => {
        const fonts = deferred();
        vi.mocked(waitForFonts).mockReturnValueOnce(fonts.promise);
        const layout = createLayout();
        const graph = makeGraph();
        const preparation = layout.prepare(graph, getNodes(graph));
        const rejection = expect(preparation).rejects.toThrow();
        await vi.waitFor(() => expect(waitForFonts).toHaveBeenCalled());

        layout.dispose();
        await rejection;
        fonts.resolve();
        await Promise.resolve();
        expect(getBBox).not.toHaveBeenCalled();
        expect(document.body.children).toHaveLength(bodyChildren);
        await expect(layout.prepare(graph, getNodes(graph))).rejects.toThrow();
    });
});
