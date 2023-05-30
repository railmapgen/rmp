import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { LineStyleType } from '../constants/lines';

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

interface RMGInterchange {
    theme: Array<string>;
    name: Array<string>;
}

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

const colorToString = (color: any) => {
    return String(color[0] + color[1] + color[2] + color[3]);
};

const addEdge = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, lineId: string) => {
    const u = graph.extremities(lineId)[0];
    const v = graph.extremities(lineId)[1];
    const now = graph.getEdgeAttributes(lineId);
    const nowStyle: string = now.style;
    if (nowStyle == LineStyleType['SingleColor']) {
        // @ts-ignore-error
        const nowColor: Array<string> = now[LineStyleType['SingleColor']].color;
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
    console.log('DFS: ' + u);
    let countDegree = 0;
    // @ts-ignore-error
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (colorToString(col) != colorToString(color)) continue;
        countDegree++;
        if (v == f) continue;
        edgeDfs(v, u, color);
    }
    outDegree.set(u, countDegree);
};

const generateNewStn = (
    u: any,
    f: any,
    counter: any,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    color: Array<string>,
    newParam: any
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
    newParam.stn_list[u] = newRMGStn;
    let countChild = 0;
    let countTransfer = 0;
    const newChild = new Array<string>();
    const newInterchange = new Array<RMGInterchange>();
    const newInterchangeSet = new Set<string>();
    // @ts-ignore-error
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (v == f) continue;
        if (!visStn.has(v) && colorToString(col) == colorToString(color)) {
            countChild++;
            newChild.push(v);
            generateNewStn(v, u, counter + 1, graph, color, newParam);
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
    if (countChild != 0) {
        newParam.stn_list[u].children = newChild;
    } else {
        newParam.stn_list[u].children = ['lineend'];
        newParam.stn_list['lineend'].parents = [u];
    }
    newParam.stn_list[u].parents = [f];
    if (countTransfer != 0) {
        newParam.stn_list[u].transfer.groups[0].lines = structuredClone(newInterchange);
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
        let newStart: any = 'no_val';
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
        let newParam = newParamTemple;
        if (newStart != 'no_val') {
            // line
            console.log('Color ' + value[2] + 'is a line.');
        } else {
            // ring
            console.log('Color ' + value[2] + 'is a ring.');
            newParam.loop = true;
            newStart = colorStart.get(value);
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
        newParam = structuredClone(newParamTemple);
        newParam.theme = structuredClone(value);
        newParam.style = structuredClone(newType);
        newParam.current_stn_idx = structuredClone(newStart);
        newParam.stn_list['linestart'] = defRMGLeft;
        newParam.stn_list['lineend'] = defRMGRight;
        visStn.clear();
        newParam.stn_list['linestart'].children = [newStart];
        generateNewStn(newStart, 'linestart', 1, graph, value, newParam);
        console.log(newParam);
        downloadAs(`RMP_genRMG_${newParam.theme}.json`, 'application/json', JSON.stringify(structuredClone(newParam)));
    });
};
