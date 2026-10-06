import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { createStore } from '../../redux';
import { TimelineDocument } from '../../constants/timeline';
import TimelineTrackPanel from './timeline-track-panel';

vi.mock('./timeline-line-info-modal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">Timeline line labels</div> : null),
}));

vi.mock('react-i18next', async importOriginal => {
    const actual = await importOriginal<typeof import('react-i18next')>();
    const translate = (key: string, options?: Record<string, number>) => {
        if (key === 'header.timelinePage.missingCoverage') {
            return `Nodes not added: ${options?.nodeCount}; line segments not added: ${options?.edgeCount}.`;
        }
        if (key === 'header.timelinePage.highlightMissing') return 'Highlight missing';
        if (key === 'header.timelinePage.clearMissingHighlight') return 'Clear highlight';
        if (key === 'header.timelinePage.coverageComplete') {
            return 'All nodes and edges are added to the timeline.';
        }
        if (key === 'header.timelinePage.trackTitle') return 'Timeline track';
        if (key === 'header.timelinePage.selectHint') {
            return 'Select one node or edge above, then add it to the track.';
        }
        if (key === 'header.timelinePage.empty') {
            return 'The track is empty. Select an element above to start building the timeline.';
        }
        if (key === 'header.timelinePage.addSelected') return 'Add selected';
        if (key === 'header.timelinePage.addPathByColor') return 'Add a line by color';
        if (key === 'header.timelinePage.cursorBefore') {
            return `Insert new content before item ${options?.position}`;
        }
        if (key === 'header.timelinePage.cursorEnd') {
            return 'Insert new content at the end of the track';
        }
        return key;
    };
    return {
        ...actual,
        useTranslation: () => ({
            i18n: { language: 'en' },
            t: translate,
        }),
    };
});

const defaultProps = {
    document: { version: 1 as const, track: [] },
    missingNodeCount: 0,
    missingEdgeCount: 0,
    isCoverageComplete: true,
    isMissingHighlightShown: false,
    onToggleMissingHighlight: vi.fn(),
    onSelectEntry: vi.fn(),
    onCursorChange: vi.fn(),
    onDocumentChange: vi.fn(),
};

const renderPanel = (props: Partial<React.ComponentProps<typeof TimelineTrackPanel>> = {}, store = createStore()) =>
    render(<TimelineTrackPanel {...defaultProps} {...props} />, {
        wrapper: ({ children }: React.PropsWithChildren) => (
            <ChakraProvider>
                <Provider store={store}>{children}</Provider>
            </ChakraProvider>
        ),
    });

describe('TimelineTrackPanel', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        vi.clearAllMocks();
    });

    it('keeps labels visible and editable before visual entries are added', () => {
        const onDocumentChange = vi.fn();
        const { container } = renderPanel({
            document: {
                version: 1,
                track: [],
                labelTrack: [{ id: 'label', kind: 'label', text: 'Caption', startSlot: 0, endSlot: 1 }],
            },
            onDocumentChange,
        });
        const clip = screen.getByRole('button', { name: 'Label: Caption' });
        expect(getComputedStyle(clip).width).toBe('100%');
        expect(container.querySelector('[data-label-track]')).not.toBeNull();
        fireEvent.contextMenu(clip, { clientX: 50, clientY: 80 });
        fireEvent.click(screen.getByRole('menuitem', { name: 'header.edit' }));
        const save = screen.getByRole('button', { name: 'header.timelinePage.saveLabel' });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Changed' } });
        fireEvent.pointerDown(save, { button: 0, pointerId: 1 });
        fireEvent.click(save);
        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].labelTrack[0].text).toBe('Changed');
    });

    it('keeps cached card actions current after callback, document and selection changes', () => {
        const document: TimelineDocument = {
            version: 1,
            track: [
                { id: 'a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
            ],
        };
        const oldSelect = vi.fn();
        const oldChange = vi.fn();
        const nextSelect = vi.fn();
        const nextChange = vi.fn();
        const { container, rerender } = renderPanel({
            document,
            onSelectEntry: oldSelect,
            onDocumentChange: oldChange,
        });
        const nextCursor = vi.fn();
        rerender(
            <TimelineTrackPanel
                {...defaultProps}
                document={document}
                playbackTime={5}
                onSelectEntry={nextSelect}
                onDocumentChange={nextChange}
                onCursorChange={nextCursor}
            />
        );
        fireEvent.click(container.querySelectorAll('[data-timeline-cursor]')[2]);
        expect(nextCursor).toHaveBeenLastCalledWith(2);
        fireEvent.click(container.querySelectorAll('[data-timeline-card]')[1]);
        expect(nextSelect).toHaveBeenLastCalledWith(document.track[1]);
        expect(oldSelect).not.toHaveBeenCalled();
        fireEvent.click(screen.getAllByRole('button', { name: 'header.timelinePage.showAnimation' })[1]);
        expect(oldChange).not.toHaveBeenCalled();
        const updated = nextChange.mock.calls.at(-1)![0] as TimelineDocument;
        expect(updated.track[1]).toMatchObject({ id: 'b', showAnimation: false });
        rerender(
            <TimelineTrackPanel
                {...defaultProps}
                document={updated}
                selectedEntryId="a"
                onDocumentChange={nextChange}
            />
        );
        fireEvent.click(screen.getAllByRole('button', { name: 'header.timelinePage.showAnimation' })[0]);
        expect(nextChange.mock.calls.at(-1)![0].track).toMatchObject([
            { id: 'a', showAnimation: false },
            { id: 'b', showAnimation: false },
        ]);
    });

    it('reorders cached cards on drag and saves through the latest callback', () => {
        const document: TimelineDocument = {
            version: 1,
            track: ['a', 'b', 'c'].map(id => ({
                id,
                kind: 'node',
                refId: `stn_${id}`,
                phase: 'enter',
                showAnimation: true,
            })),
        };
        const oldChange = vi.fn();
        const nextChange = vi.fn();
        const { container, rerender } = renderPanel({ document, onDocumentChange: oldChange });
        rerender(
            <TimelineTrackPanel {...defaultProps} document={document} playbackTime={3} onDocumentChange={nextChange} />
        );
        const cards = container.querySelectorAll('[data-timeline-card]');
        fireEvent.dragStart(cards[2]);
        fireEvent.dragOver(cards[0]);
        fireEvent.dragEnd(container.querySelector('[data-timeline-card]')!);
        expect(oldChange).not.toHaveBeenCalled();
        expect(nextChange.mock.calls.at(-1)![0].track.map((entry: { id: string }) => entry.id)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    it('keeps range selection and context actions live after playback updates', () => {
        const document: TimelineDocument = {
            version: 1,
            track: ['a', 'b', 'c'].map(id => ({
                id,
                kind: 'node',
                refId: `stn_${id}`,
                phase: 'enter',
                showAnimation: true,
            })),
        };
        const onDocumentChange = vi.fn();
        const { container, rerender } = renderPanel({ document, onDocumentChange });
        rerender(
            <TimelineTrackPanel
                {...defaultProps}
                document={document}
                playbackTime={3}
                onDocumentChange={onDocumentChange}
            />
        );
        const track = container.querySelector('[data-timeline-track-content]')!.parentElement!;
        track.setPointerCapture = vi.fn();
        track.hasPointerCapture = vi.fn(() => true);
        track.releasePointerCapture = vi.fn();
        fireEvent.pointerDown(track, { button: 0, pointerId: 1, clientX: 0 });
        fireEvent.pointerMove(track, { pointerId: 1, clientX: 370 });
        fireEvent.pointerUp(track, { pointerId: 1, clientX: 370 });
        fireEvent.contextMenu(container.querySelector('[data-timeline-card]')!, { clientX: 10, clientY: 10 });
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.invertSelection' }));
        expect(onDocumentChange.mock.calls.at(-1)![0].track.map((entry: { id: string }) => entry.id)).toEqual([
            'b',
            'a',
            'c',
        ]);
        fireEvent.contextMenu(container.querySelector('[data-timeline-card]')!);
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.toggleAnimation' }));
        expect(onDocumentChange.mock.calls.at(-1)![0].track).toMatchObject([
            { id: 'b', showAnimation: false },
            { id: 'a', showAnimation: false },
            { id: 'c', showAnimation: true },
        ]);
        fireEvent.contextMenu(container.querySelector('[data-timeline-card]')!);
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.deleteEntry' }));
        expect(onDocumentChange.mock.calls.at(-1)![0].track.map((entry: { id: string }) => entry.id)).toEqual(['c']);
    });

    it('should show missing coverage counts and toggle highlighting', () => {
        const onToggleMissingHighlight = vi.fn();
        renderPanel({
            missingNodeCount: 2,
            missingEdgeCount: 1,
            isCoverageComplete: false,
            onToggleMissingHighlight,
        });

        expect(screen.queryByText('Nodes not added: 2; line segments not added: 1.')).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Highlight missing' }));

        expect(onToggleMissingHighlight).toHaveBeenCalledOnce();
    });

    it('should insert selected content at the cursor position', () => {
        const onDocumentChange = vi.fn();
        const onCursorChange = vi.fn();
        renderPanel({
            document: {
                version: 1,
                track: [
                    { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                    { id: 'clip_b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                ],
            },
            selectedId: 'stn_c',
            onDocumentChange,
            onCursorChange,
            insertionIndex: 1,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));

        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].track.map((entry: { refId: string }) => entry.refId)).toEqual([
            'stn_a',
            'stn_c',
            'stn_b',
        ]);
        expect(onCursorChange).toHaveBeenCalledWith(2);
    });

    it('seeks in real seconds and places settings immediately after play', () => {
        const onSeek = vi.fn();
        const onTogglePlayback = vi.fn();
        renderPanel({
            timing: { duration: 18.5, cursorTimes: [0, 18.5] },
            playbackTime: 4.25,
            onSeek,
            onTogglePlayback,
        });
        const play = screen.getByRole('button', { name: 'header.timelinePage.playPreview' });
        expect(play.nextElementSibling?.getAttribute('aria-label')).toBe('header.timelinePage.settings.title');
        fireEvent.click(play);
        expect(onTogglePlayback).toHaveBeenCalledOnce();
        const progress = screen.getByRole('slider', { name: 'header.timelinePage.playbackPosition' });
        expect(progress.getAttribute('aria-valuemax')).toBe('18.5');
        expect(progress.getAttribute('aria-valuenow')).toBe('4.25');
        fireEvent.keyDown(progress, { key: 'ArrowRight' });
        expect(onSeek).toHaveBeenLastCalledWith(4.26);
        fireEvent.click(play.nextElementSibling!);
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('places the ruler above the cards and spans every track with a real-time playhead', () => {
        const onSeek = vi.fn();
        const onSelectEntry = vi.fn();
        const { container } = renderPanel({
            document: {
                version: 1,
                track: [{ id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true }],
            },
            timing: { duration: 20, cursorTimes: [0, 20] },
            playbackTime: 5,
            onSeek,
            onSelectEntry,
        });
        const content = container.querySelector('[data-timeline-track-content]')!;
        const ruler = container.querySelector('[data-timeline-ruler]') as HTMLDivElement;
        const playhead = container.querySelector('[data-timeline-playhead]') as HTMLDivElement;
        expect(content.firstElementChild).toBe(ruler);
        expect(ruler.textContent).toContain('0:20.0');
        expect(content.contains(container.querySelector('[data-audio-track]'))).toBe(true);
        expect(playhead.parentElement).toBe(content);
        expect(getComputedStyle(playhead).left).toBe('64px');
        expect(getComputedStyle(playhead).top).toBe('0px');
        expect(getComputedStyle(playhead).bottom).toBe('0px');

        ruler.getBoundingClientRect = () => ({ left: 100, width: 400 }) as DOMRect;
        ruler.setPointerCapture = vi.fn();
        ruler.hasPointerCapture = vi.fn(() => true);
        ruler.releasePointerCapture = vi.fn();
        fireEvent.pointerDown(ruler, { button: 0, pointerId: 1, clientX: 164 });
        expect(onSeek).toHaveBeenLastCalledWith(5);
        fireEvent.pointerMove(ruler, { pointerId: 1, clientX: 184 });
        expect(onSeek).toHaveBeenLastCalledWith(7.5);
        fireEvent.pointerUp(ruler, { pointerId: 1, clientX: 184 });
        expect(ruler.releasePointerCapture).toHaveBeenCalledWith(1);
        expect(onSelectEntry).not.toHaveBeenCalled();
    });

    it('uses the block boundaries for nonlinear labels, playhead and ruler seeking', () => {
        const onSeek = vi.fn();
        const { container } = renderPanel({
            document: {
                version: 1,
                track: [
                    { id: 'a', kind: 'pause', duration: 1, position: 'after' },
                    { id: 'b', kind: 'pause', duration: 10, position: 'after' },
                    { id: 'c', kind: 'pause', duration: 2, position: 'after' },
                ],
            },
            timing: { duration: 13, cursorTimes: [0, 1, 11, 13] },
            playbackTime: 6,
            onSeek,
        });
        const ticks = [...container.querySelectorAll('[data-timeline-tick]')];
        expect(ticks.map(tick => tick.textContent)).toEqual(['0:00.0', '0:01.0', '0:11.0', '0:13.0']);
        expect(ticks.map(tick => getComputedStyle(tick).left)).toEqual(['24px', '208px', '392px', '552px']);
        expect(getComputedStyle(container.querySelector('[data-timeline-playhead]')!).left).toBe('288px');
        const ruler = container.querySelector('[data-timeline-ruler]') as HTMLDivElement;
        ruler.getBoundingClientRect = () => ({ left: 100, width: 576 }) as DOMRect;
        ruler.setPointerCapture = vi.fn();
        fireEvent.pointerDown(ruler, { button: 0, pointerId: 1, clientX: 388 });
        expect(onSeek).toHaveBeenLastCalledWith(6);
        fireEvent.pointerDown(ruler, { button: 0, pointerId: 2, clientX: 296 });
        expect(onSeek).toHaveBeenLastCalledWith(1);
    });

    it('opens the timeline label editor from the Video labels settings', () => {
        renderPanel();
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.settings.title' }));
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.settings.lineInformation' }));
        expect(screen.getByText('Timeline line labels')).toBeTruthy();
    });

    it('removes dependent cards together and adjusts the cursor by all removed entries before it', () => {
        const onDocumentChange = vi.fn();
        const onCursorChange = vi.fn();
        const document: TimelineDocument = {
            version: 1,
            track: [
                { id: 'enter_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'key_a', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 },
                { id: 'enter_b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                { id: 'exit_a', kind: 'node', refId: 'stn_a', phase: 'exit', showAnimation: true },
                { id: 'enter_c', kind: 'node', refId: 'stn_c', phase: 'enter', showAnimation: true },
            ],
        };
        renderPanel({ document, onDocumentChange, onCursorChange, insertionIndex: 4 });

        fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].track.map((entry: { id: string }) => entry.id)).toEqual([
            'enter_b',
            'enter_c',
        ]);
        expect(onCursorChange).toHaveBeenCalledWith(1);
    });
});
