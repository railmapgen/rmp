import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { LinePathType, LineStyleType } from '../constants/lines';
import stations from '../components/svgs/stations/stations';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import singleColor, { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import { count } from 'console';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';

interface edgeVector {
    target: string;
    next: any;
    color: Array<string>;
}

// // Copied from RMG/src/constants/constants.ts
// // And deleted 'export'
// export enum RmgStyle {
//     MTR = 'mtr',
//     GZMTR = 'gzmtr',
//     SHMetro = 'shmetro',
// }

// export enum CanvasType {
//     Destination = 'destination',
//     RunIn = 'runin',
//     RailMap = 'railmap',
//     Indoor = 'indoor',
// }

// export enum PanelTypeGZMTR {
//     gz1 = 'gz1',
//     gz28 = 'gz28',
//     gz2otis = 'gz2otis',
//     gz3 = 'gz3',
//     gz4 = 'gz4',
//     gz5 = 'gz5',
//     gz1421 = 'gz1421',
//     gz6 = 'gz6',
//     gzgf = 'gzgf',
// }

// export enum PanelTypeShmetro {
//     sh = 'sh',
//     sh2020 = 'sh2020',
// }

// /**
//  * @property {string} 0 - Chinese characters
//  * @property {string} 1 - Latin characters
//  */
// type Name = [string, string];

// enum Direction {
//     left = 'left',
//     right = 'right',
// }

// enum ShortDirection {
//     left = 'l',
//     right = 'r',
// }

// enum BranchStyle {
//     through = 'through',
//     nonThrough = 'nonthrough',
// }

// /**
//  * Information of branch on both side.
//  * @property 0 - branch type
//  * @property 1 - ID of the first station of the branch (should also be one of the station's parents/children) or empty
//  */
// type BranchInfo = Record<Direction, [BranchStyle, string] | []>;

// enum Services {
//     local = 'local',
//     express = 'express',
//     direct = 'direct',
// }

// interface ColineInfo {
//     from: string;
//     to: string;
//     colors: ColineColours[];
//     display: boolean;
// }

// type ColineColours = [...Theme, ...Name];

// interface ExtendedInterchangeInfo {
//     theme?: Theme;
//     name: Name;
//     facility?: Facilities;
// }

// interface InterchangeGroup {
//     name?: Name;
//     lines: ExtendedInterchangeInfo[];
// }

// interface StationTransfer {
//     /**
//      * Direction of text/tick of interchanges.
//      */
//     tick_direc: ShortDirection;
//     /**
//      * Flag of paid area within out-of-station interchange.
//      */
//     paid_area: boolean;
//     groups: [InterchangeGroup, ...InterchangeGroup[]];
// }

// const FACILITIES = {
//     '': 'None',
//     airport: 'Airport',
//     hsr: 'High speed rail',
//     railway: 'National rail',
//     disney: 'Disneyland resort',
//     np360: 'Ngong Ping 360',
// };
// type Facilities = keyof typeof FACILITIES;

// interface StationInfo {
//     title?: string;
//     /**
//      * Station name in two languages.
//      */
//     name: Name;
//     secondaryName: false | Name;
//     /**
//      * Station number. (GZMTR specific)
//      */
//     num: string;
//     /**
//      * Dictionary of the information of branch on the station's both side.
//      */
//     branch: BranchInfo;
//     /**
//      * Array of parents' IDs.
//      */
//     parents: string[];
//     /**
//      * Array of children's IDs.
//      */
//     children: string[];
//     /**
//      * Detail of interchanges.
//      */
//     transfer: StationTransfer;
//     /**
//      * Array of services at this station.
//      */
//     services: Services[];
//     /**
//      * Facility near the station.
//      */
//     facility: Facilities;
//     /**
//      * Is a pivot station in the loop.
//      */
//     loop_pivot: boolean;
//     /**
//      * Whether display Chinese and English in the same line.
//      */
//     one_line: boolean;
//     /**
//      * Padding between int box and station name. Default to 355 in updateParam.
//      * This is calculated from (svg_height - 200) * 1.414 where typical svg_height
//      * is 450 and station element is tilted at a 45-degree angle.
//      */
//     int_padding: number;
// }

// type StationDict = Record<string, StationInfo>;

// /**
//  * Dictionary of configuration parameters for RMG, stored in `localStorage` as string.
//  */
// export interface RMGParam {
//     svgWidth: Record<CanvasType, number>;
//     svg_height: number;
//     style: RmgStyle;
//     /**
//      * Vertical position (in percentage) of line.
//      */
//     y_pc: number;
//     /**
//      * Left and right margin of line (in percentage).
//      */
//     padding: number;
//     /** Branch spacing percentage (space between upper and lower branch).
//      *  In SHMetro loop line, this is also used in determining vertical padding.
//      */
//     branchSpacingPct: number;
//     direction: ShortDirection;
//     /**
//      * Platform number of the destination canvas. Set to '' will hide the element.
//      */
//     platform_num: string;
//     theme: Theme;
//     line_name: Name;
//     current_stn_idx: keyof StationDict;
//     /**
//      * Key-value pairs of the information of each station.
//      */
//     stn_list: StationDict;
//     namePosMTR: {
//         /**
//          * Flag of whether station names staggered. If false, place name above line.
//          */
//         isStagger: boolean;
//         /**
//          * Flag of flipping station names.
//          * When `isStagger === false`, names are above line if `isFlip === false`.
//          */
//         isFlip: boolean;
//     };
//     /**
//      * Customise destination sign of MTR style.
//      */
//     customiseMTRDest: {
//         /**
//          * Flag of legacy style. (Show line name before 'to').
//          */
//         isLegacy: boolean;
//         /**
//          * Customise terminal stations.
//          */
//         terminal: false | Name;
//     };
//     line_num: string;
//     psd_num: string;
//     info_panel_type: PanelTypeGZMTR | PanelTypeShmetro;
//     notesGZMTR: Note[];
//     direction_gz_x: number;
//     direction_gz_y: number;
//     coline: Record<string, ColineInfo>;
//     loop: boolean;
//     loop_info: {
//         /**
//          * Bank the closed rectangular path (railmap) or not.
//          */
//         bank: boolean;
//         /**
//          * Station size on the left and right side. Integer only, will be `Math.floor`ed.
//          * Also, this factor is subject to several rules, see loop-shmetro for more info.
//          */
//         left_and_right_factor: number;
//         /**
//          * Station size on the bottom side. Integer only, will be `Math.floor`ed.
//          * Also, this factor is subject to several rules, see loop-shmetro for more info.
//          */
//         bottom_factor: number;
//     };
// }

// let newParam: RMGParam = {
//     svgWidth: {
//         destination: 100,
//         runin: 100,
//         railmap: 100,
//         indoor: 100,
//     },
//     svg_height: 100,
//     style: RmgStyle.MTR,
//     y_pc: 50,
//     padding: 10,
//     branchSpacingPct: 10,
//     direction: ShortDirection.left,
//     platform_num: '1',
//     theme: [CityCode.Other, 'twl', '#E2231A', MonoColour.white],
//     line_name: ['線', 'line'],
//     current_stn_idx: '',
//     stn_list: {},
//     namePosMTR: {
//         isStagger: true,
//         isFlip: true,
//     },
//     customiseMTRDest: {
//         isLegacy: false,
//         terminal: false,
//     },
//     line_num: '1',
//     psd_num: '1',
//     info_panel_type: PanelTypeGZMTR.gz1,
//     notesGZMTR: [],
//     direction_gz_x: 0,
//     direction_gz_y: 0,
//     coline: {},
//     loop: false,
//     loop_info: {
//         bank: true,
//         left_and_right_factor: 1,
//         bottom_factor: 1,
//     },
// };
// */

const visStn: Set<any> = new Set();
const colorList: Set<Array<string>> = new Set<Array<string>>();
const colorStart: Map<Array<string>, string> = new Map<Array<string>, string>();
const headGraph: Map<string, any> = new Map<string, any>();
let edgeGraph: Array<edgeVector> = new Array<edgeVector>();
let countGraph = 0;
const outDegree: Map<string, any> = new Map<string, any>();

interface RMGStn {
    name: Array<any>;
    secondaryName: boolean;
    num: string;
    services: Array<any>;
    parents: Array<any>;
    children: Array<any>;
    branch: {
        left: Array<any>;
        right: Array<any>;
    };
    transfer: {
        groups: [
            {
                lines: Array<any>;
            }
        ];
        tick_direc: 'r';
        paid_area: true;
    };
    facility: '';
    loop_pivot: false;
    one_line: true;
    int_padding: 355;
}

const defRMGLeft: RMGStn = {
    name: ['LEFT END', 'LEFT END'],
    secondaryName: false,
    num: '00',
    services: ['local'],
    parents: [],
    children: ['lineend'],
    branch: {
        left: [],
        right: [],
    },
    transfer: {
        groups: [
            {
                lines: [],
            },
        ],
        tick_direc: 'r',
        paid_area: true,
    },
    facility: '',
    loop_pivot: false,
    one_line: true,
    int_padding: 355,
};

const defRMGRight: RMGStn = {
    name: ['RIGHT END', 'RIGHT END'],
    secondaryName: false,
    num: '00',
    services: ['local'],
    parents: ['linestart'],
    children: [],
    branch: {
        left: [],
        right: [],
    },
    transfer: {
        groups: [
            {
                lines: [],
            },
        ],
        tick_direc: 'r',
        paid_area: true,
    },
    facility: '',
    loop_pivot: false,
    one_line: true,
    int_padding: 355,
};

const useStn: any = {};

const newParamTemple = {
    svgWidth: {
        destination: 1200,
        runin: 1200,
        railmap: 1200,
        indoor: 1200,
    },
    svg_height: 300,
    style: 'shmetro',
    y_pc: 50,
    padding: 10,
    branchSpacingPct: 33,
    direction: 'l',
    platform_num: '1',
    theme: ['hongkong', 'twl', '#E2231A', '#fff'],
    line_name: ['地鐵線', 'Metro Line'],
    current_stn_idx: 'jlaMj2',
    stn_list: useStn,
    namePosMTR: {
        isStagger: true,
        isFlip: true,
    },
    customiseMTRDest: {
        isLegacy: false,
        terminal: false,
    },
    line_num: '1',
    psd_num: '1',
    info_panel_type: 'gz1',
    notesGZMTR: [],
    direction_gz_x: 40,
    direction_gz_y: 70,
    coline: {},
    loop: false,
    loop_info: {
        bank: true,
        left_and_right_factor: 1,
        bottom_factor: 1,
    },
};

let newParam = newParamTemple;

const addEdge = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, lineId: string) => {
    console.log(lineId);
    const u = graph.extremities(lineId)[0];
    const v = graph.extremities(lineId)[1];
    const now = graph.getEdgeAttributes(lineId);
    console.log(now);
    const nowStyle: string = now.style;
    if (nowStyle == LineStyleType['SingleColor']) {
        // @ts-ignore-error
        const nowColor: Array<string> = now[LineStyleType['SingleColor']].color;
        if (colorList.has(nowColor)) console.warn('HAS');
        if (!colorList.has(nowColor)) {
            colorList.add(nowColor);
            colorStart.set(nowColor, u);
            console.warn('HEY COLOR');
        }
        /*
        // const newEdgeVector: edgeVector = ;
        // @ts-ignore-error [v, nowColor]
        const tmpGraph: Array<edgeVector> = edgeGraph.get(u);
        // @ts-ignore-error
        tmpGraph.push({ target = v, color = nowColor });
        edgeGraph.set(u, tmpGraph);
        */
        // countGraph;
        if (!headGraph.has(u)) {
            edgeGraph.push({ target: v, next: -1, color: nowColor });
        } else {
            edgeGraph.push({ target: v, next: headGraph.get(u), color: nowColor });
        }
        headGraph.set(u, countGraph);
        countGraph++;
        if (!headGraph.has(v)) {
            edgeGraph.push({ target: u, next: -1, color: nowColor });
        } else {
            edgeGraph.push({ target: u, next: headGraph.get(v), color: nowColor });
        }
        headGraph.set(v, countGraph);
        countGraph++;
    }
};

const edgeDfs = (u: any, f: any, color: Array<string>) => {
    if (visStn.has(u)) {
        return;
    }
    visStn.add(u);
    console.log('DFS: ' + u);
    let countDegree = 0;
    // @ts-ignore-error
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (col != color) continue;
        countDegree++;
        // if (v == f) continue;
        edgeDfs(v, u, color);
    }
    outDegree.set(u, countDegree);
};

const generateNewStn = (
    u: any,
    f: any,
    counter: any,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    color: Array<string>
) => {
    if (visStn.has(u)) {
        return;
    }
    visStn.add(u);
    console.log('DFS2: ' + u);
    // @ts-ignore-error
    const newNames = graph.getNodeAttributes(u)[graph.getNodeAttributes(u).type].names;
    const newRMGStn: RMGStn = {
        name: newNames,
        secondaryName: false,
        num: String(counter),
        services: ['local'],
        parents: [f],
        children: [newParam.stn_list[f].children],
        branch: {
            left: [],
            right: [],
        },
        transfer: {
            groups: [
                {
                    lines: [],
                },
            ],
            tick_direc: 'r',
            paid_area: true,
        },
        facility: '',
        loop_pivot: false,
        one_line: true,
        int_padding: 355,
    };
    newParam.stn_list[u] = newRMGStn;
    newParam.stn_list[f].children = u;
    newParam.stn_list[newParam.stn_list[u].children].parents = u;
    // @ts-ignore-error
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (col[0] == color[0] && col[1] == color[1] && col[2] == color[2] && col[3] == color[3]) {
            console.error('GO');
            console.log(col);
            console.log(color);
            generateNewStn(v, u, counter + 1, graph, color);
        }
    }
};

const downloadBlobAs = (filename: string, blob: Blob) => {
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

const downloadAs = (filename: string, type: string, data: any) => {
    const blob = new Blob([data], { type });
    downloadBlobAs(filename, blob);
};

/**
 * Convert RMP to RMG
 * @param graph Graph.
 */
export const toRmg = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    visStn.clear();
    colorList.clear();
    colorStart.clear();
    headGraph.clear();
    edgeGraph = new Array<edgeVector>();
    countGraph = 0;
    outDegree.clear();
    graph
        .filterEdges(edge => edge.startsWith('line'))
        .forEach(edgeId => {
            addEdge(graph, edgeId);
        });
    console.info(colorList);
    colorList.forEach(value => {
        visStn.clear();
        outDegree.clear();
        console.log('Start DFS color as ' + value[2]);
        edgeDfs(colorStart.get(value), 'line_root', value);
        let newStart = 'no_val';
        let branchFlag = true;
        for (const [u, deg] of outDegree) {
            if (deg == 1) {
                newStart = u;
            }
            if (deg > 4) {
                branchFlag = false;
            }
        }
        if (!branchFlag) {
            // throw error
        }
        let newType: string;
        switch (graph.getNodeAttributes(newStart).type) {
            case StationType.GzmtrBasic:
            case StationType.GzmtrInt:
                newType = 'gzmtr';
                break;
            case StationType.MTR:
                newType = 'mtr';
                break;
            default:
                newType = 'shmetro';
                break;
        }
        newParam = newParamTemple;
        newParam.theme = value;
        console.warn(newParam.theme);
        newParam.style = newType;
        newParam.current_stn_idx = newStart;
        newParam.stn_list['linestart'] = defRMGLeft;
        newParam.stn_list['lineend'] = defRMGRight;
        visStn.clear();
        generateNewStn(newStart, 'linestart', 1, graph, value);
        if (newStart != 'no_val') {
            // line
            console.log('Color ' + value[2] + 'is a line.');
        } else {
            // ring
            console.log('Color ' + value[2] + 'is a ring.');
        }
        console.log(newParam);
        downloadAs(`RMP_genRMG.json`, 'application/json', JSON.stringify(newParam));
    });
};

/*
const readJson =
    '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_VRv1gDdHzR","attributes":{"visible":true,"zIndex":0,"x":140,"y":400,"type":"bjsubway-basic","bjsubway-basic":{"names":["1","e1"],"nameOffsetX":"right","nameOffsetY":"top","open":true}}},{"key":"stn_udgGZ7NZbz","attributes":{"visible":true,"zIndex":0,"x":310,"y":400,"type":"bjsubway-basic","bjsubway-basic":{"names":["2","e2"],"nameOffsetX":"right","nameOffsetY":"top","open":true}}},{"key":"stn_sM1bBoNvpj","attributes":{"visible":true,"zIndex":0,"x":490,"y":400,"type":"bjsubway-basic","bjsubway-basic":{"names":["3","e3"],"nameOffsetX":"right","nameOffsetY":"top","open":true}}}],"edges":[{"key":"line_KOvisSrKIT","source":"stn_VRv1gDdHzR","target":"stn_udgGZ7NZbz","attributes":{"visible":true,"zIndex":0,"type":"diagonal","diagonal":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":10},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":""}},{"key":"line_KhIQ6E78Zx","source":"stn_udgGZ7NZbz","target":"stn_sM1bBoNvpj","attributes":{"visible":true,"zIndex":0,"type":"diagonal","diagonal":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":10},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":""}}]},"version":11}';

const visStn: Set<any> = new Set();

function toRmg(json: string) {
    const data = JSON.parse(json);
    const { nodes, edges } = data.graph;
    const nodeMap = new Map<string, string>();
    const edgeMap = new Map<string, string>();
    const nodeIds = nodes.map((node: { key: any }) => {
        const { key } = node;
        nodeMap.set(key, key);
        return key;
    });
    const edgeIds = edges.map((edge: { key: any }) => {
        const { key } = edge;
        edgeMap.set(key, key);
        return key;
    });

    nodeMap.forEach((key, val) => {
        console.log(key, val);
    });

    // const rmg = {
    //     nodes: nodeIds,
    //     edges: edgeIds,
    //     nodeMap,
    //     edgeMap,
    // };
    // return rmg;
}

toRmg(readJson);
*/
