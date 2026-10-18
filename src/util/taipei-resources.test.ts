import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { dynamicColorInjection } from '../components/panels/details/color-field';
import stations from '../components/svgs/stations/stations';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createTestLineGraph } from '../test-utils';
import { autoPopulateTransfer, checkAndChangeStationIntType } from './change-types';
import { Node2Font, TextLanguage } from './fonts';
import { UPGRADE_COLLECTION } from './save';
import { createFrameStationGraph } from './video-export';

const red: Theme = [CityCode.Taipei, 'r', '#E3002D', MonoColour.white];
const green: Theme = [CityCode.Taipei, 'g', '#00865B', MonoColour.white];
const makeGraph = (themes: [Theme, Theme] = [red, green]) => {
    const graph = createTestLineGraph([
        ['center', 'north', themes[0]],
        ['center', 'east', themes[1]],
    ]);
    graph.mergeNodeAttributes('stn_center', {
        type: StationType.TaipeiMetroBasic,
        [StationType.TaipeiMetroBasic]: {
            ...structuredClone(stations[StationType.TaipeiMetroBasic].defaultAttrs),
            names: ['中山', 'Zhongshan'],
            secondaryNames: ['副站名', 'Secondary name'],
            secondaryNameOnNewLine: true,
            preciseNameOffsets: { x: 20, y: 30, anchor: 'end' },
            color: themes[0],
            lineCode: 'R',
            stationCode: '11',
            filled: true,
        },
    });
    return graph;
};

describe('Taipei resource integration', () => {
    it('preserves numbered badge styles, secondary names and their layout through automatic station conversion', () => {
        const graph = makeGraph();
        expect(checkAndChangeStationIntType(graph, 'stn_center')).toBe(true);
        const interchange = graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!;
        expect(interchange.transfer[0]).toEqual([
            [...red, 'R', '11', 'filled'],
            [...green, '', ''],
        ]);
        expect(interchange.secondaryNames).toEqual(['副站名', 'Secondary name']);
        expect(interchange.secondaryNameOnNewLine).toBe(true);
        expect(interchange.preciseNameOffsets).toEqual({ x: 20, y: 30, anchor: 'end' });

        interchange.transfer[0][1] = [...green, 'G', '14', 'hollow'];
        graph.setNodeAttribute('stn_center', StationType.TaipeiMetroInt, interchange);
        graph.dropEdge('line_0');
        expect(checkAndChangeStationIntType(graph, 'stn_center')).toBe(true);
        const basic = graph.getNodeAttribute('stn_center', StationType.TaipeiMetroBasic)!;
        expect(basic).toMatchObject({
            color: green,
            lineCode: 'G',
            stationCode: '14',
            filled: false,
            secondaryNames: ['副站名', 'Secondary name'],
            secondaryNameOnNewLine: true,
            preciseNameOffsets: { x: 20, y: 30, anchor: 'end' },
        });
    });

    it('retains mixed fill styles when adding connected lines, sorting, saving and loading', () => {
        const graph = makeGraph();
        checkAndChangeStationIntType(graph, 'stn_center');
        const attrs = graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!;
        attrs.transfer[0] = [
            [...green, 'G', '14', 'hollow'],
            [...red, 'R', '11', 'filled'],
        ];
        graph.setNodeAttribute('stn_center', StationType.TaipeiMetroInt, attrs);
        expect(autoPopulateTransfer(graph, 'stn_center')).toBe(false);
        const blue: Theme = [CityCode.Taipei, 'bl', '#0070BD', MonoColour.white];
        graph.addDirectedEdgeWithKey('line_2', 'stn_center', 'stn_north', {
            ...structuredClone(graph.getEdgeAttributes('line_0')),
            [LineStyleType.SingleColor]: { color: blue },
        });
        expect(autoPopulateTransfer(graph, 'stn_center')).toBe(true);
        expect(graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!.transfer[0]).toEqual([
            [...green, 'G', '14', 'hollow'],
            [...red, 'R', '11', 'filled'],
            [...blue, '', ''],
        ]);
        graph.dropEdge('line_1');
        expect(autoPopulateTransfer(graph, 'stn_center')).toBe(true);
        const restored = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        restored.import(JSON.parse(JSON.stringify(graph.export())));
        expect(restored.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!.transfer[0]).toEqual([
            [...red, 'R', '11', 'filled'],
            [...blue, '', ''],
        ]);
    });

    it('selects the visible line badge for a video frame without changing the authored interchange', () => {
        const graph = makeGraph();
        checkAndChangeStationIntType(graph, 'stn_center');
        const attrs = graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!;
        attrs.transfer[0][1] = [...green, 'G', '14', 'filled'];
        graph.setNodeAttribute('stn_center', StationType.TaipeiMetroInt, attrs);
        const frame = createFrameStationGraph(graph, new Set(['line_1']));
        expect(frame.getNodeAttribute('stn_center', StationType.TaipeiMetroBasic)).toMatchObject({
            lineCode: 'G',
            stationCode: '14',
            filled: true,
            secondaryNames: ['副站名', 'Secondary name'],
            secondaryNameOnNewLine: true,
        });
        expect(graph.getNodeAttribute('stn_center', 'type')).toBe(StationType.TaipeiMetroInt);
        expect(graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!.secondaryNameOnNewLine).toBe(true);
        expect(graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!.transfer[0][0][6]).toBe('filled');
    });

    it('registers theme injection and the bundled Chinese font for Taipei resources', () => {
        for (const type of [
            StationType.TaipeiMetroBasic,
            StationType.TaipeiLightRail,
            StationType.TaipeiMaokongGondola,
        ]) {
            expect(dynamicColorInjection.has(type)).toBe(true);
            expect(Node2Font[type]).toContain(TextLanguage.taipei);
        }
        expect(Node2Font[StationType.TaipeiMetroInt]).toContain(TextLanguage.taipei);
        for (const type of [
            MiscNodeType.TaipeiLightRailLineBadge,
            MiscNodeType.TaipeiMaokongGondolaBadge,
            LineStyleType.TaipeiLightRail,
            LineStyleType.TaipeiMaokongGondola,
            LineStyleType.TaipeiTaiwanRailway,
            MiscNodeType.TaiwanRailwayArrow,
        ]) {
            expect(dynamicColorInjection.has(type)).toBe(true);
        }
    });

    it('matches custom line colors by paint when choosing the surviving numbered badge', () => {
        const customRed: Theme = [CityCode.Other, '', '#FF0000', MonoColour.white];
        const customGreen: Theme = [CityCode.Other, '', '#00FF00', MonoColour.black];
        const graph = makeGraph([customRed, customGreen]);
        checkAndChangeStationIntType(graph, 'stn_center');
        const attrs = graph.getNodeAttribute('stn_center', StationType.TaipeiMetroInt)!;
        attrs.transfer[0][1] = [...customGreen, 'C', '04', 'hollow'];
        graph.setNodeAttribute('stn_center', StationType.TaipeiMetroInt, attrs);
        const frame = createFrameStationGraph(graph, new Set(['line_1']));
        expect(frame.getNodeAttribute('stn_center', StationType.TaipeiMetroBasic)).toMatchObject({
            color: customGreen,
            lineCode: 'C',
            stationCode: '04',
            filled: false,
        });
        graph.dropEdge('line_0');
        checkAndChangeStationIntType(graph, 'stn_center');
        expect(graph.getNodeAttribute('stn_center', StationType.TaipeiMetroBasic)).toMatchObject({
            color: customGreen,
            lineCode: 'C',
            stationCode: '04',
            filled: false,
        });
    });
});

describe('Taipei save upgrade 80 → 81', () => {
    it('keeps legacy badge sizes while preserving explicit new sizes', () => {
        const graph = createTestLineGraph([]);
        [undefined, 20].forEach((size, i) => {
            const legacyAttrs = { code: 'BR', color: red, tram: false, ...(size ? { size } : {}) };
            graph.addNode(`misc_node_badge_${i}`, {
                x: i * 100,
                y: 0,
                zIndex: 0,
                visible: true,
                type: MiscNodeType.TaiPeiMetroLineBadege,
                [MiscNodeType.TaiPeiMetroLineBadege]: legacyAttrs,
            });
        });
        const upgraded = JSON.parse(UPGRADE_COLLECTION[80](JSON.stringify({ version: 80, graph: graph.export() })));
        expect(upgraded.version).toBe(81);
        expect(upgraded.graph.nodes[0].attributes[MiscNodeType.TaiPeiMetroLineBadege]).toEqual({
            code: 'BR',
            color: red,
            size: 16,
        });
        expect(upgraded.graph.nodes[1].attributes[MiscNodeType.TaiPeiMetroLineBadege]).toEqual({
            code: 'BR',
            color: red,
            size: 20,
        });
    });
});
