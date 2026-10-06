import { ChakraProvider } from '@chakra-ui/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineDocument } from '../../constants/timeline';
import TimelineAudioTrack from './timeline-audio-track';
import { createTimelineTrackTimeScale, getTimelineTrackLayout } from './timeline-track-layout';

const mocks = vi.hoisted(() => ({ getAudio: vi.fn(), saveAudio: vi.fn() }));
vi.mock('../../timeline/timeline-project-context', () => ({ useOptionalTimelineProjectContext: () => mocks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const NativeURL = URL;
const animationFrames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const flushDragFrame = () =>
    act(() => {
        const callbacks = [...animationFrames.values()];
        animationFrames.clear();
        callbacks.forEach(callback => callback(16));
    });
const preparePointerCapture = (element: HTMLDivElement) => {
    element.setPointerCapture = vi.fn();
    element.hasPointerCapture = vi.fn(() => true);
    element.releasePointerCapture = vi.fn();
};
const timeline: TimelineDocument = {
    version: 1,
    track: [],
    audioTrack: [
        {
            id: 'music',
            kind: 'audio',
            name: 'song.wav',
            blobId: 'old-blob',
            startSlot: 0,
            endSlot: 1,
            startTime: 1.25,
            endTime: 8.75,
        },
    ],
};
const props = {
    document: timeline,
    timing: { duration: 20, cursorTimes: [0, 20] },
    totalWidth: 1000,
    onChange: vi.fn(),
};
class MockAudio {
    duration = 14.25;
    preload = '';
    set onloadedmetadata(callback: () => void) {
        queueMicrotask(callback);
    }
    removeAttribute() {}
    load() {}
}
const renderTrack = (overrides: Partial<React.ComponentProps<typeof TimelineAudioTrack>> = {}) =>
    render(
        <ChakraProvider>
            <TimelineAudioTrack {...props} {...overrides} />
        </ChakraProvider>
    );

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAudio.mockResolvedValue(new Blob(['audio']));
    mocks.saveAudio.mockResolvedValue(undefined);
    animationFrames.clear();
    frameId = 0;
    vi.stubGlobal(
        'requestAnimationFrame',
        vi.fn((callback: FrameRequestCallback) => {
            const id = ++frameId;
            animationFrames.set(id, callback);
            return id;
        })
    );
    vi.stubGlobal(
        'cancelAnimationFrame',
        vi.fn((id: number) => animationFrames.delete(id))
    );
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal(
        'URL',
        class extends NativeURL {
            static createObjectURL = vi.fn(() => 'blob:music');
            static revokeObjectURL = vi.fn();
        }
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('Timeline audio seconds editor', () => {
    it('drags a handle continuously in seconds rather than snapping to visual cards', async () => {
        const onChange = vi.fn();
        const { container } = renderTrack({ onChange });
        await waitFor(() => expect(mocks.getAudio).toHaveBeenCalledOnce());
        const lane = container.querySelector('[data-audio-track]') as HTMLDivElement;
        lane.getBoundingClientRect = () => ({ left: 0, width: 1000 }) as DOMRect;
        const handle = container.querySelector('[data-audio-handle="start"]') as HTMLDivElement;
        preparePointerCapture(handle);
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 62.5 });
        fireEvent.pointerMove(lane, { pointerId: 1, clientX: 112.5 });
        expect(onChange).not.toHaveBeenCalled();
        flushDragFrame();
        expect(getComputedStyle(container.querySelector('[data-audio-clip="music"]')!).left).toBe('11.25%');
        fireEvent.pointerUp(lane, { pointerId: 1, clientX: 112.5 });
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.calls[0][0].audioTrack[0]).toMatchObject({ startTime: 2.25, endTime: 8.75 });
    });

    it('allows precise numeric placement and displays the actual source length', async () => {
        const onChange = vi.fn();
        renderTrack({ onChange });
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.audioTiming: song.wav' }));
        await screen.findByText('header.timelinePage.audioDuration');
        const start = await screen.findByRole('spinbutton', { name: 'header.timelinePage.audioStart: song.wav' });
        fireEvent.change(start, { target: { value: '2.35' } });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ audioTrack: [expect.objectContaining({ startTime: 2.35, endTime: 8.75 })] })
        );
    });

    it('aligns music and handle dragging with nonlinear card time without changing elapsed seconds', async () => {
        const document: TimelineDocument = {
            ...timeline,
            track: [
                { id: 'a', kind: 'pause', duration: 1, position: 'after' },
                { id: 'b', kind: 'pause', duration: 10, position: 'after' },
                { id: 'c', kind: 'pause', duration: 2, position: 'after' },
            ],
            audioTrack: [{ ...timeline.audioTrack![0], startTime: 1, endTime: 11 }],
        };
        const timing = { duration: 13, cursorTimes: [0, 1, 11, 13] };
        const { entries, totalWidth } = getTimelineTrackLayout(document.track);
        const timeScale = createTimelineTrackTimeScale(entries, totalWidth, timing);
        const onChange = vi.fn();
        const { container } = renderTrack({ document, timing, totalWidth, timeScale, onChange });
        await waitFor(() => expect(mocks.getAudio).toHaveBeenCalledOnce());
        const clip = container.querySelector('[title="song.wav"]')!;
        expect(getComputedStyle(clip).left).toBe('208px');
        expect(getComputedStyle(clip).width).toBe('184px');
        const lane = container.querySelector('[data-audio-track]') as HTMLDivElement;
        lane.getBoundingClientRect = () => ({ left: 100, width: 1000 }) as DOMRect;
        const handle = container.querySelector('[data-audio-handle="start"]') as HTMLDivElement;
        preparePointerCapture(handle);
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 308 });
        fireEvent.pointerMove(lane, { pointerId: 1, clientX: 388 });
        expect(onChange).not.toHaveBeenCalled();
        flushDragFrame();
        expect(getComputedStyle(clip).left).toBe('288px');
        fireEvent.pointerUp(lane, { pointerId: 1, clientX: 388 });
        expect(onChange.mock.calls[0][0].audioTrack[0]).toMatchObject({ startTime: 6, endTime: 11 });
    });

    it('batches rapid pointer moves without project commits, repeated layout reads or resource reloads', async () => {
        const onChange = vi.fn();
        const { container } = renderTrack({ onChange });
        await waitFor(() => expect(mocks.getAudio).toHaveBeenCalledOnce());
        const lane = container.querySelector('[data-audio-track]') as HTMLDivElement;
        const readBounds = vi.fn(() => ({ left: 0, width: 1000 }) as DOMRect);
        lane.getBoundingClientRect = readBounds;
        const clip = container.querySelector('[data-audio-clip="music"]') as HTMLDivElement;
        preparePointerCapture(clip);
        fireEvent.pointerDown(clip, { button: 0, pointerId: 1, clientX: 100 });
        vi.mocked(requestAnimationFrame).mockClear();
        for (let x = 101; x <= 200; x++) fireEvent.pointerMove(lane, { pointerId: 1, clientX: x });
        expect(requestAnimationFrame).toHaveBeenCalledOnce();
        expect(readBounds).toHaveBeenCalledOnce();
        expect(onChange).not.toHaveBeenCalled();
        flushDragFrame();
        expect(getComputedStyle(clip).left).toBe('16.25%');
        expect(getComputedStyle(clip).width).toBe('37.5%');
        expect(mocks.getAudio).toHaveBeenCalledOnce();

        // The release position must be saved even if its final frame has not painted yet.
        fireEvent.pointerMove(lane, { pointerId: 1, clientX: 225 });
        fireEvent.pointerUp(lane, { pointerId: 1, clientX: 250 });
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.calls[0][0].audioTrack[0]).toMatchObject({ startTime: 4.25, endTime: 11.75 });
        expect(clip.releasePointerCapture).toHaveBeenCalledWith(1);
        flushDragFrame();
        expect(onChange).toHaveBeenCalledOnce();
    });

    it.each(['pointerCancel', 'lostPointerCapture'] as const)(
        'rolls back a draft on %s without saving it',
        async event => {
            const onChange = vi.fn();
            const { container } = renderTrack({ onChange });
            await waitFor(() => expect(mocks.getAudio).toHaveBeenCalledOnce());
            const lane = container.querySelector('[data-audio-track]') as HTMLDivElement;
            lane.getBoundingClientRect = () => ({ left: 0, width: 1000 }) as DOMRect;
            const handle = container.querySelector('[data-audio-handle="end"]') as HTMLDivElement;
            preparePointerCapture(handle);
            fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 437.5 });
            fireEvent.pointerMove(lane, { pointerId: 1, clientX: 600 });
            flushDragFrame();
            const clip = container.querySelector('[data-audio-clip="music"]')!;
            expect(getComputedStyle(clip).width).toBe('53.75%');
            fireEvent[event](lane, { pointerId: 1, clientX: 600 });
            expect(getComputedStyle(clip).width).toBe('37.5%');
            expect(onChange).not.toHaveBeenCalled();
            expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
            flushDragFrame();
            expect(getComputedStyle(clip).width).toBe('37.5%');
        }
    );

    it('preserves pixel precision while resizing and commits once after horizontal scrolling', async () => {
        const onChange = vi.fn();
        const { container } = renderTrack({ onChange });
        await waitFor(() => expect(mocks.getAudio).toHaveBeenCalledOnce());
        const lane = container.querySelector('[data-audio-track]') as HTMLDivElement;
        lane.getBoundingClientRect = vi.fn(() => ({ left: 0, width: 1000 }) as DOMRect);
        const handle = container.querySelector('[data-audio-handle="start"]') as HTMLDivElement;
        preparePointerCapture(handle);
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 62.5 });
        lane.parentElement!.scrollLeft = 50;
        fireEvent.pointerMove(lane, { pointerId: 1, clientX: 62.75 });
        flushDragFrame();
        const clip = container.querySelector('[data-audio-clip="music"]')!;
        expect(parseFloat(getComputedStyle(clip).left)).toBeCloseTo(11.275, 8);
        fireEvent.pointerUp(lane, { pointerId: 1, clientX: 62.75 });
        expect(onChange.mock.calls[0][0].audioTrack[0]).toMatchObject({ startTime: 2.255, endTime: 8.75 });
        expect(lane.getBoundingClientRect).toHaveBeenCalledOnce();
    });

    it('discards a pending draft when the document changes or the lane unmounts', async () => {
        const onChange = vi.fn();
        const { container, rerender, unmount } = renderTrack({ onChange });
        await waitFor(() => expect(mocks.getAudio).toHaveBeenCalledOnce());
        const lane = container.querySelector('[data-audio-track]') as HTMLDivElement;
        lane.getBoundingClientRect = () => ({ left: 0, width: 1000 }) as DOMRect;
        const clip = container.querySelector('[data-audio-clip="music"]') as HTMLDivElement;
        preparePointerCapture(clip);
        fireEvent.pointerDown(clip, { button: 0, pointerId: 1, clientX: 100 });
        fireEvent.pointerMove(lane, { pointerId: 1, clientX: 200 });
        rerender(
            <ChakraProvider>
                <TimelineAudioTrack {...props} document={{ ...timeline, audioTrack: [] }} onChange={onChange} />
            </ChakraProvider>
        );
        flushDragFrame();
        expect(container.querySelector('[data-audio-clip]')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();

        rerender(
            <ChakraProvider>
                <TimelineAudioTrack {...props} onChange={onChange} />
            </ChakraProvider>
        );
        const nextLane = container.querySelector('[data-audio-track]') as HTMLDivElement;
        nextLane.getBoundingClientRect = () => ({ left: 0, width: 1000 }) as DOMRect;
        const nextClip = container.querySelector('[data-audio-clip="music"]') as HTMLDivElement;
        preparePointerCapture(nextClip);
        fireEvent.pointerDown(nextClip, { button: 0, pointerId: 2, clientX: 100 });
        fireEvent.pointerMove(nextLane, { pointerId: 2, clientX: 200 });
        vi.mocked(cancelAnimationFrame).mockClear();
        unmount();
        expect(cancelAnimationFrame).toHaveBeenCalled();
        expect(nextClip.releasePointerCapture).toHaveBeenCalledWith(2);
        flushDragFrame();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('replaces the blob identity when restoring missing music so playback reloads it', async () => {
        mocks.getAudio.mockResolvedValue(undefined);
        const onChange = vi.fn();
        const { container } = renderTrack({ onChange });
        await screen.findByText('header.timelinePage.audioMissing');
        fireEvent.click(container.querySelector('[title="song.wav"]')!);
        fireEvent.change(container.querySelector('input[type="file"]')!, {
            target: { files: [new File(['sound'], 'restored.wav', { type: 'audio/wav' })] },
        });
        await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
        const restored = onChange.mock.calls[0][0].audioTrack[0];
        expect(restored.blobId).not.toBe('old-blob');
        expect(restored).toMatchObject({ name: 'restored.wav', startTime: 1.25, endTime: 8.75 });
        expect(mocks.saveAudio).toHaveBeenCalledWith(restored.blobId, expect.any(File), 'restored.wav');
    });
});
