import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import store from '../../redux';
import TouchOverlay from './touch-overlay';

// Mock the helper function
vi.mock('../../util/helpers', () => ({
    pointerPosToSVGCoord: vi.fn().mockReturnValue({ x: 100, y: 100 }),
    isTouchClient: vi.fn().mockReturnValue(true),
    getCanvasSize: vi.fn().mockReturnValue({ height: 400, width: 300 }),
}));

// Mock the useNearbyElements hook
vi.mock('../../util/hooks/useNearbyElements', () => ({
    useNearbyElements: () => ({
        findNearbyElements: vi.fn().mockReturnValue([]),
    }),
}));

// Mock window.graph
Object.defineProperty(window, 'graph', {
    value: {
        current: {
            nodeEntries: vi.fn().mockReturnValue([]),
            edgeEntries: vi.fn().mockReturnValue([]),
            hasNode: vi.fn().mockReturnValue(false),
            hasEdge: vi.fn().mockReturnValue(false),
            dropNode: vi.fn(),
            dropEdge: vi.fn(),
        },
    },
    writable: true,
});

describe('TouchOverlay', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <TouchOverlay />
                </svg>
            </Provider>
        );

        // Check that the overlay rect is rendered
        const overlay = container.querySelector('rect');
        expect(overlay).toBeTruthy();
    });

    it('has correct styling for touch overlay', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <TouchOverlay />
                </svg>
            </Provider>
        );

        const overlay = container.querySelector('rect');
        expect(overlay).toBeTruthy();

        // Check that the overlay has the expected class
        expect(overlay?.classList).toContain('removeMe');
    });
});
