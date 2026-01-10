import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, Id, NodeType, Theme } from '../../constants/constants';
import { LineStyleType } from '../../constants/lines';
import { StationType } from '../../constants/stations';
import accountSlice from '../../redux/account/account-slice';
import appSlice from '../../redux/app/app-slice';
import paramSlice from '../../redux/param/param-slice';
import runtimeSlice from '../../redux/runtime/runtime-slice';
import VirtualJoystick from './virtual-joystick';
import { defaultRadialTouchMenuState } from './radial-touch-menu';

// Mock the helper functions
vi.mock('../../util/helpers', () => ({
    getCanvasSize: vi.fn().mockReturnValue({ height: 600, width: 800 }),
}));

// Mock window.graph
const mockGraph = {
    hasNode: vi.fn().mockReturnValue(true),
    hasEdge: vi.fn().mockReturnValue(false),
    dropNode: vi.fn(),
    dropEdge: vi.fn(),
    updateNodeAttribute: vi.fn(),
    export: vi.fn().mockReturnValue({}),
};

Object.defineProperty(window, 'graph', {
    value: mockGraph,
    writable: true,
});

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
    },
});

describe('VirtualJoystick', () => {
    const createTestStore = (selectedNodes: Id[] = [], paramOverride?: any) =>
        configureStore({
            reducer: {
                app: appSlice,
                param: paramSlice,
                runtime: runtimeSlice,
                account: accountSlice,
            },
            preloadedState: {
                param: {
                    // minimal fields used by component
                    svgViewBoxZoom: 100,
                    svgViewBoxMin: { x: 0, y: 0 },
                    ...paramOverride,
                },
                runtime: {
                    selected: new Set(selectedNodes),
                    pointerPosition: undefined,
                    active: undefined,
                    isDetailsOpen: 'close' as const,
                    refresh: { nodes: 0, edges: 0, images: 0 },
                    mode: 'free' as const,
                    lineStyle: LineStyleType.SingleColor,
                    lastTool: undefined,
                    keepLastPath: false,
                    theme: [CityCode.Shanghai, 'sh1', '#000000', MonoColour.white] as Theme,
                    paletteAppClip: { input: undefined, output: undefined },
                    count: {
                        stations: 0,
                        miscNodes: 0,
                        lines: 0,
                        masters: 0,
                        parallel: 0,
                        mostFrequentStationType: StationType.ShmetroBasic,
                    },
                    stationNames: {},
                    existsNodeTypes: new Set<NodeType>(),
                    radialTouchMenu: defaultRadialTouchMenuState,
                    globalAlerts: {},
                },
            },
        });

    it('renders joystick even when no nodes are selected', () => {
        const store = createTestStore();
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <VirtualJoystick />
                </svg>
            </Provider>
        );
        const rootGroup = container.querySelector('svg > g');
        expect(rootGroup).toBeTruthy();
        const childGroups = rootGroup?.querySelectorAll(':scope > g');
        expect(childGroups?.length).toBe(6); // 4 directional + 2 action
    });

    it('renders joystick when nodes are selected', () => {
        const store = createTestStore(['stn_test1', 'stn_test2']);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <VirtualJoystick />
                </svg>
            </Provider>
        );
        const rootGroup = container.querySelector('svg > g');
        expect(rootGroup).toBeTruthy();
        const circles = rootGroup?.querySelectorAll('circle');
        expect(circles && circles.length).toBeGreaterThan(0);
    });

    it('applies transform based on param slice viewport values', () => {
        const store = createTestStore(['stn_test1'], {
            svgViewBoxZoom: 150,
            svgViewBoxMin: { x: 100, y: 200 },
        });
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <VirtualJoystick />
                </svg>
            </Provider>
        );
        const rootGroup = container.querySelector('svg > g');
        expect(rootGroup).toBeTruthy();
        const transform = rootGroup?.getAttribute('transform');
        expect(transform).toBeTruthy();
        expect(transform).toContain('translate');
        expect(transform).toContain('scale');
    });
});
