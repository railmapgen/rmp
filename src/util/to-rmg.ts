import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { AttributesWithColor, dynamicColorInjection } from '../components/panels/details/color-field';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LineStyleType } from '../constants/lines';
import {
    BranchStyle,
    Name,
    PanelTypeShmetro,
    RMGParam,
    RmgStyle,
    Services,
    ShortDirection,
    StationInfo,
} from '../constants/rmg';
import { StationAttributes, StationType } from '../constants/stations';
import { downloadAs } from './download';

interface edgeVector {
    target: string;
    next: number;
    color: Theme;
}

interface ThemeWithIndex {
    theme: Theme;
    index: number;
}

const visStn: Set<string> = new Set<string>();
const visVir: Set<string> = new Set<string>();
const colorList: Set<Theme> = new Set<Theme>();
const colorSet: Set<string> = new Set<string>(); // color visit
const colorStart: Map<Theme, string> = new Map<Theme, string>(); // starting stn of each color
const colorStnList: Map<string, Set<string>> = new Map<string, Set<string>>(); // list all stns in a color
const colorWithIndexList: Set<ThemeWithIndex> = new Set<ThemeWithIndex>();
const colorStartWithIndexList: Map<ThemeWithIndex, string> = new Map<ThemeWithIndex, string>(); // starting stn of each color
const headGraph: Map<string, number> = new Map<string, number>(); // head[]
let edgeGraph: edgeVector[] = []; // e[]
let countGraph = 0; // nn
const outDegree: Map<string, number> = new Map<string, number>();
const nodeIndex: Map<string, number> = new Map<string, number>();
const expandVirtualNodeVisStn: Set<string> = new Set<string>();

interface RMGInterchange {
    theme: Theme;
    name: Name;
}

const defRMGLeft: StationInfo = {
    localisedName: { en: 'LEFT END' },
    num: '00',
    services: [Services.local],
    parents: [],
    children: ['lineend'],
    transfer: {
        groups: [{}],
        tick_direc: ShortDirection.right,
        paid_area: true,
    },
    loop_pivot: false,
    one_line: true,
    int_padding: 355,
    character_spacing: 0,
};

const defRMGRight: StationInfo = {
    localisedName: { en: 'RIGHT END' },
    num: '00',
    services: [Services.local],
    parents: [],
    children: [],
    transfer: {
        groups: [{}],
        tick_direc: ShortDirection.right,
        paid_area: true,
    },
    loop_pivot: false,
    one_line: true,
    int_padding: 355,
    character_spacing: 0,
};

const useStn: any = {};

export const newParamTemplate: RMGParam = {
    svgWidth: {
        destination: 1500,
        runin: 1500,
        railmap: 1500,
        indoor: 1500,
    },
    svg_height: 400,
    style: RmgStyle.SHMetro,
    y_pc: 50,
    padding: 10,
    branchSpacingPct: 33,
    direction: ShortDirection.right,
    platform_num: '1',
    theme: [CityCode.Shanghai, 'sh1', '#E3002B', MonoColour.white],
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
    info_panel_type: PanelTypeShmetro.sh,
    direction_gz_x: 40,
    direction_gz_y: 70,
    coline: {},
    loop: false,
    loop_info: {
        bank: true,
        left_and_right_factor: 0,
        bottom_factor: 1,
    },
    coachNum: '1',
};

const newRMGStn: StationInfo = {
    localisedName: {},
    num: '',
    services: [Services.local],
    parents: [],
    children: [],
    transfer: {
        groups: [{}],
        tick_direc: ShortDirection.right,
        paid_area: true,
    },
    loop_pivot: false,
    one_line: true,
    int_padding: 355,
    character_spacing: 0,
};

// convert color['shanghai', 'sh1', ...] to a string (for compare)
export const colorToString = (color: Theme) => `${color[0]}/${color[1]}=${color[2]}${color[3]}`;

// verify the line whether is needed to add
const isColorLine = (type: LineStyleType) => dynamicColorInjection.has(type);

// get line color array
const getColor = (attr: EdgeAttributes) => {
    if (isColorLine(attr.style)) {
        return structuredClone((attr[attr.style] as AttributesWithColor).color);
    }
};

// add edge
const addEdge = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, lineId: string) => {
    const [u, v] = graph.extremities(lineId);
    const now = graph.getEdgeAttributes(lineId);
    const nowStyle = now.style;
    if (u == v) return; // skip u-u
    if (isColorLine(nowStyle)) {
        const nowColor = getColor(now)!; // as long as the graph is valid, it will never be undefined
        if (!colorSet.has(colorToString(nowColor))) {
            // count color
            colorList.add(nowColor);
            colorSet.add(colorToString(nowColor));
            colorStart.set(nowColor, u);
            colorStnList.set(colorToString(nowColor), new Set<string>());
        }
        colorStnList.get(colorToString(nowColor))!.add(u);
        colorStnList.get(colorToString(nowColor))!.add(v);
        // do add edge (u-v)
        if (!headGraph.has(u)) {
            edgeGraph.push({ target: v, next: -1, color: nowColor });
        } else {
            edgeGraph.push({ target: v, next: headGraph.get(u)!, color: nowColor });
        }
        headGraph.set(u, countGraph);
        countGraph++;
        // (v-u)
        if (!headGraph.has(v)) {
            edgeGraph.push({ target: u, next: -1, color: nowColor });
        } else {
            edgeGraph.push({ target: u, next: headGraph.get(v)!, color: nowColor });
        }
        headGraph.set(v, countGraph);
        countGraph++;
    }
};

// Handling of disconnected lines
const separateDfs = (u: string, f: string, color: Theme) => {
    if (!colorStnList.get(colorToString(color))!.has(u)) {
        return;
    }
    colorStnList.get(colorToString(color))!.delete(u);
    for (let i: number = headGraph.get(u)!; i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (colorToString(col) != colorToString(color)) continue;
        separateDfs(v, u, color);
    }
};

// Calc stn out-degree (dfs)
const edgeDfs = (u: string, f: string, color: Theme) => {
    if (visStn.has(u)) {
        return;
    }
    visStn.add(u);
    let countDegree = 0;
    const visNext: Set<string> = new Set<string>();
    for (let i: number = headGraph.get(u)!; i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (colorToString(col) != colorToString(color)) continue;
        if (visNext.has(v)) continue;
        visNext.add(v);
        countDegree++;
        if (v == f) continue;
        edgeDfs(v, u, color);
    }
    outDegree.set(u, countDegree);
};

const editLineend = (newParam: RMGParam, u: string) => {
    const newParent: string[] = newParam.stn_list['lineend'].parents;
    newParent.push(u);
    newParam.stn_list['lineend'].parents = structuredClone(newParent).reverse();
    newParam.stn_list['lineend'].branch = {
        ...newParam.stn_list['lineend'].branch,
        left: newParam.stn_list['lineend'].parents.length == 2 ? [BranchStyle.through, newParent[1]] : undefined,
    };
};

// Count children in same color
const countChild = (u: string, color: Theme) => {
    let count = 0;
    for (let i: number = headGraph.get(u)!; i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (colorToString(col) == colorToString(color)) {
            count++;
        }
    }
    return count;
};

/**
 * List children of a station (expand its children's station if it is a virtual node).
 * **subVisStn needs to be clear before run expandVirtualNode() !!!**
 */
const expandVirtualNode = (u: string, f: string, color: Theme) => {
    if (expandVirtualNodeVisStn.has(u)) return [];
    expandVirtualNodeVisStn.add(u);
    const resultList: string[] = [];
    for (let i: number = headGraph.get(u)!; i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (v == f) continue;
        if (colorToString(col) == colorToString(color)) {
            if (v.startsWith('stn')) {
                resultList.push(v);
            } else {
                resultList.push(...expandVirtualNode(v, u, color));
            }
        }
    }
    return resultList;
};

// Generate RMG saves (dfs)
const generateNewStn = (
    u: string,
    f: string,
    absFather: string,
    counter: number,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    color: Theme,
    newParam: RMGParam
) => {
    if (
        visStn.has(u) &&
        ((!u.startsWith('misc_node_') && newParam.stn_list[u] == undefined) ||
            (u.startsWith('misc_node_') && !visVir.has(u)) ||
            newParam.loop)
    ) {
        return [];
    } else if (visStn.has(u) && newParam.stn_list[u] != undefined && countChild(u, color) - 1 >= 2) {
        // parent (for MTR Racecourse Station) update branch right (merge) info
        const newParent = [...newParam.stn_list[u].parents, f];
        if (newParam.stn_list[newParent[1]] == undefined) {
            const t = newParent[0];
            newParent[0] = newParent[1];
            newParent[1] = t;
        }
        newParam.stn_list[u].parents = structuredClone(newParent).reverse();
        newParam.stn_list[u].branch = { ...newParam.stn_list[u].branch, left: [BranchStyle.through, newParent[1]] };
        // delete f in u's children
        const newChild = [];
        for (const ch of newParam.stn_list[u].children) {
            if (ch != f) {
                newChild.push(ch);
            }
        }
        newParam.stn_list[u].children = structuredClone(newChild);
        delete newParam.stn_list[u].branch?.right;
        const endParent: string[] = [];
        for (const p of newParam.stn_list['lineend'].parents) {
            if (p != u) {
                endParent.push(p);
            }
        }
        newParam.stn_list['lineend'].parents = structuredClone(endParent).reverse();
        newParam.stn_list['lineend'].branch = {
            ...newParam.stn_list['lineend'].branch,
            left: newParam.stn_list['lineend'].parents.length == 2 ? [BranchStyle.through, endParent[1]] : undefined,
        };
        if (newChild.length == 0) {
            newParam.stn_list[u].children = ['lineend'];
            editLineend(newParam, u);
        }
        return [u];
    }
    visStn.add(u);
    const newChild: string[] = [];
    const newParent: string[] = [];
    const newInterchange: RMGInterchange[] = [];
    const newInterchangeSet = new Set<string>();
    const visNext: Set<string> = new Set<string>();
    for (let i: number = headGraph.get(u)!; i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (v == absFather) continue;
        if (colorToString(col) == colorToString(color)) {
            // same color => count children
            if (visNext.has(v)) continue;
            visNext.add(v);
            if (!u.startsWith('misc_node_')) {
                // a normal stn
                const r = generateNewStn(v, u, u, counter + 1, graph, color, newParam);
                if (r.length != 0) {
                    newChild.push(...r);
                }
            } else {
                // a virtual stn, use this.father as children's father
                const r = generateNewStn(v, f, u, counter + 1, graph, color, newParam);
                if (r.length != 0) {
                    newChild.push(...r);
                }
            }
        }
        if (!newInterchangeSet.has(colorToString(col)) && colorToString(col) != colorToString(color)) {
            newInterchangeSet.add(colorToString(col));
            const tmpInterchange: RMGInterchange = {
                theme: col,
                name: [`ch_${colorToString(col)}`, `en_${colorToString(col)}`],
            };
            newInterchange.push(tmpInterchange);
        }
    }
    if (newChild.length == 2) {
        // delete branch without stn
        for (let i = 0; i < 2; i++) {
            if (newChild[i] == 'lineend') {
                newChild.splice(i, 1);
            }
        }

        // move down if no station on main line
        if (newParam.stn_list[newChild[1]].parents.length >= 2) {
            const t = newChild[0];
            newChild[0] = newChild[1];
            newChild[1] = t;
        }
    }
    if (visStn.has(u) && newParam.stn_list[u] != undefined) {
        // delete lineend info for lamp line
        const endParent: string[] = [];
        for (const p of newParam.stn_list['lineend'].parents) {
            if (p != u) {
                endParent.push(p);
            }
        }
        newParam.stn_list['lineend'].parents = structuredClone(endParent).reverse();
        newParam.stn_list['lineend'].branch = {
            ...newParam.stn_list['lineend'].branch,
            left: newParam.stn_list['lineend'].parents.length == 2 ? [BranchStyle.through, endParent[1]] : undefined,
        };
        if (newChild.length == 0) {
            expandVirtualNodeVisStn.clear();
            newParent.push(...expandVirtualNode(u, f, color));
        }
    }
    if (!u.startsWith('misc_node_')) {
        const uType = graph.getNodeAttributes(u).type as StationType;
        const uAttr = graph.getNodeAttributes(u)[uType] as StationAttributes;
        newParam.stn_list[u] = structuredClone(newRMGStn);
        newParam.stn_list[u].localisedName = { zh: uAttr.names[0], en: uAttr.names[1] };
        newParam.stn_list[u].num = String(counter);
        if (graph.getNodeAttributes(u).type == StationType.GzmtrBasic) {
            const gzAttr = uAttr as GzmtrBasicStationAttributes;
            newParam.stn_list[u].num = gzAttr.stationCode;
            if (gzAttr.secondaryNames[0] !== '' || gzAttr.secondaryNames[1] !== '') {
                newParam.stn_list[u].localisedSecondaryName = {
                    zh: gzAttr.secondaryNames[0],
                    en: gzAttr.secondaryNames[1],
                };
            }
        }
        if (graph.getNodeAttributes(u).type == StationType.GzmtrInt) {
            const gzAttr = uAttr as GzmtrIntStationAttributes;
            const tmpTransfer: Array<any> = gzAttr.transfer[0];
            for (const p of tmpTransfer) {
                if (colorToString(p) == colorToString(color)) {
                    newParam.stn_list[u].num = String(p[5]);
                    break;
                }
            }
            if (gzAttr.secondaryNames[0] !== '' || gzAttr.secondaryNames[1] !== '') {
                newParam.stn_list[u].localisedSecondaryName = {
                    zh: gzAttr.secondaryNames[0],
                    en: gzAttr.secondaryNames[1],
                };
            }
        }
        if (newChild.length != 0) {
            newParam.stn_list[u].children = structuredClone(newChild).reverse();
            if (newChild.length == 2) {
                newParam.stn_list[u].branch = {
                    ...newParam.stn_list[u].branch,
                    right: [BranchStyle.through, newChild[1]],
                };
            }
        } else {
            newParam.stn_list[u].children = ['lineend'];
            editLineend(newParam, u);
        }
        newParent.push(f);
        newParam.stn_list[u].parents = structuredClone(newParent).reverse();
        if (newParent.length == 2) {
            newParam.stn_list[u].branch = { ...newParam.stn_list[u].branch, left: [BranchStyle.through, newParent[1]] };
        }
        if (newInterchange.length != 0) {
            newParam.stn_list[u].transfer.groups[0].lines = structuredClone(newInterchange);
        }
        return [u];
    } else {
        // if this is a virtual stn, return the children of u.
        visVir.add(u);
        return newChild;
    }
};

const generateParam = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    color: Theme,
    newStart: string,
    typeInfo: 'LINE' | 'BRANCH' | 'LOOP'
) => {
    const newParam = structuredClone(newParamTemplate);
    if (typeInfo == 'LOOP') {
        newParam.loop = true;
    }
    let newType: RmgStyle;
    switch (graph.getNodeAttributes(newStart).type) {
        case StationType.GzmtrBasic:
        case StationType.GzmtrInt:
            newType = RmgStyle.GZMTR;
            break;
        case StationType.MTR:
            newType = RmgStyle.MTR;
            break;
        default:
            newType = RmgStyle.SHMetro;
            break;
    }
    newParam.theme = structuredClone(color);
    newParam.style = newType;
    newParam.stn_list['linestart'] = structuredClone(defRMGLeft);
    newParam.stn_list['lineend'] = structuredClone(defRMGRight);
    visStn.clear();
    visVir.clear();
    const resStart = generateNewStn(newStart, 'linestart', 'linestart', 1, graph, color, newParam);
    newParam.current_stn_idx = resStart[0];
    newParam.stn_list['linestart'].children = [resStart[0]];
    if (Object.keys(newParam.stn_list).length <= 3 || newParam.stn_list['lineend'].parents.length >= 3)
        return undefined;
    else return structuredClone(newParam);
};

/**
 * The return type of `toRmg`.
 */
export interface ToRmg {
    id: string;
    theme: Theme;
    param: [RMGParam, ...Name][];
    type: 'LINE' | 'BRANCH' | 'LOOP';
}

/**
 * Convert RMP to RMG
 * @param graph Graph.
 */
export const toRmg = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    visStn.clear();
    colorList.clear();
    colorSet.clear();
    colorStart.clear();
    colorStnList.clear();
    colorWithIndexList.clear();
    colorStartWithIndexList.clear();
    headGraph.clear();
    edgeGraph = [];
    countGraph = 0;
    outDegree.clear();
    nodeIndex.clear();
    // calc color
    graph
        .filterEdges(edge => edge.startsWith('line'))
        .forEach(edgeId => {
            if (isColorLine(graph.getEdgeAttributes(edgeId).style)) {
                addEdge(graph, edgeId);
            }
        });
    // calc node index
    let index = 0;
    graph.forEachNode(u => {
        nodeIndex.set(u, ++index);
    });
    nodeIndex.set('lineend', ++index);
    const resultList: ToRmg[] = [];
    for (const color of colorList) {
        let colorIndex = 0;
        while (colorStnList.get(colorToString(color))!.size != 0) {
            let u = 'line_root';
            colorStnList.get(colorToString(color))!.forEach(stnId => {
                if (u == 'line_root') u = stnId;
            });
            separateDfs(u, 'line_root', color);
            const colorWithIndex: ThemeWithIndex = { theme: color, index: ++colorIndex };
            colorWithIndexList.add(colorWithIndex);
            colorStartWithIndexList.set(colorWithIndex, u);
        }
    }
    for (const colorWithIndex of colorWithIndexList) {
        const { theme: color } = colorWithIndex;
        visStn.clear();
        outDegree.clear();
        edgeDfs(colorStartWithIndexList.get(colorWithIndex)!, 'line_root', color);
        let branchErrorFlag = true;
        let typeInfo: 'LINE' | 'BRANCH' | 'LOOP' = 'LINE';
        const entrance: string[] = [];
        for (const [u, deg] of outDegree) {
            if (deg == 1) {
                entrance.push(u);
            }
            if (deg == 3) {
                typeInfo = 'BRANCH';
            }
            if (deg > 3) {
                branchErrorFlag = false;
            }
        }
        if (!branchErrorFlag) {
            continue;
        }
        if (entrance.length == 0) {
            typeInfo = 'LOOP';
            outDegree.forEach((_, u) => {
                entrance.push(u);
            });
        }
        const nowResult: [RMGParam, ...Name][] = [];
        for (const start of entrance) {
            const newParam = generateParam(graph, color, start, typeInfo);
            if (newParam != undefined) {
                nowResult.push([
                    newParam,
                    newParam.stn_list[newParam.current_stn_idx].localisedName.zh ?? '',
                    newParam.stn_list[newParam.current_stn_idx].localisedName.en ?? '',
                ]);
            }
        }
        if (nowResult.length != 0) {
            resultList.push({ id: nanoid(10), theme: color, param: structuredClone(nowResult), type: typeInfo });
        }
    }
    return resultList;
};

const getFileName = (nameList: string[]) => {
    if (nameList[0] != '' && nameList[1] != '') return nameList[0] + '_' + nameList[1];
    else if (nameList[0] != '') return nameList[0];
    else if (nameList[1] != '') return nameList[1];
    else return `${new Date().valueOf()}`;
};

const replaceInterchange = (inputString: string, replacements: Map<string, [string, string]>) => {
    let resultString = inputString;
    replacements.forEach((value, key) => {
        const regexCh = new RegExp(`ch_${key}`, 'g');
        const regexEn = new RegExp(`en_${key}`, 'g');
        resultString = resultString.replace(regexCh, value[0]);
        resultString = resultString.replace(regexEn, value[1]);
    });
    return resultString;
};

/**
 * Export RMG json
 * @param param RMG json object.
 * @param lineName Line name array: [Chinese, English]
 * @param lineCode Line code string e.g. '1'
 */
export const exportToRmg = (
    param: RMGParam,
    lineName: Name,
    lineCode: string,
    interchange: Map<string, [string, string]>
) => {
    param['line_name'] = lineName;
    param['line_num'] = String(lineCode);
    downloadAs(
        `RMG_${getFileName(lineName)}.json`,
        'application/json',
        replaceInterchange(JSON.stringify(param), interchange)
    );
};
