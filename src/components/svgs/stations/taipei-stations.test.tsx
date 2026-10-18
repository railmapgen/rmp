import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { fireEvent } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../constants/constants';
import { Station, StationType } from '../../../constants/stations';
import i18n from '../../../i18n/config';
import { render } from '../../../test-utils';
import taipeiLightRailStation from './taipei-light-rail';
import taipeiMaokongGondolaStation from './taipei-maokong-gondola';
import taipeiMetroBasicStation from './taipei-metro-basic';
import taipeiMetroIntStation from './taipei-metro-int';

const taipeiStationResources = [
    [StationType.TaipeiMetroBasic, taipeiMetroBasicStation],
    [StationType.TaipeiMetroInt, taipeiMetroIntStation],
    [StationType.TaipeiLightRail, taipeiLightRailStation],
    [StationType.TaipeiMaokongGondola, taipeiMaokongGondolaStation],
] as const;

const getTranslate = (element: Element) =>
    element
        .getAttribute('transform')!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);

const renderStation = (resource: Station<any>, type: StationType, overrides: Record<string, unknown> = {}) => {
    const Component = resource.component;
    const handlePointerDown = vi.fn();
    return {
        ...render(
            <svg>
                <Component
                    id="stn_test"
                    x={0}
                    y={0}
                    attrs={{ [type]: { ...structuredClone(resource.defaultAttrs), ...overrides } }}
                    handlePointerDown={handlePointerDown}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                />
            </svg>
        ),
        handlePointerDown,
    };
};

describe('Taipei station resources', () => {
    beforeEach(() => {
        Object.defineProperty(SVGElement.prototype, 'getBBox', {
            configurable: true,
            value: vi.fn(() => ({ x: 0, y: 0, width: 40, height: 14 }) as DOMRect),
        });
    });

    it('renders hollow and filled metro badges with Taipei Chinese and separate Latin typography', () => {
        const { container, rerender } = renderStation(taipeiMetroBasicStation, StationType.TaipeiMetroBasic);
        const badge = container.querySelector('[data-taipei-metro-badge]')!;
        expect(badge).toHaveAttribute('data-taipei-metro-badge', 'hollow');
        expect(badge.querySelector('rect')).toHaveAttribute('width', '8.75');
        expect(Number(badge.querySelector('rect')!.getAttribute('height'))).toBeCloseTo(11.45);
        expect(badge.querySelector('rect')).toHaveAttribute('stroke-width', '0.75');
        expect(badge.querySelector('rect')).toHaveAttribute('fill', 'white');
        const texts = Array.from(container.querySelectorAll('text'));
        expect(texts.find(text => text.textContent === '淡水')).toHaveAttribute(
            'font-family',
            "'Taipei Sans TC Beta', Arial, sans-serif"
        );
        const englishName = texts.find(text => text.textContent === 'Tamsui');
        expect(englishName).toHaveAttribute('font-family', 'Arial, sans-serif');
        expect(englishName).toHaveAttribute('font-size', '5.05');
        expect(englishName).toHaveAttribute('dy', '1.4');
        const Component = taipeiMetroBasicStation.component;
        rerender(
            <svg>
                <Component
                    id="stn_test"
                    x={0}
                    y={0}
                    attrs={{
                        [StationType.TaipeiMetroBasic]: { ...taipeiMetroBasicStation.defaultAttrs, filled: true },
                    }}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                />
            </svg>
        );
        expect(container.querySelector('[data-taipei-metro-badge]')).toHaveAttribute(
            'data-taipei-metro-badge',
            'filled'
        );
        expect(container.querySelector('[data-taipei-metro-badge] rect')).toHaveAttribute('fill', '#E3002C');
        expect(container.querySelector('[data-taipei-metro-badge] g')).toHaveAttribute('fill', MonoColour.white);
    });

    it.each(['horizontal', 'vertical'])('keeps individual interchange badge fill in %s layout', align => {
        const { container } = renderStation(taipeiMetroIntStation, StationType.TaipeiMetroInt, {
            align,
            transfer: [
                [
                    [CityCode.Taipei, 'bl', '#0070BD', MonoColour.white, 'BL', '12', 'filled'],
                    [CityCode.Taipei, 'r', '#E3002C', MonoColour.white, 'R', '10'],
                ],
            ],
        });
        const badges = container.querySelectorAll('[data-taipei-metro-badge]');
        expect(badges).toHaveLength(2);
        expect(badges[0]).toHaveAttribute('data-taipei-metro-badge', 'filled');
        expect(badges[1]).toHaveAttribute('data-taipei-metro-badge', 'hollow');
        expect(badges[0].parentElement).toHaveAttribute(
            'transform',
            align === 'horizontal' ? 'translate(-5.25, 0)' : 'translate(0, -6.6)'
        );
    });

    it('keeps multiline secondary names and divider inside the precisely positioned draggable name group', () => {
        const { container } = renderStation(taipeiMetroBasicStation, StationType.TaipeiMetroBasic, {
            names: ['唭哩岸', 'Qilian'],
            secondaryNames: ['陽明交通大學', 'National Yang Ming\nChiao Tung University'],
            preciseNameOffsets: { x: 30, y: -20, anchor: 'end' },
        });
        const name = container.querySelector('#stn_name_stn_test')!;
        expect(name).toHaveAttribute('transform', 'translate(30, -20)');
        const secondary = name.querySelector('[data-taipei-secondary-name]')!;
        expect(secondary).toHaveAttribute('text-anchor', 'end');
        expect(secondary.querySelector('line')).toHaveAttribute('x1', '-42');
        expect(secondary.textContent).toContain('National Yang Ming');
        expect(secondary.querySelectorAll('text')).toHaveLength(3);
    });

    it.each(taipeiStationResources)('updates the second-name line-break option for %s', (type, resource) => {
        const AttrsComponent = resource.attrsComponent as Station<any>['attrsComponent'];
        const attrs = structuredClone(resource.defaultAttrs);
        const handleAttrsUpdate = vi.fn();
        const ui = () => <AttrsComponent id="stn_test" attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />;
        const { getByLabelText, rerender } = render(ui());
        const label = i18n.t('panel.details.stations.taipeiCommon.secondaryNameOnNewLine');
        expect(attrs.secondaryNameOnNewLine).toBe(false);
        const toggle = getByLabelText(label, { selector: 'input' });
        expect(toggle).not.toBeChecked();
        fireEvent.click(toggle);
        expect(attrs.secondaryNameOnNewLine).toBe(true);
        expect(handleAttrsUpdate).toHaveBeenLastCalledWith('stn_test', attrs);
        rerender(ui());
        expect(getByLabelText(label, { selector: 'input' })).toBeChecked();
        fireEvent.click(getByLabelText(label, { selector: 'input' }));
        expect(attrs.secondaryNameOnNewLine).toBe(false);
        expect(handleAttrsUpdate).toHaveBeenCalledTimes(2);
    });

    it.each(taipeiStationResources)(
        'fits one Chinese and one English second-name row within the main Chinese height for %s',
        (type, resource) => {
            const { container } = renderStation(resource, type, {
                names: ['石牌', 'Shipai'],
                secondaryNames: ['榮總', 'Veterans General Hospital'],
            });
            const name = container.querySelector('#stn_name_stn_test')!;
            const mainChinese = Array.from(name.querySelectorAll('text')).find(text => text.textContent === '石牌')!;
            const secondary = name.querySelector('[data-taipei-secondary-name]')!;
            const [chinese, english] = Array.from(secondary.querySelectorAll('text'));
            const divider = secondary.querySelector('line')!;
            const secondaryHeight = Number(divider.getAttribute('y2')) - Number(divider.getAttribute('y1'));
            expect(secondaryHeight).toBe(Number(mainChinese.getAttribute('font-size')));
            expect(chinese).toHaveAttribute('font-size', '4.7');
            expect(english).toHaveAttribute('font-size', '2.67');
            expect(Number(english.getAttribute('dy'))).toBeGreaterThan(Number(chinese.getAttribute('dy')));
            const [, textTop] = getTranslate(secondary.querySelector('g')!);
            expect(textTop).toBeGreaterThan(Number(divider.getAttribute('y1')));
            expect(textTop).toBeLessThan(Number(divider.getAttribute('y2')));
        }
    );

    it.each(taipeiStationResources)(
        'moves second names below all main English rows when enabled for %s',
        (type, resource) => {
            const attrs = {
                names: ['石牌', 'Shipai\nStation'],
                secondaryNames: ['榮總', 'Veterans General Hospital'],
                preciseNameOffsets: { x: 30, y: -20, anchor: 'start' },
            };
            const { container: inline } = renderStation(resource, type, attrs);
            const { container: stacked } = renderStation(resource, type, { ...attrs, secondaryNameOnNewLine: true });
            const inlineSecondary = inline.querySelector('[data-taipei-secondary-name]')!;
            const stackedSecondary = stacked.querySelector('[data-taipei-secondary-name]')!;
            const stackedName = stackedSecondary.parentElement!;
            expect(Number(inlineSecondary.querySelector('line')!.getAttribute('x1'))).toBeGreaterThan(0);
            const stackedDivider = stackedSecondary.querySelector('line')!;
            expect(stackedDivider).toHaveAttribute('x1', '0');
            const mainEnglishBottom = Math.max(
                ...Array.from(stackedName.firstElementChild!.querySelectorAll('text'))
                    .filter(text => ['Shipai', 'Station'].includes(text.textContent ?? ''))
                    .map(text => Number(text.getAttribute('dy')) + Number(text.getAttribute('font-size')))
            );
            expect(Number(stackedDivider.getAttribute('y1'))).toBeCloseTo(mainEnglishBottom + 1.5);
            const [textX, textTop] = getTranslate(stackedSecondary.querySelector('g')!);
            expect(textX).toBe(2);
            expect(textTop).toBeGreaterThan(Number(stackedDivider.getAttribute('y1')));
            expect(textTop).toBeLessThan(Number(stackedDivider.getAttribute('y2')));
            expect(stackedName).toHaveAttribute('transform', 'translate(30, -20)');
        }
    );

    it.each(['start', 'middle', 'end'] as const)(
        'preserves the %s anchor when placing a second name below the main name',
        anchor => {
            const { container } = renderStation(taipeiMetroBasicStation, StationType.TaipeiMetroBasic, {
                secondaryNames: ['榮總', 'Veterans General Hospital'],
                secondaryNameOnNewLine: true,
                preciseNameOffsets: { x: 30, y: -20, anchor },
            });
            const secondary = container.querySelector('[data-taipei-secondary-name]')!;
            expect(secondary).toHaveAttribute('text-anchor', anchor);
            const [textX] = getTranslate(secondary.querySelector('g')!);
            const dividerX = Number(secondary.querySelector('line')!.getAttribute('x1'));
            expect(textX).toBe(anchor === 'start' ? 2 : anchor === 'end' ? -2 : 0);
            expect(anchor === 'middle' ? dividerX < textX : dividerX === 0).toBe(true);
        }
    );

    it.each([false, true])(
        'extends the divider for English line breaks with secondaryNameOnNewLine=%s',
        secondaryNameOnNewLine => {
            const renderSecondary = (english: string) =>
                renderStation(taipeiMetroBasicStation, StationType.TaipeiMetroBasic, {
                    secondaryNames: ['陽明交通大學', english],
                    secondaryNameOnNewLine,
                }).container.querySelector('[data-taipei-secondary-name]')!;
            const single = renderSecondary('National Yang Ming Chiao Tung University');
            const multiline = renderSecondary('National Yang Ming\nChiao Tung\nUniversity');
            const singleDivider = single.querySelector('line')!;
            const multilineDivider = multiline.querySelector('line')!;
            expect(multilineDivider.getAttribute('y1')).toBe(singleDivider.getAttribute('y1'));
            expect(Number(multilineDivider.getAttribute('y2')) - Number(singleDivider.getAttribute('y2'))).toBeCloseTo(
                2 * 3.4
            );
            const englishRows = Array.from(multiline.querySelectorAll('text')).slice(1);
            expect(englishRows.map(text => text.textContent)).toEqual([
                'National Yang Ming',
                'Chiao Tung',
                'University',
            ]);
            expect(Number(englishRows[2].getAttribute('dy')) - Number(englishRows[0].getAttribute('dy'))).toBeCloseTo(
                2 * 3.4
            );
            expect(getTranslate(multiline.querySelector('g')!)).toEqual(getTranslate(single.querySelector('g')!));
        }
    );

    it('omits the divider when no secondary name is set and supports an empty interchange list', () => {
        const { container } = renderStation(taipeiMetroIntStation, StationType.TaipeiMetroInt, { transfer: [[]] });
        expect(container.querySelector('[data-taipei-secondary-name]')).toBeNull();
        expect(container.querySelector('#stn_core_stn_test')).not.toBeNull();
        expect(container.querySelector('[data-taipei-metro-badge]')).toBeNull();
    });

    it('positions secondary names after the main name in effect-free video/static rendering', () => {
        const Component = taipeiMetroBasicStation.component;
        const markup = renderToStaticMarkup(
            <svg>
                <Component
                    id="stn_static"
                    x={0}
                    y={0}
                    attrs={{
                        [StationType.TaipeiMetroBasic]: {
                            ...taipeiMetroBasicStation.defaultAttrs,
                            names: ['石牌', 'Shipai'],
                            secondaryNames: ['榮總', 'Veterans General Hospital'],
                        },
                    }}
                    handlePointerDown={vi.fn()}
                    handlePointerMove={vi.fn()}
                    handlePointerUp={vi.fn()}
                />
            </svg>
        );
        const svg = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const divider = svg.querySelector('[data-taipei-secondary-name] line')!;
        expect(Number(divider.getAttribute('x1'))).toBeGreaterThan(16);
    });

    it.each(taipeiStationResources)(
        'exports both second-name layouts without waiting for DOM measurements for %s',
        (type, resource) => {
            const Component = resource.component;
            const renderSavedStation = (secondaryNameOnNewLine?: boolean, chinese = '石牌') => {
                const markup = renderToStaticMarkup(
                    <svg>
                        <Component
                            id="stn_static"
                            x={0}
                            y={0}
                            attrs={{
                                [type]: {
                                    ...resource.defaultAttrs,
                                    names: [chinese, 'Shipai'],
                                    secondaryNames: ['榮總', 'Veterans General\nHospital'],
                                    secondaryNameOnNewLine,
                                },
                            }}
                            handlePointerDown={vi.fn()}
                            handlePointerMove={vi.fn()}
                            handlePointerUp={vi.fn()}
                        />
                    </svg>
                );
                return new DOMParser().parseFromString(markup, 'image/svg+xml');
            };
            const legacy = renderSavedStation().querySelector('[data-taipei-secondary-name] line')!;
            const inline = renderSavedStation(false).querySelector('[data-taipei-secondary-name] line')!;
            const longInline = renderSavedStation(false, '榮民總醫院前站').querySelector(
                '[data-taipei-secondary-name] line'
            )!;
            expect(legacy.getAttribute('x1')).toBe(inline.getAttribute('x1'));
            expect(Number(inline.getAttribute('x1'))).toBeGreaterThan(16);
            expect(Number(longInline.getAttribute('x1'))).toBeGreaterThan(Number(inline.getAttribute('x1')));
            const stacked = renderSavedStation(true).querySelector('[data-taipei-secondary-name]')!;
            const stackedDivider = stacked.querySelector('line')!;
            expect(stackedDivider.getAttribute('x1')).toBe('0');
            expect(Number(stackedDivider.getAttribute('y1'))).toBeGreaterThan(Number(inline.getAttribute('y2')));
            expect(Number(stackedDivider.getAttribute('y2')) - Number(stackedDivider.getAttribute('y1'))).toBeCloseTo(
                Number(inline.getAttribute('y2')) - Number(inline.getAttribute('y1'))
            );
            expect(stacked.textContent).toContain('Veterans GeneralHospital');
            expect(SVGGElement.prototype.getBBox).not.toHaveBeenCalled();
        }
    );

    it.each([
        ['inline', 'V', '11', ['V11']],
        ['stacked', 'LB', '12', ['LB', '12']],
    ] as const)('renders %s light rail codes', (codeLayout, lineCode, stationCode, expected) => {
        const { container } = renderStation(taipeiLightRailStation, StationType.TaipeiLightRail, {
            codeLayout,
            lineCode,
            stationCode,
        });
        const badge = container.querySelector('[data-taipei-light-rail-badge]')!;
        const outline = badge.querySelector('[data-taipei-light-rail-outline]')!;
        expect(outline).toHaveAttribute('stroke-width', '1.15');
        expect(Number(outline.getAttribute('r')) * 2 + Number(outline.getAttribute('stroke-width'))).toBeCloseTo(9.5);
        expect(Array.from(badge.querySelectorAll('text')).map(text => text.textContent)).toEqual(expected);
    });

    it.each([
        { opacity: undefined, textOpacity: undefined, stroke: 0.45, text: 0.55 },
        { opacity: 'preset', textOpacity: 'opaque', stroke: 0.45, text: 1 },
        { opacity: 'opaque', textOpacity: 'preset', stroke: 1, text: 0.55 },
        { opacity: 1, textOpacity: 1, stroke: 1, text: 1 },
        { opacity: 0.8, textOpacity: 0.2, stroke: 0.45, text: 0.55 },
    ] as const)(
        'applies light rail opacity %s without fading the white mask or interaction target',
        ({ opacity, textOpacity, stroke, text }) => {
            const { container } = renderStation(taipeiLightRailStation, StationType.TaipeiLightRail, {
                opacity,
                textOpacity,
            });
            const badge = container.querySelector('[data-taipei-light-rail-badge]')!;
            const background = badge.querySelector('[data-taipei-light-rail-background]')!;
            expect(background).toHaveAttribute('fill', 'white');
            expect(background).not.toHaveAttribute('opacity');
            expect(badge).not.toHaveAttribute('opacity');
            expect(badge.querySelector('[data-taipei-light-rail-outline]')).toHaveAttribute(
                'opacity',
                stroke.toString()
            );
            const code = badge.querySelector('g')!;
            expect(code).toHaveAttribute('fill', 'black');
            expect(code).toHaveAttribute('font-weight', 'bold');
            expect(code).toHaveAttribute('opacity', text.toString());
            expect(container.querySelector('#stn_name_stn_test')!.parentElement).toHaveAttribute(
                'opacity',
                text.toString()
            );
            expect(container.querySelector('#stn_core_stn_test')).not.toHaveAttribute('opacity');
        }
    );

    it.each(
        (
            [
                [undefined, 'preset'],
                ['preset', 'preset'],
                ['opaque', 'opaque'],
                [1, 'opaque'],
                [0.4, 'preset'],
            ] as const
        ).flatMap(([setting, expectedMode]) =>
            (['opacity', 'textOpacity'] as const).map(key => ({ key, setting, expectedMode }))
        )
    )('offers only preset/opaque for $key with saved value $setting', ({ key, setting, expectedMode }) => {
        const AttrsComponent = taipeiLightRailStation.attrsComponent;
        const attrs = structuredClone(taipeiLightRailStation.defaultAttrs);
        attrs[key] = setting;
        const handleAttrsUpdate = vi.fn();
        const { container } = render(
            <AttrsComponent id="stn_test" attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />
        );
        const opacitySelects = Array.from(container.querySelectorAll('select')).filter(select =>
            Array.from(select.options).some(option => option.value === 'preset')
        );
        expect(opacitySelects).toHaveLength(2);
        const select = opacitySelects[key === 'opacity' ? 0 : 1];
        expect(Array.from(select.options).map(option => option.value)).toEqual(['preset', 'opaque']);
        expect(select).toHaveValue(expectedMode);
        expect(container.querySelector('input[type="number"]')).toBeNull();
        const nextMode = expectedMode === 'opaque' ? 'preset' : 'opaque';
        fireEvent.change(select, { target: { value: nextMode } });
        expect(attrs[key]).toBe(nextMode);
        expect(handleAttrsUpdate).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['left', 'top', -7.25, -14.6, 'end'],
        ['middle', 'top', 0, -14.6, 'middle'],
        ['right', 'top', 7.25, -14.6, 'start'],
        ['left', 'middle', -7.25, 0.5, 'end'],
        ['right', 'middle', 7.25, 0.5, 'start'],
        ['left', 'bottom', -7.25, 16.6, 'end'],
        ['middle', 'bottom', 0, 16.6, 'middle'],
        ['right', 'bottom', 7.25, 16.6, 'start'],
    ] as const)(
        'positions the %s/%s station-name preset outside the badge',
        (nameOffsetX, nameOffsetY, x, y, anchor) => {
            const { container } = renderStation(taipeiMetroBasicStation, StationType.TaipeiMetroBasic, {
                nameOffsetX,
                nameOffsetY,
            });
            const group = container.querySelector('#stn_name_stn_test')!;
            expect(group).toHaveAttribute('transform', `translate(${x}, ${y})`);
            expect(group).toHaveAttribute('text-anchor', anchor);
        }
    );

    it.each([
        ['left', 'top', -7.25, -16, 'end'],
        ['middle', 'top', 0, -16, 'middle'],
        ['right', 'top', 7.25, -16, 'start'],
        ['left', 'middle', -13.75, 0.5, 'end'],
        ['right', 'middle', 13.75, 0.5, 'start'],
        ['left', 'bottom', -7.25, 18, 'end'],
        ['middle', 'bottom', 0, 18, 'middle'],
        ['right', 'bottom', 7.25, 18, 'start'],
    ] as const)('insets only the interchange corner name presets (%s/%s)', (nameOffsetX, nameOffsetY, x, y, anchor) => {
        const { container } = renderStation(taipeiMetroIntStation, StationType.TaipeiMetroInt, {
            names: ['中山', 'Zhongshan'],
            nameOffsetX,
            nameOffsetY,
        });
        expect(container.querySelector('#stn_name_stn_test')).toHaveAttribute('transform', `translate(${x}, ${y})`);
        expect(container.querySelector('#stn_name_stn_test')).toHaveAttribute('text-anchor', anchor);
    });

    it.each([
        ['top', -20.6],
        ['bottom', 24.6],
    ] as const)('accounts for both language row counts in %s names', (nameOffsetY, y) => {
        const { container } = renderStation(taipeiMetroBasicStation, StationType.TaipeiMetroBasic, {
            names: ['第一行\n第二行', 'First line\nSecond line'],
            nameOffsetX: 'middle',
            nameOffsetY,
        });
        expect(container.querySelector('#stn_name_stn_test')).toHaveAttribute('transform', `translate(0, ${y})`);
    });

    const getNameSelects = (container: HTMLElement) => {
        const selects = Array.from(container.querySelectorAll('select'));
        return {
            x: selects.find(select => Array.from(select.options).some(option => option.value === 'left'))!,
            y: selects.find(select => Array.from(select.options).some(option => option.value === 'top'))!,
        };
    };

    it('uses Beijing-style X/Y selectors and excludes the middle-middle combination', () => {
        const AttrsComponent = taipeiMetroBasicStation.attrsComponent;
        const attrs = structuredClone(taipeiMetroBasicStation.defaultAttrs);
        const handleAttrsUpdate = vi.fn();
        const ui = () => <AttrsComponent id="stn_test" attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />;
        const { container, rerender } = render(ui());
        let selects = getNameSelects(container);
        expect(selects.x).toHaveValue('right');
        expect(selects.x.querySelector('option[value="middle"]')).toBeDisabled();
        fireEvent.change(selects.y, { target: { value: 'top' } });
        rerender(ui());
        selects = getNameSelects(container);
        expect(selects.x.querySelector('option[value="middle"]')).not.toBeDisabled();
        fireEvent.change(selects.x, { target: { value: 'middle' } });
        rerender(ui());
        expect(getNameSelects(container).y.querySelector('option[value="middle"]')).toBeDisabled();
        expect(attrs.nameOffsetX).toBe('middle');
        expect(attrs.nameOffsetY).toBe('top');
    });

    it.each(['x', 'y'] as const)('shows custom offsets and resets them when changing the %s preset', axis => {
        const AttrsComponent = taipeiMetroBasicStation.attrsComponent;
        const attrs = {
            ...structuredClone(taipeiMetroBasicStation.defaultAttrs),
            preciseNameOffsets: { x: 30, y: -20, anchor: 'end' as const },
        };
        const handleAttrsUpdate = vi.fn();
        const { container } = render(
            <AttrsComponent id="stn_test" attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />
        );
        const selects = getNameSelects(container);
        expect(selects.x).toHaveValue('__custom__');
        expect(selects.y).toHaveValue('__custom__');
        expect(selects[axis].querySelector('option[value="__custom__"]')).toBeDisabled();
        fireEvent.change(selects[axis], { target: { value: axis === 'x' ? 'left' : 'bottom' } });
        expect(attrs.preciseNameOffsets).toBeUndefined();
        expect(attrs.nameOffsetX).toBe(axis === 'x' ? 'left' : 'right');
        expect(attrs.nameOffsetY).toBe(axis === 'y' ? 'bottom' : 'middle');
        expect(handleAttrsUpdate).toHaveBeenCalledTimes(1);
    });

    it.each(taipeiStationResources)('provides a connectable export-safe hit target for %s', (type, resource) => {
        const { container, handlePointerDown } = renderStation(resource, type);
        const core = container.querySelector('#stn_core_stn_test')!;
        expect(core).toHaveClass('removeMe');
        fireEvent.pointerDown(core);
        expect(handlePointerDown).toHaveBeenCalledWith('stn_test', expect.anything());
    });

    it('masks connecting lines through both gondola station windows with opaque white fills', () => {
        const { container } = renderStation(taipeiMaokongGondolaStation, StationType.TaipeiMaokongGondola);
        const windows = container.querySelectorAll('[data-taipei-gondola-window]');
        expect(windows).toHaveLength(2);
        windows.forEach(window => {
            expect(window).toHaveAttribute('fill', 'white');
            expect(window).not.toHaveAttribute('opacity');
            expect(window.parentElement).not.toHaveAttribute('opacity');
        });
    });
});
