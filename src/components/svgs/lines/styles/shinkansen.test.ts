import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { makeLinearPath, makePoint, makeRoundedTurnPath } from '../../../../constants/path';
import { concatOpenPaths } from '../../../../util/path';
import shinkansen, { makeShinkansenArrowsPath } from './shinkansen';

describe('makeShinkansenArrowsPath', () => {
    it('returns multiple closed arrows on a long linear path', () => {
        const path = makeLinearPath(makePoint(0, 0), makePoint(100, 0));
        const result = makeShinkansenArrowsPath(path, {
            arrowWidth: 2,
            tipLength: 4,
            bodyLength: 10,
            tailInsetLength: 4,
            gapLength: 5,
            startInset: 6,
            endInset: 6,
        });

        expect(result?.kind).toBe('compound-closed-area');
        if (!result || result.kind !== 'compound-closed-area') {
            throw new Error('Expected a compound closed area path.');
        }
        expect(result?.d).not.toContain('NaN');
        expect((result?.d.match(/\bM\b/g) ?? []).length).toBeGreaterThan(1);
        expect((result?.d.match(/\bZ\b/g) ?? []).length).toBeGreaterThan(1);
        expect(result.subpaths.length).toBeGreaterThan(1);
    });

    it('keeps cubic commands when an arrow crosses from a line into a curve', () => {
        const path = concatOpenPaths([
            makeLinearPath(makePoint(0, 0), makePoint(15, 0)),
            makeRoundedTurnPath(
                makePoint(15, 0),
                makePoint(20, 0),
                makePoint(25, 0),
                makePoint(25, 5),
                makePoint(25, 10),
                makePoint(32, 10)
            ),
        ]);

        const result = makeShinkansenArrowsPath(path, {
            arrowWidth: 2,
            tipLength: 4,
            bodyLength: 17,
            tailInsetLength: 4,
            gapLength: 20,
            startInset: 4,
            endInset: 4,
        });

        expect(result?.kind).toBe('compound-closed-area');
        if (!result || result.kind !== 'compound-closed-area') {
            throw new Error('Expected a compound closed area path.');
        }
        expect(result?.d).toContain('C');
        expect(result?.d).not.toContain('NaN');
        expect((result?.d.match(/\bZ\b/g) ?? []).length).toBe(1);
    });

    it('returns an empty path when the usable range is too short', () => {
        const path = makeLinearPath(makePoint(0, 0), makePoint(20, 0));
        const result = makeShinkansenArrowsPath(path, {
            arrowWidth: 2,
            tipLength: 4,
            bodyLength: 8,
            tailInsetLength: 4,
            gapLength: 5,
            startInset: 8,
            endInset: 8,
        });

        expect(result.kind).toBe('empty-open');
        expect(result.d).toBe('');
    });

    it('starts each arrow from an inset notch rather than a pointed tail', () => {
        const path = makeLinearPath(makePoint(0, 0), makePoint(100, 0));
        const result = makeShinkansenArrowsPath(path, {
            arrowWidth: 2,
            tipLength: 4,
            bodyLength: 10,
            tailInsetLength: 4,
            gapLength: 30,
            startInset: 6,
            endInset: 6,
        });

        expect(result?.d.startsWith('M 10 0')).toBe(true);
    });

    it('renders the decoration marker when decoration is enabled', () => {
        const path = makeLinearPath(makePoint(0, 0), makePoint(100, 0));
        const props = {
            id: 'line_edge_1' as const,
            type: LinePathType.Simple,
            path,
            styleAttrs: {
                ...shinkansen.defaultAttrs,
                decoration: 'black-block' as const,
                decorationAt: 'to' as const,
            },
            newLine: false,
            handlePointerDown: () => undefined,
        };
        const PreComponent = shinkansen.preComponent;
        const Component = shinkansen.component;

        const children = [
            PreComponent ? React.createElement(PreComponent, { ...props, key: 'pre' }) : null,
            React.createElement(Component, { ...props, key: 'main' }),
        ];
        const { container } = render(React.createElement('svg', undefined, children));

        const decorationPath = container.querySelector(
            `#${LineStyleType.Shinkansen}_decorationMarker_line_edge_1`
        ) as SVGUseElement | null;
        const mainPath = container.querySelector(`#${LineStyleType.Shinkansen}_main_line_edge_1`);
        const marker = container.querySelector('marker');

        expect(mainPath).not.toBeNull();
        expect(marker).not.toBeNull();
        expect(decorationPath).not.toBeNull();
        expect(decorationPath?.getAttribute('href')).toBe(`#${LineStyleType.Shinkansen}_main_line_edge_1`);
        expect(decorationPath?.getAttribute('marker-end')).toContain(
            'url(#jr_east_pattern_black-block_to_line_edge_1)'
        );
    });
});
