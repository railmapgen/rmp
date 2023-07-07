import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../../../test-utils';
import { LineIcon } from './line-icon';

const mockGetBBox = vi.fn();
(SVGElement.prototype as any).getBBox = mockGetBBox;

describe('GZMTRLineIcon', () => {
    beforeEach(() => {
        mockGetBBox.mockReturnValue({ width: 0 });
    });

    it('Can render type 1 line icon as expected', () => {
        render(
            <svg>
                <LineIcon
                    lineName={['18号线', 'Line 18']}
                    foregroundColour={MonoColour.white}
                    backgroundColour="#000000"
                />
            </svg>
        );

        // text is separated in 3 elements
        expect(screen.getByText('18').tagName).toBe('tspan');
        expect(screen.getByText('号线').tagName).toBe('tspan');
        expect(screen.getByText('Line 18').tagName).toBe('text');
    });

    it('Can render type 2 line icon as expected', () => {
        render(
            <svg>
                <LineIcon
                    lineName={['APM线', 'APM Line']}
                    foregroundColour={MonoColour.white}
                    backgroundColour="#000000"
                />
            </svg>
        );

        // remaining part
        expect(screen.getByText('线').tagName).toBe('tspan');
        expect(screen.getByText('Line').tagName).toBe('tspan');

        // common part
        expect(screen.getByText('APM').tagName).toBe('text');
    });

    it('Can render type 3 line icon as expected', () => {
        render(
            <svg>
                <LineIcon
                    lineName={['佛山2号线', 'Foshan Line 2']}
                    foregroundColour={MonoColour.white}
                    backgroundColour="#000000"
                />
            </svg>
        );

        expect(screen.getByText('佛山2号线').tagName).toBe('text');
        expect(screen.getByText('Foshan Line 2').tagName).toBe('text');
    });
});
