import { logger } from '@railmapgen/rmg-runtime';
import { render, renderHook, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { TextLanguage } from '../util/fonts';
import * as fonts from '../util/fonts';
import { getNodes } from '../util/process-elements';
import SvgLayer from './svg-layer';
import { SvgRenderProvider, useSvgRenderContext } from './svg-render-context';

beforeAll(() => {
    if (!(SVGElement.prototype as SVGElement & { getBBox?: () => DOMRect }).getBBox) {
        Object.defineProperty(SVGElement.prototype, 'getBBox', {
            configurable: true,
            value: () => ({ x: 0, y: 0, width: 32, height: 16 }),
        });
    }
});

afterEach(() => {
    vi.restoreAllMocks();
    window.graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
});

describe('SvgRenderContext', () => {
    it('observes font failures in the editor fallback without interrupting rendering', async () => {
        const failure = new Error('Font download failed');
        vi.spyOn(fonts, 'loadFont').mockRejectedValue(failure);
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
        const { result } = renderHook(useSvgRenderContext);

        expect(() => result.current.ensureFont(TextLanguage.mrt)).not.toThrow();

        await waitFor(() => expect(warn).toHaveBeenCalledWith('Failed to load font', TextLanguage.mrt, failure));
    });

    it('renders Fill, Image and Text through SvgLayer without RMP Redux or window.graph', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_fill', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: MiscNodeType.Fill,
            [MiscNodeType.Fill]: {
                color: ['shanghai', 'fill', '#ff0000', '#fff'],
                opacity: 0.5,
                selectedPatterns: [],
            },
        } as NodeAttributes);
        graph.addNode('misc_node_image', {
            visible: true,
            zIndex: 0,
            x: 10,
            y: 10,
            type: MiscNodeType.Image,
            [MiscNodeType.Image]: {
                type: 'local',
                href: 'img-l-context',
                scale: 1,
                rotate: 0,
                opacity: 1,
            },
        } as NodeAttributes);
        graph.addNode('misc_node_text', {
            visible: true,
            zIndex: 0,
            x: 20,
            y: 20,
            type: MiscNodeType.Text,
            [MiscNodeType.Text]: {
                content: 'Independent Timeline',
                fontSize: 16,
                lineHeight: 16,
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                language: TextLanguage.en,
                color: ['shanghai', 'text', '#000000', '#fff'],
                rotate: 0,
                italic: 'normal',
                bold: 'normal',
                outline: 0,
            },
        } as NodeAttributes);
        (window as { graph?: unknown }).graph = undefined;
        const ensureFont = vi.fn();

        const { container } = render(
            <svg>
                <SvgRenderProvider
                    value={{
                        graph,
                        graphRefresh: 1,
                        imageRefresh: 1,
                        getImage: async id => (id === 'img-l-context' ? 'data:image/png;base64,aW1hZ2U=' : undefined),
                        ensureFont,
                    }}
                >
                    <SvgLayer
                        elements={getNodes(graph)}
                        selected={new Set()}
                        mapEnabled={false}
                        isSubscriber={false}
                        handlePointerDown={() => undefined}
                        handlePointerMove={() => undefined}
                        handlePointerUp={() => undefined}
                        handleEdgePointerDown={() => undefined}
                        handleEdgeDoubleClick={() => undefined}
                    />
                </SvgRenderProvider>
            </svg>
        );

        expect(container.querySelector('#misc_node_fill')).not.toBeNull();
        expect(container.textContent).toContain('Independent Timeline');
        await waitFor(() =>
            expect(container.querySelector('#misc_node_image image')?.getAttribute('href')).toBe(
                'data:image/png;base64,aW1hZ2U='
            )
        );
        expect(ensureFont).toHaveBeenCalledWith(TextLanguage.en);
    });
});
