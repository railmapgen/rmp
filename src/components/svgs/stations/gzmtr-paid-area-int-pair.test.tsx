import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { ICON_FULL_HEIGHT, ICON_FULL_WIDTH } from '@railmapgen/svg-assets/gzmtr';
import { fireEvent } from '@testing-library/react';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../constants/constants';
import { StationType } from '../../../constants/stations';
import { render } from '../../../test-utils';
import { InterchangeInfo } from '../../panels/details/interchange-field';
import gzmtrPaidAreaIntPairStation, { GzmtrPaidAreaIntPairStationAttributes } from './gzmtr-paid-area-int-pair';

const Station = gzmtrPaidAreaIntPairStation.component;
const within: InterchangeInfo[] = [
    [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.white, '1', '11', 'gz'],
    [CityCode.Guangzhou, 'gz2', '#00629B', MonoColour.white, '2', '12', 'gz'],
    [CityCode.Guangzhou, 'gz3', '#ECA154', MonoColour.white, '3', '13', 'gz'],
];

const renderStation = (patch: Partial<GzmtrPaidAreaIntPairStationAttributes> = {}) =>
    render(
        <svg>
            <Station
                id="stn_test"
                x={0}
                y={0}
                attrs={{
                    [StationType.GzmtrPaidAreaIntPair]: {
                        ...gzmtrPaidAreaIntPairStation.defaultAttrs,
                        ...patch,
                    },
                }}
                handlePointerDown={vi.fn()}
                handlePointerMove={vi.fn()}
                handlePointerUp={vi.fn()}
            />
        </svg>
    );

const getTranslate = (container: HTMLElement) =>
    container.querySelector('rect[id^="stn_core_"]')!.parentElement!.parentElement!.getAttribute('transform');

const getCorridor = (container: HTMLElement) => container.querySelector('path[stroke="#aaa"]')!;

const getCorridorXs = (container: HTMLElement) => {
    const d = getCorridor(container).getAttribute('d')!;
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    return nums.filter((_, i) => i % 2 === 0);
};

const getCorridorYs = (container: HTMLElement) => {
    const d = getCorridor(container).getAttribute('d')!;
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    return nums.filter((_, i) => i % 2 === 1);
};

const getTranslateNumbers = (container: HTMLElement) =>
    getTranslate(container)!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);

const getSelectsWithOption = (container: HTMLElement, value: string) =>
    Array.from(container.querySelectorAll('select')).filter(select =>
        Array.from(select.options).some(option => option.value === value)
    );

const AttrsComponent = gzmtrPaidAreaIntPairStation.attrsComponent!;

const renderAttrs = (patch: Partial<GzmtrPaidAreaIntPairStationAttributes> = {}) => {
    const attrs: GzmtrPaidAreaIntPairStationAttributes = {
        ...structuredClone(gzmtrPaidAreaIntPairStation.defaultAttrs),
        ...patch,
    };
    const handleAttrsUpdate = vi.fn((_id: string, next: GzmtrPaidAreaIntPairStationAttributes) =>
        Object.assign(attrs, next)
    );
    const ui = () => <AttrsComponent id="stn_test" attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />;
    return { ...render(ui()), attrs, handleAttrsUpdate, ui };
};

const getTexts = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('text')).map(text => text.textContent);

const expectBadgeLayout = (container: HTMLElement, topHeavy: boolean) => {
    const transforms = Array.from(container.querySelectorAll('path[transform]')).map(path =>
        path.getAttribute('transform')
    );
    const fullRowY = ((topHeavy ? -1 : 1) * ICON_FULL_HEIGHT) / 2;
    const shortRowY = -fullRowY;
    expect(transforms).toEqual(
        expect.arrayContaining([
            `translate(${-ICON_FULL_WIDTH / 2},${fullRowY})`,
            `translate(${ICON_FULL_WIDTH / 2},${fullRowY})`,
            `translate(0,${shortRowY})`,
        ])
    );
    expect(transforms).not.toContain(`translate(0,${fullRowY})`);
};

const originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox');
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

describe('GzmtrPaidAreaIntPairStation', () => {
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

    it('renders both stations, the corridor and a clip for each station', () => {
        const { container } = renderStation();

        expect(container.querySelector('#stn_core_stn_test')).toBeInTheDocument();
        expect(container.getElementsByTagName('clipPath')).toHaveLength(2);
        expect(getCorridor(container)).toBeInTheDocument();
        expect(getTexts(container)).toEqual(
            expect.arrayContaining(['淘金', 'Taojin', '建设六马路', 'Jianshe 6th Road'])
        );
    });

    it.each([
        ['center', 'translate(10, -17.5)'],
        ['station1', 'translate(0, 0)'],
        ['station2', 'translate(20, -35)'],
    ] as const)('anchors the node to %s', (anchorPosition, transform) => {
        const { container } = renderStation({ anchorPosition });

        expect(getTranslate(container)).toBe(transform);
    });

    it('falls back to the other axis when the configured direction cannot reach the other station', () => {
        const { container } = renderStation({ dx: 0, dy: 40, direction1: 'vertical', direction2: 'vertical' });

        // The corridor runs straight between the two stations, i.e. all x are 0.
        expect(getCorridorXs(container).every(x => Math.abs(x) < 1e-6)).toBe(true);
    });

    it('keeps the configured direction when the stations are offset on that axis', () => {
        const { container } = renderStation({ dx: -18, dy: 40, direction1: 'vertical', direction2: 'vertical' });

        expect(getCorridorXs(container).some(x => Math.abs(x) > 1)).toBe(true);
    });

    it('supports secondary names and the under construction hint per station', () => {
        const { container } = renderStation({
            secondaryNames1: ['体育西路', 'Tiyu Xilu'],
            secondaryNames2: ['珠江新城', 'Zhujiang New Town'],
            open1: false,
            open2: true,
        });

        const texts = getTexts(container);
        expect(texts).toEqual(expect.arrayContaining(['体育西路', 'Tiyu Xilu', '珠江新城', 'Zhujiang New Town']));
        expect(texts.filter(text => text === '（未开通）')).toHaveLength(1);
        expect(texts.filter(text => text === '(Under Construction)')).toHaveLength(1);
    });

    it('has no per-station anchor badge fields any more', () => {
        const attrs = gzmtrPaidAreaIntPairStation.defaultAttrs;
        expect(attrs).not.toHaveProperty('anchor1');
        expect(attrs).not.toHaveProperty('anchor2');
        expect(attrs).toHaveProperty('anchorPosition', 'station1');
    });

    it('renders a badge for every interchange of each station', () => {
        const { container } = renderStation({ transfer1: within, transfer2: within.slice(0, 2) });

        // Each 2024 icon renders its line number and station number as text.
        const texts = getTexts(container);
        expect(texts).toEqual(expect.arrayContaining(['1', '11', '2', '12', '3', '13']));
    });

    it.each([
        ['top-left', true],
        ['top-right', true],
        ['bottom-left', false],
        ['bottom-right', false],
    ] as const)('uses %s to control station 1 badge layout and anchor', (attachPosition1, topHeavy) => {
        const { container } = renderStation({
            transfer1: within,
            columns1: 2,
            transfer2: within.slice(0, 1),
            attachPosition1,
            anchorPosition: 'station1',
            anchorAt: 0,
        });

        expectBadgeLayout(container, topHeavy);
        const [x, y] = getTranslateNumbers(container);
        expect(x).toBeCloseTo(((topHeavy ? ICON_FULL_WIDTH : 0) / 2) * 0.56);
        expect(y).toBeCloseTo((ICON_FULL_HEIGHT / 2) * 0.56);
    });

    it.each([
        ['top-left', true],
        ['top-right', true],
        ['bottom-left', false],
        ['bottom-right', false],
    ] as const)('uses %s to control station 2 badge layout independently', (attachPosition2, topHeavy) => {
        const { container } = renderStation({
            transfer1: within.slice(0, 1),
            transfer2: within,
            columns2: 2,
            attachPosition2,
        });

        expectBadgeLayout(container, topHeavy);
    });

    it('defaults to corner attach positions and the sub-station centre badge anchor', () => {
        const attrs = gzmtrPaidAreaIntPairStation.defaultAttrs;
        expect(attrs).toMatchObject({
            dx: -20,
            dy: 35,
            attachPosition1: 'bottom-left',
            attachPosition2: 'top-right',
            anchorPosition: 'station1',
            anchorAt: -1,
        });
        expect(attrs.transfer1[0][2]).toBe('#c5003e');
        expect(attrs.transfer2.map(info => info[2])).toEqual(['#59621d', '#8e8c13']);
    });

    it('leaves each station from the left/right side fixed by its attach position', () => {
        const left = renderStation({ attachPosition1: 'top-left' });
        const right = renderStation({ attachPosition1: 'top-right' });

        expect(getCorridorXs(left.container)[0]).toBeLessThan(0);
        expect(getCorridorXs(right.container)[0]).toBeGreaterThan(0);
    });

    it('lines the channel up with the top/bottom row selected by the corner', () => {
        const top = renderStation({ transfer2: within, columns2: 1, attachPosition2: 'top-right' });
        const bottom = renderStation({ transfer2: within, columns2: 1, attachPosition2: 'bottom-right' });

        // Corridor paths use unscaled svg-assets coordinates. Three badges in one column
        // span two full rows, so switching corner moves station 2 by 2 * ICON_FULL_HEIGHT.
        const delta = getCorridorYs(bottom.container).at(-1)! - getCorridorYs(top.container).at(-1)!;
        expect(delta).toBeCloseTo(2 * 19.8);
    });

    it('anchors the node to the selected badge instead of the sub-station centre', () => {
        const { container } = renderStation({
            transfer1: within,
            columns1: 1,
            anchorPosition: 'station1',
            anchorAt: 0,
        });

        // Badge 0 is the top row of a 3-row, 1-column station: one row up from the centre.
        const [x, y] = getTranslateNumbers(container);
        expect(x).toBeCloseTo(0);
        expect(y).toBeCloseTo(19.8 * 0.56);
    });

    it('anchors the node to a badge of station 2', () => {
        const { container } = renderStation({ anchorPosition: 'station2', anchorAt: 1 });

        // Station 2 has two badges stacked in one column; badge 1 is the bottom row.
        const [x, y] = getTranslateNumbers(container);
        expect(x).toBeCloseTo(20);
        expect(y).toBeCloseTo(-35 - (19.8 / 2) * 0.56);
    });

    it('keeps the centre anchor for -1 and clamps out-of-range badge indices', () => {
        const centre = renderStation({ anchorPosition: 'station2', anchorAt: -1 });
        const outOfRange = renderStation({ anchorPosition: 'station2', anchorAt: 99 });

        expect(getTranslate(centre.container)).toBe('translate(20, -35)');
        // An out-of-range index is clamped to the last badge rather than producing NaN.
        expect(getTranslateNumbers(outOfRange.container)[1]).toBeCloseTo(-35 - (19.8 / 2) * 0.56);
    });

    it('offers the four attach positions for both stations', () => {
        const { container, attrs, handleAttrsUpdate, ui } = renderAttrs();

        const selects = getSelectsWithOption(container, 'top-left');
        expect(selects).toHaveLength(2);
        expect(Array.from(selects[0].options).map(option => option.value)).toEqual([
            'top-left',
            'bottom-left',
            'top-right',
            'bottom-right',
        ]);
        expect(selects[0]).toHaveValue('bottom-left');
        expect(selects[1]).toHaveValue('top-right');

        fireEvent.change(selects[0], { target: { value: 'top-right' } });
        expect(attrs.attachPosition1).toBe('top-right');
        expect(handleAttrsUpdate).toHaveBeenCalled();
        void ui;
    });

    it('offers the badge selector only when a station is the anchor', () => {
        const { container, attrs, ui, rerender } = renderAttrs({
            anchorPosition: 'center',
            transfer1: within,
            transfer2: within.slice(0, 2),
        });

        expect(getSelectsWithOption(container, '-1')).toHaveLength(0);

        attrs.anchorPosition = 'station1';
        rerender(ui());
        const station1Select = getSelectsWithOption(container, '-1');
        expect(station1Select).toHaveLength(1);
        expect(Array.from(station1Select[0].options).map(option => option.value)).toEqual(['0', '1', '2', '-1']);

        attrs.anchorPosition = 'station2';
        rerender(ui());
        const station2Select = getSelectsWithOption(container, '-1');
        expect(station2Select).toHaveLength(1);
        expect(Array.from(station2Select[0].options).map(option => option.value)).toEqual(['0', '1', '-1']);
    });

    it('writes the chosen badge index back to the attributes', () => {
        const { container, attrs, handleAttrsUpdate } = renderAttrs({
            anchorPosition: 'station1',
            transfer1: within,
        });

        const select = getSelectsWithOption(container, '-1')[0];
        expect(select).toHaveValue('-1');
        fireEvent.change(select, { target: { value: '2' } });
        expect(attrs.anchorAt).toBe(2);
        expect(handleAttrsUpdate).toHaveBeenLastCalledWith('stn_test', expect.objectContaining({ anchorAt: 2 }));
    });
});
