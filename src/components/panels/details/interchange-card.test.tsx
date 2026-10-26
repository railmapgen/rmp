import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { act, fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../../../constants/constants';
import { StationType } from '../../../constants/stations';
import { createStore } from '../../../redux';
import { onPaletteAppClipEmit } from '../../../redux/runtime/runtime-slice';
import { render } from '../../../test-utils';
import taipeiMetroIntStation from '../../svgs/stations/taipei-metro-int';
import InterchangeCard from './interchange-card';
import { InterchangeField, InterchangeInfo } from './interchange-field';

const entries: InterchangeInfo[] = [
    [CityCode.Taipei, 'bl', '#0070BD', MonoColour.white, 'BL', '12', 'filled'],
    [CityCode.Taipei, 'r', '#E3002C', MonoColour.white, 'R', '10'],
];

describe('InterchangeCard extension metadata', () => {
    it('sets filled or hollow independently on each Taipei badge', () => {
        const onUpdate = vi.fn();
        const { getAllByRole } = render(
            <InterchangeCard interchangeList={entries} maximumTransfers={10} taipei onUpdate={onUpdate} />
        );
        const toggles = getAllByRole('checkbox');
        expect(toggles[0]).toBeChecked();
        expect(toggles[1]).not.toBeChecked();
        fireEvent.click(toggles[1]);
        expect(onUpdate).toHaveBeenLastCalledWith(1, [...entries[1], 'filled']);
        fireEvent.click(toggles[0]);
        expect(onUpdate).toHaveBeenLastCalledWith(0, [...entries[0].slice(0, 6), 'hollow']);
    });

    it('preserves Taipei and other tuple extensions when changing the palette color', () => {
        const onUpdate = vi.fn();
        const store = createStore();
        const withExtensions: InterchangeInfo[] = [[...entries[0], 'future-extension']];
        const { container } = render(
            <InterchangeCard interchangeList={withExtensions} maximumTransfers={10} taipei onUpdate={onUpdate} />,
            { store }
        );
        fireEvent.click(container.querySelector('button')!);
        const color: Theme = [CityCode.Taipei, 'g', '#008659', MonoColour.white];
        act(() => {
            store.dispatch(onPaletteAppClipEmit(color));
        });
        expect(onUpdate).toHaveBeenLastCalledWith(0, [...color, 'BL', '12', 'filled', 'future-extension']);
    });

    it('keeps fill metadata attached to its badge through reorder, insert, and delete', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('stn_test', {
            x: 0,
            y: 0,
            visible: true,
            zIndex: 0,
            type: StationType.TaipeiMetroInt,
            [StationType.TaipeiMetroInt]: {
                ...structuredClone(taipeiMetroIntStation.defaultAttrs),
                transfer: [structuredClone(entries)] as any,
            },
        });
        window.graph = graph;
        const initial = createStore().getState();
        const store = createStore({ ...initial, runtime: { ...initial.runtime, selected: new Set(['stn_test']) } });
        const ui = () => (
            <InterchangeField
                stationType={StationType.TaipeiMetroInt}
                defaultAttrs={taipeiMetroIntStation.defaultAttrs}
                maximumTransfers={[1000, 0, 0]}
            />
        );
        const { container, rerender } = render(ui(), { store });
        const transfer = () => window.graph.getNodeAttribute('stn_test', StationType.TaipeiMetroInt)!.transfer[0];
        const buttons = () => Array.from(container.querySelectorAll('button'));
        fireEvent.click(buttons().find(button => /down|下/i.test(button.getAttribute('aria-label') ?? ''))!);
        expect(transfer()[1][6]).toBe('filled');
        rerender(ui());
        fireEvent.click(buttons().find(button => /add|添加|新增/i.test(button.getAttribute('aria-label') ?? ''))!);
        expect(transfer()).toHaveLength(3);
        expect(transfer()[2][6]).toBe('filled');
        rerender(ui());
        fireEvent.click(buttons().find(button => /remove|删除|刪除/i.test(button.getAttribute('aria-label') ?? ''))!);
        expect(transfer()).toHaveLength(2);
        expect(transfer()[1][6]).toBe('filled');
    });
});
