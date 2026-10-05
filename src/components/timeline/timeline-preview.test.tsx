import { act, fireEvent, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { render } from '../../test-utils';
import { videoPreviewDefaultOptions } from '../../util/video-export';
import TimelinePreview from './timeline-preview';

const mocks = vi.hoisted(() => ({
    prepare: vi.fn(),
    renderFrame: vi.fn(),
    renderPreviewFrame: vi.fn(),
    dispose: vi.fn(),
    setLabelTrack: vi.fn(),
}));
vi.mock('../../util/video-export', async original => ({
    ...(await original<typeof import('../../util/video-export')>()),
    createVideoPreviewRenderer: mocks.prepare,
}));

const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
const timeline = {
    ...createEmptyTimelineDocument(),
    track: [
        { id: 'clip', kind: 'node' as const, refId: 'stn_a' as const, phase: 'enter' as const, showAnimation: true },
    ],
};
const props = {
    graph,
    document: timeline,
    languages: [],
    time: 0,
    options: videoPreviewDefaultOptions,
    mapEnabled: false,
    mapStyle: DEFAULT_MAP_STYLE,
    svgViewBoxMin: { x: 0, y: 0 },
    svgViewBoxZoom: 100,
    onTimingChange: vi.fn(),
    onKeyframeMove: vi.fn(),
};

const createScene = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 160 90');
    svg.innerHTML = '<g id="stn_a" transform="translate(10,20)"><circle r="5" /></g>';
    return svg;
};
let scene: SVGSVGElement;

describe('TimelinePreview video frames', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.prepare.mockReset();
        mocks.renderPreviewFrame.mockReset();
        scene = createScene();
        mocks.renderPreviewFrame.mockImplementation(async (time, options) => {
            scene.setAttribute('data-time', String(time));
            if (options?.force) scene.querySelector('g')!.setAttribute('transform', 'translate(10,20)');
            return scene;
        });
        mocks.prepare.mockResolvedValue({
            duration: 12.5,
            cursorTimes: [0, 12.5],
            renderFrame: mocks.renderFrame,
            renderPreviewFrame: mocks.renderPreviewFrame,
            dispose: mocks.dispose,
            setLabelTrack: mocks.setLabelTrack,
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('uses exported frames at real seconds and publishes the complete video timing', async () => {
        const onTimingChange = vi.fn();
        const { container, rerender, unmount } = render(<TimelinePreview {...props} onTimingChange={onTimingChange} />);
        await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-time')).toBe('0'));
        const svg = container.querySelector('svg')!;
        const station = svg.querySelector('circle');
        const replaceChildren = vi.spyOn(svg.parentElement!, 'replaceChildren');
        expect(onTimingChange).toHaveBeenLastCalledWith({ duration: 12.5, cursorTimes: [0, 12.5] });
        rerender(<TimelinePreview {...props} time={5.75} onTimingChange={onTimingChange} />);
        await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-time')).toBe('5.75'));
        expect(container.querySelector('svg')).toBe(svg);
        expect(svg.querySelector('circle')).toBe(station);
        expect(replaceChildren).not.toHaveBeenCalled();
        expect(mocks.renderFrame).not.toHaveBeenCalled();
        expect(mocks.prepare).toHaveBeenCalledTimes(1);
        unmount();
        expect(mocks.dispose).toHaveBeenCalledOnce();
    });

    it('skips requests in the current video frame and can seek backward', async () => {
        const { container, rerender } = render(<TimelinePreview {...props} />);
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        rerender(<TimelinePreview {...props} time={0.01} />);
        rerender(<TimelinePreview {...props} time={0.02} />);
        expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(1);
        rerender(<TimelinePreview {...props} time={0.04} />);
        await waitFor(() => expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(2));
        rerender(<TimelinePreview {...props} time={0.01} />);
        await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-time')).toBe('0.01'));
        expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(3);
        expect(mocks.prepare).toHaveBeenCalledOnce();
    });

    it('coalesces seeks while a frame is pending and mounts only the latest result', async () => {
        const pending: { time: number; resolve: (svg: SVGSVGElement) => void }[] = [];
        mocks.renderPreviewFrame.mockImplementation(
            time => new Promise<SVGSVGElement>(resolve => pending.push({ time, resolve }))
        );
        const { container, rerender } = render(<TimelinePreview {...props} />);
        await waitFor(() => expect(pending).toHaveLength(1));
        rerender(<TimelinePreview {...props} time={2} />);
        rerender(<TimelinePreview {...props} time={5} />);
        expect(pending).toHaveLength(1);
        await act(async () => {
            scene.setAttribute('data-time', '0');
            pending[0].resolve(scene);
        });
        expect(pending).toHaveLength(2);
        expect(pending[1].time).toBe(5);
        expect(container.querySelector('svg')).toBeNull();
        await act(async () => {
            scene.setAttribute('data-time', '5');
            pending[1].resolve(scene);
        });
        expect(container.querySelector('svg')).toBe(scene);
        expect(scene.getAttribute('data-time')).toBe('5');
    });

    it('restores the latest seek when a stale request mutates the mounted scene', async () => {
        const { container, rerender } = render(<TimelinePreview {...props} />);
        await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-time')).toBe('0'));
        let resolveSeek: (svg: SVGSVGElement) => void = () => {};
        mocks.renderPreviewFrame.mockImplementationOnce(
            () => new Promise<SVGSVGElement>(resolve => (resolveSeek = resolve))
        );
        rerender(<TimelinePreview {...props} time={2} />);
        await waitFor(() => expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(2));
        rerender(<TimelinePreview {...props} time={0} />);
        await act(async () => {
            scene.setAttribute('data-time', '2');
            resolveSeek(scene);
        });
        expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(3);
        expect(scene.getAttribute('data-time')).toBe('0');
        expect(container.querySelector('svg')).toBe(scene);
    });

    it('fills the available area with a 16:9 frame and only one pair of black bars', async () => {
        let reportResize: (width: number, height: number) => void = () => {};
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: ResizeObserverCallback) {
                    reportResize = (width, height) =>
                        callback(
                            [{ contentRect: { width, height } } as ResizeObserverEntry],
                            this as unknown as ResizeObserver
                        );
                }
                observe() {}
                disconnect() {}
            }
        );
        const { container } = render(<TimelinePreview {...props} />);
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        const preview = container.querySelector<HTMLElement>('[data-video-preview]')!;
        act(() => reportResize(1200, 600));
        expect(parseFloat(getComputedStyle(preview).width)).toBeCloseTo((600 * 16) / 9);
        expect(parseFloat(getComputedStyle(preview).height)).toBe(600);
        act(() => reportResize(600, 600));
        expect(parseFloat(getComputedStyle(preview).width)).toBe(600);
        expect(parseFloat(getComputedStyle(preview).height)).toBe(337.5);
    });

    it('reuses prepared visuals during music edits and passes project images to the renderer', async () => {
        const getImage = vi.fn();
        const onTimingChange = vi.fn();
        const { container, rerender } = render(
            <TimelinePreview {...props} getImage={getImage} onTimingChange={onTimingChange} />
        );
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        const timingCalls = onTimingChange.mock.calls.length;
        for (const edit of [
            { startTime: 0.5, endTime: 10, blobId: 'audio', name: 'music' },
            { startTime: 1.5, endTime: 11, blobId: 'audio', name: 'music' },
            { startTime: 2, endTime: 8, blobId: 'audio', name: 'music' },
            { startTime: 2, endTime: 8, blobId: 'replacement', name: 'replacement music' },
        ]) {
            rerender(
                <TimelinePreview
                    {...props}
                    getImage={getImage}
                    onTimingChange={onTimingChange}
                    document={{
                        ...structuredClone(timeline),
                        audioTrack: [{ id: 'music', kind: 'audio', startSlot: 0, endSlot: 1, ...edit }],
                    }}
                />
            );
            expect(container.querySelector('svg')).toBe(scene);
            expect(onTimingChange).toHaveBeenCalledTimes(timingCalls);
        }
        expect(mocks.prepare).toHaveBeenCalledTimes(1);
        expect(mocks.dispose).not.toHaveBeenCalled();
        expect(mocks.renderPreviewFrame).toHaveBeenCalledOnce();
        expect(mocks.prepare.mock.calls[0][4].getImage).toBe(getImage);
    });

    it('updates labels at the current frame without rebuilding geometry or resetting playback timing', async () => {
        const onTimingChange = vi.fn();
        const { container, rerender } = render(<TimelinePreview {...props} time={2} onTimingChange={onTimingChange} />);
        await waitFor(() => expect(container.querySelector('svg')).toBe(scene));
        const timingCalls = onTimingChange.mock.calls.length;
        const label = {
            id: 'label',
            kind: 'label' as const,
            text: 'Caption',
            startSlot: 0,
            endSlot: 1,
            startTime: 1,
            endTime: 3,
        };
        for (const text of ['Caption', 'Updated\nText', '']) {
            const labelTrack = [{ ...label, text }];
            rerender(
                <TimelinePreview
                    {...props}
                    document={{ ...timeline, labelTrack }}
                    time={2}
                    onTimingChange={onTimingChange}
                />
            );
            await waitFor(() => expect(mocks.setLabelTrack).toHaveBeenLastCalledWith(labelTrack));
            await waitFor(() => expect(mocks.renderPreviewFrame).toHaveBeenLastCalledWith(2, { force: true }));
        }
        expect(mocks.prepare).toHaveBeenCalledOnce();
        expect(mocks.dispose).not.toHaveBeenCalled();
        expect(onTimingChange).toHaveBeenCalledTimes(timingCalls);
        expect(container.querySelector('svg')).toBe(scene);
    });

    it('serializes visual content only after its references change', async () => {
        const serializeTrack = vi.fn(() => timeline.track);
        const track = [...timeline.track];
        Object.defineProperty(track, 'toJSON', { value: serializeTrack });
        const document = { ...timeline, track };
        const { container, rerender } = render(<TimelinePreview {...props} document={document} />);
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        expect(serializeTrack).toHaveBeenCalledOnce();
        rerender(<TimelinePreview {...props} document={document} time={1} />);
        await waitFor(() => expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(2));
        rerender(<TimelinePreview {...props} document={{ ...document, audioTrack: [] }} time={1} />);
        expect(serializeTrack).toHaveBeenCalledOnce();
        rerender(
            <TimelinePreview
                {...props}
                document={{ ...document, settings: { ...document.settings!, showYear: true } }}
                time={1}
            />
        );
        await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
        expect(serializeTrack).toHaveBeenCalledTimes(2);
    });

    it('ignores a disposed renderer result after preparing changed video options', async () => {
        let resolveOld: (svg: SVGSVGElement) => void = () => {};
        const oldRender = vi.fn(() => new Promise<SVGSVGElement>(resolve => (resolveOld = resolve)));
        const oldDispose = vi.fn();
        mocks.prepare.mockResolvedValueOnce({
            duration: 12.5,
            cursorTimes: [0, 12.5],
            renderPreviewFrame: oldRender,
            renderFrame: mocks.renderFrame,
            dispose: oldDispose,
            setLabelTrack: mocks.setLabelTrack,
        });
        const { container, rerender } = render(<TimelinePreview {...props} />);
        await waitFor(() => expect(oldRender).toHaveBeenCalledOnce());
        rerender(<TimelinePreview {...props} options={{ ...props.options, resolution: '1080p' }} />);
        await waitFor(() => expect(container.querySelector('svg')).toBe(scene));
        await act(async () => resolveOld(createScene()));
        expect(container.querySelector('svg')).toBe(scene);
        expect(oldDispose).toHaveBeenCalledOnce();
    });

    it('shows an error and can retry preparing a failed frame', async () => {
        mocks.prepare.mockRejectedValueOnce(new Error('Broken image'));
        const { findByText, getByRole, container } = render(<TimelinePreview {...props} />);
        await findByText('Broken image');
        fireEvent.click(getByRole('button', { name: /Reload preview|重新加载/ }));
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        expect(mocks.prepare).toHaveBeenCalledTimes(2);
    });

    it('edits a keyframe in the video camera coordinate space', async () => {
        const onKeyframeMove = vi.fn();
        const keyframe = { id: 'key', kind: 'keyframe' as const, refId: 'stn_a' as const, x: 10, y: 20 };
        const { container } = render(
            <TimelinePreview {...props} editableKeyframe={keyframe} onKeyframeMove={onKeyframeMove} />
        );
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        const svg = container.querySelector('svg')!;
        svg.getScreenCTM = () => ({ inverse: () => ({}) }) as DOMMatrix;
        svg.createSVGPoint = () => {
            const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x / 2, y: point.y / 2 }) };
            return point as unknown as DOMPoint;
        };
        const host = svg.parentElement!;
        host.setPointerCapture = vi.fn();
        host.hasPointerCapture = () => true;
        host.releasePointerCapture = vi.fn();
        fireEvent.pointerDown(svg.querySelector('circle')!, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerMove(host, { pointerId: 1, clientX: 60, clientY: 80 });
        fireEvent.pointerUp(host, { pointerId: 1, clientX: 60, clientY: 80 });
        expect(onKeyframeMove).toHaveBeenCalledWith('key', 40, 60);
    });

    it('restores a cancelled keyframe drag even when playback stays in the cached frame', async () => {
        const onKeyframeMove = vi.fn();
        const keyframe = { id: 'key', kind: 'keyframe' as const, refId: 'stn_a' as const, x: 10, y: 20 };
        const { container } = render(
            <TimelinePreview {...props} editableKeyframe={keyframe} onKeyframeMove={onKeyframeMove} />
        );
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        scene.getScreenCTM = () => ({ inverse: () => ({}) }) as DOMMatrix;
        scene.createSVGPoint = () => {
            const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
            return point as unknown as DOMPoint;
        };
        const host = scene.parentElement!;
        host.setPointerCapture = vi.fn();
        host.hasPointerCapture = () => true;
        host.releasePointerCapture = vi.fn();
        fireEvent.pointerDown(scene.querySelector('circle')!, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerMove(host, { pointerId: 1, clientX: 30, clientY: 40 });
        expect(scene.querySelector('g')?.getAttribute('transform')).toContain('translate(30,40)');
        fireEvent.pointerCancel(host, { pointerId: 1 });
        await waitFor(() => expect(mocks.renderPreviewFrame).toHaveBeenLastCalledWith(0, { force: true }));
        expect(scene.querySelector('g')?.getAttribute('transform')).toBe('translate(10,20)');
        expect(onKeyframeMove).not.toHaveBeenCalled();
        expect(container.querySelector('svg')).toBe(scene);
    });
});
