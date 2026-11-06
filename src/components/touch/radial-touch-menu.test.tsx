import { act, fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import store from '../../redux/store';
import { closeRadialTouchMenu, setRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import { MenuCategory, type MenuLayerData } from '../../constants/touch';
import RadialTouchMenu, { getRadialTouchMenuLayout } from './radial-touch-menu';

const baseData = {
    [MenuCategory.STATION]: [
        {
            label: 'Test Station',
            action: vi.fn(),
            elementId: 'stn_1',
        },
    ],
    [MenuCategory.MISC_NODE]: [],
    [MenuCategory.LINE]: [],
    [MenuCategory.OPERATION]: [],
};

const setMenu = (visible: boolean, overrideData: MenuLayerData = baseData) => {
    store.dispatch(
        setRadialTouchMenu({
            visible,
            position: { x: 200, y: 200 },
            data: overrideData,
        })
    );
};

afterEach(() => {
    act(() => {
        store.dispatch(closeRadialTouchMenu());
    });
    vi.clearAllMocks();
});

describe('RadialTouchMenu', () => {
    it('renders when visible is true', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        expect(container.querySelector('g')).toBeTruthy();
        expect(container.querySelector('[data-touch-menu]')?.getAttribute('transform')).toBe(
            'translate(200, 200)scale(1.2)'
        );
        expect(container.querySelector('[data-touch-menu] > circle')?.getAttribute('r')).toBe('45');
    });

    it('does not render when visible is false', () => {
        setMenu(false);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        expect(container.querySelector('g')).toBeFalsy();
    });

    it('renders SVG menu with nested groups', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        const nestedGroups = container.querySelectorAll('g');
        expect(nestedGroups.length).toBeGreaterThan(1);
    });

    it('displays category item label', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        const stationText = Array.from(container.querySelectorAll('text')).find(t => t.textContent === 'Test Station');
        expect(stationText).toBeTruthy();
    });

    it('marks and highlights the item under the held pointer', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu highlightedItem="station:0" />
                </svg>
            </Provider>
        );

        expect(container.querySelector('[data-touch-menu]')).toBeTruthy();
        const item = container.querySelector('[data-touch-menu-item="station:0"]');
        expect(item?.hasAttribute('data-active')).toBe(true);
        expect(item?.querySelector('path')?.getAttribute('stroke-width')).toBe('2');
    });

    it('leaves touch selection to the release gesture controller', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        const event = new Event('pointerdown', { bubbles: true });
        Object.defineProperty(event, 'pointerType', { value: 'touch' });
        fireEvent(container.querySelector('[data-touch-menu-item]')!, event);

        expect(baseData[MenuCategory.STATION][0].action).not.toHaveBeenCalled();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(true);
    });

    it('preserves direct mouse selection and closes the menu', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        const event = new Event('pointerdown', { bubbles: true });
        Object.defineProperty(event, 'pointerType', { value: 'mouse' });
        fireEvent(container.querySelector('[data-touch-menu-item]')!, event);

        expect(baseData[MenuCategory.STATION][0].action).toHaveBeenCalledOnce();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
    });

    it('keeps a touch on the center open until the controller handles release', () => {
        setMenu(true);
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu />
                </svg>
            </Provider>
        );
        const event = new Event('pointerdown', { bubbles: true });
        Object.defineProperty(event, 'pointerType', { value: 'touch' });
        fireEvent(container.querySelector('circle')!, event);

        expect(store.getState().runtime.radialTouchMenu.visible).toBe(true);
    });
});

describe('radial menu layout', () => {
    const denseData: MenuLayerData = {
        [MenuCategory.STATION]: [],
        [MenuCategory.MISC_NODE]: [],
        [MenuCategory.LINE]: [],
        [MenuCategory.OPERATION]: [],
    };
    for (const category of Object.values(MenuCategory)) {
        denseData[category] = Array.from({ length: 6 }, (_, index) => ({
            label: `${category} ${index}`,
            elementId: `${category}_${index}`,
            action: vi.fn(),
        }));
    }

    it('keeps a sparse menu at its normal size and original position when it fits', () => {
        const position = { x: 200, y: 200 };
        const layout = getRadialTouchMenuLayout(baseData, position, 100, {
            width: 600,
            height: 400,
            x: 0,
            y: 0,
            zoom: 100,
        });

        expect(layout).toEqual({ position, scale: 1.2 });
    });

    it.each([25, 100, 250])('fits six rings at every phone-screen corner at zoom %s', zoom => {
        const viewport = { width: 320, height: 480, x: -100, y: 50, zoom };
        for (const [screenX, screenY] of [
            [0, 0],
            [320, 0],
            [0, 480],
            [320, 480],
        ]) {
            const position = {
                x: viewport.x + (screenX * zoom) / 100,
                y: viewport.y + (screenY * zoom) / 100,
            };
            const originalPosition = { ...position };
            const layout = getRadialTouchMenuLayout(denseData, position, 100, viewport);
            const centerX = ((layout.position.x - viewport.x) * 100) / zoom;
            const centerY = ((layout.position.y - viewport.y) * 100) / zoom;
            // Six 36-unit rings, the 45-unit center, and the highlighted border.
            const screenRadius = (262 * layout.scale * 100) / zoom;

            expect(centerX - screenRadius).toBeGreaterThanOrEqual(8 - 1e-8);
            expect(centerX + screenRadius).toBeLessThanOrEqual(312 + 1e-8);
            expect(centerY - screenRadius).toBeGreaterThanOrEqual(8 - 1e-8);
            expect(centerY + screenRadius).toBeLessThanOrEqual(472 + 1e-8);
            expect(layout.scale).toBeLessThan((1.2 * zoom) / 100);
            expect(position).toEqual(originalPosition);
        }
    });

    it('only reserves space for the quadrants that contain items', () => {
        const position = { x: 0, y: 0 };
        const layout = getRadialTouchMenuLayout(baseData, position, 100, {
            width: 192,
            height: 192,
            x: 0,
            y: 0,
            zoom: 100,
        });

        expect(layout.scale).toBe(1.2);
        expect(layout.position.x).toBeCloseTo(106.4);
        expect(layout.position.y).toBeCloseTo(106.4);
        expect(position).toEqual({ x: 0, y: 0 });
    });
});
