import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, Id, NodeType, Theme } from '../../constants/constants';
import { StationType } from '../../constants/stations';
import accountSlice from '../../redux/account/account-slice';
import appSlice from '../../redux/app/app-slice';
import paramSlice, { ProjectSnapshot } from '../../redux/param/param-slice';
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
    const createTestStore = (selectedNodes: Id[] = [], paramOverride: Partial<ProjectSnapshot> = {}) => {
        const paramState = paramSlice(undefined, { type: 'init' });
        return configureStore({
            reducer: {
                app: appSlice,
                param: paramSlice,
                runtime: runtimeSlice,
                account: accountSlice,
            },
            preloadedState: {
                param: {
                    ...paramState,
                    present: {
                        ...paramState.present,
                        ...paramOverride,
                    },
                },
                runtime: {
                    selected: new Set(selectedNodes),
                    pointerPosition: undefined,
                    active: undefined,
                    isDetailsOpen: 'close' as const,
                    refresh: { nodes: 0, edges: 0, images: 0 },
                    mode: 'free' as const,
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
                    isMapOverview: false,
                    globalAlerts: {},
                },
            },
        });
    };

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
        expect(rootGroup?.getAttribute('class')).toBe('removeMe');
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

    it.each([25, 100, 150, 250])('keeps compact buttons and the bottom anchor at zoom %s', zoom => {
        const min = { x: 100, y: 200 };
        const store = createTestStore(['stn_test1'], {
            svgViewBoxZoom: zoom,
            svgViewBoxMin: min,
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
        const transform = rootGroup
            ?.getAttribute('transform')
            ?.match(/-?\d+(?:\.\d+)?/g)
            ?.map(Number);
        expect(transform).toHaveLength(3);
        const [x, y, scale] = transform!;
        const screenScale = (scale * 100) / zoom;
        expect(screenScale).toBeCloseTo(1.1);
        expect(((x - min.x) * 100) / zoom).toBeCloseTo(400);
        expect(((y - min.y) * 100) / zoom).toBeCloseTo(500);

        const circles = rootGroup!.querySelectorAll('circle');
        for (const circle of Array.from(circles).slice(0, 4)) {
            expect(Number(circle.getAttribute('r')) * 2 * screenScale).toBeCloseTo(44);
        }
        for (const circle of Array.from(circles).slice(4)) {
            expect(Number(circle.getAttribute('r')) * 2 * screenScale).toBeCloseTo(35.2);
        }
    });
});
