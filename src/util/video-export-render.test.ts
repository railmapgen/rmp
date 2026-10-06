import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getI18n, setI18n } from 'react-i18next';
import i18n from '../i18n/config';
import stations from '../components/svgs/stations/stations';
import miscNodes from '../components/svgs/nodes/misc-nodes';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/nodes';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import * as mapTileController from '../map/map-tile-controller';
import { createEmptyTimelineDocument, TimelineDocument, TimelineEntry } from '../constants/timeline';
import { makeRenderReadySVGElement } from './download';
import * as videoExportCanvas from './video-export-canvas';
import {
    createVideoPreviewRenderer,
    exportVideo,
    getCameraViewBox,
    getOverviewZoom,
    VideoExportOptions,
} from './video-export';
import { createVideoFrameWriter, NativeVideoEncodingError } from './video-encoder';
import { calculateCanvasSize } from './helpers';

const { addFrame, complete } = vi.hoisted(() => ({
    addFrame: vi.fn(),
    complete: vi.fn().mockResolvedValue(new Blob()),
}));
vi.mock('./video-encoder', async importOriginal => ({
    ...(await importOriginal<typeof import('./video-encoder')>()),
    createVideoFrameWriter: vi.fn(async () => ({ addFrame, complete, dispose: vi.fn() })),
}));
vi.mock('./download', () => ({ makeRenderReadySVGElement: vi.fn() }));

const renderedSVGs: SVGSVGElement[] = [];
let editorCanvas: SVGSVGElement;
const defaultOptions: VideoExportOptions = {
    format: 'mp4',
    fps: 30,
    speedMultiplier: 1,
    resolution: '720p',
    isTransparent: false,
    autoChangeStationType: false,
    isSystemFontsOnly: true,
    quality: 95,
    hideWatermark: true,
};

beforeEach(() => {
    vi.clearAllMocks();
    renderedSVGs.length = 0;
    editorCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    editorCanvas.id = 'canvas';
    document.body.append(editorCanvas);
    vi.mocked(makeRenderReadySVGElement).mockImplementation(
        async (graph, mapEnabled, _info, _fonts, _languages, _force, _version, renderGraph, sourceCanvas) => {
            const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            if (mapEnabled) {
                const sourceMap = sourceCanvas?.querySelector('[data-map-layer]');
                if (sourceMap) elem.append(sourceMap.cloneNode(true));
            }
            const layer = document.createElementNS(elem.namespaceURI, 'g');
            layer.setAttribute('data-editor-layer', '');
            elem.append(layer);
            graph.forEachNode(node => {
                const group = document.createElementNS(elem.namespaceURI, 'g');
                group.id = node;
                layer.append(group);
            });
            graph.forEachEdge(edge => {
                const group = document.createElementNS(elem.namespaceURI, 'g');
                const path = document.createElementNS(elem.namespaceURI, 'path') as SVGPathElement;
                group.id = edge;
                group.appendChild(path);
                layer.appendChild(group);
            });
            renderGraph?.(elem);
            elem.querySelectorAll('.removeMe, [fill="url(#opaque)"]').forEach(el => el.remove());
            graph.forEachEdge(edge => {
                const source = graph.getNodeAttributes(graph.source(edge));
                const target = graph.getNodeAttributes(graph.target(edge));
                [edge, `${edge}.pre`, `${edge}.post`].forEach(id =>
                    elem
                        .getElementById(id)
                        ?.querySelectorAll('path')
                        .forEach(path => {
                            path.getTotalLength = () => Math.hypot(target.x - source.x, target.y - source.y);
                            path.getPointAtLength = distance =>
                                ({
                                    x: source.x + ((target.x - source.x) * distance) / path.getTotalLength(),
                                    y: source.y + ((target.y - source.y) * distance) / path.getTotalLength(),
                                }) as DOMPoint;
                        })
                );
            });
            // Keep the preparation geometry separately from the SVGs actually sent to the canvas.
            if (!renderedSVGs.length) renderedSVGs.push(elem.cloneNode(true) as SVGSVGElement);
            return { elem, width: 1280, height: 720 };
        }
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal(
        'Image',
        class {
            onload?: () => void;
            set src(value: string) {
                const encodedSVG = value.split(',', 2)[1];
                const bytes = Uint8Array.from(atob(encodedSVG), character => character.charCodeAt(0));
                const svg = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'text/html');
                renderedSVGs.push(svg.querySelector('svg')!);
                this.onload?.();
            }
        }
    );
});

afterEach(() => {
    editorCanvas.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const makeGraph = (length: number) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    const stationAttrs = {
        visible: true,
        zIndex: 0,
        type: StationType.LondonTubeBasic,
        [StationType.LondonTubeBasic]: structuredClone(stations[StationType.LondonTubeBasic].defaultAttrs),
    };
    graph.addNode('stn_a', { ...stationAttrs, x: 0, y: 0 });
    graph.addNode('stn_b', { ...stationAttrs, x: length, y: 0 });
    graph.addDirectedEdgeWithKey('line_ab', 'stn_a', 'stn_b', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Diagonal,
        style: LineStyleType.SingleColor,
        reconcileId: '',
        parallelIndex: -1,
        [LinePathType.Diagonal]: structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
        [LineStyleType.SingleColor]: structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs),
    });
    return graph;
};

const makeFillGraph = () => {
    const graph = makeGraph(200);
    const lineAttrs = structuredClone(graph.getEdgeAttributes('line_ab'));
    graph.clear();
    graph.addNode('misc_node_fill', {
        visible: true,
        zIndex: -1,
        x: 0,
        y: 0,
        type: MiscNodeType.Fill,
        [MiscNodeType.Fill]: {
            color: structuredClone(lineAttrs[LineStyleType.SingleColor]!.color),
            opacity: 0.5,
            selectedPatterns: ['trees', 'water'],
        },
    });
    for (const [id, x, y] of [
        ['misc_node_corner_a', 200, 0],
        ['misc_node_corner_b', 200, 200],
    ] as const)
        graph.addNode(id, { visible: true, zIndex: 0, x, y, type: MiscNodeType.Virtual, virtual: {} });
    for (const [id, source, target] of [
        ['line_fill_a', 'misc_node_fill', 'misc_node_corner_a'],
        ['line_fill_b', 'misc_node_corner_a', 'misc_node_corner_b'],
        ['line_fill_close', 'misc_node_corner_b', 'misc_node_fill'],
    ] as const)
        graph.addDirectedEdgeWithKey(id, source, target, {
            ...structuredClone(lineAttrs),
            type: LinePathType.Bezier,
            [LinePathType.Bezier]: { ...linePaths[LinePathType.Bezier].defaultAttrs, normal: 0, along: 0.5 },
        });
    return graph;
};

describe('video export frame timing', () => {
    it('burns the fixed watermark into every exported frame', async () => {
        await exportVideo(
            makeGraph(200),
            createEmptyTimelineDocument(),
            [],
            { ...defaultOptions, hideWatermark: false },
            'white'
        );

        const frames = renderedSVGs.slice(1);
        expect(frames).toHaveLength(91);
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        expect(frames.every(frame => frame.getElementById('rmp_info') !== null)).toBe(true);
        expect(frames.every(frame => frame.lastElementChild?.id === 'rmp_info')).toBe(true);
        const watermark = frames[0].getElementById('rmp_info')!;
        expect(watermark.querySelector('[data-watermark-part="wordmark"]')?.tagName).toBe('path');
        expect(watermark.querySelector('[data-watermark-part="wordmark"]')?.getAttribute('d')).toContain('M20 68V5');
        const redLine = watermark.querySelector('[data-watermark-part="red-line"]');
        const greenLine = watermark.querySelector('[data-watermark-part="green-line"]');
        expect(redLine?.getAttribute('stroke')).toBe('#e3002b');
        expect(redLine?.getAttribute('x2')).toBe('123');
        expect(greenLine?.getAttribute('stroke')).toBe('#82bf25');
        expect(greenLine?.getAttribute('x1')).toBe('157');
        expect(watermark.querySelector('[data-watermark-part="interchange"]')?.getAttribute('fill')).toBe('none');
        expect(watermark.querySelector('rect, image')).toBeNull();
    });

    it.each([
        { length: 200, speedMultiplier: 1, fps: 30, drawingSeconds: 2 },
        { length: 400, speedMultiplier: 1, fps: 30, drawingSeconds: 4 },
    ])('derives frame timing from $length units at $speedMultiplier× and $fps FPS', async params => {
        const { length, speedMultiplier, fps, drawingSeconds } = params;
        const onProgress = vi.fn();
        const timeline = createEmptyTimelineDocument();
        timeline.settings!.speedMultiplier = speedMultiplier;
        await exportVideo(
            makeGraph(length),
            timeline,
            [],
            { ...defaultOptions, speedMultiplier, fps },
            'white',
            onProgress
        );

        // One endpoint frame and a fixed one-second overview follow the drawing frames.
        expect(addFrame).toHaveBeenCalledTimes((drawingSeconds + 1) * fps + 1);
        // The first SVG only measures line length; later SVGs are the rendered frames.
        const halfwayFrame = renderedSVGs[1 + (drawingSeconds * fps) / 2];
        expect(halfwayFrame.querySelector('path')?.getAttribute('stroke-dasharray')).toBe(
            `${length / 2} ${length * 2}`
        );
        expect(onProgress).toHaveBeenLastCalledWith(1);
        expect(complete).toHaveBeenCalledOnce();
    });

    it('keeps elapsed-time progress when the drawing duration ends between frames', async () => {
        await exportVideo(makeGraph(205), createEmptyTimelineDocument(), [], defaultOptions, 'white');
        expect(addFrame).toHaveBeenCalledTimes(93);
        const dashArray = renderedSVGs[31].querySelector('path')!.getAttribute('stroke-dasharray')!;
        expect(Number(dashArray.split(' ')[0])).toBeCloseTo(100);
        expect(renderedSVGs[63].querySelector('path')?.getAttribute('stroke-dasharray')).toBeNull();
    });

    it('exports a node-only timeline with time for the node reveal and overview', async () => {
        const graph = makeGraph(200);
        graph.dropEdge('line_ab');
        await exportVideo(graph, createEmptyTimelineDocument(), [], defaultOptions, 'white');
        expect(addFrame).toHaveBeenCalledTimes(61);
        expect(complete).toHaveBeenCalledOnce();
    });
});

const authoredTimeline = (...track: TimelineEntry[]): TimelineDocument => ({ version: 1, track });
const nodeEntry: TimelineEntry = { id: 'enter_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true };
const edgeEntry: TimelineEntry = {
    id: 'enter_ab',
    kind: 'edge',
    refId: 'line_ab',
    phase: 'enter',
    showAnimation: true,
};

const geographicEnvironment = {
    mapEnabled: true,
    isSubscriber: true,
    mapStyle: DEFAULT_MAP_STYLE,
    svgViewBoxMin: { x: 0, y: 0 },
    svgViewBoxZoom: 100,
};

const mockGeographicMap = () => {
    const layer = document.createElementNS(editorCanvas.namespaceURI, 'g');
    layer.setAttribute('data-map-layer', '');
    editorCanvas.append(layer);
    vi.spyOn(videoExportCanvas, 'createVideoExportCanvas').mockReturnValue({
        canvas: editorCanvas,
        renderGeometry: true,
        dispose: vi.fn(),
    });
    return vi
        .spyOn(mapTileController, 'renderMapLayerForExport')
        .mockImplementation(async (_source, target, bounds) => {
            const background = document.createElementNS(editorCanvas.namespaceURI, 'rect');
            background.setAttribute('data-test-map-coverage', '');
            background.setAttribute('x', String(bounds.xMin));
            background.setAttribute('y', String(bounds.yMin));
            background.setAttribute('width', String(bounds.xMax - bounds.xMin));
            background.setAttribute('height', String(bounds.yMax - bounds.yMin));
            target.replaceChildren(background);
        });
};

describe('geographic timeline overlays and frame coverage', () => {
    it.each(['hidden', 'unavailable'])(
        'does not count %s lines that are omitted from the rendered map',
        async reason => {
            mockGeographicMap();
            const graph = makeGraph(200);
            if (reason === 'hidden') graph.setEdgeAttribute('line_ab', 'visible', false);
            const timeline = authoredTimeline(nodeEntry, edgeEntry);
            timeline.settings = { ...createEmptyTimelineDocument().settings!, showLineLength: true };
            const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions, {
                ...geographicEnvironment,
                isSubscriber: reason !== 'unavailable',
            });
            const svg = await renderer.renderFrame(renderer.duration);
            expect(svg.getElementById('line_ab')).toBeNull();
            expect(svg.querySelector('[data-video-total-length]')?.textContent).toBe('0.0km');
            renderer.dispose();
        }
    );

    it.each(['km', 'mi'] as const)('totals revealed edges in %s and restores totals on backwards seeks', async unit => {
        mockGeographicMap();
        const graph = makeGraph(200);
        graph.addNode('stn_c', { ...structuredClone(graph.getNodeAttributes('stn_b')), x: 400 });
        graph.addDirectedEdgeWithKey('line_bc', 'stn_b', 'stn_c', structuredClone(graph.getEdgeAttributes('line_ab')));
        const timeline = authoredTimeline(
            nodeEntry,
            edgeEntry,
            { ...edgeEntry, id: 'enter_bc', refId: 'line_bc' },
            { ...edgeEntry, id: 'exit_ab', phase: 'exit' }
        );
        timeline.settings = {
            ...createEmptyTimelineDocument().settings!,
            autoChangeStationType: false,
            showLineLength: true,
            lineLengthUnit: unit,
        };
        const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions, geographicEnvironment);
        const readLength = async (time: number) => {
            const svg = await renderer.renderPreviewFrame(time);
            const text = svg.querySelector('[data-video-total-length]')!.textContent!;
            expect(text).toMatch(new RegExp(`^\\d+\\.\\d${unit}$`));
            return parseFloat(text);
        };
        const multiplier = unit === 'km' ? 1 : 1 / 1.609344;
        const half = await readLength(1);
        expect(half).toBeCloseTo(1.8 * multiplier, 0);
        const full = await readLength(renderer.cursorTimes[3]);
        expect(full).toBeGreaterThan(half * 3);
        const final = await readLength(renderer.duration);
        expect(final).toBeCloseTo(full / 2, 0);
        expect(await readLength(1)).toBe(half);
        expect(await readLength(0)).toBe(0);
        renderer.dispose();
    });

    it('omits geographic length from ordinary map videos despite an enabled saved setting', async () => {
        const timeline = authoredTimeline(nodeEntry, edgeEntry);
        timeline.settings = { ...createEmptyTimelineDocument().settings!, showLineLength: true };
        const renderer = await createVideoPreviewRenderer(makeGraph(200), timeline, [], defaultOptions);
        expect((await renderer.renderFrame(renderer.duration)).querySelector('[data-video-total-length]')).toBeNull();
        renderer.dispose();
    });

    it('updates geographic length with station keyframes and restores original measurements on backwards seek', async () => {
        mockGeographicMap();
        const timeline = authoredTimeline(
            nodeEntry,
            edgeEntry,
            { id: 'origin', kind: 'keyframe', refId: 'stn_b', x: 200, y: 0 },
            { id: 'wait', kind: 'pause', position: 'after', duration: 2 },
            { id: 'move', kind: 'keyframe', refId: 'stn_b', x: 400, y: 0 }
        );
        timeline.settings = { ...createEmptyTimelineDocument().settings!, showLineLength: true };
        const renderer = await createVideoPreviewRenderer(
            makeGraph(200),
            timeline,
            [],
            defaultOptions,
            geographicEnvironment
        );
        const read = async (time: number) =>
            parseFloat((await renderer.renderFrame(time)).querySelector('[data-video-total-length]')!.textContent!);
        const initial = await read(renderer.cursorTimes[2]);
        expect(await read(renderer.duration)).toBeCloseTo(initial * 2, 0);
        expect(await read(renderer.cursorTimes[2])).toBe(initial);
        renderer.dispose();
    });

    it.each([false, true])('loads map coverage for the full final video frame (keyframe=%s)', async moving => {
        const load = mockGeographicMap();
        const timeline = authoredTimeline(
            nodeEntry,
            edgeEntry,
            ...(moving ? [{ id: 'move', kind: 'keyframe', refId: 'stn_b', x: 800, y: 600 } as TimelineEntry] : [])
        );
        const renderer = await createVideoPreviewRenderer(
            makeGraph(200),
            timeline,
            [],
            defaultOptions,
            geographicEnvironment
        );
        expect(load).toHaveBeenCalledOnce();
        const coversFrame = async (time: number) => {
            const svg = await renderer.renderFrame(time);
            const coverage = svg.querySelector('[data-test-map-coverage]')!;
            const [x, y, width, height] = svg.getAttribute('viewBox')!.split(' ').map(Number);
            expect(Number(coverage.getAttribute('x'))).toBeLessThanOrEqual(x);
            expect(Number(coverage.getAttribute('y'))).toBeLessThanOrEqual(y);
            expect(Number(coverage.getAttribute('x')) + Number(coverage.getAttribute('width'))).toBeGreaterThanOrEqual(
                x + width
            );
            expect(Number(coverage.getAttribute('y')) + Number(coverage.getAttribute('height'))).toBeGreaterThanOrEqual(
                y + height
            );
        };
        await coversFrame(0);
        await coversFrame(renderer.duration / 2);
        await coversFrame(renderer.duration);
        renderer.dispose();
    });
});
// Rasterization strips control characters before encoding the SVG, including CSS line breaks.
const rasterizedMarkup = (svg: SVGSVGElement) => svg.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');

describe('authored video frames', () => {
    it.each([
        { fps: 30, keyframes: false },
        { fps: 60, keyframes: true },
    ])(
        'keeps the camera moving across adjacent lines at $fps FPS (keyframes=$keyframes)',
        async ({ fps, keyframes }) => {
            const graph = makeGraph(200);
            graph.addNode('stn_c', { ...structuredClone(graph.getNodeAttributes('stn_b')), x: 400 });
            graph.addDirectedEdgeWithKey(
                'line_bc',
                'stn_b',
                'stn_c',
                structuredClone(graph.getEdgeAttributes('line_ab'))
            );
            const entries: TimelineEntry[] = [nodeEntry, edgeEntry, { ...nodeEntry, id: 'enter_b', refId: 'stn_b' }];
            if (keyframes) entries.push({ id: 'marker', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 });
            entries.push({ ...edgeEntry, id: 'enter_bc', refId: 'line_bc' });
            await exportVideo(graph, authoredTimeline(...entries), [], { ...defaultOptions, fps }, 'white');
            expect(addFrame).toHaveBeenCalledTimes(5 * fps + 1);
            const frames = renderedSVGs.slice(1);
            const centerX = (frame: number) => {
                const [x, , width] = frames[frame].getAttribute('viewBox')!.split(' ').map(Number);
                return x + width / 2;
            };
            for (let frame = 2 * fps - 2; frame <= 2 * fps + Math.ceil(fps * 0.3); frame++) {
                expect(centerX(frame) - centerX(frame - 1)).toBeGreaterThan((100 / fps) * 0.98);
                expect(centerX(frame) - centerX(frame - 1)).toBeLessThan((100 / fps) * 1.02);
            }
        }
    );

    it.each(['empty', 'authored'] as const)(
        'exports an %s timeline through real SVG preparation without an editor canvas',
        async scenario => {
            editorCanvas.remove();
            expect(document.getElementById('canvas')).toBeNull();
            const { makeRenderReadySVGElement: prepareSVG } =
                await vi.importActual<typeof import('./download')>('./download');
            vi.mocked(makeRenderReadySVGElement).mockImplementation(async (...args) => {
                const result = await prepareSVG(...args);
                const graph = args[0];
                graph.forEachEdge(edge => {
                    const source = graph.getNodeAttributes(graph.source(edge));
                    const target = graph.getNodeAttributes(graph.target(edge));
                    result.elem
                        .getElementById(edge)
                        ?.querySelectorAll('path')
                        .forEach(path => {
                            path.getTotalLength = () => Math.hypot(target.x - source.x, target.y - source.y);
                            path.getPointAtLength = distance =>
                                ({
                                    x: source.x + ((target.x - source.x) * distance) / path.getTotalLength(),
                                    y: source.y + ((target.y - source.y) * distance) / path.getTotalLength(),
                                }) as DOMPoint;
                        });
                });
                if (!renderedSVGs.length) renderedSVGs.push(result.elem.cloneNode(true) as SVGSVGElement);
                return result;
            });
            const timeline =
                scenario === 'empty'
                    ? createEmptyTimelineDocument()
                    : authoredTimeline(
                          nodeEntry,
                          edgeEntry,
                          { id: 'move', kind: 'keyframe', refId: 'stn_a', x: 0, y: 100 },
                          { ...nodeEntry, id: 'exit_a', phase: 'exit' }
                      );
            const onProgress = vi.fn();
            await exportVideo(makeGraph(200), timeline, [], defaultOptions, 'white', onProgress);
            expect(complete).toHaveBeenCalledOnce();
            expect(onProgress).toHaveBeenLastCalledWith(1);
            expect(renderedSVGs[0].getElementById('line_ab')).not.toBeNull();
            expect(renderedSVGs.at(-1)?.getElementById('line_ab')).not.toBeNull();
            expect(document.getElementById('canvas')).toBeNull();
            if (scenario === 'authored') {
                expect(renderedSVGs.at(-1)?.getElementById('stn_a')).toBeNull();
                expect(
                    renderedSVGs.some(svg =>
                        svg.getElementById('stn_a')?.getAttribute('transform')?.includes('translate(0, 100)')
                    )
                ).toBe(true);
            } else {
                expect(renderedSVGs.at(-1)?.getElementById('stn_b')?.getAttribute('transform')).toContain(
                    'translate(200, 0)'
                );
            }
        }
    );

    it('releases its export source when SVG preparation fails', async () => {
        const dispose = vi.fn();
        vi.spyOn(videoExportCanvas, 'createVideoExportCanvas').mockReturnValue({
            canvas: editorCanvas,
            renderGeometry: false,
            dispose,
        });
        vi.mocked(makeRenderReadySVGElement).mockRejectedValue(new Error('SVG preparation failed'));
        await expect(
            exportVideo(makeGraph(200), createEmptyTimelineDocument(), [], defaultOptions, 'white')
        ).rejects.toThrow('SVG preparation failed');
        expect(dispose).toHaveBeenCalledOnce();
        expect(complete).not.toHaveBeenCalled();
    });

    it('restarts failed native encoding from frame zero and releases both writers and canvases', async () => {
        const firstDispose = vi.fn();
        const secondDispose = vi.fn();
        const firstAdd = vi.fn().mockRejectedValue(new NativeVideoEncodingError(new Error('Encoder failed')));
        vi.mocked(createVideoFrameWriter)
            .mockResolvedValueOnce({ addFrame: firstAdd, complete, dispose: firstDispose })
            .mockResolvedValueOnce({ addFrame, complete, dispose: secondDispose });
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const onProgress = vi.fn();
        await exportVideo(makeGraph(200), createEmptyTimelineDocument(), [], defaultOptions, 'white', onProgress);
        const attempts = vi.mocked(createVideoFrameWriter).mock.calls;
        expect(attempts.map(call => call[2])).toEqual([false, true]);
        expect(attempts[0][0]).not.toBe(attempts[1][0]);
        attempts.forEach(([canvas]) => expect([canvas.width, canvas.height]).toEqual([0, 0]));
        expect(firstDispose).toHaveBeenCalledOnce();
        expect(secondDispose).toHaveBeenCalledOnce();
        expect(firstAdd).toHaveBeenCalledWith(0);
        expect(addFrame).toHaveBeenNthCalledWith(1, 0);
        expect(addFrame).toHaveBeenCalledTimes(91);
        expect(onProgress).toHaveBeenLastCalledWith(1);
    });

    it('releases a failed software writer without retrying or reporting completion', async () => {
        const dispose = vi.fn();
        vi.mocked(createVideoFrameWriter).mockResolvedValueOnce({ addFrame, complete, dispose });
        complete.mockRejectedValueOnce(new Error('Software encoding failed'));
        const onProgress = vi.fn();
        await expect(
            exportVideo(makeGraph(200), createEmptyTimelineDocument(), [], defaultOptions, 'white', onProgress)
        ).rejects.toThrow('Software encoding failed');
        expect(createVideoFrameWriter).toHaveBeenCalledOnce();
        expect(dispose).toHaveBeenCalledOnce();
        expect(onProgress).not.toHaveBeenCalledWith(1);
    });

    it('moves nodes and their connected line geometry while preserving the editor graph and final keyframe', async () => {
        const graph = makeGraph(200);
        const original = structuredClone(graph.export());
        await exportVideo(
            graph,
            authoredTimeline(nodeEntry, { id: 'first', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 }, edgeEntry, {
                id: 'second',
                kind: 'keyframe',
                refId: 'stn_a',
                x: 0,
                y: 100,
            }),
            [],
            defaultOptions,
            'white'
        );

        const frames = renderedSVGs.slice(1);
        const transforms = frames.map(svg => svg.getElementById('stn_a')?.getAttribute('transform') ?? '');
        expect(transforms.some(transform => /translate\(0, (?:[1-9]|[1-9]\d)\./.test(transform))).toBe(true);
        const paths = new Set(
            frames.map(svg => svg.getElementById('line_ab')?.querySelector('path')?.getAttribute('d')).filter(Boolean)
        );
        expect(paths.size).toBeGreaterThan(10);
        expect(frames.at(-1)?.getElementById('stn_a')?.getAttribute('transform')).toContain('translate(0, 100)');
        expect(frames.at(-1)?.getElementById('stn_b')).toBeNull();
        expect(graph.export()).toEqual(original);
    });

    it('fades nodes out and keeps them hidden throughout the overview', async () => {
        await exportVideo(
            makeGraph(200),
            authoredTimeline(nodeEntry, { ...nodeEntry, id: 'exit_a', phase: 'exit' }),
            [],
            defaultOptions,
            'white'
        );
        // Node entrance takes 0.4s, followed by a 0.4s exit: at 0.6s it is half transparent.
        const halfway = renderedSVGs[1 + 18].getElementById('stn_a');
        expect(Number(halfway?.getAttribute('opacity'))).toBeCloseTo(0.5);
        expect(renderedSVGs.slice(1 + 24).every(svg => svg.getElementById('stn_a') === null)).toBe(true);
        expect(renderedSVGs.at(-1)?.getElementById('line_ab')).toBeNull();
    });

    it('retracts lines on exit and leaves the final frame empty', async () => {
        await exportVideo(
            makeGraph(200),
            authoredTimeline(edgeEntry, { ...edgeEntry, id: 'exit_ab', phase: 'exit' }),
            [],
            defaultOptions,
            'white'
        );
        const halfway = renderedSVGs[1 + 90].getElementById('line_ab')?.querySelector('path');
        expect(halfway?.getAttribute('stroke-dasharray')).toBe('100 400');
        expect(renderedSVGs.slice(1 + 120).every(svg => svg.getElementById('line_ab') === null)).toBe(true);
    });

    it('shows animation-disabled entries immediately without fading or scaling', async () => {
        await exportVideo(
            makeGraph(200),
            authoredTimeline({ ...nodeEntry, showAnimation: false }, { ...edgeEntry, showAnimation: false }),
            [],
            defaultOptions,
            'white'
        );
        expect(renderedSVGs[1].getElementById('stn_a')?.getAttribute('opacity')).toBe('1');
        expect(renderedSVGs[2].getElementById('stn_a')?.getAttribute('transform')).toBe('translate(0, 0)');
        expect(
            renderedSVGs[2].getElementById('line_ab')?.querySelector('path')?.getAttribute('stroke-dasharray')
        ).toBeNull();
    });

    it('animates and removes line underlays along with the main line', async () => {
        const graph = makeGraph(200);
        graph.mergeEdgeAttributes('line_ab', {
            style: LineStyleType.JREastSingleColor,
            [LineStyleType.JREastSingleColor]: structuredClone(
                lineStyles[LineStyleType.JREastSingleColor].defaultAttrs
            ),
        });
        await exportVideo(
            graph,
            authoredTimeline(edgeEntry, { ...edgeEntry, id: 'exit_ab', phase: 'exit' }),
            [],
            defaultOptions,
            'white'
        );
        const halfway = renderedSVGs[1 + 90];
        expect(halfway.getElementById('line_ab.pre')?.querySelector('path')?.getAttribute('stroke-dasharray')).toBe(
            '100 400'
        );
        expect(renderedSVGs.at(-1)?.getElementById('line_ab.pre')).toBeNull();
        expect(renderedSVGs.at(-1)?.getElementById('line_ab')).toBeNull();
    });
});

describe('shared real-time preview renderer', () => {
    it.each([false, true])(
        'keeps station names at a fixed size after their fade across adjacent lines (authored=%s)',
        async authored => {
            const graph = makeGraph(200);
            graph.addNode('stn_c', { ...structuredClone(graph.getNodeAttributes('stn_b')), x: 400 });
            graph.addDirectedEdgeWithKey(
                'line_bc',
                'stn_b',
                'stn_c',
                structuredClone(graph.getEdgeAttributes('line_ab'))
            );
            const timeline = authoredTimeline(
                nodeEntry,
                edgeEntry,
                { ...nodeEntry, id: 'enter_b', refId: 'stn_b' },
                { ...edgeEntry, id: 'enter_bc', refId: 'line_bc' }
            );
            if (authored) timeline.track.push({ id: 'pause', kind: 'pause', position: 'after', duration: 0.2 });
            const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
            const secondStart = renderer.cursorTimes[2];
            const early = await renderer.renderPreviewFrame(0.2);
            expect(Number(early.getElementById('stn_a')?.getAttribute('opacity'))).toBeCloseTo(0.5);
            for (const time of [0.4, 1, secondStart, secondStart + 0.2, secondStart + 0.4, 3.5, secondStart]) {
                const preview = await renderer.renderPreviewFrame(time);
                const snapshot = await renderer.renderFrame(time);
                for (const svg of [preview, snapshot]) {
                    expect(svg.getElementById('stn_a')?.getAttribute('transform')).toBe('translate(0, 0)');
                    expect(svg.getElementById('stn_a')?.getAttribute('opacity')).toBe('1');
                    const station = svg.getElementById('stn_b');
                    if (station) expect(station.getAttribute('transform')).toBe('translate(200, 0)');
                }
                if (time >= secondStart + 0.4)
                    expect(preview.getElementById('stn_b')?.getAttribute('opacity')).toBe('1');
            }
            renderer.dispose();
        }
    );

    it.each(['empty', 'authored'] as const)(
        'hides the first line until drawing starts in %s preview and export',
        async scenario => {
            const graph = makeGraph(200);
            const timeline =
                scenario === 'empty' ? createEmptyTimelineDocument() : authoredTimeline(nodeEntry, edgeEntry);
            await exportVideo(graph, timeline, [], defaultOptions, 'white');
            const exported = renderedSVGs.slice(1);
            expect(exported[0].getElementById('line_ab')).toBeNull();
            expect(exported[1].getElementById('line_ab')).not.toBeNull();

            const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
            for (const time of [0, 1 / defaultOptions.fps, 1, 0, 1 / defaultOptions.fps]) {
                const live = await renderer.renderPreviewFrame(time);
                expect(live.getElementById('line_ab')!.getAttribute('display')).toBe(time === 0 ? 'none' : null);
                const snapshot = await renderer.renderFrame(time);
                expect(snapshot.getElementById('line_ab') === null).toBe(time === 0);
            }
            renderer.dispose();
        }
    );

    it('keeps Full fitted to the whole map as keyframes move stations', async () => {
        const graph = makeGraph(200);
        const timeline = authoredTimeline(nodeEntry, edgeEntry, {
            id: 'move',
            kind: 'keyframe',
            refId: 'stn_a',
            x: 1000,
            y: 300,
        });
        timeline.settings = { ...createEmptyTimelineDocument().settings!, cameraZoom: 1 };
        const renderer = await createVideoPreviewRenderer(graph, timeline, [], { ...defaultOptions, fps: 15 });
        for (const time of [1, renderer.duration, 0]) {
            const frameGraph = graph.copy();
            const progress = Math.min(1, time / 2);
            frameGraph.mergeNodeAttributes('stn_a', { x: 1000 * progress, y: 300 * progress });
            const bounds = calculateCanvasSize(frameGraph);
            const box = getCameraViewBox(
                { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2 },
                getOverviewZoom(frameGraph)
            );
            const expected = [box.x, box.y, box.width, box.height];
            const frame = await renderer.renderFrame(time);
            frame
                .getAttribute('viewBox')!
                .split(' ')
                .map(Number)
                .forEach((value, index) => expect(value).toBeCloseTo(expected[index], 9));
        }
        renderer.dispose();
    });

    it.each([1, 4, 16] as const)('uses project Zoom %sx in preview and export and ends at 100%%', async cameraZoom => {
        const graph = makeGraph(200);
        const timeline = createEmptyTimelineDocument();
        timeline.settings!.cameraZoom = cameraZoom;
        const bounds = calculateCanvasSize(graph);
        const wholeViewBox = getCameraViewBox(
            {
                x: (bounds.xMin + bounds.xMax) / 2,
                y: (bounds.yMin + bounds.yMax) / 2,
            },
            getOverviewZoom(graph)
        );
        const preview = await createVideoPreviewRenderer(graph, timeline, [], { ...defaultOptions, fps: 15 });
        const current = await preview.renderFrame(0.4);
        const currentBox = current.getAttribute('viewBox')!.split(' ').map(Number);
        expect(currentBox[2]).toBeCloseTo(wholeViewBox.width / cameraZoom, 9);
        expect(currentBox[3]).toBeCloseTo(wholeViewBox.height / cameraZoom, 9);
        const expectedFinal = [wholeViewBox.x, wholeViewBox.y, wholeViewBox.width, wholeViewBox.height];
        const final = await preview.renderFrame(preview.duration);
        final
            .getAttribute('viewBox')!
            .split(' ')
            .map(Number)
            .forEach((value, index) => expect(value).toBeCloseTo(expectedFinal[index], 9));
        if (cameraZoom === 1) {
            currentBox.forEach((value, index) => expect(value).toBeCloseTo(expectedFinal[index], 9));
        }
        await exportVideo(graph, timeline, [], { ...defaultOptions, fps: 60, resolution: '1080p' }, 'white');
        // First SVG is measurement geometry; subsequent SVGs are actual exported frames.
        renderedSVGs[1 + 24]
            .getAttribute('viewBox')!
            .split(' ')
            .map(Number)
            .forEach((value, index) => expect(value).toBeCloseTo(currentBox[index], 9));
        renderedSVGs
            .at(-1)!
            .getAttribute('viewBox')!
            .split(' ')
            .map(Number)
            .forEach((value, index) => expect(value).toBeCloseTo(expectedFinal[index], 9));
        preview.dispose();
    });

    it('keeps the same camera position at shared video times across preview and export FPS', async () => {
        const graph = makeGraph(200);
        const timeline = authoredTimeline(
            nodeEntry,
            { id: 'origin', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 },
            edgeEntry,
            { id: 'move', kind: 'keyframe', refId: 'stn_a', x: 0, y: 100 }
        );
        const preview = await createVideoPreviewRenderer(graph, timeline, [], {
            ...defaultOptions,
            fps: 15,
            resolution: '720p',
        });
        const exported = await createVideoPreviewRenderer(graph, timeline, [], {
            ...defaultOptions,
            fps: 60,
            resolution: '4k',
        });
        for (const time of [0.4, 0.8, 1.2, 0.4, 1.2]) {
            const a = await preview.renderPreviewFrame(time);
            const b = await exported.renderPreviewFrame(time);
            expect(a.getAttribute('width')).not.toBe(b.getAttribute('width'));
            const [ax, ay, aw, ah] = a.getAttribute('viewBox')!.split(' ').map(Number);
            const [bx, by, bw, bh] = b.getAttribute('viewBox')!.split(' ').map(Number);
            expect(ax + aw / 2).toBeCloseTo(bx + bw / 2, 9);
            expect(ay + ah / 2).toBeCloseTo(by + bh / 2, 9);
            expect(aw).toBeCloseTo(bw, 9);
            expect(ah).toBeCloseTo(bh, 9);
        }
        preview.dispose();
        exported.dispose();
    });

    it('keeps short clips, disabled animations, pauses and keyframe cursors independent of preview and export FPS', async () => {
        const graph = makeGraph(1);
        graph.addNode('stn_c', { ...structuredClone(graph.getNodeAttributes('stn_b')), x: 201 });
        graph.addDirectedEdgeWithKey('line_bc', 'stn_b', 'stn_c', structuredClone(graph.getEdgeAttributes('line_ab')));
        const timeline = authoredTimeline(
            { ...nodeEntry, showAnimation: false },
            edgeEntry,
            { id: 'pause', kind: 'pause', position: 'after', duration: 0.125 },
            { id: 'origin_b', kind: 'keyframe', refId: 'stn_b', x: 1, y: 0 },
            { ...nodeEntry, id: 'exit_a', phase: 'exit', showAnimation: false },
            { ...edgeEntry, id: 'exit_ab', phase: 'exit', showAnimation: false },
            { ...nodeEntry, id: 'enter_b', refId: 'stn_b', showAnimation: false },
            { ...edgeEntry, id: 'enter_bc', refId: 'line_bc' },
            { id: 'move_b', kind: 'keyframe', refId: 'stn_b', x: 1, y: 100 },
            { ...nodeEntry, id: 'enter_c', refId: 'stn_c', showAnimation: false },
            { id: 'move_c', kind: 'keyframe', refId: 'stn_c', x: 201, y: 20 }
        );
        const preview = await createVideoPreviewRenderer(graph, timeline, [], { ...defaultOptions, fps: 15 });
        const exported = await createVideoPreviewRenderer(graph, timeline, [], { ...defaultOptions, fps: 60 });
        // The last cursor includes overview and output-frame rounding; authored event times do not.
        expect(preview.cursorTimes.slice(0, -1)).toEqual(exported.cursorTimes.slice(0, -1));
        for (const renderer of [preview, exported]) {
            const cursors = renderer.cursorTimes;
            expect(cursors[2]).toBeCloseTo(1 / 30);
            expect(cursors[3] - cursors[2]).toBeCloseTo(0.125);
            expect(cursors[4]).toBe(cursors[3]);
            expect(cursors[5] - cursors[4]).toBeCloseTo(1 / 30);
            expect(cursors[6] - cursors[5]).toBeCloseTo(1 / 30);
            expect(cursors[8] - cursors[7]).toBeCloseTo(2);
            expect(cursors[9]).toBe(cursors[8]);
            expect(cursors[10] - cursors[9]).toBeCloseTo(1 / 30);
            renderer.dispose();
        }
    });

    it.each([0.5, 2])(
        'preserves physical drawing speed at %s× for 15 FPS preview and 60 FPS export',
        async speedMultiplier => {
            const timeline = authoredTimeline(nodeEntry, edgeEntry, {
                id: 'end',
                kind: 'keyframe',
                refId: 'stn_a',
                x: 0,
                y: 0,
            });
            timeline.settings = {
                cameraZoom: 2,
                speedMultiplier,
                autoChangeStationType: false,
                showYear: false,
                showLineName: false,
                showLineLength: false,
                lineLengthUnit: 'km' as const,
            };
            const drawingSeconds = 2 / speedMultiplier;
            for (const fps of [15, 60]) {
                const renderer = await createVideoPreviewRenderer(makeGraph(200), timeline, [], {
                    ...defaultOptions,
                    fps,
                });
                expect(renderer.cursorTimes[2] - renderer.cursorTimes[1]).toBeCloseTo(drawingSeconds);
                const frame = await renderer.renderFrame(drawingSeconds * 0.4);
                const dash = frame.getElementById('line_ab')?.querySelector('path')?.getAttribute('stroke-dasharray');
                expect(Number(dash?.split(' ')[0])).toBeCloseTo(80);
                expect(Number(dash?.split(' ')[1])).toBeCloseTo(400);
                renderer.dispose();
            }
        }
    );

    it('updates fill geometry with moving polygon corners and restores it on backwards seek', async () => {
        const graph = makeFillGraph();
        const original = structuredClone(graph.export());
        const renderer = await createVideoPreviewRenderer(
            graph,
            authoredTimeline(
                { ...nodeEntry, refId: 'misc_node_fill', showAnimation: false },
                { id: 'origin', kind: 'keyframe', refId: 'misc_node_corner_a', x: 200, y: 0 },
                { ...edgeEntry, refId: 'line_fill_a' },
                { id: 'move', kind: 'keyframe', refId: 'misc_node_corner_a', x: 300, y: 0 }
            ),
            [],
            defaultOptions
        );
        const live = await renderer.renderPreviewFrame(0);
        const fill = live.getElementById('misc_node_fill')!;
        const originalPaths = Array.from(fill.querySelectorAll('path[fill-opacity]'), path => path.getAttribute('d'));
        expect(originalPaths).toHaveLength(3);
        expect(originalPaths.every(path => path?.includes('200 0'))).toBe(true);

        const pathsAt = async (time: number) => {
            expect(await renderer.renderPreviewFrame(time)).toBe(live);
            expect(live.getElementById('misc_node_fill')).toBe(fill);
            return Array.from(fill.querySelectorAll('path[fill-opacity]'), path => path.getAttribute('d'));
        };
        const middle = await pathsAt(1);
        expect(middle).not.toEqual(originalPaths);
        expect(middle.every(path => path?.includes('250 0'))).toBe(true);
        const end = await pathsAt(2);
        expect(end).not.toEqual(middle);
        expect(end.every(path => path?.includes('300 0'))).toBe(true);
        expect(await pathsAt(1)).toEqual(middle);
        expect(await pathsAt(0)).toEqual(originalPaths);
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        expect(graph.export()).toEqual(original);
        renderer.dispose();
    });

    it('uses entered-edge topology for fill regions when automatic station switching is enabled', async () => {
        const graph = makeFillGraph();
        const timeline = authoredTimeline(
            { ...nodeEntry, refId: 'misc_node_fill', showAnimation: false },
            { ...edgeEntry, id: 'first_edge', refId: 'line_fill_a' },
            { ...edgeEntry, id: 'second_edge', refId: 'line_fill_b' },
            { ...edgeEntry, id: 'closing_edge', refId: 'line_fill_close' }
        );
        timeline.settings = {
            cameraZoom: 2,
            speedMultiplier: 1,
            autoChangeStationType: true,
            showYear: false,
            showLineName: false,
            showLineLength: false,
            lineLengthUnit: 'km' as const,
        };
        const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
        const beforeClosing = renderer.cursorTimes[3] - 1 / defaultOptions.fps;
        const fillPaths = (svg: SVGSVGElement) =>
            svg.getElementById('misc_node_fill')?.querySelectorAll('path[fill-opacity]');
        for (const time of [0.1, 1, beforeClosing]) {
            const snapshot = await renderer.renderFrame(time);
            expect(snapshot.getElementById('misc_node_fill')).not.toBeNull();
            expect(snapshot.getElementById('line_fill_close')).toBeNull();
            expect(fillPaths(snapshot)).toHaveLength(0);
        }
        const closed = await renderer.renderFrame(renderer.duration);
        expect(fillPaths(closed)).toHaveLength(3);
        const closedPaths = Array.from(fillPaths(closed)!, path => path.getAttribute('d'));
        expect(fillPaths(await renderer.renderFrame(beforeClosing))).toHaveLength(0);
        expect(
            Array.from(fillPaths(await renderer.renderFrame(renderer.duration))!, path => path.getAttribute('d'))
        ).toEqual(closedPaths);
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        renderer.dispose();
    });

    it('restores a timeline transform after external dragging when the same frame is forced', async () => {
        const renderer = await createVideoPreviewRenderer(
            makeGraph(200),
            authoredTimeline(nodeEntry, edgeEntry, { id: 'move', kind: 'keyframe', refId: 'stn_a', x: 0, y: 100 }),
            [],
            defaultOptions
        );
        const live = await renderer.renderPreviewFrame(1);
        const station = live.getElementById('stn_a')!;
        const expectedTransform = station.getAttribute('transform');
        expect(expectedTransform).toContain('translate(0, 50)');
        station.setAttribute('transform', 'translate(999, 888)');
        expect(await renderer.renderPreviewFrame(1, { force: true })).toBe(live);
        expect(live.getElementById('stn_a')).toBe(station);
        expect(station.getAttribute('transform')).toBe(expectedTransform);
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        renderer.dispose();
    });

    it('prepares resources once and keeps the live SVG, station and line paths across moving frames', async () => {
        const graph = makeGraph(200);
        graph.mergeEdgeAttributes('line_ab', {
            style: LineStyleType.JREastSingleColor,
            [LineStyleType.JREastSingleColor]: structuredClone(
                lineStyles[LineStyleType.JREastSingleColor].defaultAttrs
            ),
        });
        const renderer = await createVideoPreviewRenderer(
            graph,
            authoredTimeline(nodeEntry, { id: 'origin', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 }, edgeEntry, {
                id: 'move',
                kind: 'keyframe',
                refId: 'stn_a',
                x: 0,
                y: 100,
            }),
            [],
            defaultOptions
        );
        const live = await renderer.renderPreviewFrame(0);
        const station = live.getElementById('stn_a');
        const line = live.getElementById('line_ab');
        const path = line?.querySelector('path');
        const underlay = live.getElementById('line_ab.pre');
        const underlayPath = underlay?.querySelector('path');
        expect(station).not.toBeNull();
        expect(path).not.toBeNull();
        expect(underlayPath).not.toBeNull();
        const originalPath = path!.getAttribute('d');
        const geometry = new Set<string | null>();
        for (const time of [0.1, 0.5, 1, 1.5, 2, 0.5, 0]) {
            const next = await renderer.renderPreviewFrame(time);
            expect(next).toBe(live);
            expect(next.getElementById('stn_a')).toBe(station);
            expect(next.getElementById('line_ab')).toBe(line);
            expect(next.getElementById('line_ab')?.querySelector('path')).toBe(path);
            expect(next.getElementById('line_ab.pre')).toBe(underlay);
            expect(next.getElementById('line_ab.pre')?.querySelector('path')).toBe(underlayPath);
            geometry.add(path!.getAttribute('d'));
        }
        expect(geometry.size).toBeGreaterThan(3);
        expect(path!.getAttribute('d')).toBe(originalPath);
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        // Live preview updates do not rasterize or serialize another SVG image.
        expect(renderedSVGs).toHaveLength(1);
        renderer.dispose();
    });

    it('returns independent snapshots matching export after live updates and snapshot edits', async () => {
        const graph = makeGraph(200);
        const original = structuredClone(graph.export());
        const timeline = authoredTimeline(
            nodeEntry,
            edgeEntry,
            { id: 'move', kind: 'keyframe', refId: 'stn_a', x: 0, y: 100 },
            { ...edgeEntry, id: 'exit_ab', phase: 'exit' }
        );
        timeline.labelTrack = [
            {
                id: 'label',
                kind: 'label',
                text: '通车纪念\nOpening day',
                startSlot: 0,
                endSlot: 1,
                startTime: 0.3,
                endTime: 2.5,
            },
        ];
        await exportVideo(graph, timeline, [], defaultOptions, 'white');
        const exported = renderedSVGs.slice(1).map(rasterizedMarkup);
        vi.mocked(makeRenderReadySVGElement).mockClear();
        const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
        expect(renderer.duration).toBe(exported.length / defaultOptions.fps);
        expect(renderer.cursorTimes.at(-1)).toBe(renderer.duration);
        const live = await renderer.renderPreviewFrame(0.3);
        const first = await renderer.renderFrame(0.3);
        const firstMarkup = first.outerHTML;
        expect(first).not.toBe(live);
        expect(first.getElementById('line_ab')).not.toBe(live.getElementById('line_ab'));
        expect(rasterizedMarkup(first)).toBe(exported[9]);

        await renderer.renderPreviewFrame(renderer.duration);
        expect(first.outerHTML).toBe(firstMarkup);
        first.setAttribute('data-snapshot-edit', 'detached');
        first.getElementById('line_ab')?.remove();
        for (const frame of [60, exported.length - 1, 9, 0, 90]) {
            expect(await renderer.renderPreviewFrame(frame / defaultOptions.fps)).toBe(live);
            const snapshot = await renderer.renderFrame(frame / defaultOptions.fps);
            expect(snapshot).not.toBe(live);
            expect(snapshot).not.toBe(first);
            expect(rasterizedMarkup(snapshot)).toBe(exported[frame]);
            expect(snapshot.hasAttribute('data-snapshot-edit')).toBe(false);
        }
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        expect(graph.export()).toEqual(original);
        renderer.dispose();
    });

    it('restores hidden groups, fades, line progress and camera when seeking backwards', async () => {
        const renderer = await createVideoPreviewRenderer(
            makeGraph(200),
            authoredTimeline(
                nodeEntry,
                edgeEntry,
                { ...nodeEntry, id: 'exit_a', phase: 'exit' },
                { ...edgeEntry, id: 'exit_ab', phase: 'exit' }
            ),
            [],
            defaultOptions
        );
        const live = await renderer.renderPreviewFrame(0.1);
        const station = live.getElementById('stn_a')!;
        const line = live.getElementById('line_ab')!;
        const path = line.querySelector('path')!;
        const earlyMarkup = live.outerHTML;
        expect(Number(station.getAttribute('opacity'))).toBeCloseTo(0.25);
        expect(path.getAttribute('stroke-dasharray')).toBe('10 400');

        const end = await renderer.renderPreviewFrame(renderer.duration);
        expect(end).toBe(live);
        expect(station.getAttribute('display')).toBe('none');
        expect(line.getAttribute('display')).toBe('none');
        const endSnapshot = await renderer.renderFrame(renderer.duration);
        expect(endSnapshot.getElementById('stn_a')).toBeNull();
        expect(endSnapshot.getElementById('line_ab')).toBeNull();

        for (const time of [0.1, 2.5, renderer.duration, 0.1]) {
            expect(await renderer.renderPreviewFrame(time)).toBe(live);
            expect(live.getElementById('stn_a')).toBe(station);
            expect(live.getElementById('line_ab')?.querySelector('path')).toBe(path);
        }
        expect(live.outerHTML).toBe(earlyMarkup);
        expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
        renderer.dispose();
    });

    it('shows labels during their exact time span without year, line metadata or matching slots', async () => {
        const graph = makeGraph(200);
        const timeline = authoredTimeline(nodeEntry, edgeEntry);
        timeline.labelTrack = [
            { id: 'label', kind: 'label', text: '通车纪念', startSlot: 1, endSlot: 2, startTime: 1, endTime: 2 },
        ];
        const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
        const duration = renderer.duration;
        const times = [...renderer.cursorTimes];
        for (const [time, text] of [
            [0.5, null],
            [1, '通车纪念'],
            [1.9, '通车纪念'],
            [2, null],
            [1, '通车纪念'],
        ] as const) {
            const svg = await renderer.renderPreviewFrame(time);
            expect(svg.querySelector('[data-video-label]')?.textContent ?? null).toBe(text);
        }
        renderer.setLabelTrack([{ ...timeline.labelTrack[0], text: 'Updated', startTime: 0, endTime: duration }]);
        expect((await renderer.renderPreviewFrame(1)).querySelector('[data-video-label]')?.textContent).toBe('Updated');
        renderer.setLabelTrack([]);
        expect((await renderer.renderPreviewFrame(1)).querySelector('[data-video-label]')).toBeNull();
        expect(renderer.duration).toBe(duration);
        expect(renderer.cursorTimes).toEqual(times);
        renderer.dispose();
    });

    it('uses saved drawing speed and shows the current line opening year and bilingual label', async () => {
        const graph = makeGraph(200);
        graph.setAttribute('lineDefinitions', [
            {
                id: 'metro',
                edgeIds: ['line_ab'],
                name: ['地铁一号线', 'Metro Line 1'],
                lineNumber: '1',
                openingDate: '1999-10-01',
                operator: '',
                status: 'operating',
                notes: '',
                exportStartStationId: 'stn_a',
            },
        ]);
        const timeline = createEmptyTimelineDocument();
        timeline.settings = {
            cameraZoom: 2,
            speedMultiplier: 2,
            autoChangeStationType: false,
            showYear: true,
            showLineName: true,
            showLineLength: false,
            lineLengthUnit: 'km' as const,
        };
        const renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
        expect(renderer.duration).toBeCloseTo(2 + 1 / 30);
        const svg = await renderer.renderFrame(0.5);
        expect(svg.getElementById('line_ab')?.querySelector('path')?.getAttribute('stroke-dasharray')).toBe('100 400');
        const overlay = svg.getElementById('rmp_video_line_overlay')!;
        expect(overlay.textContent).toBe('199910-01地铁一号线Metro Line 1');
        const labels = overlay.querySelectorAll('text');
        expect(labels[1].textContent).toBe('10-01');
        expect(Number(labels[1].getAttribute('y'))).toBeGreaterThan(Number(labels[0].getAttribute('y')));
        expect(Number(labels[2].getAttribute('y'))).toBeGreaterThan(Number(labels[1].getAttribute('y')));
        expect(Number(labels[2].getAttribute('font-size'))).toBeGreaterThan(
            Number(labels[3].getAttribute('font-size'))
        );
        expect(overlay.querySelector('rect[width="7"]')?.getAttribute('fill')).toBe(
            graph.getEdgeAttribute('line_ab', LineStyleType.SingleColor)!.color[2]
        );
        renderer.dispose();
    });

    it('resolves audio placements in real seconds instead of their original slots', async () => {
        const timeline = authoredTimeline(nodeEntry, edgeEntry);
        const audio = new Blob(['audio']);
        timeline.audioTrack = [
            {
                id: 'music',
                kind: 'audio',
                blobId: 'music-asset',
                name: 'Music',
                startSlot: 0,
                endSlot: 2,
                startTime: 0.35,
                endTime: 1.2,
            },
        ];
        await exportVideo(makeGraph(200), timeline, [], defaultOptions, 'white', undefined, {
            mapEnabled: false,
            mapStyle: DEFAULT_MAP_STYLE,
            svgViewBoxMin: { x: 0, y: 0 },
            svgViewBoxZoom: 100,
            getAudio: async () => audio,
        });
        expect(vi.mocked(createVideoFrameWriter).mock.calls[0][1].audioTracks).toEqual([
            { blob: audio, start: 0.35, end: 1.2 },
        ]);
    });
});

it('renders only the entered segment of a reconciled group and preserves its source graph', async () => {
    const graph = makeGraph(200);
    graph.addNode('stn_c', { ...structuredClone(graph.getNodeAttributes('stn_b')), x: 400 });
    graph.addDirectedEdgeWithKey('line_bc', 'stn_b', 'stn_c', structuredClone(graph.getEdgeAttributes('line_ab')));
    graph.setEdgeAttribute('line_ab', 'reconcileId', 'reconciled');
    graph.setEdgeAttribute('line_bc', 'reconcileId', 'reconciled');
    const original = structuredClone(graph.export());
    const renderer = await createVideoPreviewRenderer(
        graph,
        authoredTimeline(nodeEntry, edgeEntry),
        [],
        defaultOptions
    );
    const svg = await renderer.renderFrame(0.5);
    expect(svg.getElementById('line_ab')?.querySelector('path')?.getAttribute('stroke-dasharray')).toBe('50 400');
    expect(svg.getElementById('line_bc')).toBeNull();
    expect(graph.export()).toEqual(original);
    renderer.dispose();
});

it('preloads project images and includes them in every rendered frame', async () => {
    const graph = makeGraph(200);
    graph.addNode('misc_node_image', {
        visible: true,
        zIndex: 0,
        x: 20,
        y: 20,
        type: MiscNodeType.Image,
        [MiscNodeType.Image]: { type: 'local', href: 'image', scale: 2, rotate: 15, opacity: 0.8 },
    });
    const getImage = vi.fn(async () => 'data:image/png;base64,aW1hZ2U=');
    const renderer = await createVideoPreviewRenderer(graph, createEmptyTimelineDocument(), [], defaultOptions, {
        mapEnabled: false,
        mapStyle: DEFAULT_MAP_STYLE,
        svgViewBoxMin: { x: 0, y: 0 },
        svgViewBoxZoom: 100,
        getImage,
    });
    for (const time of [0.5, 1.5, 0.5]) {
        const image = (await renderer.renderFrame(time)).getElementById('misc_node_image')?.querySelector('image');
        expect(image?.getAttribute('href')).toBe('data:image/png;base64,aW1hZ2U=');
        expect(image?.getAttribute('opacity')).toBe('0.8');
        expect(image?.parentElement?.getAttribute('transform')).toBe('rotate(15) scale(2)');
    }
    expect(getImage).toHaveBeenCalledExactlyOnceWith('image');
    expect(makeRenderReadySVGElement).toHaveBeenCalledOnce();
    renderer.dispose();
});

it.each([
    ['zh-Hans', '中文标题'],
    ['en', 'English title'],
])(
    'renders translated text in the preview with the app language %s without a global i18next instance',
    async (language, expected) => {
        const previousInstance = getI18n();
        const previousLanguage = i18n.language;
        setI18n(undefined as never);
        let renderer: Awaited<ReturnType<typeof createVideoPreviewRenderer>> | undefined;
        try {
            await i18n.changeLanguage(language);
            const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
            graph.addNode('misc_node_translated_text', {
                type: MiscNodeType.I18nText,
                x: 0,
                y: 0,
                visible: true,
                zIndex: 0,
                [MiscNodeType.I18nText]: {
                    ...structuredClone(miscNodes[MiscNodeType.I18nText].defaultAttrs),
                    contents: { en: 'English title', 'zh-Hans': '中文标题' },
                },
            } as NodeAttributes);
            const timeline: TimelineDocument = {
                ...createEmptyTimelineDocument(),
                track: [
                    {
                        id: 'translated',
                        kind: 'node',
                        refId: 'misc_node_translated_text',
                        phase: 'enter',
                        showAnimation: true,
                    },
                ],
            };
            renderer = await createVideoPreviewRenderer(graph, timeline, [], defaultOptions);
            const frame = await renderer.renderFrame(0.5);
            expect(frame.getElementById('misc_node_translated_text')?.textContent).toContain(expected);
        } finally {
            renderer?.dispose();
            setI18n(previousInstance);
            await i18n.changeLanguage(previousLanguage);
        }
    }
);
