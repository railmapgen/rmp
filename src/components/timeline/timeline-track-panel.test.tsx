import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimelineTrackPanel from './timeline-track-panel';

vi.mock('react-i18next', () => ({
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
}));

vi.mock('../../redux', () => ({
    useRootSelector: (selector: (state: { runtime: { refresh: { nodes: number; edges: number } } }) => unknown) =>
        selector({ runtime: { refresh: { nodes: 0, edges: 0 } } }),
}));

const defaultProps = {
    document: { version: 1 as const, track: [] },
    missingNodeCount: 0,
    missingEdgeCount: 0,
    isCoverageComplete: true,
    isMissingHighlightShown: false,
    onToggleMissingHighlight: vi.fn(),
    onSelectEntry: vi.fn(),
    onDocumentChange: vi.fn(),
};

const renderPanel = (props: Partial<React.ComponentProps<typeof TimelineTrackPanel>> = {}) =>
    render(
        <ChakraProvider>
            <TimelineTrackPanel {...defaultProps} {...props} />
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
        renderPanel({
            document: {
                version: 1,
                track: [
                    { id: 'clip_a', kind: 'node', refId: 'stn_a' },
                    { id: 'clip_b', kind: 'node', refId: 'stn_b' },
                ],
            },
            selectedId: 'stn_c',
            onDocumentChange,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Insert new content before item 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));

        expect(onDocumentChange).toHaveBeenCalledOnce();
        expect(onDocumentChange.mock.calls[0][0].track.map((entry: { refId: string }) => entry.refId)).toEqual([
            'stn_a',
            'stn_c',
            'stn_b',
        ]);
    });
});
