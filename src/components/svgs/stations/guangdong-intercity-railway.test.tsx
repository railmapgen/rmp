import { waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NameOffsetX, StationType } from '../../../constants/stations';
import { render } from '../../../test-utils';
import stations from './stations';

const Station = stations[StationType.GuangdongIntercityRailway].component;

const makeDOMRect = (width: number): DOMRect =>
    ({
        x: 0,
        y: 0,
        width,
        height: 10,
        top: 0,
        right: width,
        bottom: 10,
        left: 0,
        toJSON: () => ({}),
    }) as DOMRect;

const getSecondaryNameGroup = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('g[transform]')).find(g => g.textContent?.includes('广州南'));

const renderStation = (
    nameOffsetX: NameOffsetX,
    preciseNameOffsets?: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
) =>
    render(
        <svg>
            <Station
                id="stn_test"
                x={0}
                y={0}
                attrs={{
                    [StationType.GuangdongIntercityRailway]: {
                        names: ['番禺', 'Panyu'],
                        preciseNameOffsets,
                        nameOffsetX,
                        nameOffsetY: 'top',
                        secondaryNames: ['广州南', 'Guangzhounan'],
                        interchange: false,
                    },
                }}
                handlePointerDown={vi.fn()}
                handlePointerMove={vi.fn()}
                handlePointerUp={vi.fn()}
            />
        </svg>
    );

describe('GuangdongIntercityRailwayStation', () => {
    let originalGetBBox: unknown;

    beforeEach(() => {
        originalGetBBox = (SVGElement.prototype as { getBBox?: unknown }).getBBox;
        Object.defineProperty(SVGElement.prototype, 'getBBox', {
            configurable: true,
            value: vi.fn(function (this: SVGElement) {
                const text = this.textContent?.replace(/\s/g, '') ?? '';
                if (text.includes('广州南')) return makeDOMRect(50);
                if (text.includes('番禺')) return makeDOMRect(40);
                return makeDOMRect(0);
            }),
        });
    });

    afterEach(() => {
        if (originalGetBBox) {
            Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: originalGetBBox });
        } else {
            delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
        }
        vi.restoreAllMocks();
    });

    it.each([
        ['right', 'translate(90.33, -16.67)'],
        ['left', 'translate(-90.33, -16.67)'],
        ['middle', 'translate(57, -16.67)'],
    ] satisfies Array<[NameOffsetX, string]>)(
        'places secondary names with %s name offset',
        async (nameOffsetX, transform) => {
            const { container } = renderStation(nameOffsetX);

            await waitFor(() => expect(getSecondaryNameGroup(container)).toHaveAttribute('transform', transform));
        }
    );

    it('places secondary names from precise name offsets', async () => {
        const { container } = renderStation('right', { x: 20, y: 30, anchor: 'end' });

        await waitFor(() =>
            expect(getSecondaryNameGroup(container)).toHaveAttribute('transform', 'translate(-57, 30)')
        );
    });
});
