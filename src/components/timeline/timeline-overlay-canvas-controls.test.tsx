import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createTimelineOverlayModule } from '../../constants/timeline-overlays';
import { render } from '../../test-utils';
import { getEmptyTimelineOverlayLayout } from '../../util/video-export/video-overlay-modules';
import TimelineOverlayCanvasControls from './timeline-overlay-canvas-controls';

const date = createTimelineOverlayModule('date', 'top-left', 'date');
const map = createTimelineOverlayModule('minimap', 'bottom-right', 'map');
const modules = [date, map];

const setup = (hasExportSubscription = false) => {
    const onMove = vi.fn();
    const onPreviewMove = vi.fn();
    const onCancelMove = vi.fn();
    const { container, rerender } = render(
        <ChakraProvider>
            <TimelineOverlayCanvasControls
                modules={modules}
                layout={getEmptyTimelineOverlayLayout(modules)}
                editing
                hasExportSubscription={hasExportSubscription}
                onMove={onMove}
                onPreviewMove={onPreviewMove}
                onCancelMove={onCancelMove}
            />
        </ChakraProvider>
    );
    const area = container.querySelector('[data-overlay-canvas-controls]')!;
    area.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1280,
        bottom: 720,
        width: 1280,
        height: 720,
        toJSON: () => ({}),
    });
    const handle = container.querySelector('[data-overlay-handle="date"]') as HTMLElement;
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.releasePointerCapture = vi.fn();
    return { handle, container, rerender, onMove, onPreviewMove, onCancelMove };
};

describe('annotation drag preview', () => {
    it('previews the target before drop and commits exactly once after release', () => {
        const { handle, onMove, onPreviewMove, onCancelMove } = setup();
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 80, clientY: 50 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1000, clientY: 650 });
        expect(onPreviewMove).toHaveBeenLastCalledWith('date', 'bottom-right', 1);
        expect(onMove).not.toHaveBeenCalled();
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 1000, clientY: 650 });
        expect(onMove).toHaveBeenCalledExactlyOnceWith('date', 'bottom-right', 1);
        expect(onCancelMove).toHaveBeenCalledOnce();
    });

    it('restores the committed layout on cancellation and rejects the subscription-only drop target', () => {
        const { handle, onMove, onPreviewMove, onCancelMove } = setup();
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 80, clientY: 50 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1000, clientY: 650 });
        fireEvent.pointerCancel(handle, { pointerId: 1 });
        expect(onCancelMove).toHaveBeenCalledOnce();
        expect(onMove).not.toHaveBeenCalled();
        onPreviewMove.mockClear();
        fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 80, clientY: 50 });
        fireEvent.pointerMove(handle, { pointerId: 2, clientX: 1100, clientY: 100 });
        fireEvent.pointerUp(handle, { pointerId: 2, clientX: 1100, clientY: 100 });
        expect(onPreviewMove).not.toHaveBeenCalled();
        expect(onMove).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Add to Top right' })).toBeDisabled();
        expect(screen.getByText('Stop and Proceed')).toBeInTheDocument();
    });

    it('unlocks the top-right corner and accepts drops with Export access', () => {
        const { handle, container, onMove, onPreviewMove } = setup(true);
        expect(screen.getByRole('button', { name: 'Add to Top right' })).toBeEnabled();
        expect(container.querySelector('[data-timeline-locked-glass]')).toBeNull();
        expect(screen.queryByText('Stop and Proceed')).not.toBeInTheDocument();
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 80, clientY: 50 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1100, clientY: 100 });
        expect(onPreviewMove).toHaveBeenLastCalledWith('date', 'top-right', 0);
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 1100, clientY: 100 });
        expect(onMove).toHaveBeenCalledExactlyOnceWith('date', 'top-right', 0);
    });

    it('identifies the Export subscription in the top-right lock with a working tooltip', async () => {
        const { container } = setup();
        const badge = screen.getByText('Stop and Proceed');
        expect(container.querySelector('[data-timeline-locked-glass]')).toContainElement(badge);
        expect(badge).toHaveStyle({ pointerEvents: 'auto' });
        fireEvent.focus(badge);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Subscribe to Rail Map Painter・Stop and Proceed to unlock this feature.'
        );
    });
});
