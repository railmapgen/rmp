import { ChakraProvider } from '@chakra-ui/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineDocument } from '../../constants/timeline';
import TimelineLabelTrack from './timeline-label-track';
import { createTimelineTrackTimeScale, getTimelineTrackLayout } from './timeline-track-layout';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const timeline: TimelineDocument = {
    version: 1,
    track: [
        { id: 'a', kind: 'pause', duration: 1, position: 'after' },
        { id: 'b', kind: 'pause', duration: 10, position: 'after' },
        { id: 'c', kind: 'pause', duration: 2, position: 'after' },
    ],
    labelTrack: [{ id: 'label', kind: 'label', text: 'Caption', startSlot: 1, endSlot: 3, startTime: 1, endTime: 3 }],
    audioTrack: [{ id: 'audio', kind: 'audio', name: 'Music', blobId: 'blob', startSlot: 0, endSlot: 3 }],
};
const timing = { duration: 13, cursorTimes: [0, 1, 11, 13] };
const { entries, totalWidth } = getTimelineTrackLayout(timeline.track);
const timeScale = createTimelineTrackTimeScale(entries, totalWidth, timing);
let paint: FrameRequestCallback | undefined;
const renderTrack = (onChange = vi.fn(), onParentPointerDown = vi.fn()) =>
    render(
        <ChakraProvider>
            <div onPointerDown={onParentPointerDown}>
                <TimelineLabelTrack
                    document={timeline}
                    timing={timing}
                    totalWidth={totalWidth}
                    timeScale={timeScale}
                    onChange={onChange}
                />
            </div>
        </ChakraProvider>
    );
const capture = (element: HTMLElement) => {
    element.setPointerCapture = vi.fn();
    element.hasPointerCapture = vi.fn(() => true);
    element.releasePointerCapture = vi.fn();
};
beforeEach(() => {
    paint = undefined;
    vi.stubGlobal(
        'requestAnimationFrame',
        vi.fn(callback => {
            paint = callback;
            return 1;
        })
    );
    vi.stubGlobal(
        'cancelAnimationFrame',
        vi.fn(() => {
            paint = undefined;
        })
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('Timeline label lane', () => {
    it('edits multiline text through the label-only context menu and saves once', () => {
        const onChange = vi.fn();
        const parentPointerDown = vi.fn();
        renderTrack(onChange, parentPointerDown);
        fireEvent.contextMenu(screen.getByRole('button', { name: 'Label: Caption' }), { clientX: 50, clientY: 80 });
        expect(screen.queryByText('header.timelinePage.toggleAnimation')).toBeNull();
        fireEvent.click(screen.getByRole('menuitem', { name: 'header.edit' }));
        const textarea = screen.getByRole('textbox', { name: 'header.timelinePage.labelText' });
        fireEvent.pointerDown(textarea, { button: 0, pointerId: 1 });
        expect(parentPointerDown).not.toHaveBeenCalled();
        fireEvent.change(textarea, { target: { value: '中文说明\nEnglish caption <&>' } });
        expect(onChange).not.toHaveBeenCalled();
        const save = screen.getByRole('button', { name: 'header.timelinePage.saveLabel' });
        fireEvent.pointerDown(save, { button: 0, pointerId: 2 });
        expect(parentPointerDown).not.toHaveBeenCalled();
        fireEvent.click(save);
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.calls[0][0]).toEqual({
            ...timeline,
            labelTrack: [{ ...timeline.labelTrack![0], text: '中文说明\nEnglish caption <&>' }],
        });
    });

    it('cancels text edits and deletes just the label without touching visual or audio entries', () => {
        const onChange = vi.fn();
        renderTrack(onChange);
        const clip = screen.getByRole('button', { name: 'Label: Caption' });
        fireEvent.doubleClick(clip);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Draft' } });
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.contextMenu(clip);
        fireEvent.click(screen.getByRole('menuitem', { name: 'header.timelinePage.deleteEntry' }));
        expect(onChange).toHaveBeenCalledExactlyOnceWith({ ...timeline, labelTrack: [] });
    });

    it('moves smoothly against nonlinear card times and commits only on release', () => {
        const onChange = vi.fn();
        const { container } = renderTrack(onChange);
        const lane = container.querySelector('[data-label-track]') as HTMLDivElement;
        const clip = container.querySelector('[data-label-clip]') as HTMLDivElement;
        const readBounds = vi.fn(() => ({ left: 0, width: totalWidth }) as DOMRect);
        lane.getBoundingClientRect = readBounds;
        capture(clip);
        const origin = timeScale.timeToPosition(1);
        vi.mocked(requestAnimationFrame).mockClear();
        fireEvent.pointerDown(clip, { button: 0, pointerId: 1, clientX: origin + 12 });
        for (let offset = 1; offset <= 40; offset++)
            fireEvent.pointerMove(lane, { pointerId: 1, clientX: origin + 12 + offset });
        expect(onChange).not.toHaveBeenCalled();
        expect(requestAnimationFrame).toHaveBeenCalledOnce();
        act(() => paint?.(16));
        expect(getComputedStyle(clip).left).toBe(`${origin + 40}px`);
        fireEvent.pointerUp(lane, { pointerId: 1, clientX: origin + 52 });
        expect(onChange).toHaveBeenCalledOnce();
        expect(readBounds).toHaveBeenCalledOnce();
        expect(onChange.mock.calls[0][0].labelTrack[0]).toMatchObject({ startTime: 3.5, endTime: 5.5 });
        expect(onChange.mock.calls[0][0].track).toBe(timeline.track);
        expect(onChange.mock.calls[0][0].audioTrack).toBe(timeline.audioTrack);
    });

    it.each(['start', 'end'] as const)('resizes the %s handle freely in real seconds', mode => {
        const onChange = vi.fn();
        const { container } = renderTrack(onChange);
        const lane = container.querySelector('[data-label-track]') as HTMLDivElement;
        lane.getBoundingClientRect = () => ({ left: 0, width: totalWidth }) as DOMRect;
        const handle = container.querySelector(`[data-label-handle="${mode}"]`) as HTMLDivElement;
        capture(handle);
        const original = mode === 'start' ? 1 : 3;
        const destination = mode === 'start' ? 1.75 : 5.25;
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: timeScale.timeToPosition(original) });
        fireEvent.pointerUp(lane, { pointerId: 1, clientX: timeScale.timeToPosition(destination) });
        expect(onChange.mock.calls[0][0].labelTrack[0]).toMatchObject(
            mode === 'start' ? { startTime: 1.75, endTime: 3 } : { startTime: 1, endTime: 5.25 }
        );
    });
});
