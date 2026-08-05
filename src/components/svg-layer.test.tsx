// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makeLinearPath, makePoint } from '../constants/path';
import { StationType } from '../constants/stations';
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

const makeStationAttrs = (): NodeAttributes => ({
    visible: true,
    zIndex: 0,
    x: 10,
    y: 20,
    type: 'test-station' as StationType,
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

    it('treats legacy lines without visible as visible', () => {
        const attr = makeLineAttrs() as Partial<EdgeAttributes>;
        delete attr.visible;
        const elements: Element[] = [
            {
                id: 'line_legacy',
                type: 'line',
                line: {
                    attr: attr as EdgeAttributes,
                    path: makeLinearPath(makePoint(0, 0), makePoint(100, 0)),
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set(['line_legacy'])}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        const group = container.querySelector('#line_legacy');
        expect(group).toHaveClass('rmp-selected-glow');
        expect(group).not.toHaveClass('removeMe');
        expect(group).not.toHaveAttribute('filter');
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

    it('marks invisible station wrappers with the hidden filter', () => {
        const elements: Element[] = [
            {
                id: 'stn_hidden',
                type: 'station',
                station: {
                    ...makeStationAttrs(),
                    visible: false,
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

        const group = container.querySelector('#stn_hidden');
        expect(group).toHaveClass('removeMe');
        expect(group).toHaveAttribute('filter', 'url(#invisible)');
    });

    it('treats legacy stations and misc nodes without visible as visible', () => {
        const station = makeStationAttrs() as Partial<NodeAttributes>;
        delete station.visible;
        const miscNode = {
            x: 30,
            y: 40,
            type: MiscNodeType.Virtual,
            zIndex: 0,
            [MiscNodeType.Virtual]: {},
        } as NodeAttributes;
        const elements: Element[] = [
            {
                id: 'stn_legacy',
                type: 'station',
                station: station as NodeAttributes,
            },
            {
                id: 'misc_node_legacy',
                type: 'misc-node',
                miscNode,
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set(['stn_legacy', 'misc_node_legacy'])}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        const stationGroup = container.querySelector('#stn_legacy');
        expect(stationGroup).toHaveClass('rmp-selected-glow');
        expect(stationGroup).not.toHaveClass('removeMe');
        expect(stationGroup).not.toHaveAttribute('filter');

        const miscNodeGroup = container.querySelector('#misc_node_legacy');
        expect(miscNodeGroup).toHaveClass('rmp-selected-glow');
        expect(miscNodeGroup).not.toHaveClass('removeMe');
        expect(miscNodeGroup).not.toHaveAttribute('filter');
    });

    it('adds the timeline missing glow to highlighted elements', () => {
        const elements: Element[] = [
            {
                id: 'misc_node_a',
                type: 'misc-node',
                miscNode: {
                    visible: true,
                    zIndex: 0,
                    x: 0,
                    y: 0,
                    type: MiscNodeType.Virtual,
                    [MiscNodeType.Virtual]: {},
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set()}
                    highlighted={new Set(['misc_node_a'])}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        expect(container.querySelector('#misc_node_a')).toHaveClass('rmp-timeline-missing-glow');
    });

    it('prefers selected glow when an element is selected and highlighted', () => {
        const elements: Element[] = [
            {
                id: 'misc_node_a',
                type: 'misc-node',
                miscNode: {
                    visible: true,
                    zIndex: 0,
                    x: 0,
                    y: 0,
                    type: MiscNodeType.Virtual,
                    [MiscNodeType.Virtual]: {},
                },
            },
        ];

        const { container } = render(
            <svg>
                <SvgLayer
                    elements={elements}
                    selected={new Set(['misc_node_a'])}
                    highlighted={new Set(['misc_node_a'])}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                    handleEdgePointerDown={vi.fn()}
                    handleEdgeDoubleClick={vi.fn()}
                />
            </svg>
        );

        const element = container.querySelector('#misc_node_a');
        expect(element).toHaveClass('rmp-selected-glow');
        expect(element).not.toHaveClass('rmp-timeline-missing-glow');
    });
});
