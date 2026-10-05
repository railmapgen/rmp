import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { render } from '../../test-utils';
import TimelineSettingsModal from './timeline-settings-modal';

describe('Timeline settings', () => {
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
