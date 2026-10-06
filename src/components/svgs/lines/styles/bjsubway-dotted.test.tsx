import { DarkMode, LightMode } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinePathType } from '../../../../constants/lines';
import { makeCubicPath, makeEmptyOpenPath, makeLinearPath, makePoint } from '../../../../constants/path';
import * as primitives from '../../../../util/open-path-primitives';
import bjsubwayDotted from './bjsubway-dotted';

const Component = bjsubwayDotted.component;
const makePath = () => makeCubicPath(makePoint(-80, 0), makePoint(-40, -90), makePoint(40, 90), makePoint(80, 0));
const props = {
    id: 'line_test' as const,
    type: LinePathType.Bezier,
    path: makePath(),
    styleAttrs: bjsubwayDotted.defaultAttrs,
    newLine: false,
    handlePointerDown: () => undefined,
};

afterEach(() => vi.restoreAllMocks());

describe('Beijing dotted transparent rendering', () => {
    it.each([LightMode, DarkMode])('keeps inflected curves and dashes independent of the color mode (%#)', Mode => {
        const { container } = render(
            <Mode>
                <svg>
                    <Component {...props} />
                </svg>
            </Mode>
        );
        const paintedPath = container.querySelector('svg > g > path')!;
        const clip = container.querySelector('defs > [id]')!;

        expect(paintedPath.getAttribute('d')).toBe(props.path.d);
        expect(paintedPath.getAttribute('stroke-dasharray')).toBe('2 2');
        expect(paintedPath.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
        expect(clip.querySelector('path')!.getAttribute('d')).not.toMatch(/NaN|Infinity/);
        expect(container.querySelector('svg')!.outerHTML).not.toMatch(/var\(|stroke="white"|<mask/);
    });

    it('handles empty and zero-length paths without invalid geometry', () => {
        for (const path of [makeEmptyOpenPath(), makeLinearPath(makePoint(0, 0), makePoint(0, 0))]) {
            const { container, unmount } = render(
                <svg>
                    <Component {...props} path={path} />
                </svg>
            );

            expect(container.querySelector('defs path')!.getAttribute('d')).toBe('');
            unmount();
        }
    });

    it('keeps collapsed Bezier endpoint handles finite', () => {
        for (const path of [
            makeCubicPath(makePoint(-80, 0), makePoint(-80, 0), makePoint(80, 0), makePoint(80, 0)),
            makeCubicPath(makePoint(-80, 0), makePoint(-80, 0), makePoint(80, -80), makePoint(80, 0)),
        ]) {
            const { container, unmount } = render(
                <svg>
                    <Component {...props} path={path} />
                </svg>
            );
            const outline = container.querySelector('defs path')!.getAttribute('d');

            expect(outline).not.toBe('');
            expect(outline).not.toMatch(/NaN|Infinity/);
            unmount();
        }
    });

    it('isolates resources when the same edge also appears in a preview', () => {
        const { container } = render(
            <>
                <svg>
                    <Component {...props} />
                </svg>
                <svg>
                    <Component {...props} />
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
    });

    it('reuses outlines across graph refreshes until the geometry changes', () => {
        const generate = vi.spyOn(primitives, 'getOpenPathPrimitives');
        const { rerender } = render(
            <svg>
                <Component {...props} />
            </svg>
        );

        rerender(
            <svg>
                <Component {...props} path={makePath()} styleAttrs={structuredClone(props.styleAttrs)} />
            </svg>
        );
        expect(generate).toHaveBeenCalledOnce();

        rerender(
            <svg>
                <Component {...props} path={makeLinearPath(makePoint(0, 0), makePoint(100, 0))} />
            </svg>
        );
        expect(generate).toHaveBeenCalledTimes(2);
    });
});
