import { act, fireEvent, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { createTimelineOverlayModule } from '../../constants/timeline-overlays';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { render } from '../../test-utils';
import { videoPreviewDefaultOptions } from '../../util/video-export/video-export';
import TimelinePreview from './timeline-preview';

const mocks = vi.hoisted(() => ({
    prepare: vi.fn(),
    renderFrame: vi.fn(),
    renderPreviewFrame: vi.fn(),
    dispose: vi.fn(),
    setLabelTrack: vi.fn(),
    setOverlayModules: vi.fn(),
    setOverlayEditing: vi.fn(),
    getOverlayLayout: vi.fn(() => []),
    subscribeLayoutInvalidation: vi.fn(),
    unsubscribeLayout: vi.fn(),
}));
vi.mock('../../util/video-export/video-export', async original => ({
    ...(await original<typeof import('../../util/video-export/video-export')>()),
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
    isSubscriber: false,
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
        mocks.subscribeLayoutInvalidation.mockReset().mockReturnValue(mocks.unsubscribeLayout);
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
            setOverlayModules: mocks.setOverlayModules,
            setOverlayEditing: mocks.setOverlayEditing,
            getOverlayLayout: mocks.getOverlayLayout,
            subscribeLayoutInvalidation: mocks.subscribeLayoutInvalidation,
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('prepares fixed-only documents and rebuilds when the fixed selection changes', async () => {
        const fixed = { ...createEmptyTimelineDocument(), fixedResources: ['stn_a' as const] };
        const { container, rerender } = render(<TimelinePreview {...props} document={fixed} />);
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        expect(mocks.prepare.mock.calls[0][1]).toMatchObject({ track: [], fixedResources: ['stn_a'] });
        rerender(<TimelinePreview {...props} document={{ ...fixed, fixedResources: ['stn_b'] }} />);
        await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
        expect(mocks.prepare.mock.calls[1][1].fixedResources).toEqual(['stn_b']);
    });

    it('rebuilds video geometry when Export access changes', async () => {
        const { container, rerender } = render(<TimelinePreview {...props} />);
        await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
        expect(mocks.prepare.mock.calls[0][4]).toMatchObject({ isSubscriber: false });

        rerender(<TimelinePreview {...props} isSubscriber={true} />);
        await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
        expect(mocks.prepare.mock.calls[1][4]).toMatchObject({ isSubscriber: true });
        expect(mocks.dispose).toHaveBeenCalledTimes(1);

        rerender(<TimelinePreview {...props} isSubscriber={false} />);
        await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(3));
        expect(mocks.prepare.mock.calls[2][4]).toMatchObject({ isSubscriber: false });
        expect(mocks.dispose).toHaveBeenCalledTimes(2);
    });

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

    it('refreshes a paused frame on layout invalidation and cancels its subscription on unmount', async () => {
        const { container, unmount } = render(<TimelinePreview {...props} time={2} />);
        await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-time')).toBe('2'));
        expect(mocks.subscribeLayoutInvalidation).toHaveBeenCalledOnce();
        const invalidate = mocks.subscribeLayoutInvalidation.mock.calls[0][0] as () => void;
        const signal = mocks.prepare.mock.calls[0][5] as AbortSignal;
        expect(signal.aborted).toBe(false);
        const initialRequests = mocks.renderPreviewFrame.mock.calls.length;

        await act(async () => invalidate());
        await waitFor(() => expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(initialRequests + 1));
        expect(mocks.renderPreviewFrame).toHaveBeenLastCalledWith(2, { force: true });
        expect(mocks.prepare).toHaveBeenCalledOnce();
        expect(container.querySelector('svg')).toBe(scene);

        unmount();
        expect(signal.aborted).toBe(true);
        expect(mocks.unsubscribeLayout).toHaveBeenCalledOnce();
        expect(mocks.dispose).toHaveBeenCalledOnce();
        await act(async () => invalidate());
        expect(mocks.renderPreviewFrame).toHaveBeenCalledTimes(initialRequests + 1);
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

    it('edits module layout at the current time without rebuilding geometry or timing', async () => {
        const onTimingChange = vi.fn();
        const { container, rerender } = render(<TimelinePreview {...props} time={4} onTimingChange={onTimingChange} />);
        await waitFor(() => expect(container.querySelector('svg')).toBe(scene));
        const timingCalls = onTimingChange.mock.calls.length;
        const date = createTimelineOverlayModule('date', 'bottom-right', 'date');
        rerender(
            <TimelinePreview
                {...props}
                time={4}
                document={{ ...timeline, overlayModules: [date] }}
                overlayEditing
                onTimingChange={onTimingChange}
            />
        );
        await waitFor(() => expect(mocks.setOverlayModules).toHaveBeenLastCalledWith([date]));
        expect(mocks.setOverlayEditing).toHaveBeenLastCalledWith(true);
        expect(mocks.prepare).toHaveBeenCalledOnce();
        expect(onTimingChange).toHaveBeenCalledTimes(timingCalls);
        expect(container.querySelector('svg')).toBe(scene);
        expect(scene.getAttribute('data-time')).toBe('4');
    });

    it('offers all four region entries and selectable placeholders before a visual track exists', () => {
        const { container } = render(
            <TimelinePreview {...props} document={createEmptyTimelineDocument()} overlayEditing />
        );
        expect(container.querySelectorAll('[data-overlay-add-region]')).toHaveLength(4);
        expect(container.querySelector('[data-overlay-add-region="top-right"]')).toBeDisabled();
        expect(container.querySelector('[data-overlay-handle]')).not.toBeNull();
        expect(mocks.prepare).not.toHaveBeenCalled();
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

    it('cancels an active keyframe drag when annotation editing begins and continues rendering', async () => {
        const onKeyframeMove = vi.fn();
        const keyframe = { id: 'key', kind: 'keyframe' as const, refId: 'stn_a' as const, x: 10, y: 20 };
        const { rerender } = render(
            <TimelinePreview {...props} editableKeyframe={keyframe} onKeyframeMove={onKeyframeMove} />
        );
        await waitFor(() => expect(scene.parentElement).not.toBeNull());
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
        rerender(<TimelinePreview {...props} time={2} overlayEditing onKeyframeMove={onKeyframeMove} />);
        await waitFor(() => expect(scene.getAttribute('data-time')).toBe('2'));
        expect(scene.querySelector('g')?.getAttribute('transform')).toBe('translate(10,20)');
        fireEvent.pointerUp(host, { pointerId: 1 });
        expect(onKeyframeMove).not.toHaveBeenCalled();
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
