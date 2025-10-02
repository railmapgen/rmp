import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import store from '../../redux';
import { closeRadialTouchMenu, setRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import { MenuCategory } from '../../util/graph-nearby-elements';
import RadialTouchMenu from './radial-touch-menu';

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

const setMenu = (visible: boolean, overrideData = baseData) => {
    store.dispatch(
        setRadialTouchMenu({
            visible,
            position: { x: 200, y: 200 },
            data: overrideData,
        })
    );
};

afterEach(() => {
    store.dispatch(closeRadialTouchMenu());
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
});
