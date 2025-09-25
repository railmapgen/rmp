import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MenuCategory } from '../../util/hooks/use-nearby-elements';
import RadialTouchMenu from './radial-touch-menu';

describe('RadialTouchMenu', () => {
    const mockProps = {
        data: [
            {
                category: MenuCategory.STATION,
                items: [
                    {
                        label: 'Test Station',
                        action: vi.fn(),
                        elementId: 'stn_1',
                    },
                ],
            },
        ],
        position: { x: 200, y: 200 },
        onClose: vi.fn(),
        visible: true,
    };

    it('renders when visible is true', () => {
        const { container } = render(<RadialTouchMenu {...mockProps} />);

        const overlay = container.querySelector('.radial-touch-menu-overlay');
        expect(overlay).toBeTruthy();
    });

    it('does not render when visible is false', () => {
        const { container } = render(<RadialTouchMenu {...mockProps} visible={false} />);

        const overlay = container.querySelector('.radial-touch-menu-overlay');
        expect(overlay).toBeFalsy();
    });

    it('renders SVG menu with correct structure', () => {
        const { container } = render(<RadialTouchMenu {...mockProps} />);

        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();

        // Check for center circle
        const centerCircle = container.querySelector('circle[r="20"]');
        expect(centerCircle).toBeTruthy();

        // Check for menu text (center label)
        const centerText = Array.from(container.querySelectorAll('text')).find(text => text.textContent === 'Touch');
        expect(centerText).toBeTruthy();
    });

    it('displays category items correctly', () => {
        const { container } = render(<RadialTouchMenu {...mockProps} />);

        // Check that the station label is rendered
        const stationText = Array.from(container.querySelectorAll('text')).find(
            text => text.textContent === 'Test Station'
        );
        expect(stationText).toBeTruthy();
    });
});
