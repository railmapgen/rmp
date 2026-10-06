import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { render } from '../../test-utils';
import TimelineSettingsModal from './timeline-settings-modal';

describe('Timeline settings', () => {
    it('disables geographic length settings on an ordinary map and explains availability in a tooltip', async () => {
        const document = createEmptyTimelineDocument();
        document.settings!.showLineLength = true;
        const onDocumentChange = vi.fn();
        render(
            <ChakraProvider>
                <TimelineSettingsModal
                    document={document}
                    onDocumentChange={onDocumentChange}
                    isOpen
                    onClose={() => {}}
                />
            </ChakraProvider>
        );
        const toggle = screen.getByRole('checkbox', { name: 'Label line length' });
        expect(toggle).toBeDisabled();
        expect(toggle).not.toBeChecked();
        expect(screen.getByRole('combobox', { name: 'Length unit' })).toBeDisabled();
        expect(screen.queryByText('Available with the geographic map enabled.')).not.toBeInTheDocument();
        fireEvent.pointerOver(toggle.closest('label')!.parentElement!);
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Available with the geographic map enabled.');
        fireEvent.click(toggle);
        expect(onDocumentChange).not.toHaveBeenCalled();
    });

    it('saves the length toggle and km/mi unit when the geographic map is enabled', () => {
        const onDocumentChange = vi.fn();
        function Harness() {
            const [document, setDocument] = React.useState(createEmptyTimelineDocument);
            return (
                <ChakraProvider>
                    <TimelineSettingsModal
                        document={document}
                        mapEnabled
                        onDocumentChange={next => {
                            setDocument(next);
                            onDocumentChange(next);
                        }}
                        isOpen
                        onClose={() => {}}
                    />
                </ChakraProvider>
            );
        }
        render(<Harness />);
        const toggle = screen.getByRole('checkbox', { name: 'Label line length' });
        const unit = screen.getByRole('combobox', { name: 'Length unit' });
        expect(toggle).toBeEnabled();
        fireEvent.pointerOver(toggle.closest('label')!.parentElement!);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(unit).toBeDisabled();
        expect(unit).toHaveValue('km');
        fireEvent.click(toggle);
        expect(unit).toBeEnabled();
        fireEvent.change(unit, { target: { value: 'mi' } });
        expect(onDocumentChange.mock.lastCall?.[0].settings).toMatchObject({
            showLineLength: true,
            lineLengthUnit: 'mi',
        });
    });

    it('updates saved drawing speed, station conversion, and both video labels', async () => {
        const onDocumentChange = vi.fn();
        const onClose = vi.fn();
        function Harness() {
            const [document, setDocument] = React.useState(createEmptyTimelineDocument);
            return (
                <ChakraProvider>
                    <TimelineSettingsModal
                        document={document}
                        onDocumentChange={next => {
                            setDocument(next);
                            onDocumentChange(next);
                        }}
                        isOpen={true}
                        onClose={onClose}
                    />
                </ChakraProvider>
            );
        }
        render(<Harness />);

        const zoom = screen.getByRole('combobox', { name: 'Zoom' });
        expect(zoom).toHaveValue('2');
        expect([...zoom.querySelectorAll('option')].map(option => option.textContent)).toEqual([
            'Full',
            '2x',
            '4x',
            '8x',
            '16x',
        ]);
        expect(screen.getByText('Playback').parentElement).toContainElement(zoom);
        fireEvent.change(zoom, { target: { value: '16' } });
        expect(screen.getByText('Drawing speed (1.0×)')).toBeInTheDocument();
        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('aria-valuemin', '0.5');
        expect(slider).toHaveAttribute('aria-valuemax', '2');
        fireEvent.keyDown(slider, { key: 'End' });
        await waitFor(() => expect(screen.getByText('Drawing speed (2.0×)')).toBeInTheDocument());

        const stationConversion = screen.getByRole('checkbox', {
            name: 'Automatically switch basic and interchange stations',
        });
        expect(stationConversion).toBeChecked();
        fireEvent.click(stationConversion);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show year' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Label line names' }));
        expect(onDocumentChange).toHaveBeenLastCalledWith({
            ...createEmptyTimelineDocument(),
            settings: {
                cameraZoom: 16,
                speedMultiplier: 2,
                autoChangeStationType: false,
                showYear: true,
                showLineName: true,
                showLineLength: false,
                lineLengthUnit: 'km' as const,
            },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('closes settings before opening the video line information editor', () => {
        const calls: string[] = [];
        const onDocumentChange = vi.fn();
        render(
            <ChakraProvider>
                <TimelineSettingsModal
                    document={createEmptyTimelineDocument()}
                    onDocumentChange={onDocumentChange}
                    isOpen={true}
                    onClose={() => calls.push('close settings')}
                    onOpenLineInformation={() => calls.push('open line information')}
                />
            </ChakraProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Line information' }));
        expect(calls).toEqual(['close settings', 'open line information']);
        expect(onDocumentChange).not.toHaveBeenCalled();
    });
});
