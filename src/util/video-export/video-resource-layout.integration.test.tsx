import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import miscNodes from '../../components/svgs/nodes/misc-nodes';
import stations from '../../components/svgs/stations/stations';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { StationType } from '../../constants/stations';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { waitForFonts } from '../fonts';
import { createVideoPreviewRenderer, exportVideo, VideoExportOptions } from './video-export';

const encoding = vi.hoisted(() => ({
    frames: [] as SVGSVGElement[],
    addFrame: vi.fn(),
    complete: vi.fn(async () => ({ kind: 'memory-blob' as const, blob: new Blob() })),
    dispose: vi.fn(),
}));

vi.mock('../fonts', async importOriginal => ({
    ...(await importOriginal<typeof import('../fonts')>()),
    waitForFonts: vi.fn(async () => undefined),
    loadFont: vi.fn(async () => undefined),
}));

vi.mock('./video-encoder', async importOriginal => ({
    ...(await importOriginal<typeof import('./video-encoder')>()),
    createVideoFrameWriter: vi.fn(async () => encoding),
}));

vi.mock('./video-export-rasterizer', () => ({
    renderVideoSVGToCanvas: vi.fn(async (svg: SVGSVGElement) => {
        encoding.frames.push(svg.cloneNode(true) as SVGSVGElement);
    }),
}));

const options: VideoExportOptions = {
    format: 'mp4',
    fps: 2,
    quality: 95,
    isTransparent: false,
    speedMultiplier: 8,
    autoChangeStationType: false,
    resolution: '720p',
    isSystemFontsOnly: true,
    hideWatermark: true,
};

const timeline = () => {
    const document = createEmptyTimelineDocument();
    document.settings = { ...document.settings!, cameraZoom: 1, autoChangeStationType: false, speedMultiplier: 8 };
    return document;
};

const makeGraph = (longNames = false, vertical = false) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_jr', {
        visible: true,
        zIndex: 0,
        x: 0,
        y: 0,
        type: StationType.JREastImportant,
        [StationType.JREastImportant]: {
            ...structuredClone(stations[StationType.JREastImportant].defaultAttrs),
            names: [longNames ? '東京品川新宿池袋' : '東京', 'Tokyo'],
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
            names: [longNames ? '北京地铁自适应文字线路' : '八通线', 'Line'],
        },
    });
    return graph;
};

// Exercise the complete SVG preparation path in jsdom. Actual font metrics are
// verified separately in a browser; this metric makes skipped measurement fail.
const measureText = (element: SVGElement): DOMRect => {
    if (element.tagName.toLowerCase() === 'text') {
        const size = Number(element.getAttribute('font-size') ?? 10);
        const length = [...(element.textContent ?? '')].length * size;
        const vertical = element.getAttribute('writing-mode') === 'vertical-rl';
        return { x: 0, y: 0, width: vertical ? size : length, height: vertical ? length : size } as DOMRect;
    }
    const boxes = [...element.querySelectorAll<SVGTextElement>('text')].map(measureText);
    return {
        x: 0,
        y: 0,
        width: Math.max(0, ...boxes.map(box => box.width)),
        height: Math.max(0, ...boxes.map(box => box.height)),
    } as DOMRect;
};

const dimensions = (svg: SVGSVGElement, id: string) => {
    const rect = svg.getElementById(id)?.querySelector('rect');
    expect(rect).not.toBeNull();
    return { width: Number(rect!.getAttribute('width')), height: Number(rect!.getAttribute('height')) };
};

const assertCleanGeometry = (svg: SVGSVGElement) => {
    expect(svg.querySelector('.removeMe')).toBeNull();
    for (const element of svg.querySelectorAll('[width], [height]')) {
        for (const name of ['width', 'height']) {
            if (!element.hasAttribute(name)) continue;
            expect(Number(element.getAttribute(name))).toBeGreaterThanOrEqual(0);
        }
    }
};

describe('video resource layout through real SVG preparation', () => {
    const previews: Awaited<ReturnType<typeof createVideoPreviewRenderer>>[] = [];
    const originalBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    let getBBox: ReturnType<typeof vi.fn>;
    let bodyChildren: number;
    let fontSet: EventTarget;

    beforeEach(() => {
        vi.clearAllMocks();
        encoding.addFrame.mockReset();
        vi.mocked(waitForFonts).mockResolvedValue(undefined);
        encoding.frames.length = 0;
        bodyChildren = document.body.children.length;
        fontSet = new EventTarget();
        Object.defineProperty(document, 'fonts', { configurable: true, value: fontSet });
        getBBox = vi.fn(function (this: SVGElement) {
            return measureText(this);
        });
        Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: getBBox });
    });

    afterEach(() => {
        previews.splice(0).forEach(preview => preview.dispose());
        if (originalBBox) Object.defineProperty(SVGElement.prototype, 'getBBox', originalBBox);
        else Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
        vi.restoreAllMocks();
        expect(document.body.children).toHaveLength(bodyChildren);
    });

    it('uses measured long-name templates in preview and reuses them for repeated seeks', async () => {
        const shortPreview = await createVideoPreviewRenderer(makeGraph(), timeline(), [], options);
        const longGraph = makeGraph(true);
        const originalGraph = structuredClone(longGraph.export());
        const longPreview = await createVideoPreviewRenderer(longGraph, timeline(), [], options);
        previews.push(shortPreview, longPreview);
        const shortSVG = await shortPreview.renderFrame(shortPreview.duration);
        const longSVG = await longPreview.renderFrame(longPreview.duration);

        expect(dimensions(shortSVG, 'stn_jr')).toEqual({ width: 27, height: 11 });
        expect(dimensions(longSVG, 'stn_jr').width).toBeGreaterThan(dimensions(shortSVG, 'stn_jr').width);
        expect(dimensions(longSVG, 'misc_node_bj').width).toBeGreaterThan(dimensions(shortSVG, 'misc_node_bj').width);
        assertCleanGeometry(longSVG);
        const count = getBBox.mock.calls.length;
        for (const time of [0, longPreview.duration / 2, longPreview.duration, 0, longPreview.duration]) {
            await longPreview.renderPreviewFrame(time);
        }
        expect(getBBox).toHaveBeenCalledTimes(count);
        expect(longGraph.export()).toEqual(originalGraph);
    });

    it('uses the same measured geometry during export and performs no per-frame text measurement', async () => {
        await exportVideo(makeGraph(), timeline(), [], options, 'white');
        const shortSVG = encoding.frames.at(-1)!;
        const shortFrameCount = encoding.frames.length;
        encoding.frames.length = 0;
        let countAtFirstFrame: number | undefined;
        encoding.addFrame.mockImplementation(() => {
            countAtFirstFrame ??= getBBox.mock.calls.length;
            expect(getBBox).toHaveBeenCalledTimes(countAtFirstFrame);
        });

        await exportVideo(makeGraph(true), timeline(), [], options, 'white');
        const longSVG = encoding.frames.at(-1)!;
        expect(shortFrameCount).toBeGreaterThan(1);
        expect(encoding.frames.length).toBeGreaterThan(1);
        expect(dimensions(longSVG, 'stn_jr').width).toBeGreaterThan(dimensions(shortSVG, 'stn_jr').width);
        expect(dimensions(longSVG, 'misc_node_bj').width).toBeGreaterThan(dimensions(shortSVG, 'misc_node_bj').width);
        assertCleanGeometry(longSVG);
        expect(encoding.complete).toHaveBeenCalledTimes(2);
        expect(encoding.dispose).toHaveBeenCalledTimes(2);
    });

    it('refreshes the same preview frame after fonts change and caches its new baseline', async () => {
        const preview = await createVideoPreviewRenderer(makeGraph(true), timeline(), [], options);
        previews.push(preview);
        const time = preview.duration;
        const originalSVG = await preview.renderPreviewFrame(time);
        const originalJR = dimensions(originalSVG, 'stn_jr');
        const originalBeijing = dimensions(originalSVG, 'misc_node_bj');
        const measurements = getBBox.mock.calls.length;
        const preparations = vi.mocked(waitForFonts).mock.calls.length;
        const onInvalidation = vi.fn();
        const unsubscribe = preview.subscribeLayoutInvalidation!(onInvalidation);
        getBBox.mockImplementation(function (this: SVGElement) {
            const box = measureText(this);
            return { ...box, width: box.width * 1.25 } as DOMRect;
        });

        fontSet.dispatchEvent(new Event('loadingdone'));
        expect(onInvalidation).toHaveBeenCalledOnce();
        const refreshedSVG = await preview.renderPreviewFrame(time);
        expect(refreshedSVG).toBe(originalSVG);
        expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
        expect(getBBox.mock.calls.length).toBeGreaterThan(measurements);
        expect(dimensions(refreshedSVG, 'stn_jr')).toEqual({ width: 107, height: 11 });
        expect(dimensions(refreshedSVG, 'misc_node_bj').width).toBeCloseTo(100.25);
        expect(dimensions(refreshedSVG, 'stn_jr').width).toBeGreaterThan(originalJR.width);
        expect(dimensions(refreshedSVG, 'misc_node_bj').width).toBeGreaterThan(originalBeijing.width);
        assertCleanGeometry(refreshedSVG);

        const refreshedMeasurements = getBBox.mock.calls.length;
        await preview.renderPreviewFrame(time);
        expect(getBBox).toHaveBeenCalledTimes(refreshedMeasurements);
        expect(waitForFonts).toHaveBeenCalledTimes(preparations + 1);
        unsubscribe();
        fontSet.dispatchEvent(new Event('loadingdone'));
        expect(onInvalidation).toHaveBeenCalledOnce();
    });

    it('keeps vertical JR station dimensions valid in preview and every exported frame', async () => {
        const preview = await createVideoPreviewRenderer(makeGraph(true, true), timeline(), [], options);
        previews.push(preview);
        const previewSVG = await preview.renderFrame(preview.duration);
        expect(dimensions(previewSVG, 'stn_jr')).toEqual({ width: 11, height: 76 });

        await exportVideo(makeGraph(true, true), timeline(), [], options, 'white');
        for (const svg of encoding.frames) assertCleanGeometry(svg);
        expect(dimensions(encoding.frames.at(-1)!, 'stn_jr')).toEqual(dimensions(previewSVG, 'stn_jr'));
    });

    it('cleans the offscreen measurement host when preview preparation is canceled', async () => {
        const controller = new AbortController();
        getBBox.mockImplementation(function (this: SVGElement) {
            controller.abort();
            return measureText(this);
        });

        await expect(
            createVideoPreviewRenderer(makeGraph(true), timeline(), [], options, undefined, controller.signal)
        ).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(document.body.children).toHaveLength(bodyChildren));
        expect(getBBox).toHaveBeenCalled();
        expect(encoding.frames).toHaveLength(0);
        expect(encoding.addFrame).not.toHaveBeenCalled();
    });
});
