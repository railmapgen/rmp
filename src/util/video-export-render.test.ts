import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import stations from '../components/svgs/stations/stations';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { StationType } from '../constants/stations';
import { createEmptyTimelineDocument, TimelineDocument, TimelineEntry } from '../constants/timeline';
import { makeRenderReadySVGElement } from './download';
import * as videoExportCanvas from './video-export-canvas';
import { exportVideo, VideoExportOptions } from './video-export';
import { createVideoFrameWriter, NativeVideoEncodingError } from './video-encoder';

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
    scale: 200,
    fullscreenScale: 100,
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
        async (graph, _map, _info, _fonts, _languages, _force, _version, renderGraph) => {
            const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
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
            renderedSVGs.push(elem);
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
            set src(_value: string) {
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

describe('video export frame timing', () => {
    it.each([
        { length: 200, speedMultiplier: 1, fps: 30, drawingSeconds: 2 },
        { length: 400, speedMultiplier: 1, fps: 30, drawingSeconds: 4 },
        { length: 200, speedMultiplier: 0.5, fps: 30, drawingSeconds: 4 },
        { length: 200, speedMultiplier: 2, fps: 60, drawingSeconds: 1 },
    ])('derives frame timing from $length units at $speedMultiplier× and $fps FPS', async params => {
        const { length, speedMultiplier, fps, drawingSeconds } = params;
        const onProgress = vi.fn();
        await exportVideo(
            makeGraph(length),
            createEmptyTimelineDocument(),
            [],
            { ...defaultOptions, speedMultiplier, fps },
            'white',
            onProgress
        );

        // One endpoint frame and a fixed one-second overview follow the drawing frames.
        expect(addFrame).toHaveBeenCalledTimes((drawingSeconds + 1) * fps + 1);
        // The first SVG only measures line length; later SVGs are the rendered frames.
        const halfwayFrame = renderedSVGs[1 + (drawingSeconds * fps) / 2];
        expect(halfwayFrame.querySelector('path')?.getAttribute('stroke-dasharray')).toBe(`${length / 2} ${length}`);
        expect(onProgress).toHaveBeenLastCalledWith(1);
        expect(complete).toHaveBeenCalledOnce();
    });

    it('preserves drawing speed when output resolution and zoom change', async () => {
        await exportVideo(
            makeGraph(200),
            createEmptyTimelineDocument(),
            [],
            { ...defaultOptions, resolution: '4k', scale: 400 },
            'white'
        );
        expect(addFrame).toHaveBeenCalledTimes(91);
        expect(renderedSVGs[31].querySelector('path')?.getAttribute('stroke-dasharray')).toBe('100 200');
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

const proTimeline = (...track: TimelineEntry[]): TimelineDocument => ({ version: 1, mode: 'pro', track });
const nodeEntry: TimelineEntry = { id: 'enter_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true };
const edgeEntry: TimelineEntry = {
    id: 'enter_ab',
    kind: 'edge',
    refId: 'line_ab',
    phase: 'enter',
    showAnimation: true,
};

describe('authored video frames', () => {
    it.each([
        { fps: 30, keyframes: false },
        { fps: 60, keyframes: false },
        { fps: 30, keyframes: true },
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
            await exportVideo(graph, proTimeline(...entries), [], { ...defaultOptions, fps }, 'white');
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

    it.each(['quick', 'pro'] as const)(
        'exports %s video through real SVG preparation without an editor canvas',
        async mode => {
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
                renderedSVGs.push(result.elem);
                return result;
            });
            const timeline =
                mode === 'quick'
                    ? createEmptyTimelineDocument()
                    : proTimeline(
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
            if (mode === 'pro') {
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

    it('preserves simple entrance timing when only the editor mode changes', async () => {
        await exportVideo(makeGraph(200), proTimeline(nodeEntry, edgeEntry), [], defaultOptions, 'white');
        expect(addFrame).toHaveBeenCalledTimes(91);
    });

    it('moves nodes and their connected line geometry while preserving the editor graph and final keyframe', async () => {
        const graph = makeGraph(200);
        const original = structuredClone(graph.export());
        await exportVideo(
            graph,
            proTimeline(nodeEntry, { id: 'first', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 }, edgeEntry, {
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
            proTimeline(nodeEntry, { ...nodeEntry, id: 'exit_a', phase: 'exit' }),
            [],
            defaultOptions,
            'white'
        );
        // Node entrance takes 0.2s, followed by a 0.2s exit: at 0.3s it is half transparent.
        const halfway = renderedSVGs[1 + 9].getElementById('stn_a');
        expect(Number(halfway?.getAttribute('opacity'))).toBeCloseTo(0.5);
        expect(renderedSVGs.slice(1 + 12).every(svg => svg.getElementById('stn_a') === null)).toBe(true);
        expect(renderedSVGs.at(-1)?.getElementById('line_ab')).toBeNull();
    });

    it('retracts lines on exit and leaves the final frame empty', async () => {
        await exportVideo(
            makeGraph(200),
            proTimeline(edgeEntry, { ...edgeEntry, id: 'exit_ab', phase: 'exit' }),
            [],
            defaultOptions,
            'white'
        );
        const halfway = renderedSVGs[1 + 90].getElementById('line_ab')?.querySelector('path');
        expect(halfway?.getAttribute('stroke-dasharray')).toBe('100 200');
        expect(renderedSVGs.slice(1 + 120).every(svg => svg.getElementById('line_ab') === null)).toBe(true);
    });

    it('shows animation-disabled entries immediately without fading or scaling', async () => {
        await exportVideo(
            makeGraph(200),
            proTimeline({ ...nodeEntry, showAnimation: false }, { ...edgeEntry, showAnimation: false }),
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
            proTimeline(edgeEntry, { ...edgeEntry, id: 'exit_ab', phase: 'exit' }),
            [],
            defaultOptions,
            'white'
        );
        const halfway = renderedSVGs[1 + 90];
        expect(halfway.getElementById('line_ab.pre')?.querySelector('path')?.getAttribute('stroke-dasharray')).toBe(
            '100 200'
        );
        expect(renderedSVGs.at(-1)?.getElementById('line_ab.pre')).toBeNull();
        expect(renderedSVGs.at(-1)?.getElementById('line_ab')).toBeNull();
    });
});
