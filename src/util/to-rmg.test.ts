import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { linePaths } from '../components/svgs/lines/lines';
import miscNodes from '../components/svgs/nodes/misc-nodes';
import stations from '../components/svgs/stations/stations';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createTestLineGraph } from '../test-utils';
import { colorToString, toRmg } from './to-rmg';

const color: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];

describe('Unit tests for to rmg function', () => {
    it('will return one line for only two stations', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_1', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);
        for (let i = 0; i < toRmgRes.length; i++) {
            toRmgRes[i].id = '';
        }

        expect(toRmgRes).toEqual([
            {
                id: '',
                theme: color,
                param: [
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_2',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_2'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_1'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_2'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_1'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_1',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_1'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_2'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_1'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_2'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                ],
                type: 'LINE',
            },
        ]);
    });

    it('will return loop line on loop', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_3', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_1', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_2', 'stn_1', 'stn_3', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_3', 'stn_3', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);

        for (let i = 0; i < toRmgRes.length; i++) {
            toRmgRes[i].id = '';
        }

        expect(toRmgRes).toEqual([
            {
                id: '',
                param: [
                    [
                        {
                            branchSpacingPct: 33,
                            coachNum: '1',
                            coline: {},
                            current_stn_idx: 'stn_2',
                            customiseMTRDest: {
                                isLegacy: false,
                                terminal: false,
                            },
                            direction: 'r',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            info_panel_type: 'sh',
                            line_name: ['地鐵線', 'Metro Line'],
                            line_num: '1',
                            loop: true,
                            loop_info: {
                                bank: true,
                                bottom_factor: 1,
                                left_and_right_factor: 0,
                            },
                            namePosMTR: {
                                isFlip: true,
                                isStagger: true,
                            },
                            padding: 10,
                            platform_num: '1',
                            psd_num: '1',
                            stn_list: {
                                lineend: {
                                    branch: {
                                        left: undefined,
                                    },
                                    character_spacing: 0,
                                    children: [],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'RIGHT END',
                                    },
                                    loop_pivot: false,
                                    num: '00',
                                    one_line: true,
                                    parents: ['stn_1'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                linestart: {
                                    character_spacing: 0,
                                    children: ['stn_2'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'LEFT END',
                                    },
                                    loop_pivot: false,
                                    num: '00',
                                    one_line: true,
                                    parents: [],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_1: {
                                    character_spacing: 0,
                                    children: ['lineend'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '3',
                                    one_line: true,
                                    parents: ['stn_3'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_2: {
                                    character_spacing: 0,
                                    children: ['stn_3'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '1',
                                    one_line: true,
                                    parents: ['linestart'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_3: {
                                    character_spacing: 0,
                                    children: ['stn_1'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '2',
                                    one_line: true,
                                    parents: ['stn_2'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                            },
                            style: 'shmetro',
                            svgWidth: {
                                destination: 1500,
                                indoor: 1500,
                                railmap: 1500,
                                runin: 1500,
                            },
                            svg_height: 400,
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            y_pc: 50,
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            branchSpacingPct: 33,
                            coachNum: '1',
                            coline: {},
                            current_stn_idx: 'stn_3',
                            customiseMTRDest: {
                                isLegacy: false,
                                terminal: false,
                            },
                            direction: 'r',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            info_panel_type: 'sh',
                            line_name: ['地鐵線', 'Metro Line'],
                            line_num: '1',
                            loop: true,
                            loop_info: {
                                bank: true,
                                bottom_factor: 1,
                                left_and_right_factor: 0,
                            },
                            namePosMTR: {
                                isFlip: true,
                                isStagger: true,
                            },
                            padding: 10,
                            platform_num: '1',
                            psd_num: '1',
                            stn_list: {
                                lineend: {
                                    branch: {
                                        left: undefined,
                                    },
                                    character_spacing: 0,
                                    children: [],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'RIGHT END',
                                    },
                                    loop_pivot: false,
                                    num: '00',
                                    one_line: true,
                                    parents: ['stn_1'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                linestart: {
                                    character_spacing: 0,
                                    children: ['stn_3'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'LEFT END',
                                    },
                                    loop_pivot: false,
                                    num: '00',
                                    one_line: true,
                                    parents: [],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_1: {
                                    character_spacing: 0,
                                    children: ['lineend'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '3',
                                    one_line: true,
                                    parents: ['stn_2'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_2: {
                                    character_spacing: 0,
                                    children: ['stn_1'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '2',
                                    one_line: true,
                                    parents: ['stn_3'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_3: {
                                    character_spacing: 0,
                                    children: ['stn_2'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '1',
                                    one_line: true,
                                    parents: ['linestart'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                            },
                            style: 'shmetro',
                            svgWidth: {
                                destination: 1500,
                                indoor: 1500,
                                railmap: 1500,
                                runin: 1500,
                            },
                            svg_height: 400,
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            y_pc: 50,
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            branchSpacingPct: 33,
                            coachNum: '1',
                            coline: {},
                            current_stn_idx: 'stn_1',
                            customiseMTRDest: {
                                isLegacy: false,
                                terminal: false,
                            },
                            direction: 'r',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            info_panel_type: 'sh',
                            line_name: ['地鐵線', 'Metro Line'],
                            line_num: '1',
                            loop: true,
                            loop_info: {
                                bank: true,
                                bottom_factor: 1,
                                left_and_right_factor: 0,
                            },
                            namePosMTR: {
                                isFlip: true,
                                isStagger: true,
                            },
                            padding: 10,
                            platform_num: '1',
                            psd_num: '1',
                            stn_list: {
                                lineend: {
                                    branch: {
                                        left: undefined,
                                    },
                                    character_spacing: 0,
                                    children: [],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'RIGHT END',
                                    },
                                    loop_pivot: false,
                                    num: '00',
                                    one_line: true,
                                    parents: ['stn_2'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                linestart: {
                                    character_spacing: 0,
                                    children: ['stn_1'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'LEFT END',
                                    },
                                    loop_pivot: false,
                                    num: '00',
                                    one_line: true,
                                    parents: [],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_1: {
                                    character_spacing: 0,
                                    children: ['stn_3'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '1',
                                    one_line: true,
                                    parents: ['linestart'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_2: {
                                    character_spacing: 0,
                                    children: ['lineend'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '3',
                                    one_line: true,
                                    parents: ['stn_3'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                                stn_3: {
                                    character_spacing: 0,
                                    children: ['stn_2'],
                                    int_padding: 355,
                                    localisedName: {
                                        en: 'Stn',
                                        zh: '车站',
                                    },
                                    loop_pivot: false,
                                    num: '2',
                                    one_line: true,
                                    parents: ['stn_1'],
                                    services: ['local'],
                                    transfer: {
                                        groups: [{}],
                                        paid_area: true,
                                        tick_direc: 'r',
                                    },
                                },
                            },
                            style: 'shmetro',
                            svgWidth: {
                                destination: 1500,
                                indoor: 1500,
                                railmap: 1500,
                                runin: 1500,
                            },
                            svg_height: 400,
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            y_pc: 50,
                        },
                        '车站',
                        'Stn',
                    ],
                ],
                theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                type: 'LOOP',
            },
        ]);
    });

    it('will return branch line on branch line', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: -1,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_3', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 2,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_a', {
            visible: true,
            zIndex: 0,
            x: -1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_a', 'stn_1', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_2', 'stn_a', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_3', 'stn_a', 'stn_3', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);

        for (let i = 0; i < toRmgRes.length; i++) {
            toRmgRes[i].id = '';
        }

        expect(toRmgRes).toEqual([
            {
                id: '',
                theme: color,
                param: [
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_3',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_3'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_1', 'stn_2'],
                                    children: [],
                                    branch: { left: ['through', 'stn_1'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_a'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_a'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_a: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_3'],
                                    children: ['stn_1', 'stn_2'],
                                    branch: { right: ['through', 'stn_1'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_3: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_a'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_2',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_2'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_1', 'stn_3'],
                                    children: [],
                                    branch: { left: ['through', 'stn_1'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_3: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_a'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_a'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_a: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_2'],
                                    children: ['stn_1', 'stn_3'],
                                    branch: { right: ['through', 'stn_1'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_a'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_1',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_1'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_2', 'stn_3'],
                                    children: [],
                                    branch: { left: ['through', 'stn_2'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_3: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_a'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_a'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_a: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_1'],
                                    children: ['stn_2', 'stn_3'],
                                    branch: { right: ['through', 'stn_2'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_a'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                ],
                type: 'BRANCH',
            },
        ]);
    });

    it('will return lamp line on lamp line', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_3', {
            visible: true,
            zIndex: 0,
            x: 3,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_4', {
            visible: true,
            zIndex: 0,
            x: 2,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_1', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_2', 'stn_2', 'stn_3', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_3', 'stn_3', 'stn_4', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_4', 'stn_4', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);

        for (let i = 0; i < toRmgRes.length; i++) {
            toRmgRes[i].id = '';
        }

        expect(toRmgRes).toEqual([
            {
                id: '',
                theme: color,
                param: [
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_1',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_1'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_4'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_3: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '3',
                                    services: ['local'],
                                    parents: ['stn_2'],
                                    children: ['stn_4'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_4: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '4',
                                    services: ['local'],
                                    parents: ['stn_3', 'stn_2'],
                                    children: ['lineend'],
                                    branch: { left: ['through', 'stn_3'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_1'],
                                    children: ['stn_3', 'stn_4'],
                                    branch: { right: ['through', 'stn_3'] },
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_2'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                ],
                type: 'BRANCH',
            },
        ]);
    });

    it('will not throw error if only one edge connect a station and a virtual node', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('misc_node_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 1,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: miscNodes[MiscNodeType.Virtual].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_1', 'misc_node_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);

        expect(toRmgRes).toEqual([]);
    });

    it('will not throw error if only one station connects more than 3 stations', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: -1,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_3', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 2,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_4', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 3,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_a', {
            visible: true,
            zIndex: 0,
            x: -1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_a', 'stn_1', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_2', 'stn_a', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_3', 'stn_a', 'stn_3', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_4', 'stn_a', 'stn_4', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);

        expect(toRmgRes).toEqual([]);
    });

    it('will return two part in one theme', () => {
        const graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = new MultiDirectedGraph();
        graph.addNode('stn_1', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_2', {
            visible: true,
            zIndex: 0,
            x: 1,
            y: 1,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_3', {
            visible: true,
            zIndex: 0,
            x: 2,
            y: 2,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addNode('stn_4', {
            visible: true,
            zIndex: 0,
            x: 3,
            y: 3,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: stations[StationType.ShmetroBasic].defaultAttrs,
        });
        graph.addDirectedEdgeWithKey('line_1', 'stn_1', 'stn_2', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('line_2', 'stn_3', 'stn_4', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: linePaths[LinePathType.Simple].defaultAttrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color },
            reconcileId: '',
            parallelIndex: -1,
        });

        const toRmgRes = toRmg(graph);

        for (let i = 0; i < toRmgRes.length; i++) {
            toRmgRes[i].id = '';
        }

        expect(toRmgRes).toEqual([
            {
                id: '',
                theme: color,
                param: [
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_2',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_2'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_1'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_2'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_1'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_1',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_1'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_2'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_2: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_1'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_1: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_2'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                ],
                type: 'LINE',
            },
            {
                id: '',
                theme: color,
                param: [
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_4',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_4'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_3'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_3: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_4'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_4: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_3'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                    [
                        {
                            svgWidth: { destination: 1500, runin: 1500, railmap: 1500, indoor: 1500 },
                            svg_height: 400,
                            style: 'shmetro',
                            y_pc: 50,
                            padding: 10,
                            branchSpacingPct: 33,
                            direction: 'r',
                            platform_num: '1',
                            theme: ['shanghai', 'sh1', '#E4002B', '#fff'],
                            line_name: ['地鐵線', 'Metro Line'],
                            current_stn_idx: 'stn_3',
                            stn_list: {
                                linestart: {
                                    localisedName: { en: 'LEFT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: [],
                                    children: ['stn_3'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                lineend: {
                                    localisedName: { en: 'RIGHT END' },
                                    character_spacing: 0,
                                    num: '00',
                                    services: ['local'],
                                    parents: ['stn_4'],
                                    children: [],
                                    branch: {},
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_4: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '2',
                                    services: ['local'],
                                    parents: ['stn_3'],
                                    children: ['lineend'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                                stn_3: {
                                    localisedName: { zh: '车站', en: 'Stn' },
                                    character_spacing: 0,
                                    num: '1',
                                    services: ['local'],
                                    parents: ['linestart'],
                                    children: ['stn_4'],
                                    transfer: { groups: [{}], tick_direc: 'r', paid_area: true },
                                    loop_pivot: false,
                                    one_line: true,
                                    int_padding: 355,
                                },
                            },
                            namePosMTR: { isStagger: true, isFlip: true },
                            customiseMTRDest: { isLegacy: false, terminal: false },
                            line_num: '1',
                            psd_num: '1',
                            info_panel_type: 'sh',
                            direction_gz_x: 40,
                            direction_gz_y: 70,
                            coline: {},
                            loop: false,
                            loop_info: { bank: true, left_and_right_factor: 0, bottom_factor: 1 },
                            coachNum: '1',
                        },
                        '车站',
                        'Stn',
                    ],
                ],
                type: 'LINE',
            },
        ]);
    });
});

describe('RMG theme identity', () => {
    const paletteVariant: Theme = [CityCode.Shanghai, 'sh1', '#123456', MonoColour.black];
    const custom: Theme = [CityCode.Other, 'custom-a', '#E4002B', MonoColour.white];
    const customVariant: Theme = [CityCode.Other, 'custom-b', '#E4002B', MonoColour.white];

    it.each([
        { kind: 'palette', first: color, second: paletteVariant },
        { kind: 'custom', first: custom, second: customVariant },
    ])('joins equivalent $kind edges and does not add a self transfer', ({ first, second }) => {
        const graph = createTestLineGraph([
            ['A', 'B', first],
            ['B', 'C', second],
        ]);
        const result = toRmg(graph);
        expect(result).toHaveLength(1);
        expect(result[0].param).toHaveLength(2);
        for (const [param] of result[0].param) {
            expect(
                Object.keys(param.stn_list)
                    .filter(id => id.startsWith('stn'))
                    .sort()
            ).toEqual(['stn_A', 'stn_B', 'stn_C']);
            expect(param.stn_list.stn_B.transfer.groups[0].lines).toBeUndefined();
        }
    });

    it.each([
        { kind: 'palette line IDs', first: color, second: [CityCode.Shanghai, 'sh2', color[2], color[3]] as Theme },
        { kind: 'palette city IDs', first: color, second: [CityCode.Guangzhou, color[1], color[2], color[3]] as Theme },
        { kind: 'custom fill', first: custom, second: [CityCode.Other, custom[1], '#123456', custom[3]] as Theme },
        {
            kind: 'custom foreground',
            first: custom,
            second: [CityCode.Other, custom[1], custom[2], MonoColour.black] as Theme,
        },
        { kind: 'custom fill case', first: custom, second: [CityCode.Other, custom[1], '#e4002b', custom[3]] as Theme },
        { kind: 'palette and custom', first: color, second: custom },
    ])('keeps distinct $kind separate and preserves interchange placeholder names', ({ first, second }) => {
        const graph = createTestLineGraph([
            ['A', 'B', first],
            ['B', 'C', second],
        ]);
        const result = toRmg(graph);
        expect(result).toHaveLength(2);
        for (const [index, line] of result.entries()) {
            const other = index === 0 ? second : first;
            for (const [param] of line.param) {
                expect(Object.keys(param.stn_list).filter(id => id.startsWith('stn'))).toHaveLength(2);
                expect(param.stn_list.stn_B.transfer.groups[0].lines).toEqual([
                    { theme: other, name: [`ch_${colorToString(other)}`, `en_${colorToString(other)}`] },
                ]);
            }
        }
    });

    it('adds only one transfer for equivalent palette representations on the other line', () => {
        const other: Theme = [CityCode.Shanghai, 'sh2', '#123456', MonoColour.black];
        const otherVariant: Theme = [CityCode.Shanghai, 'sh2', '#654321', MonoColour.white];
        const graph = createTestLineGraph([
            ['A', 'B', color],
            ['B', 'C', paletteVariant],
            ['D', 'B', other],
            ['B', 'E', otherVariant],
        ]);
        const result = toRmg(graph);
        expect(result).toHaveLength(2);
        for (const line of result) {
            for (const [param] of line.param) {
                const transfers = param.stn_list.stn_B.transfer.groups[0].lines!;
                expect(transfers).toHaveLength(1);
                expect(transfers[0].theme![1]).not.toEqual(line.theme[1]);
            }
        }
    });

    it.each([
        { kind: 'palette', first: color, transferTheme: paletteVariant },
        { kind: 'custom', first: custom, transferTheme: customVariant },
    ])('matches the GZMTR station code using $kind identity', ({ first, transferTheme }) => {
        const graph = createTestLineGraph([['A', 'B', first]]);
        graph.mergeNodeAttributes('stn_A', {
            type: StationType.GzmtrInt,
            [StationType.GzmtrInt]: {
                ...structuredClone(stations[StationType.GzmtrInt].defaultAttrs),
                transfer: [[[...transferTheme, '线路', '07']], []],
            },
        });
        const result = toRmg(graph, ['stn_A']);
        expect(result).toHaveLength(1);
        expect(result[0].param[0][0].stn_list.stn_A.num).toBe('07');
    });
});

describe('on-demand RMG conversion', () => {
    it('constructs only the requested loop direction while retaining the historical station links', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]);
        const allDirections = toRmg(graph)[0].param;
        const selected = toRmg(graph, ['stn_C'])[0].param;
        expect(selected).toEqual(allDirections.filter(([param]) => param.current_stn_idx === 'stn_C'));
    });

    it('exports a long line without overflowing the JavaScript call stack', () => {
        const length = 6000;
        const connections: [string, string][] = Array.from({ length: length - 1 }, (_, index) => [
            String(index),
            String(index + 1),
        ]);
        const graph = createTestLineGraph(connections);
        const result = toRmg(graph, ['stn_0']);
        expect(result).toHaveLength(1);
        expect(result[0].param).toHaveLength(1);
        const param = result[0].param[0][0];
        expect(Object.keys(param.stn_list)).toHaveLength(length + 2);
        expect(param.stn_list.linestart.children).toEqual(['stn_0']);
        expect(param.stn_list.lineend.parents).toEqual([`stn_${length - 1}`]);
        expect(param.stn_list.stn_3000).toMatchObject({ parents: ['stn_2999'], children: ['stn_3001'] });
    });

    it.each([false, true])(
        'rejects a many-terminal branch before generating parameters (virtual tails: %s)',
        virtualTails => {
            const connections: [string, string][] = Array.from({ length: 254 }, (_, index) => [
                String(Math.floor(index / 2)),
                String(index + 1),
            ]);
            const virtual: string[] = [];
            if (virtualTails) {
                for (let index = 127; index < 255; index++) {
                    const tail = `tail_${index}`;
                    virtual.push(tail);
                    connections.push([String(index), tail]);
                }
            }
            const graph = createTestLineGraph(connections, virtual);
            const attributes = vi.spyOn(graph, 'getNodeAttributes');
            expect(toRmg(graph)).toEqual([]);
            expect(attributes).not.toHaveBeenCalled();
        }
    );

    it('visits a large loop once for a saved origin instead of generating every station origin', () => {
        const length = 1200;
        const graph = createTestLineGraph(
            Array.from({ length }, (_, index) => [String(index), String((index + 1) % length)])
        );
        const attributes = vi.spyOn(graph, 'getNodeAttributes');
        const result = toRmg(graph, ['stn_600']);
        expect(result[0].param).toHaveLength(1);
        expect(Object.keys(result[0].param[0][0].stn_list)).toHaveLength(length + 2);
        expect(result[0].param[0][0]).toMatchObject({ loop: true, current_stn_idx: 'stn_600' });
        expect(attributes).toHaveBeenCalledTimes(length + 1);
    });
});
