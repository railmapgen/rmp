import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import {
    CanvasType,
    PanelTypeShmetro,
    RMGParam,
    RmgStyle,
    Services,
    ShortDirection,
    StationInfo,
} from '../constants/rmg';
import { LinePathType } from '../constants/lines';
import { parseRmgParam } from './rmg-param-parser';

const makeStation = (name: string, parents: string[], children: string[]): StationInfo => ({
    localisedName: { zh: name, en: name },
    num: '',
    parents,
    children,
    transfer: {
        tick_direc: ShortDirection.right,
        paid_area: true,
        groups: [{}],
    },
    services: [Services.local],
    loop_pivot: false,
    one_line: false,
    int_padding: 355,
    character_spacing: 0,
});

const rmgParam = {
    svgWidth: {
        [CanvasType.Destination]: 1200,
        [CanvasType.RunIn]: 1200,
        [CanvasType.RailMap]: 1200,
        [CanvasType.Indoor]: 1200,
    },
    svg_height: 300,
    info_panel_type: PanelTypeShmetro.sh,
    line_num: '1',
    style: RmgStyle.SHMetro,
    y_pc: 50,
    padding: 10,
    branchSpacingPct: 30,
    direction: ShortDirection.right,
    platform_num: '',
    theme: [CityCode.Shanghai, 'sh1', '#E3002B', MonoColour.white],
    line_name: ['Line 1', 'Line 1'],
    current_stn_idx: 'a',
    stn_list: {
        linestart: makeStation('', [], ['a']),
        a: makeStation('A', ['linestart'], ['b']),
        b: makeStation('B', ['a'], ['lineend']),
        lineend: makeStation('', ['b'], []),
    },
    namePosMTR: { isStagger: false, isFlip: false },
    customiseMTRDest: { isLegacy: false, terminal: false },
    psd_num: '',
    coachNum: '',
    direction_gz_x: 0,
    direction_gz_y: 0,
    coline: {},
    loop: false,
    loop_info: {
        bank: false,
        left_and_right_factor: 0,
        bottom_factor: 0,
    },
} satisfies RMGParam;

describe('parseRmgParam', () => {
    it('imports RMG lines in a map-enabled free-user context', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        expect(() => parseRmgParam(graph, rmgParam, 0, 0, false)).not.toThrow();
        expect(graph.order).toBe(2);
        expect(graph.size).toBe(1);
        expect(graph.getEdgeAttribute(graph.edges()[0], 'type')).toBe(LinePathType.Diagonal);
    });
});
