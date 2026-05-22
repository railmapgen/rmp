import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Id } from '../constants/constants';
import { Element } from '../util/process-elements';
import SvgLayer from './svg-layer';

vi.mock('./svgs/lines/lines', () => ({ lineStyles: {} }));
vi.mock('./svgs/nodes/misc-nodes', () => ({ default: {} }));
vi.mock('./svgs/stations/stations', () => ({ default: {} }));

const elements: Element[] = [
    {
        id: 'misc_node_a',
        type: 'misc-node',
        miscNode: {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: 'unknown',
        } as never,
    },
];

const renderLayer = (selected = new Set<Id>(), highlighted?: Set<Id>) =>
    render(
        <svg>
            <SvgLayer
                elements={elements}
                selected={selected}
                highlighted={highlighted}
                handlePointerDown={vi.fn()}
                handlePointerMove={vi.fn()}
                handlePointerUp={vi.fn()}
                handleEdgePointerDown={vi.fn()}
                handleEdgeDoubleClick={vi.fn()}
            />
        </svg>
    );

describe('SvgLayer', () => {
    it('should add the timeline missing glow to highlighted elements', () => {
        const { container } = renderLayer(new Set<Id>(), new Set<Id>(['misc_node_a']));

        expect(container.querySelector('#misc_node_a')?.getAttribute('class')).toContain('rmp-timeline-missing-glow');
    });

    it('should prefer selected glow when an element is selected and highlighted', () => {
        const { container } = renderLayer(new Set<Id>(['misc_node_a']), new Set<Id>(['misc_node_a']));
        const element = container.querySelector('#misc_node_a');

        expect(element?.getAttribute('class')).toContain('rmp-selected-glow');
        expect(element?.getAttribute('class')).not.toContain('rmp-timeline-missing-glow');
    });
});
