// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makeLinearPath, makePoint } from '../constants/path';
import { Element } from '../util/process-elements';
import SvgLayer from './svg-layer';

const makeLineAttrs = (): EdgeAttributes => ({
    visible: true,
    zIndex: 0,
    type: LinePathType.Simple,
    [LinePathType.Simple]: { offset: 0 },
    style: LineStyleType.SingleColor,
    [LineStyleType.SingleColor]: {
        color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    },
    reconcileId: 'reconcile-a',
    parallelIndex: -1,
});

const makeUnknownLineAttrs = (): EdgeAttributes => ({
    ...makeLineAttrs(),
    style: LineStyleType.Unknown,
    [LineStyleType.Unknown]: {},
});

describe('SvgLayer', () => {
    it('renders unknown line style with UnknownLineStyle', () => {
        const elements: Element[] = [
            {
                id: 'line_a',
                type: 'line',
                line: {
                    attr: makeUnknownLineAttrs(),
                    path: makeLinearPath(makePoint(0, 0), makePoint(100, 0)),
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set()}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        expect(container.querySelector('path')?.getAttribute('stroke')).toBe('grey');
    });

    it('keeps invisible lines rendered and marks their wrapper with the hidden filter', () => {
        const elements: Element[] = [
            {
                id: 'line_hidden',
                type: 'line',
                line: {
                    attr: { ...makeLineAttrs(), visible: false },
                    path: makeLinearPath(makePoint(0, 0), makePoint(100, 0)),
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set()}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        const group = container.querySelector('#line_hidden');
        expect(group).toBeInTheDocument();
        expect(group).toHaveClass('removeMe');
        expect(group).not.toHaveClass('rmp-hidden-pattern');
        expect(group).not.toHaveAttribute('opacity');
        expect(group).toHaveAttribute('filter', 'url(#invisible)');
        expect(group?.querySelector('path')).toBeInTheDocument();
        expect(container.querySelector('path[stroke="url(#opaque)"]')).not.toBeInTheDocument();
        expect(container.querySelector('[id="line_hidden_hidden_mask"]')).not.toBeInTheDocument();
        expect(container.querySelector('[id="line_hidden_hidden_pattern"]')).not.toBeInTheDocument();
    });

    it('does not apply selected glow to hidden wrappers because both states use filters', () => {
        const elements: Element[] = [
            {
                id: 'line_hidden',
                type: 'line',
                line: {
                    attr: { ...makeLineAttrs(), visible: false },
                    path: makeLinearPath(makePoint(0, 0), makePoint(100, 0)),
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set(['line_hidden'])}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        const group = container.querySelector('#line_hidden');
        expect(group).not.toHaveClass('rmp-selected-glow');
        expect(group).toHaveAttribute('filter', 'url(#invisible)');
    });

    it('marks invisible node wrappers with the hidden filter', () => {
        const elements: Element[] = [
            {
                id: 'misc_node_hidden',
                type: 'misc-node',
                miscNode: {
                    x: 10,
                    y: 20,
                    type: MiscNodeType.Virtual,
                    visible: false,
                    zIndex: 0,
                    [MiscNodeType.Virtual]: {},
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set()}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        const group = container.querySelector('#misc_node_hidden');
        expect(group).toHaveClass('removeMe');
        expect(group).not.toHaveClass('rmp-hidden-pattern');
        expect(group).toHaveAttribute('filter', 'url(#invisible)');
        expect(container.querySelector('rect[width="80"][height="80"][fill="url(#opaque)"]')).not.toBeInTheDocument();
        expect(container.querySelector('circle[fill="url(#opaque)"]')).not.toBeInTheDocument();
        expect(container.querySelector('[id="misc_node_hidden_hidden_mask"]')).not.toBeInTheDocument();
        expect(container.querySelector('[id="misc_node_hidden_hidden_pattern"]')).not.toBeInTheDocument();
    });
});
