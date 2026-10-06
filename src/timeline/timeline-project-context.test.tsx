import { render, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { useSvgRenderContext } from '../components/svg-render-context';
import { TextLanguage, loadFont } from '../util/fonts';
import { TimelineProjectProvider, useTimelineProjectContext } from './timeline-project-context';

vi.mock('../util/fonts', async importOriginal => ({
    ...(await importOriginal<typeof import('../util/fonts')>()),
    loadFont: vi.fn().mockResolvedValue(undefined),
}));

const LanguageProbe = () => {
    const { languages } = useTimelineProjectContext();
    const { fontRevision } = useSvgRenderContext();
    return (
        <>
            <div>{languages.join(',')}</div>
            <div data-testid="font-revision">{fontRevision}</div>
        </>
    );
};

describe('TimelineProjectProvider fonts', () => {
    it('loads and exposes fonts required by the project graph', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('stn_mtr', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.MTR,
        } as NodeAttributes);
        graph.addNode('stn_tokyo', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.TokyoMetroBasic,
        } as NodeAttributes);
        graph.addNode('stn_london_river', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.LondonRiverServicesInt,
        } as NodeAttributes);
        graph.addNode('misc_node_text', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: MiscNodeType.Text,
            [MiscNodeType.Text]: { language: TextLanguage.taipei },
        } as NodeAttributes);

        render(
            <TimelineProjectProvider projectId="font-test" graph={graph} revision={1}>
                <LanguageProbe />
            </TimelineProjectProvider>
        );

        expect(screen.getByText('mtr_zh,mtr_en,tokyo_ja,tokyo_en,tube,taipei')).not.toBeNull();
        await waitFor(() => {
            expect(loadFont).toHaveBeenCalledTimes(6);
            expect(screen.getByTestId('font-revision').textContent).toBe('1');
        });
        expect(vi.mocked(loadFont).mock.calls.map(([language]) => language)).toEqual([
            TextLanguage.mtr_zh,
            TextLanguage.mtr_en,
            TextLanguage.tokyo_ja,
            TextLanguage.tokyo_en,
            TextLanguage.tube,
            TextLanguage.taipei,
        ]);
    });
});
