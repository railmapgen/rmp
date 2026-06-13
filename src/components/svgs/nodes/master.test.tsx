import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CityCode, MiscNodeId, Theme } from '../../../constants/constants';
import { defaultMasterTransform } from '../../../constants/master';
import { NodeComponentProps } from '../../../constants/nodes';
import type { MasterAttributes } from './master';

vi.mock('@chakra-ui/react', () => ({
    Button: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
    Flex: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    IconButton: () => <button />,
    Spacer: () => <span />,
}));

vi.mock('@railmapgen/rmg-components', () => ({
    RmgFields: () => null,
    RmgLabel: ({ children }: React.PropsWithChildren) => <label>{children}</label>,
    RmgLineBadge: () => <span />,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../page-header/master-import', () => ({
    MasterImport: () => null,
}));

vi.mock('../../page-header/master-manager', () => ({
    MasterManager: () => null,
}));

vi.mock('../../panels/theme-button', () => ({
    default: () => null,
}));

vi.mock('../../../util/hooks', () => ({
    usePaletteTheme: () => ({ theme: undefined, requestThemeChange: () => undefined }),
}));

const theme: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
const secondTheme: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black];
const updatedTheme: Theme = [CityCode.Beijing, 'bj1', '#C23A30', MonoColour.white];
let MasterNodeComponent: React.FC<NodeComponentProps<MasterAttributes>>;

const baseProps = {
    id: 'misc_node_master' as MiscNodeId,
    x: 0,
    y: 0,
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
};

describe('MasterNode rendering', () => {
    beforeAll(async () => {
        const masterNode = await import('./master');
        MasterNodeComponent = masterNode.default.component;
    });

    it('renders legacy v2/v3 masters through attrs and top-level color', () => {
        const attrs: MasterAttributes = {
            randomId: 'legacy',
            version: 3,
            transform: defaultMasterTransform,
            nodeType: 'MiscNode',
            components: [{ id: 'width', label: 'width', type: 'number', defaultValue: 6, value: 6 }],
            color: { id: 'color', label: 'color', type: 'color', defaultValue: theme },
            svgs: [
                {
                    id: 'rect',
                    type: 'rect',
                    attrs: {
                        x: '=width',
                        y: '=width + 1',
                        width: '=10',
                        height: '=5',
                        fill: '=color[2]',
                    },
                },
            ],
        };

        const { container } = render(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={attrs} />
            </svg>
        );

        const rect = container.querySelector('rect');
        expect(container.querySelector('g[transform="translate(6, 7)"]')).not.toBeNull();
        expect(rect?.getAttribute('x')).toBe('0');
        expect(rect?.getAttribute('y')).toBe('0');
        expect(rect?.getAttribute('fill')).toBe(theme[2]);
    });

    it('renders v4 masters from attrBindings without attrs or top-level color', () => {
        const attrs: MasterAttributes = {
            randomId: 'v4',
            version: 4,
            transform: defaultMasterTransform,
            nodeType: 'MiscNode',
            components: [
                { id: 'primary', label: 'param_color', name: 'Line color', type: 'color', defaultValue: theme },
            ],
            svgs: [
                {
                    id: 'rect',
                    type: 'rect',
                    attrBindings: {
                        x: { kind: 'literal', value: 3 },
                        y: { kind: 'literal', value: 4 },
                        width: { kind: 'literal', value: 10 },
                        height: { kind: 'literal', value: 5 },
                        fill: { kind: 'variable', componentId: 'primary', path: 'hex' },
                        stroke: { kind: 'literal', value: '#111111' },
                        'stroke-width': { kind: 'literal', value: 2 },
                        strokeWidth: { kind: 'literal', value: 0 },
                        'fill-rule': { kind: 'literal', value: 'evenodd' },
                        class: { kind: 'literal', value: 'master-shape' },
                    },
                },
            ],
        };

        const { container } = render(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={attrs} />
            </svg>
        );

        const rect = container.querySelector('rect');
        expect(container.querySelector('g[transform="translate(3, 4)"]')).not.toBeNull();
        expect(rect?.getAttribute('x')).toBe('0');
        expect(rect?.getAttribute('y')).toBe('0');
        expect(rect?.getAttribute('fill')).toBe(theme[2]);
        expect(rect?.getAttribute('stroke')).toBe('#111111');
        expect(rect?.getAttribute('stroke-width')).toBe('2');
        expect(rect?.getAttribute('fill-rule')).toBe('evenodd');
        expect(rect?.getAttribute('class')).toBe('master-shape');
    });

    it('normalizes SVG style strings for React rendering', () => {
        const attrs: MasterAttributes = {
            randomId: 'v4-style',
            version: 4,
            transform: defaultMasterTransform,
            nodeType: 'MiscNode',
            components: [],
            svgs: [
                {
                    id: 'path',
                    type: 'path',
                    attrBindings: {
                        d: { kind: 'literal', value: 'M0 0L10 0' },
                        style: { kind: 'literal', value: 'fill: none; stroke: #123456; stroke-width: 3' },
                    },
                },
            ],
        };

        const { container } = render(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={attrs} />
            </svg>
        );

        const path = container.querySelector('path');
        expect(path?.style.fill).toBe('none');
        expect(path?.style.stroke).toBe('#123456');
        expect(path?.style.strokeWidth).toBe('3');
    });

    it('uses the whole wrapper as the station core for v4 station masters without core', () => {
        const handlePointerDown = vi.fn();
        const attrs: MasterAttributes = {
            randomId: 'v4-station',
            version: 4,
            transform: defaultMasterTransform,
            nodeType: 'Station',
            components: [],
            svgs: [
                {
                    id: 'rect',
                    type: 'rect',
                    attrBindings: {
                        x: { kind: 'literal', value: 0 },
                        y: { kind: 'literal', value: 0 },
                        width: { kind: 'literal', value: 10 },
                        height: { kind: 'literal', value: 5 },
                    },
                },
            ],
        };

        const { container } = render(
            <svg>
                <MasterNodeComponent {...baseProps} handlePointerDown={handlePointerDown} attrs={attrs} />
            </svg>
        );

        const core = container.querySelector('[id="stn_core_misc_node_master"]');
        expect(container.querySelectorAll('[id="stn_core_misc_node_master"]')).toHaveLength(1);
        expect(core?.tagName.toLowerCase()).toBe('g');

        fireEvent.pointerDown(core!);
        expect(handlePointerDown).toHaveBeenCalledWith(baseProps.id, expect.anything());
    });

    it('ignores stale core fields for v4 station masters', () => {
        const attrs: MasterAttributes = {
            randomId: 'v4-station',
            version: 4,
            transform: defaultMasterTransform,
            nodeType: 'Station',
            components: [],
            core: 'rect',
            svgs: [
                {
                    id: 'rect',
                    type: 'rect',
                    attrBindings: {
                        x: { kind: 'literal', value: 0 },
                        y: { kind: 'literal', value: 0 },
                        width: { kind: 'literal', value: 10 },
                        height: { kind: 'literal', value: 5 },
                    },
                },
            ],
        };

        const { container } = render(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={attrs} />
            </svg>
        );

        const coreElements = container.querySelectorAll('[id="stn_core_misc_node_master"]');
        expect(coreElements).toHaveLength(1);
        expect(coreElements[0].tagName.toLowerCase()).toBe('g');
    });

    it('keeps legacy station master core on the configured child element', () => {
        const attrs: MasterAttributes = {
            randomId: 'legacy-station',
            version: 3,
            transform: defaultMasterTransform,
            nodeType: 'Station',
            components: [{ id: 'width', label: 'width', type: 'number', defaultValue: 10, value: 10 }],
            core: 'rect',
            svgs: [
                {
                    id: 'rect',
                    type: 'rect',
                    attrs: {
                        x: '=0',
                        y: '=0',
                        width: '=width',
                        height: '=5',
                    },
                },
            ],
        };

        const { container } = render(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={attrs} />
            </svg>
        );

        const coreElements = container.querySelectorAll('[id="stn_core_misc_node_master"]');
        expect(coreElements).toHaveLength(1);
        expect(coreElements[0].tagName.toLowerCase()).toBe('rect');
    });

    it('renders and updates multiple v4 color variables independently', () => {
        const makeAttrs = (primary: Theme, secondary: Theme): MasterAttributes => ({
            randomId: 'v4',
            version: 4,
            transform: defaultMasterTransform,
            nodeType: 'MiscNode',
            components: [
                { id: 'primary', label: 'param_primary', type: 'color', defaultValue: theme, value: primary },
                {
                    id: 'secondary',
                    label: 'param_secondary',
                    type: 'color',
                    defaultValue: secondTheme,
                    value: secondary,
                },
            ],
            svgs: [
                {
                    id: 'rect',
                    type: 'rect',
                    attrBindings: {
                        x: { kind: 'literal', value: 0 },
                        y: { kind: 'literal', value: 0 },
                        width: { kind: 'literal', value: 10 },
                        height: { kind: 'literal', value: 5 },
                        fill: { kind: 'formula', expression: '{param_primary}' },
                        stroke: { kind: 'formula', expression: '{param_secondary.hex}' },
                        color: { kind: 'formula', expression: '{param_secondary.text}' },
                    },
                },
            ],
        });

        const { container, rerender } = render(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={makeAttrs(theme, secondTheme)} />
            </svg>
        );

        let rect = container.querySelector('rect');
        expect(rect?.getAttribute('fill')).toBe(theme[2]);
        expect(rect?.getAttribute('stroke')).toBe(secondTheme[2]);
        expect(rect?.getAttribute('color')).toBe(secondTheme[3]);

        rerender(
            <svg>
                <MasterNodeComponent {...baseProps} attrs={makeAttrs(updatedTheme, secondTheme)} />
            </svg>
        );

        rect = container.querySelector('rect');
        expect(rect?.getAttribute('fill')).toBe(updatedTheme[2]);
        expect(rect?.getAttribute('stroke')).toBe(secondTheme[2]);
        expect(rect?.getAttribute('color')).toBe(secondTheme[3]);
    });
});
