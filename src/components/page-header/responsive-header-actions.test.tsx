import { Portal } from '@chakra-ui/react';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../test-utils';
import ResponsiveHeaderActions from './responsive-header-actions';

const renderActions = (children: React.ReactNode) =>
    render(
        <RmgThemeProvider>
            <ResponsiveHeaderActions>{children}</ResponsiveHeaderActions>
        </RmgThemeProvider>
    );

const setScrollSize = (toolbar: HTMLElement, scrollWidth = 600, clientWidth = 160) => {
    Object.defineProperties(toolbar, {
        scrollWidth: { configurable: true, value: scrollWidth },
        clientWidth: { configurable: true, value: clientWidth },
    });
};

const wheel = (target: Element, options: WheelEventInit = {}) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...options });
    fireEvent(target, event);
    return event;
};

beforeEach(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('ResponsiveHeaderActions', () => {
    it('always shows one row of actions with a focusable scroller and no collapse button', () => {
        renderActions(
            <>
                <button>First action</button>
                <button>Last action</button>
            </>
        );
        const toolbar = screen.getByRole('toolbar', { name: 'Menu' });
        expect(toolbar).toHaveStyle({ flexWrap: 'nowrap', overflowX: 'auto', position: 'static' });
        expect(toolbar).toHaveAttribute('tabindex', '0');
        expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
        expect(screen.getByRole('button', { name: 'First action' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Last action' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
        expect(screen.getByTestId('responsive-header-actions')).toHaveStyle({
            position: 'relative',
            overflow: 'visible',
        });
    });

    it('uses the mouse wheel and native horizontal deltas to reveal overflowed actions', () => {
        renderActions(<button>Action</button>);
        const toolbar = screen.getByRole('toolbar');
        setScrollSize(toolbar);
        const vertical = wheel(screen.getByRole('button'), { deltaY: 90 });
        expect(toolbar.scrollLeft).toBe(90);
        expect(vertical.defaultPrevented).toBe(true);
        wheel(toolbar, { deltaY: -35 });
        expect(toolbar.scrollLeft).toBe(55);
        wheel(toolbar, { deltaX: 40, deltaY: 2 });
        expect(toolbar.scrollLeft).toBe(95);
        wheel(toolbar, { deltaY: 2, deltaMode: 1 });
        expect(toolbar.scrollLeft).toBe(159);
        wheel(toolbar, { deltaY: 1, deltaMode: 2 });
        expect(toolbar.scrollLeft).toBe(319);
    });

    it('clamps to scroll boundaries and leaves unused wheel events alone', () => {
        renderActions(<button>Action</button>);
        const toolbar = screen.getByRole('toolbar');
        setScrollSize(toolbar);
        wheel(toolbar, { deltaY: 1000 });
        expect(toolbar.scrollLeft).toBe(440);
        expect(wheel(toolbar, { deltaY: 50 }).defaultPrevented).toBe(false);
        wheel(toolbar, { deltaY: -1000 });
        expect(toolbar.scrollLeft).toBe(0);
        expect(wheel(toolbar, { deltaY: -50 }).defaultPrevented).toBe(false);
        setScrollSize(toolbar, 100, 160);
        expect(wheel(toolbar, { deltaY: 50 }).defaultPrevented).toBe(false);
        expect(toolbar.scrollLeft).toBe(0);
    });

    it.each(['ctrlKey', 'metaKey'])('preserves browser %s wheel gestures', modifier => {
        renderActions(<button>Action</button>);
        const toolbar = screen.getByRole('toolbar');
        setScrollSize(toolbar);
        expect(wheel(toolbar, { deltaY: 60, [modifier]: true }).defaultPrevented).toBe(false);
        expect(toolbar.scrollLeft).toBe(0);
    });

    it.each(['menu', 'dialog'])('does not redirect wheel input inside a nested %s', role => {
        renderActions(
            <>
                <button>Action</button>
                <div role={role}>
                    <span>Popup content</span>
                </div>
            </>
        );
        const toolbar = screen.getByRole('toolbar');
        setScrollSize(toolbar);
        expect(wheel(screen.getByText('Popup content'), { deltaY: 60 }).defaultPrevented).toBe(false);
        expect(toolbar.scrollLeft).toBe(0);
    });

    it('keeps controls and their portalled windows mounted while scrolling', () => {
        const mounted = vi.fn();
        const StatefulAction = () => {
            const [count, setCount] = React.useState(0);
            React.useEffect(mounted, []);
            return (
                <>
                    <button onClick={() => setCount(value => value + 1)}>Count {count}</button>
                    {count > 0 && (
                        <Portal>
                            <button>Nested action</button>
                        </Portal>
                    )}
                </>
            );
        };
        renderActions(<StatefulAction />);
        fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
        const toolbar = screen.getByRole('toolbar');
        setScrollSize(toolbar);
        wheel(toolbar, { deltaY: 100 });
        setScrollSize(toolbar, 600, 500);
        fireEvent(window, new Event('resize'));
        expect(screen.getByRole('button', { name: 'Count 1' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Nested action' })).toBeVisible();
        expect(mounted).toHaveBeenCalledOnce();
    });
});
