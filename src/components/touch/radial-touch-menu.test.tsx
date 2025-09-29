import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import store from '../../redux';
import { MenuCategory } from '../../util/graph-nearby-elements';
import RadialTouchMenu from './radial-touch-menu';

describe('RadialTouchMenu', () => {
    const mockProps = {
        data: {
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
        },
        position: { x: 200, y: 200 },
        onClose: vi.fn(),
        visible: true,
    };

    it('renders when visible is true', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu {...mockProps} />
                </svg>
            </Provider>
        );

        const menuGroup = container.querySelector('g');
        expect(menuGroup).toBeTruthy();
    });

    it('does not render when visible is false', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu {...mockProps} visible={false} />
                </svg>
            </Provider>
        );

        const menuGroup = container.querySelector('g');
        expect(menuGroup).toBeFalsy();
    });

    it('renders SVG menu with correct structure', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu {...mockProps} />
                </svg>
            </Provider>
        );

        const menuGroup = container.querySelector('g');
        expect(menuGroup).toBeTruthy();

        // Check for nested groups
        const nestedGroups = container.querySelectorAll('g');
        expect(nestedGroups.length).toBeGreaterThan(1);
    });

    it('displays category items correctly', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <RadialTouchMenu {...mockProps} />
                </svg>
            </Provider>
        );

        // Check that the station label is rendered
        const stationText = Array.from(container.querySelectorAll('text')).find(
            text => text.textContent === 'Test Station'
        );
        expect(stationText).toBeTruthy();
    });
});
