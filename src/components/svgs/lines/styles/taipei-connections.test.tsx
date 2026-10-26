import { act, fireEvent } from '@testing-library/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
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
import { createStore } from '../../../../redux';
import { onPaletteAppClipEmit } from '../../../../redux/runtime/runtime-slice';
import { render } from '../../../../test-utils';
import { ColorFieldContext } from '../../../panels/details/color-field';
import taipeiMaokongGondolaTransfer from './taipei-maokong-gondola-transfer';
import taipeiMetroOutOfStation from './taipei-metro-out-of-station';
import taipeiTaiwanRailway from './taipei-taiwan-railway';

const props = {
    id: 'line_test' as const,
    type: LinePathType.Simple,
    path: makeLinearPath(makePoint(0, 0), makePoint(100, 0)),
    newLine: false,
    handlePointerDown: () => undefined,
};

const geometries = [
    props.path,
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
];

describe('Taipei Taiwan Railway', () => {
    const Component = taipeiTaiwanRailway.component;
    const baseProps = { ...props, styleAttrs: taipeiTaiwanRailway.defaultAttrs };

    it('leaves transparent central slots in the calibrated translucent railway', () => {
        const { container, rerender } = render(
            <svg>
                <Component {...baseProps} />
            </svg>
        );
        const paths = container.querySelectorAll('svg > g > path');
        const clip = container.querySelector('defs > [id]')!;
        const clipPath = clip.querySelector('path')!;
        expect(container.querySelector('svg > g')).toHaveAttribute('opacity', '0.25');
        expect(paths[0]).toHaveAttribute('stroke-width', '3.3');
        expect(paths[0]).toHaveAttribute('stroke', '#767475');
        expect(paths[0]).toHaveAttribute('clip-path', `url(#${clip.id})`);
        expect(paths[1]).toHaveAttribute('stroke-width', '1.7');
        expect(paths[1]).toHaveAttribute('stroke-dasharray', '6 6');
        expect(paths[1]).toHaveAttribute('stroke-dashoffset', '6');
        expect(clipPath).toHaveAttribute('clip-rule', 'evenodd');
        expect(clipPath).toHaveAttribute('fill', 'black');
        const outlines = clipPath.getAttribute('d')!.split('Z').filter(Boolean);
        expect(outlines).toHaveLength(2);
        outlines.forEach((outline, index) => {
            const coordinates = outline.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!.map(Number);
            const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);
            expect(new Set(yCoordinates)).toEqual(new Set(index === 0 ? [-1.65, 1.65] : [-0.85, 0.85]));
        });
        expect(container.querySelector('svg')!.outerHTML).not.toMatch(/stroke="white"|fill="white"|<mask/);
        rerender(
            <svg>
                <Component {...baseProps} styleAttrs={{ ...taipeiTaiwanRailway.defaultAttrs, opacity: 'opaque' }} />
            </svg>
        );
        expect(container.querySelector('svg > g')).toHaveAttribute('opacity', '1');
    });

    it('applies a selected color to both rails and crossbars while retaining opacity and transparent slots', () => {
        const { container } = render(
            <svg>
                <Component
                    {...baseProps}
                    styleAttrs={{ color: [CityCode.Taipei, 'railway', '#BE8841', MonoColour.white], opacity: 'preset' }}
                />
            </svg>
        );
        expect(container.querySelector('svg > g')).toHaveAttribute('opacity', '0.25');
        for (const paintedPath of container.querySelectorAll('svg > g > path')) {
            expect(paintedPath).toHaveAttribute('stroke', '#BE8841');
            expect(paintedPath).toHaveAttribute('fill', 'none');
        }
        expect(container.querySelector('defs path')).toHaveAttribute('clip-rule', 'evenodd');
        expect(container.querySelectorAll('svg > g > path')[1]).toHaveAttribute('stroke-dasharray', '6 6');
    });

    it.each(geometries)('keeps straight and curved railway outlines finite (%#)', path => {
        const { container } = render(
            <svg>
                <Component {...baseProps} path={path} />
            </svg>
        );
        const clipD = container.querySelector('defs path')!.getAttribute('d');
        expect(clipD).not.toBe('');
        expect(clipD).not.toMatch(/NaN|Infinity/);
    });

    it('keeps the canvas and tool preview clipping resources independent', () => {
        const { container } = render(
            <>
                <svg>
                    <Component {...baseProps} />
                </svg>
                <svg>
                    <Component {...baseProps} newLine />
                </svg>
            </>
        );
        const clips = [...container.querySelectorAll('defs > [id]')];
        expect(new Set(clips.map(clip => clip.id)).size).toBe(2);
        expect(container.querySelectorAll('svg > g')[1]).toHaveAttribute('pointer-events', 'none');
    });

    it('offers only preset and opaque appearance modes and preserves the selected color', () => {
        const AttrsComponent = taipeiTaiwanRailway.attrsComponent;
        const handleAttrsUpdate = vi.fn();
        const { getByRole, queryByRole } = render(
            <AttrsComponent
                id="line_test"
                attrs={taipeiTaiwanRailway.defaultAttrs}
                reconcileId=""
                handleAttrsUpdate={handleAttrsUpdate}
            />
        );
        const select = getByRole('combobox');
        expect(select).toHaveValue('preset');
        expect(Array.from(select.querySelectorAll('option')).map(option => option.value)).toEqual(['preset', 'opaque']);
        expect(queryByRole('spinbutton')).toBeNull();
        fireEvent.change(select, { target: { value: 'opaque' } });
        expect(handleAttrsUpdate).toHaveBeenLastCalledWith('line_test', {
            ...taipeiTaiwanRailway.defaultAttrs,
            opacity: 'opaque',
        });
        fireEvent.change(select, { target: { value: 'preset' } });
        expect(handleAttrsUpdate).toHaveBeenLastCalledWith('line_test', {
            ...taipeiTaiwanRailway.defaultAttrs,
            opacity: 'preset',
        });
    });

    it('changes the palette color through the details field while preserving opacity', () => {
        const AttrsComponent = taipeiTaiwanRailway.attrsComponent;
        const attrs = { ...taipeiTaiwanRailway.defaultAttrs, opacity: 'opaque' as const };
        const handleAttrsUpdate = vi.fn();
        const store = createStore();
        const { container } = render(
            <ColorFieldContext.Provider value={{ type: LineStyleType.TaipeiTaiwanRailway, attrs, handleAttrsUpdate }}>
                <AttrsComponent id="line_test" attrs={attrs} reconcileId="" handleAttrsUpdate={vi.fn()} />
            </ColorFieldContext.Provider>,
            { store }
        );
        const color = [CityCode.Taipei, 'railway', '#BE8841', MonoColour.white] as const;
        fireEvent.click(container.querySelector('button')!);
        act(() => {
            store.dispatch(onPaletteAppClipEmit([...color]));
        });
        expect(handleAttrsUpdate).toHaveBeenLastCalledWith({ color: [...color], opacity: 'opaque' });
    });

    it.each([
        [1, '1'],
        [0.6, '0.25'],
        [0, '0.25'],
    ] as const)('maps legacy numeric opacity %s to the corresponding appearance mode', (opacity, expected) => {
        const { container } = render(
            <svg>
                <Component {...baseProps} styleAttrs={{ ...taipeiTaiwanRailway.defaultAttrs, opacity }} />
            </svg>
        );
        expect(container.querySelector('svg > g')).toHaveAttribute('opacity', expected);
    });
});

describe('Taipei Maokong Gondola walking connection', () => {
    const Component = taipeiMaokongGondolaTransfer.component;
    const baseProps = { ...props, styleAttrs: taipeiMaokongGondolaTransfer.defaultAttrs };

    it('renders a gray dashed shaft with outward arrows at both ends and no distance text', () => {
        const { container } = render(
            <svg>
                <Component {...baseProps} />
            </svg>
        );
        const path = container.querySelector('svg > g > path')!;
        const marker = container.querySelector('defs > [id]')!;
        expect(path).toHaveAttribute('stroke-width', '1.5');
        expect(path).toHaveAttribute('stroke-dasharray', '1.35 0.6');
        expect(path).toHaveAttribute('stroke', '#767475');
        expect(path).toHaveAttribute('marker-start', `url(#${marker.id})`);
        expect(path).toHaveAttribute('marker-end', `url(#${marker.id})`);
        expect(marker).toHaveAttribute('orient', 'auto-start-reverse');
        expect(marker).toHaveAttribute('markerUnits', 'userSpaceOnUse');
        expect(marker).toHaveAttribute('markerWidth', '3.7');
        expect(marker).toHaveAttribute('markerHeight', '5.7');
        expect(container.querySelector('text')).toBeNull();
    });

    it.each(geometries)('uses the exact authored path so markers follow its endpoint tangents (%#)', path => {
        const { container } = render(
            <svg>
                <Component {...baseProps} path={path} />
            </svg>
        );
        expect(container.querySelector('svg > g > path')).toHaveAttribute('d', path.d);
    });

    it('isolates markers when the same edge is displayed in a preview', () => {
        const { container } = render(
            <>
                <svg>
                    <Component {...baseProps} />
                </svg>
                <svg>
                    <Component {...baseProps} newLine />
                </svg>
            </>
        );
        const markers = [...container.querySelectorAll('defs > [id]')];
        expect(new Set(markers.map(marker => marker.id)).size).toBe(2);
        for (const svg of container.querySelectorAll('svg')) {
            const markerId = svg.querySelector('defs > [id]')!.id;
            expect(svg.querySelector('g > path')).toHaveAttribute('marker-start', `url(#${markerId})`);
            expect(svg.querySelector('g > path')).toHaveAttribute('marker-end', `url(#${markerId})`);
        }
    });
});

describe('Taipei additional connection style compatibility', () => {
    for (const style of [taipeiTaiwanRailway, taipeiMaokongGondolaTransfer]) {
        it.each([makeEmptyOpenPath(), makeLinearPath(makePoint(0, 0), makePoint(0, 0))])(
            `does not draw empty or coincident geometry for ${style.metadata.displayName} (%#)`,
            path => {
                const Component = style.component;
                const { container } = render(
                    <svg>
                        <Component
                            {...props}
                            styleAttrs={{ ...taipeiTaiwanRailway.defaultAttrs, ...style.defaultAttrs }}
                            path={path}
                        />
                    </svg>
                );
                if (style === taipeiTaiwanRailway) {
                    expect(container.querySelector('defs path')).toHaveAttribute('d', '');
                } else {
                    expect(container.querySelector('svg > g > path')).toHaveAttribute('d', '');
                }
            }
        );
        it(`supports all seven open paths and reconcile for ${style.metadata.displayName}`, () => {
            expect(style.metadata.supportLinePathType).toEqual(expect.arrayContaining(Object.values(LinePathType)));
            expect(style.metadata.supportsReconcile).toBe(true);
        });
    }
});

describe('Taipei video frame SVG resources', () => {
    it.each([taipeiMetroOutOfStation, taipeiTaiwanRailway, taipeiMaokongGondolaTransfer])(
        'isolates edge definitions across independent static render batches (%#)',
        style => {
            const Component = style.component;
            const markup = (['line_first', 'line_second'] as const).map((id, index) =>
                renderToStaticMarkup(
                    <svg>
                        <Component
                            {...props}
                            id={id}
                            path={geometries[index]}
                            styleAttrs={{ ...taipeiTaiwanRailway.defaultAttrs, ...style.defaultAttrs }}
                        />
                    </svg>
                )
            );
            const svg = new DOMParser().parseFromString(
                `<svg xmlns="http://www.w3.org/2000/svg">${markup.join('')}</svg>`,
                'image/svg+xml'
            ).documentElement;
            const definitions = Array.from(svg.querySelectorAll('defs > [id]'));
            expect(new Set(definitions.map(definition => definition.id)).size).toBe(2);
            Array.from(svg.children).forEach((group, index) => {
                const path = group.querySelector('path')!;
                const definition = group.querySelector('defs > [id]')!;
                expect(path.getAttribute('d')).toBe(geometries[index].d);
                if (style === taipeiMaokongGondolaTransfer) {
                    expect(path.getAttribute('marker-start')).toBe(`url(#${definition.id})`);
                    expect(path.getAttribute('marker-end')).toBe(`url(#${definition.id})`);
                } else {
                    expect(path.getAttribute('clip-path')).toBe(`url(#${definition.id})`);
                }
            });
        }
    );
});
