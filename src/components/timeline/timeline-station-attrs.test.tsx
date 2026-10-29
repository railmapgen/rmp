import { ChakraProvider } from '@chakra-ui/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityCode, Theme } from '../../constants/constants';
import { StationAttributes, StationType } from '../../constants/stations';
import { createTimelineStore } from '../../timeline/timeline-store';
import stations from '../svgs/stations/stations';
import { mergeStationAttributeChanges } from '../panels/details/station-attrs-context';
import TimelineStationAttrs from './timeline-station-attrs';

vi.mock('react-i18next', async importOriginal => ({
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: () => ({ t: (key: string) => key }),
}));

const nextTheme: Theme = [CityCode.Other, 'custom', '#123456', MonoColour.white];
vi.mock('../panels/rmg-palette-app-clip', () => ({
    default: ({ onSelect }: { onSelect: (theme: Theme) => void }) => (
        <button onClick={() => onSelect(nextTheme)}>Choose palette theme</button>
    ),
}));

afterEach(cleanup);

const renderAttrs = (type: StationType) => {
    const attrs = structuredClone(stations[type].defaultAttrs);
    const onChange = vi.fn();
    const onUndo = vi.fn();
    const store = createTimelineStore();
    const view = render(
        <ChakraProvider>
            <Provider store={store}>
                <TimelineStationAttrs
                    id="stn_keyframe"
                    type={type}
                    attrs={attrs}
                    mapEnabled={false}
                    onChange={onChange}
                    onUndo={onUndo}
                />
            </Provider>
        </ChakraProvider>
    );
    return { ...view, attrs, onChange, onUndo, store };
};

describe('TimelineStationAttrs', () => {
    it('merges independent name indices and preserves fields removed by another control', () => {
        const original: StationAttributes = {
            names: ['Original', 'Original English'],
            preciseNameOffsets: { x: 1, y: 2, anchor: 'start' },
        };
        const current: StationAttributes = { names: ['Original', 'Changed English'] };
        const next: StationAttributes = { ...original, names: ['Changed Chinese', 'Original English'] };
        expect(mergeStationAttributeChanges(current, original, next)).toEqual({
            names: ['Changed Chinese', 'Changed English'],
        });
        expect(current.names).toEqual(['Original', 'Changed English']);
    });

    it.each(Object.values(StationType))('renders the existing %s attribute editor without a drawing graph', type => {
        Reflect.deleteProperty(window, 'graph');
        const { container } = renderAttrs(type);
        expect(container.querySelector('textarea')).not.toBeNull();
    });

    it('submits an isolated name snapshot through the RMP attribute component', async () => {
        const { attrs, onChange, container, store } = renderAttrs(StationType.ShmetroBasic);
        const state = store.getState();
        fireEvent.change(container.querySelector('textarea')!, { target: { value: 'Current keyframe' } });
        await waitFor(() =>
            expect(onChange).toHaveBeenLastCalledWith({ ...attrs, names: ['Current keyframe', attrs.names[1]] }, attrs)
        );
        expect(attrs.names[0]).toBe('车站');
        expect(store.getState()).toBe(state);
    });

    it('submits rotation through the keyframe owner without changing the drawing graph', () => {
        const graph = new MultiDirectedGraph();
        window.graph = graph as typeof window.graph;
        const before = graph.export();
        const { container, onChange, attrs } = renderAttrs(StationType.ShmetroInt);
        const rotation = Array.from(container.querySelectorAll('select')).find(select =>
            Array.from(select.options).some(option => option.value === '315')
        )!;
        fireEvent.change(rotation, { target: { value: '90' } });
        expect(onChange).toHaveBeenLastCalledWith({ ...attrs, rotate: 90 }, attrs);
        expect(graph.export()).toEqual(before);
    });

    it('routes translation undo to keyframe history without requiring a drawing graph', async () => {
        Reflect.deleteProperty(window, 'graph');
        const onUndo = vi.fn();
        function Harness() {
            const [attrs, setAttrs] = React.useState({
                ...structuredClone(stations[StationType.ShmetroBasic].defaultAttrs),
                names: ['南京东路', ''] as [string, string],
            });
            return (
                <TimelineStationAttrs
                    id="stn_keyframe"
                    type={StationType.ShmetroBasic}
                    attrs={attrs}
                    mapEnabled={false}
                    onChange={next => setAttrs(next as typeof attrs)}
                    onUndo={onUndo}
                />
            );
        }
        render(
            <ChakraProvider>
                <Provider store={createTimelineStore()}>
                    <Harness />
                </Provider>
            </ChakraProvider>
        );
        fireEvent.click(screen.getByRole('button', { name: 'panel.details.stations.common.translateName' }));
        const englishName = screen.getAllByRole('textbox')[1] as HTMLTextAreaElement;
        await waitFor(() => expect(englishName.value).toBe('Nan Jing Dong Lu'));
        await waitFor(() => expect(document.activeElement).toBe(englishName));
        fireEvent.keyDown(englishName, { key: 'z', ctrlKey: true });
        expect(onUndo).toHaveBeenCalledOnce();
    });

    it('preserves immediate rotation changes when a debounced name edit submits later', async () => {
        const initial = structuredClone(stations[StationType.ShmetroInt].defaultAttrs);
        let latest: StationAttributes = initial;
        function Harness() {
            const [attrs, setAttrs] = React.useState<StationAttributes>(initial);
            latest = attrs;
            return (
                <TimelineStationAttrs
                    id="stn_keyframe"
                    type={StationType.ShmetroInt}
                    attrs={attrs}
                    mapEnabled={false}
                    onChange={(next, original) =>
                        setAttrs(current => mergeStationAttributeChanges(current, original, next))
                    }
                    onUndo={() => undefined}
                />
            );
        }
        const { container } = render(
            <ChakraProvider>
                <Provider store={createTimelineStore()}>
                    <Harness />
                </Provider>
            </ChakraProvider>
        );
        fireEvent.change(container.querySelector('textarea')!, { target: { value: 'Renamed keyframe' } });
        const rotation = Array.from(container.querySelectorAll('select')).find(select =>
            Array.from(select.options).some(option => option.value === '315')
        )!;
        fireEvent.change(rotation, { target: { value: '90' } });
        await waitFor(() =>
            expect(latest).toEqual({ ...initial, names: ['Renamed keyframe', initial.names[1]], rotate: 90 })
        );
        expect(initial.rotate).toBe(0);
    });

    it('edits interchanges and palette colors through the keyframe owner', async () => {
        Reflect.deleteProperty(window, 'graph');
        const { attrs, onChange } = renderAttrs(StationType.TaipeiMetroInt);
        const transfers = (attrs as (typeof stations)[StationType.TaipeiMetroInt]['defaultAttrs']).transfer;
        fireEvent.click(screen.getAllByRole('button', { name: 'panel.details.stations.interchange.add' })[0]);
        expect(onChange).toHaveBeenCalled();
        expect(transfers).toEqual(stations[StationType.TaipeiMetroInt].defaultAttrs.transfer);
        fireEvent.click(screen.getAllByRole('button', { name: 'Color' })[0]);
        fireEvent.click(await screen.findByRole('button', { name: 'Choose palette theme' }));
        await waitFor(() => {
            const next = onChange.mock.calls.at(
                -1
            )![0] as (typeof stations)[StationType.TaipeiMetroInt]['defaultAttrs'];
            expect(next.transfer[0][0].slice(0, 4)).toEqual(nextTheme);
        });
    });
});
