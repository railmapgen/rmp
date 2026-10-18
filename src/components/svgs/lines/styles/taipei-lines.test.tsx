import { fireEvent, render } from '@testing-library/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { render as renderWithProviders } from '../../../../test-utils';
import {
    cubicTo,
    lineTo,
    makeComplexOpenPath,
    makeCubicPath,
    makeEmptyOpenPath,
    makeLinearPath,
    makePoint,
    makeRoundedTurnPath,
    makeSharpTurnPath,
    moveTo,
} from '../../../../constants/path';
import taipeiLightRail from './taipei-light-rail';
import taipeiMaokongGondola from './taipei-maokong-gondola';
import taipeiMetroOutOfStation from './taipei-metro-out-of-station';

const path = makeLinearPath(makePoint(0, 0), makePoint(100, 0));
const props = {
    id: 'line_test' as const,
    type: LinePathType.Simple,
    path,
    newLine: false,
    handlePointerDown: () => undefined,
};

describe('Taipei thin transport lines', () => {
    it.each([
        [taipeiLightRail, '2.8', '#E5554F'],
        [taipeiMaokongGondola, '3.1', '#00A7D3'],
    ] as const)('renders its calibrated width and accepts theme color (%#)', (style, width, color) => {
        const Component = style.component;
        const { container, rerender } = render(
            <svg>
                <Component {...props} styleAttrs={style.defaultAttrs} />
            </svg>
        );
        const paintedPath = container.querySelector('path')!;
        expect(paintedPath.getAttribute('stroke-width')).toBe(width);
        expect(paintedPath.getAttribute('stroke')).toBe(color);

        rerender(
            <svg>
                <Component {...props} styleAttrs={{ color: [CityCode.Taipei, 'k', '#A49359', MonoColour.white] }} />
            </svg>
        );
        expect(paintedPath.getAttribute('stroke')).toBe('#A49359');
        expect(paintedPath.getAttribute('d')).toBe(path.d);
    });

    it('keeps the light rail translucent for default and custom themes while allowing full opacity', () => {
        const Component = taipeiLightRail.component;
        const { container, rerender } = render(
            <svg>
                <Component {...props} styleAttrs={taipeiLightRail.defaultAttrs} />
            </svg>
        );
        const paintedPath = container.querySelector('path')!;
        expect(paintedPath.getAttribute('stroke-opacity')).toBe('0.45');

        rerender(
            <svg>
                <Component {...props} styleAttrs={{ color: [CityCode.Taipei, 'k', '#A49359', MonoColour.white] }} />
            </svg>
        );
        expect(paintedPath.getAttribute('stroke')).toBe('#A49359');
        expect(paintedPath.getAttribute('stroke-opacity')).toBe('0.45');

        rerender(
            <svg>
                <Component {...props} styleAttrs={{ ...taipeiLightRail.defaultAttrs, opacity: 'opaque' }} />
            </svg>
        );
        expect(paintedPath.getAttribute('stroke-opacity')).toBe('1');
    });

    it.each([
        [1, '1'],
        [0.6, '0.45'],
        [0, '0.45'],
    ] as const)('maps legacy numeric light rail opacity %s to an appearance mode', (opacity, expected) => {
        const Component = taipeiLightRail.component;
        const { container } = render(
            <svg>
                <Component {...props} styleAttrs={{ ...taipeiLightRail.defaultAttrs, opacity }} />
            </svg>
        );
        expect(container.querySelector('path')!.getAttribute('stroke-opacity')).toBe(expected);
    });

    it('exposes the two light rail appearance modes with preset selected by default', () => {
        const AttrsComponent = taipeiLightRail.attrsComponent;
        const handleAttrsUpdate = vi.fn();
        const { getByRole, queryByRole } = renderWithProviders(
            <AttrsComponent
                id="line_test"
                attrs={taipeiLightRail.defaultAttrs}
                reconcileId=""
                handleAttrsUpdate={handleAttrsUpdate}
            />
        );
        const select = getByRole('combobox');
        expect(select).toHaveValue('preset');
        expect(Array.from(select.querySelectorAll('option')).map(option => option.value)).toEqual(['preset', 'opaque']);
        expect(queryByRole('slider')).toBeNull();
        fireEvent.change(select, { target: { value: 'opaque' } });
        expect(handleAttrsUpdate).toHaveBeenLastCalledWith('line_test', {
            ...taipeiLightRail.defaultAttrs,
            opacity: 'opaque',
        });
    });
});

describe('Taipei out-of-station transfer line', () => {
    const Component = taipeiMetroOutOfStation.component;
    const baseProps = { ...props, styleAttrs: taipeiMetroOutOfStation.defaultAttrs };

    it('cuts a transparent 1.1-unit gap out of the 4.75-unit double dashed line', () => {
        const { container } = render(
            <svg>
                <Component {...baseProps} />
            </svg>
        );
        const paintedPath = container.querySelector('svg > g > path')!;
        const clip = container.querySelector('defs > [id]')!;
        const clipPath = clip.querySelector('path')!;

        expect(paintedPath.getAttribute('stroke')).toBe('#767475');
        expect(paintedPath.getAttribute('stroke-width')).toBe('4.75');
        expect(paintedPath.getAttribute('stroke-dasharray')).toBe('2 0.9');
        expect(paintedPath.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
        expect(clipPath.getAttribute('clip-rule')).toBe('evenodd');
        const outlines = clipPath.getAttribute('d')!.split('Z').filter(Boolean);
        expect(outlines).toHaveLength(2);
        outlines.forEach((outline, index) => {
            const coordinates = outline.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!.map(Number);
            const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);
            expect(new Set(yCoordinates)).toEqual(new Set(index === 0 ? [-2.375, 2.375] : [-0.55, 0.55]));
        });
        expect(container.querySelector('svg')!.outerHTML).not.toMatch(/var\(|stroke="white"|<mask/);
    });

    it.each([
        makeSharpTurnPath(makePoint(0, 0), makePoint(50, 0), makePoint(50, 50)),
        makeRoundedTurnPath(
            makePoint(0, 0),
            makePoint(40, 0),
            makePoint(45, 0),
            makePoint(50, 5),
            makePoint(50, 10),
            makePoint(50, 50)
        ),
        makeCubicPath(makePoint(-80, 0), makePoint(-40, -90), makePoint(40, 90), makePoint(80, 0)),
        makeCubicPath(makePoint(-80, 0), makePoint(-80, 0), makePoint(80, 0), makePoint(80, 0)),
        makeComplexOpenPath([
            moveTo(makePoint(0, 0)),
            lineTo(makePoint(30, 0)),
            cubicTo(makePoint(50, -30), makePoint(80, 30), makePoint(100, 0)),
            lineTo(makePoint(130, 0)),
        ]),
    ])('keeps supported corners and curves finite (%#)', curve => {
        const { container } = render(
            <svg>
                <Component {...baseProps} path={curve} />
            </svg>
        );
        const clipD = container.querySelector('defs path')!.getAttribute('d');
        expect(clipD).not.toBe('');
        expect(clipD).not.toMatch(/NaN|Infinity/);
        expect(container.querySelector('svg > g > path')!.getAttribute('d')).toBe(curve.d);
    });

    it.each([makeEmptyOpenPath(), makeLinearPath(makePoint(0, 0), makePoint(0, 0))])(
        'keeps empty or zero-length geometry empty (%#)',
        empty => {
            const { container } = render(
                <svg>
                    <Component {...baseProps} path={empty} />
                </svg>
            );
            expect(container.querySelector('defs path')!.getAttribute('d')).toBe('');
        }
    );

    it('isolates the same edge in a tool preview and forwards pointer input only on committed lines', () => {
        const handlePointerDown = vi.fn();
        const { container } = render(
            <>
                <svg>
                    <Component {...baseProps} handlePointerDown={handlePointerDown} />
                </svg>
                <svg>
                    <Component {...baseProps} handlePointerDown={handlePointerDown} newLine />
                </svg>
            </>
        );
        const ids = [...container.querySelectorAll('defs > [id]')].map(clip => clip.id);
        expect(new Set(ids).size).toBe(2);
        for (const svg of container.querySelectorAll('svg')) {
            expect(svg.querySelector('g > path')!.getAttribute('clip-path')).toBe(
                `url(#${svg.querySelector('defs > [id]')!.id})`
            );
        }
        const groups = container.querySelectorAll('svg > g');
        fireEvent.pointerDown(groups[0]);
        fireEvent.pointerDown(groups[1]);
        expect(handlePointerDown).toHaveBeenCalledOnce();
        expect(handlePointerDown).toHaveBeenCalledWith('line_test', expect.anything());
        expect(groups[1].getAttribute('pointer-events')).toBe('none');
    });

    it('supports every open path type and reconciled lines', () => {
        for (const style of [taipeiLightRail, taipeiMaokongGondola, taipeiMetroOutOfStation]) {
            expect(style.metadata.supportLinePathType).toEqual(expect.arrayContaining(Object.values(LinePathType)));
            expect(style.metadata.supportsReconcile).toBe(true);
        }
    });
});
