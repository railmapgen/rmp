import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { LinePathType, LineStyleType } from '../constants/lines';
import stations from '../components/svgs/stations/stations';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import singleColor, { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import { count } from 'console';

interface edgeVector {
    target: string;
    next: any;
    color: Array<string>;
}

const visStn: Set<any> = new Set();
const colorList: Set<Array<string>> = new Set<Array<string>>();
const colorStart: Map<Array<string>, string> = new Map<Array<string>, string>();
const headGraph: Map<string, number> = new Map<string, number>();
let edgeGraph: Array<edgeVector> = new Array<edgeVector>();
let countGraph = 0;

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
        if (!colorList.has(nowColor)) {
            colorList.add(nowColor);
            colorStart.set(nowColor, u);
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

const edgeDfs = (u: any, color: Array<string>) => {
    if (visStn.has(u)) {
        return;
    }
    visStn.add(u);
    console.log('DFS: ' + u);
    // @ts-ignore-error
    for (let i: number = headGraph.get(u); i != -1; i = edgeGraph[i].next) {
        const v = edgeGraph[i].target;
        const col = edgeGraph[i].color;
        if (color[0] == col[0] && color[1] == col[1] && color[2] == col[2] && color[3] == col[3]) {
            edgeDfs(v, color);
        }
    }
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
    graph
        .filterEdges(edge => edge.startsWith('line'))
        .forEach(edgeId => {
            addEdge(graph, edgeId);
        });
    colorList.forEach(value => {
        visStn.clear();
        console.log('Start DFS color as ' + value[2]);
        edgeDfs(colorStart.get(value), value);
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
