import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { setTimelineCursor } from '../../redux/runtime/runtime-slice';
import { TimelineDocument } from '../../constants/timeline';
import TimelineTrackPanel from './timeline-track-panel';

vi.mock('react-i18next', async importOriginal => {
    const actual = await importOriginal<typeof import('react-i18next')>();
    return {
        ...actual,
        useTranslation: () => ({
            t: (key: string, options?: Record<string, number>) => {
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
                if (key === 'header.timelinePage.cursorBefore') {
                    return `Insert new content before item ${options?.position}`;
                }
                if (key === 'header.timelinePage.cursorEnd') return 'Insert new content at the end of the track';
                return key;
            },
        }),
    };
});

const defaultProps = {
    document: { version: 1 as const, mode: 'quick' as const, track: [] },
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
    render(
        <ChakraProvider>
            <Provider store={store}>
                <TimelineTrackPanel {...defaultProps} {...props} />
            </Provider>
        </ChakraProvider>
    );

describe('TimelineTrackPanel', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        vi.clearAllMocks();
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

    it('should show the clear highlight action while missing highlight is active', () => {
        renderPanel({
            missingNodeCount: 2,
            missingEdgeCount: 1,
            isCoverageComplete: false,
            isMissingHighlightShown: true,
        });

        expect(screen.queryByRole('button', { name: 'Clear highlight' })).not.toBeNull();
    });

    it('should show a compact complete state when coverage is complete', () => {
        renderPanel();

        expect(screen.queryByText('All nodes and edges are added to the timeline.')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'Highlight missing' })).toBeNull();
    });

    it('should insert selected content at the cursor position', () => {
        const onDocumentChange = vi.fn();
        const onCursorChange = vi.fn();
        const store = createStore();
        onCursorChange.mockImplementation((index: number) => store.dispatch(setTimelineCursor(index)));
        renderPanel(
            {
                document: {
                    version: 1,
                    mode: 'quick',
                    track: [
                        { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                        { id: 'clip_b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                    ],
                },
                selectedId: 'stn_c',
                onDocumentChange,
                onCursorChange,
            },
            store
        );

        fireEvent.click(screen.getByRole('button', { name: 'Insert new content before item 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));

        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].track.map((entry: { refId: string }) => entry.refId)).toEqual([
            'stn_a',
            'stn_c',
            'stn_b',
        ]);
        expect(onCursorChange).toHaveBeenCalledWith(2);
    });

    it('should switch between quick and pro modes', () => {
        const onDocumentChange = vi.fn();
        renderPanel({ onDocumentChange });

        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.switchToPro' }));

        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].mode).toBe('pro');
    });

    it('removes dependent cards together and adjusts the cursor by all removed entries before it', () => {
        const onDocumentChange = vi.fn();
        const onCursorChange = vi.fn();
        const store = createStore();
        store.dispatch(setTimelineCursor(4));
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [
                { id: 'enter_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'key_a', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 },
                { id: 'enter_b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                { id: 'exit_a', kind: 'node', refId: 'stn_a', phase: 'exit', showAnimation: true },
                { id: 'enter_c', kind: 'node', refId: 'stn_c', phase: 'enter', showAnimation: true },
            ],
        };
        renderPanel({ document, onDocumentChange, onCursorChange }, store);

        fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].track.map((entry: { id: string }) => entry.id)).toEqual([
            'enter_b',
            'enter_c',
        ]);
        expect(onCursorChange).toHaveBeenCalledWith(1);
    });

    it('should render keyframes as a main track slot and a grouped lane marker', () => {
        renderPanel({
            document: {
                version: 1,
                mode: 'pro',
                track: [
                    { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                    { id: 'key_a', kind: 'keyframe', refId: 'stn_a', x: 10, y: 20 },
                ],
            },
        });

        // One dashed slot keeping the insertion position in the main track, one marker in the lane below.
        expect(screen.getAllByRole('button', { name: 'header.timelinePage.keyframe · stn_a' })).toHaveLength(2);
    });

    it('should toggle an element animation setting from its card', () => {
        const onDocumentChange = vi.fn();
        const onSelectEntry = vi.fn();
        renderPanel({
            document: {
                version: 1,
                mode: 'pro',
                track: [{ id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true }],
            },
            onDocumentChange,
            onSelectEntry,
        });

        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.showAnimation' }));

        expect(onSelectEntry).not.toHaveBeenCalled();
        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].track[0].showAnimation).toBe(false);
    });
});
