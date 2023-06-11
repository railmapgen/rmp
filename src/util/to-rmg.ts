import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { LineStyleType } from '../constants/lines';
import { StationAttributes } from '../constants/stations';
import { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';

interface edgeVector {
    target: string;
    next: any;
    color: Array<string>;
}

const visStn: Set<string> = new Set<string>();
const colorList: Set<Array<string>> = new Set<Array<string>>();
const colorSet: Set<string> = new Set<string>();
const colorStart: Map<Array<string>, string> = new Map<Array<string>, string>();
const headGraph: Map<string, any> = new Map<string, any>();
let edgeGraph: Array<edgeVector> = new Array<edgeVector>();
let countGraph = 0;
const outDegree: Map<string, any> = new Map<string, any>();
const stationList = new Map<string, Array<any>>();

interface RMGInterchange {
    theme: Array<string>;
    name: Array<string>;
}

interface RMGStn {
    name: Array<any>;
    secondaryName: any;
    num: any;
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
    parents: [],
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
        destination: 1500,
        runin: 1500,
        railmap: 1500,
        indoor: 1500,
    },
    svg_height: 400,
    style: 'shmetro',
    y_pc: 50,
    padding: 10,
    branchSpacingPct: 33,
    direction: 'r',
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
        left_and_right_factor: 0,
        bottom_factor: 1,
    },
};

const newRMGStn: RMGStn = {
    name: [],
    secondaryName: false,
    num: '',
    services: ['local'],
    parents: [],
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

const colorToString = (color: any) => {
    return String(color[0] + '/' + color[1] + '=' + color[2] + color[3]);
};

const reverse = (a: any) => {
    const p = [];
    for (let i = a.length - 1; i >= 0; i--) {
        p.push(a[i]);
    }
    return p;
};

const countArray = (a: any) => {
    let counter = 0;
    for (const i in a) {
        counter++;
    }
    return counter;
};

const isColorLine = (type: any) => {
    if (type == LineStyleType['SingleColor'] || type == LineStyleType['MTRRaceDays']) {
        return true;
    } else return false;
};

const getColor = (attr: any) => {
    let nowColor = new Array<any>();
    if (attr.style == LineStyleType['SingleColor']) {
        const newAttr = attr[LineStyleType['SingleColor']] as SingleColorAttributes;
        nowColor = newAttr.color;
    } else if (attr.style == LineStyleType['MTRRaceDays']) {
        const newAttr = attr[LineStyleType['MTRRaceDays']] as SingleColorAttributes;
        nowColor = newAttr.color;
    }
    return structuredClone(nowColor);
};

const addEdge = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, lineId: string) => {
    const u = graph.extremities(lineId)[0];
    const v = graph.extremities(lineId)[1];
    const now = graph.getEdgeAttributes(lineId);
    const nowStyle: string = now.style;
    if (u == v) return;
    if (isColorLine(nowStyle)) {
        const nowColor = getColor(now);
        if (!colorSet.has(colorToString(nowColor))) {
            colorList.add(nowColor);
            colorSet.add(colorToString(nowColor));
            colorStart.set(nowColor, u);
        }
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
    // console.log('DFS: ' + u);
    let countDegree = 0;
    const visNext: Set<string> = new Set<string>();
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
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

const editLineend = (newParam: any, u: any) => {
    const newParent = structuredClone(newParam.stn_list['lineend'].parents);
    newParent.push(u);
    newParam.stn_list['lineend'].parents = reverse(structuredClone(newParent));
    if (countArray(newParam.stn_list['lineend'].parents) == 2) {
        newParam.stn_list['lineend'].branch.left = ['through', structuredClone(newParent[1])];
    }
};

const generateNewStn = (
    u: any,
    f: any,
    counter: any,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    color: Array<string>,
    newParam: any
) => {
    if (visStn.has(u) && (newParam.stn_list[u] == undefined || u.startsWith('misc_node_') || newParam.loop)) {
        return;
    } else if (visStn.has(u) && newParam.stn_list[u] != undefined && countArray(newParam.stn_list[u].children) >= 2) {
        // parent
        newParam.stn_list[u].parents = [f, ...structuredClone(newParam.stn_list[u].parents)];
        newParam.stn_list[u].branch.left = ['through', f];
        const newChild = [];
        for (const ch of newParam.stn_list[u].children) {
            if (ch != f) {
                newChild.push(ch);
            }
        }
        newParam.stn_list[u].children = structuredClone(newChild);
        newParam.stn_list[u].branch.right = [];
        return u;
    }
    visStn.add(u);
    // console.log('DFS2: ' + u);
    let countChild = 0;
    let countTransfer = 0;
    const newChild = new Array<any>();
    const newInterchange = new Array<RMGInterchange>();
    const newInterchangeSet = new Set<string>();
    const visNext: Set<string> = new Set<string>();
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (v == f) continue;
        if (colorToString(col) == colorToString(color)) {
            if (visNext.has(v)) continue;
            visNext.add(v);
            if (!String(u).startsWith('misc_node_')) {
                const r = generateNewStn(v, u, counter + 1, graph, color, newParam);
                if (r != undefined) {
                    countChild++;
                    newChild.push(r);
                }
            } else {
                const r = generateNewStn(v, f, counter + 1, graph, color, newParam);
                if (r != undefined) {
                    newChild.push(r);
                }
            }
        }
        if (!newInterchangeSet.has(colorToString(col)) && colorToString(col) != colorToString(color)) {
            countTransfer++;
            newInterchangeSet.add(colorToString(col));
            const tmpInterchange: RMGInterchange = {
                theme: col,
                name: [col[1], col[1]],
            };
            newInterchange.push(tmpInterchange);
        }
    }
    if (!String(u).startsWith('misc_node_')) {
        const uType = graph.getNodeAttributes(u).type as StationType;
        const uAttr = graph.getNodeAttributes(u)[uType] as StationAttributes;
        newParam.stn_list[u] = structuredClone(newRMGStn);
        newParam.stn_list[u].name = uAttr.names;
        newParam.stn_list[u].num = String(counter);
        if (graph.getNodeAttributes(u).type == StationType.GzmtrBasic) {
            const gzAttr = uAttr as GzmtrBasicStationAttributes;
            newParam.stn_list[u].num = gzAttr.stationCode;
            newParam.stn_list[u].secondaryName = gzAttr.secondaryNames;
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
            newParam.stn_list[u].secondaryName = gzAttr.secondaryNames;
        }
        if (countChild != 0) {
            newParam.stn_list[u].children = reverse(structuredClone(newChild));
            if (Number(countChild) == 2) {
                newParam.stn_list[u].branch.right = ['through', newChild[1]];
            }
        } else {
            newParam.stn_list[u].children = ['lineend'];
            editLineend(newParam, u);
        }
        newParam.stn_list[u].parents = [f];
        if (countTransfer != 0) {
            newParam.stn_list[u].transfer.groups[0].lines = structuredClone(newInterchange);
        }
        return u;
    } else {
        if (newChild.length == 0) {
            editLineend(newParam, f);
            return 'lineend';
        } else return newChild[0];
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
    colorSet.clear();
    colorStart.clear();
    headGraph.clear();
    edgeGraph = new Array<edgeVector>();
    countGraph = 0;
    outDegree.clear();
    stationList.clear();
    graph
        .filterEdges(edge => edge.startsWith('line'))
        .forEach(edgeId => {
            if (isColorLine(String(graph.getEdgeAttributes(edgeId).style))) {
                addEdge(graph, edgeId);
            }
        });
    // console.info(colorList);
    const resultList = new Array<any>();
    for (const value of colorList) {
        visStn.clear();
        outDegree.clear();
        // console.log('Start DFS color as ' + value[2]);
        edgeDfs(colorStart.get(value), 'line_root', value);
        let newStart: any = 'no_val';
        let branchFlag = true;
        let typeInfo = 'LINE';
        for (const [u, deg] of outDegree) {
            if (deg == 1) {
                newStart = u;
            }
            if (deg == 3) {
                typeInfo = 'BRANCH';
            }
            if (deg > 3) {
                branchFlag = false;
            }
        }
        if (!branchFlag) {
            continue;
        }
        const newParam = structuredClone(newParamTemple);
        if (newStart == 'no_val') {
            newParam.loop = true;
            newStart = colorStart.get(value);
            typeInfo = 'LOOP';
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
        newParam.theme = structuredClone(value);
        newParam.style = structuredClone(newType);
        newParam.stn_list['linestart'] = structuredClone(defRMGLeft);
        newParam.stn_list['lineend'] = structuredClone(defRMGRight);
        visStn.clear();
        const resStart = generateNewStn(newStart, 'linestart', 1, graph, value, newParam);
        newParam.current_stn_idx = structuredClone(resStart);
        newParam.stn_list['linestart'].children = [resStart];
        if (countArray(newParam.stn_list) <= 3) continue;
        resultList.push([structuredClone(newParam), typeInfo]);
    }
    return structuredClone(resultList);
};

/**
 * Expert RMG json
 * @param graph Graph.
 * @param lineName Line name array: [Chinese, English]
 * @param lineCode Line code string e.g. '1'
 */
export const exportToRmg = (param: any, lineName: any, lineCode: any) => {
    param['line_name'] = lineName;
    param['line_num'] = String(lineCode);
    console.log(param);
    console.log(JSON.stringify(structuredClone(param)));
    downloadAs(`RMG_${lineName[1]}.json`, 'application/json', JSON.stringify(structuredClone(param)));
};
