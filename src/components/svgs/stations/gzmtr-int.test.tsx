import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../constants/constants';
import { StationType } from '../../../constants/stations';
import { render } from '../../../test-utils';
import { InterchangeInfo } from '../../panels/details/interchange-field';
import gzmtrIntStation from './gzmtr-int';

const Station = gzmtrIntStation.component;
const within: InterchangeInfo[] = [
    [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.white, '1', '11', 'gz'],
    [CityCode.Guangzhou, 'gz2', '#00629B', MonoColour.white, '2', '12', 'gz'],
    [CityCode.Guangzhou, 'gz3', '#ECA154', MonoColour.white, '3', '13', 'gz'],
    [CityCode.Guangzhou, 'gz4', '#00843D', MonoColour.white, '4', '14', 'gz'],
    [CityCode.Guangzhou, 'gz5', '#C5003E', MonoColour.white, '5', '15', 'gz'],
];
const outside: InterchangeInfo[] = [
    [CityCode.Guangzhou, 'gz6', '#80225F', MonoColour.white, '6', '16', 'gz'],
    [CityCode.Guangzhou, 'gz7', '#97D700', MonoColour.white, '7', '17', 'gz'],
    [CityCode.Guangzhou, 'gz8', '#008C95', MonoColour.white, '8', '18', 'gz'],
];

const renderStation = (transfer: InterchangeInfo[][] | undefined, tram = false) =>
    render(
        <svg>
            <Station
                id="stn_test"
                x={0}
                y={0}
                attrs={
                    transfer === undefined
                        ? {}
                        : {
                              [StationType.GzmtrInt]: {
                                  ...gzmtrIntStation.defaultAttrs,
                                  names: ['Station', 'Station'],
                                  transfer,
                                  tram,
                              },
                          }
                }
                handlePointerDown={vi.fn()}
                handlePointerMove={vi.fn()}
                handlePointerUp={vi.fn()}
            />
        </svg>
    );

const getBadges = (container: HTMLElement) =>
    Array.from(container.querySelector('#stn_core_stn_test')!.parentElement!.querySelectorAll(':scope > g'));

const getArrowColors = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('path[marker-end]:not([stroke-opacity="0"])'), arrow =>
        arrow.getAttribute('stroke')
    );

describe('Guangzhou Metro interchange station', () => {
    const originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

    beforeAll(() => {
        Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: () => new DOMRect() });
        Object.defineProperty(document, 'fonts', {
            configurable: true,
            value: Object.assign(new EventTarget(), { load: async () => [] }),
        });
    });

    afterAll(() => {
        if (originalGetBBox) Object.defineProperty(SVGElement.prototype, 'getBBox', originalGetBBox);
        else Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
    });

    it.each([
        [0, 2, [], ['#80225F', '#97D700']],
        [1, 0, ['translate(0,0)'], ['#F3D03E', '#F3D03E']],
        [1, 1, ['translate(0,0)'], ['#F3D03E', '#80225F']],
        [2, 1, ['translate(-21,0)', 'translate(21,0)'], ['#F3D03E', '#00629B', '#80225F']],
        [
            3,
            1,
            ['translate(-21.65,-12.5)', 'translate(21.65,-12.5)', 'translate(0,25)'],
            ['#F3D03E', '#00629B', '#ECA154', '#80225F'],
        ],
        [
            4,
            1,
            ['translate(-23,-18)', 'translate(22,-16)', 'translate(23,18)', 'translate(-22,16)'],
            ['#F3D03E', '#00629B', '#ECA154', '#00843D'],
        ],
        [2, 3, ['translate(-21,0)', 'translate(21,0)'], ['#F3D03E', '#00629B', '#80225F', '#97D700']],
    ] satisfies Array<[number, number, string[], string[]]>)(
        'renders %i within-station badges with %i out-of-station transfers',
        (withinCount, outsideCount, positions, arrowColors) => {
            const { container } = renderStation([within.slice(0, withinCount), outside.slice(0, outsideCount)]);
            const badges = getBadges(container);

            expect(badges.map(badge => badge.getAttribute('transform'))).toEqual(positions);
            expect(badges.map(badge => Array.from(badge.querySelectorAll('text'), text => text.textContent))).toEqual(
                within.slice(0, withinCount).map(info => [info[4], info[5]])
            );
            expect(getArrowColors(container)).toEqual(arrowColors);
        }
    );

    it.each([{ transfer: undefined }, { transfer: [] }, { transfer: [[]] }, { transfer: [[], []] }] satisfies Array<{
        transfer: InterchangeInfo[][] | undefined;
    }>)('renders an empty transfer list without badges (%j)', ({ transfer }) => {
        const { container } = renderStation(transfer);

        expect(getBadges(container)).toHaveLength(0);
        expect(getArrowColors(container)).toEqual(['black', 'black']);
    });

    it('limits more than four within-station transfers without changing the stored entries', () => {
        const transfer = structuredClone([within, outside]);
        const originalTransfer = structuredClone(transfer);
        const { container } = renderStation(transfer);
        const badges = getBadges(container);

        expect(badges.map(badge => Array.from(badge.querySelectorAll('text'), text => text.textContent))).toEqual([
            ['1', '11'],
            ['2', '12'],
            ['3', '13'],
            ['4', '14'],
        ]);
        expect(badges.map(badge => badge.getAttribute('transform'))).toEqual([
            'translate(-23,-18)',
            'translate(22,-16)',
            'translate(23,18)',
            'translate(-22,16)',
        ]);
        expect(getArrowColors(container)).toEqual(['#F3D03E', '#00629B', '#ECA154', '#00843D']);
        expect(transfer).toEqual(originalTransfer);
    });

    it('keeps Guangzhou and Foshan badges in the within-station layout in tram mode', () => {
        const transfer = structuredClone([within.slice(0, 2), outside.slice(0, 1)]);
        transfer[0][1][6] = 'fs';
        const { container } = renderStation(transfer, true);
        const badges = getBadges(container);

        expect(badges.map(badge => badge.getAttribute('transform'))).toEqual(['translate(-21,0)', 'translate(21,0)']);
        expect(badges.map(badge => Array.from(badge.querySelectorAll('text'), text => text.textContent))).toEqual([
            ['1', '11'],
            ['2', '12'],
        ]);
        expect(badges[0].querySelector('path')?.getAttribute('d')).not.toEqual(
            badges[1].querySelector('path')?.getAttribute('d')
        );
        expect(badges[0].parentElement).toHaveAttribute('transform', `scale(${0.57915 * 0.729})`);
        expect(getArrowColors(container)).toEqual(['#F3D03E', '#00629B', '#80225F']);
    });
});
