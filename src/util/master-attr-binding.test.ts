import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { describe, expect, it } from 'vitest';
import { CityCode, Theme } from '../constants/constants';
import { MasterComponent, MasterSvgsElem } from '../constants/master';
import { evaluateMasterSvgAttrs } from './master-attr-binding';

const lineColor: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];

const components: MasterComponent[] = [
    { id: 'component_name', label: 'param_name', type: 'text', defaultValue: '1' },
    { id: 'component_width', label: 'param_width', type: 'number', defaultValue: 8 },
    { id: 'component_enabled', label: 'param_enabled', type: 'switch', defaultValue: true },
    { id: 'component_color', label: 'param_color', name: 'Line color', type: 'color', defaultValue: lineColor },
];

describe('evaluateMasterSvgAttrs', () => {
    it('evaluates literal, variable, formula and conditional bindings', () => {
        const svg: MasterSvgsElem = {
            id: 'shape',
            type: 'rect',
            attrBindings: {
                height: { kind: 'literal', value: 12 },
                width: { kind: 'variable', componentId: 'component_width' },
                title: { kind: 'formula', expression: 'Line-{param_name}' },
                x: { kind: 'formula', expression: 'Math.max({param_width}, min(6, 10)) + round(1.2)' },
                display: {
                    kind: 'conditional',
                    if: { kind: 'formula', expression: '{param_enabled}' },
                    then: { kind: 'literal', value: 'inline' },
                    else: { kind: 'literal', value: 'none' },
                },
            },
        };

        const result = evaluateMasterSvgAttrs(svg, components);

        expect(result.error).toBeUndefined();
        expect(result.attrs).toEqual({
            height: 12,
            width: 8,
            title: 'Line-1',
            x: 9,
            display: 'inline',
        });
    });

    it('resolves color hex and text color from theme components', () => {
        const svg: MasterSvgsElem = {
            id: 'shape',
            type: 'rect',
            attrBindings: {
                fill: { kind: 'variable', componentId: 'component_color', path: 'hex' },
                stroke: { kind: 'formula', expression: '{param_color}' },
                color: { kind: 'formula', expression: '{param_color.text}' },
            },
        };

        const result = evaluateMasterSvgAttrs(svg, components);

        expect(result.error).toBeUndefined();
        expect(result.attrs.fill).toBe(lineColor[2]);
        expect(result.attrs.stroke).toBe(lineColor[2]);
        expect(result.attrs.color).toBe(lineColor[3]);
    });

    it('prefers component id over component label when resolving variables', () => {
        const svg: MasterSvgsElem = {
            id: 'shape',
            type: 'rect',
            attrBindings: {
                width: { kind: 'variable', componentId: 'param_shared' },
            },
        };
        const duplicateComponents: MasterComponent[] = [
            { id: 'param_shared', label: 'param_first', type: 'number', defaultValue: 1 },
            { id: 'component_second', label: 'param_shared', type: 'number', defaultValue: 2 },
        ];

        const result = evaluateMasterSvgAttrs(svg, duplicateComponents);

        expect(result.error).toBeUndefined();
        expect(result.attrs.width).toBe(1);
    });

    it('returns an error for invalid color themes', () => {
        const svg: MasterSvgsElem = {
            id: 'shape',
            type: 'rect',
            attrBindings: {
                fill: { kind: 'variable', componentId: 'param_color', path: 'hex' },
            },
        };
        const invalidComponents: MasterComponent[] = [
            {
                id: 'component_color',
                label: 'param_color',
                name: 'Line color',
                type: 'color',
                defaultValue: ['shanghai', 'sh1', 'red', 'blue'],
            },
        ];

        const result = evaluateMasterSvgAttrs(svg, invalidComponents);

        expect(result.error).toContain('Invalid theme');
    });

    it('does not execute legacy bindings in v4 evaluator', () => {
        const svg: MasterSvgsElem = {
            id: 'shape',
            type: 'rect',
            attrBindings: {
                x: { kind: 'legacy', expression: '(() => 1)()' },
            },
        };

        const result = evaluateMasterSvgAttrs(svg, components);

        expect(result.error).toContain('Legacy attr binding is not supported');
    });
});
