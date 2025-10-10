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

    it('renders expected overlay structure', () => {
        const { container } = render(
            <Provider store={store}>
                <svg>
                    <TouchOverlay />
                </svg>
            </Provider>
        );

        // Check that exactly one rect is rendered
        const rects = container.querySelectorAll('rect');
        expect(rects.length).toBe(1);

        // Check that the rect has expected attributes
        const rect = rects[0];
        expect(rect.getAttribute('width')).toBeTruthy();
        expect(rect.getAttribute('height')).toBeTruthy();
    });
});
