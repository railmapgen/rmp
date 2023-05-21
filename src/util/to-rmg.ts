import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { LinePathType, LineStyleType } from '../constants/lines';
import stations from '../components/svgs/stations/stations';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';

const visStn: Set<any> = new Set();

const addEdge = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, stnId: string) => {
    console.log(stnId);
    if (visStn.has(stnId)) {
        return;
    }
    visStn.add(stnId);
};

/**
 * Change a station's type.
 * @param graph Graph.
 * @param selectedFirst Current station's id.
 * @param newType New station's type.
 */
export const toRmg = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    graph
        .filterNodes(node => node.startsWith('stn'))
        .forEach(stnId => {
            addEdge(graph, stnId);
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
