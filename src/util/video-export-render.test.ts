import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { createEmptyTimelineDocument } from '../constants/timeline';
import { makeRenderReadySVGElement } from './download';
import { exportVideo, VideoExportOptions } from './video-export';

const { addFrame, complete } = vi.hoisted(() => ({
    addFrame: vi.fn(),
    complete: vi.fn().mockResolvedValue(new Blob()),
}));
vi.mock('webm-writer', () => ({ default: vi.fn(() => ({ addFrame, complete })) }));
vi.mock('./download', () => ({ makeRenderReadySVGElement: vi.fn() }));

const renderedSVGs: SVGSVGElement[] = [];
const defaultOptions: VideoExportOptions = {
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
    vi.mocked(makeRenderReadySVGElement).mockImplementation(async graph => {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        graph.forEachEdge(edge => {
            const group = document.createElementNS(elem.namespaceURI, 'g');
            const path = document.createElementNS(elem.namespaceURI, 'path') as SVGPathElement;
            const source = graph.getNodeAttributes(graph.source(edge));
            const target = graph.getNodeAttributes(graph.target(edge));
            group.id = edge;
            path.getTotalLength = () => Math.hypot(target.x - source.x, target.y - source.y);
            path.getPointAtLength = distance =>
                ({
                    x: source.x + ((target.x - source.x) * distance) / path.getTotalLength(),
                    y: source.y + ((target.y - source.y) * distance) / path.getTotalLength(),
                }) as DOMPoint;
            group.appendChild(path);
            elem.appendChild(group);
        });
        renderedSVGs.push(elem);
        return { elem, width: 1280, height: 720 };
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const makeGraph = (length: number) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_a', { x: 0, y: 0, visible: true, zIndex: 0, type: StationType.LondonTubeBasic });
    graph.addNode('stn_b', { x: length, y: 0, visible: true, zIndex: 0, type: StationType.LondonTubeBasic });
    graph.addDirectedEdgeWithKey('line_ab', 'stn_a', 'stn_b', { visible: true } as EdgeAttributes);
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
