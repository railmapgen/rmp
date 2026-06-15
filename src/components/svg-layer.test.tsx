import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
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
});
