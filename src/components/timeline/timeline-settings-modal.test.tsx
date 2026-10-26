import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { render } from '../../test-utils';
import TimelineSettingsModal from './timeline-settings-modal';

describe('Timeline settings', () => {
    it('moves annotation controls to the module editor and closes settings before entering', () => {
        const calls: string[] = [];
        const onDocumentChange = vi.fn();
        render(
            <ChakraProvider>
                <TimelineSettingsModal
                    document={createEmptyTimelineDocument()}
                    onDocumentChange={onDocumentChange}
                    isOpen
                    onClose={() => calls.push('close')}
                    onOpenLineInformation={() => calls.push('line information')}
                    onEditOverlayModules={() => calls.push('layout')}
                />
            </ChakraProvider>
        );
        expect(screen.queryByRole('checkbox', { name: 'Show year' })).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: 'Label line length' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Line information' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Edit element positions' }));
        expect(calls).toEqual(['close', 'layout']);
        expect(onDocumentChange).not.toHaveBeenCalled();
    });

    it('updates playback settings without modifying the annotation layout', async () => {
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
                        isOpen
                        onClose={onClose}
                    />
                </ChakraProvider>
            );
        }
        render(<Harness />);
        const zoom = screen.getByRole('combobox', { name: 'Zoom' });
        expect(zoom).toHaveValue('2');
        fireEvent.change(zoom, { target: { value: '16' } });
        const slider = screen.getByRole('slider');
        fireEvent.keyDown(slider, { key: 'End' });
        await waitFor(() => expect(screen.getByText('Drawing speed (2.0×)')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('checkbox', { name: 'Automatically switch basic and interchange stations' }));
        const updated = onDocumentChange.mock.lastCall?.[0];
        expect(updated.settings).toMatchObject({ cameraZoom: 16, speedMultiplier: 2, autoChangeStationType: false });
        expect(updated.overlayModules).toEqual(createEmptyTimelineDocument().overlayModules);
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('closes settings before opening line information', () => {
        const calls: string[] = [];
        render(
            <ChakraProvider>
                <TimelineSettingsModal
                    document={createEmptyTimelineDocument()}
                    onDocumentChange={vi.fn()}
                    isOpen
                    onClose={() => calls.push('close')}
                    onOpenLineInformation={() => calls.push('line information')}
                />
            </ChakraProvider>
        );
        fireEvent.click(screen.getByRole('button', { name: 'Line information' }));
        expect(calls).toEqual(['close', 'line information']);
    });

    it('closes settings before opening the fixed resource picker', () => {
        const calls: string[] = [];
        render(
            <ChakraProvider>
                <TimelineSettingsModal
                    document={createEmptyTimelineDocument()}
                    onDocumentChange={vi.fn()}
                    isOpen
                    onClose={() => calls.push('close')}
                    onEditFixedResources={() => calls.push('fixed resources')}
                />
            </ChakraProvider>
        );
        fireEvent.click(screen.getByRole('button', { name: 'Choose fixed resources' }));
        expect(calls).toEqual(['close', 'fixed resources']);
    });
});
