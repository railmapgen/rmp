import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createTimelineOverlayModule, TimelineOverlayModule } from '../../constants/timeline-overlays';
import { render } from '../../test-utils';
import TimelineOverlayPanel from './timeline-overlay-panel';

const panel = (props: Partial<React.ComponentProps<typeof TimelineOverlayPanel>> = {}) =>
    render(
        <ChakraProvider>
            <TimelineOverlayPanel
                modules={[]}
                hasExportSubscription={false}
                mapEnabled
                onChange={vi.fn()}
                onSelect={vi.fn()}
                onCloseCatalog={vi.fn()}
                onDone={vi.fn()}
                {...props}
            />
        </ChakraProvider>
    );

describe('Timeline overlay settings panel', () => {
    it('uses a date-content dropdown while persisting its value as a boolean', () => {
        const date = createTimelineOverlayModule('date', 'top-left', 'date');
        const onChange = vi.fn();
        panel({ modules: [date], selectedId: 'date', onChange });
        const content = screen.getByRole('combobox', { name: 'Date content' });
        expect(content).toHaveValue('true');
        fireEvent.change(content, { target: { value: 'false' } });
        expect(onChange.mock.lastCall?.[0]).toEqual([{ ...date, settings: { showMonthDay: false, layout: 'double' } }]);
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('sets the date layout independently of whether month/day is displayed', () => {
        const date = createTimelineOverlayModule('date', 'top-left', 'date');
        const onChange = vi.fn();
        panel({ modules: [date], selectedId: 'date', onChange });
        fireEvent.change(screen.getByRole('combobox', { name: 'Date layout' }), { target: { value: 'single' } });
        expect(onChange.mock.lastCall?.[0]).toEqual([{ ...date, settings: { showMonthDay: true, layout: 'single' } }]);
    });

    it('adds another length instance at the inward edge without changing existing configuration', () => {
        const existing = createTimelineOverlayModule('line-length', 'bottom-left', 'existing');
        existing.settings.unit = 'mi';
        const onChange = vi.fn();
        const onSelect = vi.fn();
        panel({ modules: [existing], addRegion: 'bottom-left', onChange, onSelect });
        fireEvent.click(screen.getByRole('button', { name: 'Line length' }));
        const modules = onChange.mock.calls[0][0] as TimelineOverlayModule[];
        expect(modules).toHaveLength(2);
        expect(modules[0]).toMatchObject({
            type: 'line-length',
            region: 'bottom-left',
            settings: { scope: 'network', unit: 'km' },
        });
        expect(modules[1]).toEqual(existing);
        expect(onSelect).toHaveBeenCalledWith(modules[0].id);
    });

    it('only changes the selected module settings', () => {
        const first = createTimelineOverlayModule('line-length', 'top-left', 'first');
        const second = createTimelineOverlayModule('line-length', 'top-left', 'second');
        const onChange = vi.fn();
        panel({ modules: [first, second], selectedId: 'second', onChange });
        fireEvent.change(screen.getByRole('combobox', { name: 'Length statistic' }), {
            target: { value: 'currentLine' },
        });
        expect(onChange.mock.lastCall?.[0]).toEqual([
            first,
            { ...second, settings: { scope: 'currentLine', unit: 'km' } },
        ]);
    });

    it('locks subscribed settings and leaves all positioning to dragging in the preview', () => {
        const date = createTimelineOverlayModule('date', 'top-right', 'date');
        const onChange = vi.fn();
        panel({ modules: [date], selectedId: 'date', onChange });
        expect(screen.getByRole('combobox', { name: 'Date content' })).toBeDisabled();
        expect(screen.getByRole('combobox', { name: 'Date layout' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove module' })).toBeDisabled();
        expect(screen.getByText('Stop and Proceed')).toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: 'Position' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Move down' })).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('enables saved top-right modules with Export access', () => {
        const date = createTimelineOverlayModule('date', 'top-right', 'date');
        const onChange = vi.fn();
        panel({ modules: [date], selectedId: 'date', hasExportSubscription: true, onChange });
        expect(screen.getByRole('combobox', { name: 'Date content' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Remove module' })).toBeEnabled();
        expect(screen.queryByText('Stop and Proceed')).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox', { name: 'Date content' }), { target: { value: 'false' } });
        expect(onChange).toHaveBeenCalledExactlyOnceWith([
            { ...date, settings: { showMonthDay: false, layout: 'double' } },
        ]);
    });

    it('disables geographic lengths in the catalog when geographic maps are off', () => {
        panel({ mapEnabled: false, addRegion: 'top-left' });
        expect(screen.getByRole('button', { name: 'Line length' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Minimap' })).toBeEnabled();
    });
});
