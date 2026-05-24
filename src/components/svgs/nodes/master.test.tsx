import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { render } from '@testing-library/react';
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
