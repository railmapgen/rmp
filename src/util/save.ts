import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { nanoid } from 'nanoid';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LocalStorageKey,
    NodeAttributes,
    Theme,
} from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { ParamState } from '../redux/param/param-slice';

/**
 * The save format of the project.
 * For fields other than `version`, see ParamState.
 */
export interface RMPSave {
    /**
     * The version of the current save. May be upgraded on first launch via `upgrade`.
     */
    version: number;
    graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    svgViewBoxZoom: number;
    svgViewBoxMin: { x: number; y: number };
}

export const CURRENT_VERSION = 41;

/**
 * Load the tutorial.
 */
export const getInitialParam = async () => JSON.stringify((await import('../saves/tutorial.json')).default);

/**
 * Upgrade the passed param to the latest format.
 */
export const upgrade: (originalParam: string | null) => Promise<string> = async originalParam => {
    let changed = false;

    if (!originalParam) {
        originalParam = await getInitialParam();
        changed = true;
    }

    let originalSave = JSON.parse(originalParam);
    if (!('version' in originalSave) || !Number.isInteger(originalSave.version)) {
        originalSave = JSON.parse(await getInitialParam());
        changed = true;
    }

    let version = Number(originalSave.version);
    let save = JSON.stringify(originalSave);
    while (version in UPGRADE_COLLECTION) {
        save = UPGRADE_COLLECTION[version](save);
        version = Number(JSON.parse(save).version);
        changed = true;
    }

    if (changed) {
        console.warn(`Upgrade save from version: ${originalSave.version} to version: ${version}`);
        // Backup original param in case of bugs in the upgrades.
        localStorage.setItem(LocalStorageKey.PARAM_BACKUP, originalParam);
    }

    // Version should be CURRENT_VERSION now.
    return save;
};

/**
 * Return a valid save string from ParamState.
 */
export const stringifyParam = (paramState: ParamState) => {
    const { present, past, future, ...param } = paramState;
    const save: RMPSave = { ...param, graph: present, version: CURRENT_VERSION };
    return JSON.stringify(save);
};

/**
 * Contains upgrade functions of all versions.
 * Starting from 0, it should be possible to upgrade the save to CURRENT_VERSION.
 */
export const UPGRADE_COLLECTION: { [version: number]: (param: string) => string } = {
    0: param =>
        // Add svgViewBoxZoom and svgViewBoxMin to the save.
        JSON.stringify({
            version: 1,
            graph: JSON.parse(param)?.graph,
            svgViewBoxZoom: 100,
            svgViewBoxMin: { x: 0, y: 0 },
        }),
    1: param => {
        // Remove `transfer` field in `StationAttributes`. #125
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type !== StationType.GzmtrInt)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                if (attr && 'transfer' in attr) delete attr.transfer;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 2, graph: graph.export() });
    },
    2: param => {
        // Reset nameOffsetX and nameOffsetY if both of them are 'middle'. #111
        // Rename 'up' in nameOffsetY to be 'top'. #149
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn'))
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                if (attr?.nameOffsetX === 'middle' && attr?.nameOffsetY === 'middle') {
                    attr.nameOffsetX = 'right';
                    attr.nameOffsetY = 'top';
                }
                if (attr?.nameOffsetY === 'up') attr.nameOffsetY = 'top';
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 3, graph: graph.export() });
    },
    3: param => {
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph();
        graph.import(p?.graph);
        // Add style and single color attrs to all existing lines.
        graph
            .filterEdges((edge, attr, source, target, sourceAttr, targetAttr, undirected) => edge.startsWith('line'))
            .forEach(edge => {
                const color = graph.getEdgeAttribute(edge, 'color') as Theme;
                graph.removeEdgeAttribute(edge, 'color');
                // All the existing lines are single color lines and there is no name changes in type.
                graph.mergeEdgeAttributes(edge, {
                    style: LineStyleType.SingleColor,
                    [LineStyleType.SingleColor]: { color },
                });
            });
        // Transform all misc edges to lines with LineStyleType.ShmetroVirtualInt or LineStyleType.GzmtrVirtualInt style.
        graph
            .filterEdges((edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                edge.startsWith('misc_edge')
            )
            .forEach(edge => {
                const id = `line_${nanoid(10)}`;
                const [source, target] = graph.extremities(edge);
                const type = graph.getEdgeAttribute(edge, 'type') as string;

                // We only have two misc edge types before and they belong to different styles now.
                const style = type as LineStyleType;
                // if (type === 'shmetro-virtual-int') style = LineStyleType.ShmetroVirtualInt;
                // else style = LineStyleType.GzmtrVirtualInt;

                // Add a new edge as we also need to change its id.
                graph.addDirectedEdgeWithKey(id, source, target, {
                    visible: true,
                    zIndex: 0,
                    type: LinePathType.Simple,
                    // deep copy to prevent mutual reference
                    [type]: structuredClone(linePaths[LinePathType.Simple].defaultAttrs),
                    style,
                    [style]: structuredClone(lineStyles[style].defaultAttrs),
                    reconcileId: '',
                });

                // Remove the old edge.
                graph.dropEdge(edge);
            });
        return JSON.stringify({ ...p, version: 4, graph: graph.export() });
    },
    4: param => {
        // Add secondary names and open in gzmtr-basic and gzmtr-int. #140
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes(
                (node, attr) =>
                    node.startsWith('stn') &&
                    (attr.type === StationType.GzmtrBasic || attr.type === StationType.GzmtrInt)
            )
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.open = true;
                attr.secondaryNames = ['', ''];
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 5, graph: graph.export() });
    },
    5: param => {
        // Add offset to simple line path. #184
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterEdges(
                (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                    edge.startsWith('line') && attr.type === LinePathType.Simple
            )
            .forEach(edge => {
                const attr = graph.getEdgeAttribute(edge, LinePathType.Simple) ?? { offset: 0 };
                attr.offset = 0;
                graph.mergeEdgeAttributes(edge, { [LinePathType.Simple]: attr });
            });
        return JSON.stringify({ ...p, version: 6, graph: graph.export() });
    },
    6: param => {
        // Add the tram option to gzmtr-basic. #142
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.GzmtrBasic)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.tram = false;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 7, graph: graph.export() });
    },
    7: param =>
        // Bump save version to support river style.
        JSON.stringify({ ...JSON.parse(param), version: 8 }),
    8: param =>
        // Bump save version to support MTR station style.
        JSON.stringify({ ...JSON.parse(param), version: 9 }),
    9: param =>
        // Bump save version to support MTR line style (race days/light rail/unpaid area).
        JSON.stringify({ ...JSON.parse(param), version: 10 }),
    10: param => {
        // Bump save version to add color in text misc node.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Text)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.color = [CityCode.Shanghai, 'jsr', '#000000', MonoColour.white];
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 11, graph: graph.export() });
    },
    11: param =>
        // Bump save version to support Shanghai Metro out-of-system interchange station.
        JSON.stringify({ ...JSON.parse(param), version: 12 }),
    12: param => {
        // Bump save version to add rotate and italic in the text node.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Text)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.rotate = 0;
                attr.italic = false;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 13, graph: graph.export() });
    },
    13: param =>
        // Bump save version to support Berlin U and S Bahn line badges.
        JSON.stringify({ ...JSON.parse(param), version: 14 }),
    14: param =>
        // Bump save version to support Suzhou stations and the num line badge.
        JSON.stringify({ ...JSON.parse(param), version: 15 }),
    15: param => {
        // Bump save version to update value of italic in the text node.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Text)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.italic = attr.italic ? 'italic' : 'normal';
                attr.bold = 'normal';
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 16, graph: graph.export() });
    },
    16: param => {
        // Bump save version to update y of facilities node after directly using svg in #262.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Facilities)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                let dy = 0;
                switch (attr.type) {
                    case 'airport':
                    case 'maglev':
                    case 'disney':
                    case 'railway':
                        dy += 25 / 2;
                        break;
                    case 'hsr':
                    case 'airport_hk':
                    case 'disney_hk':
                        dy += 19 / 2;
                        break;
                }
                graph.updateNodeAttribute(node, 'y', y => (y ?? 0) + dy);
            });
        return JSON.stringify({ ...p, version: 17, graph: graph.export() });
    },
    17: param =>
        // Bump save version to support Beijing Subway dotted line.
        JSON.stringify({ ...JSON.parse(param), version: 18 }),
    18: param =>
        // Bump save version to support Beijing Subway dotted line.
        JSON.stringify({ ...JSON.parse(param), version: 19 }),
    19: param =>
        // Bump save version to support Kunming Rail Transit stations.
        JSON.stringify({ ...JSON.parse(param), version: 20 }),
    20: param =>
        // Bump save version to support Shenzhen Metro num line badge.
        JSON.stringify({ ...JSON.parse(param), version: 21 }),
    21: param =>
        // Bump save version to support Singapore MRT stations.
        JSON.stringify({ ...JSON.parse(param), version: 22 }),
    22: param =>
        // Bump save version to support Singapore MRT destination numbers.
        JSON.stringify({ ...JSON.parse(param), version: 23 }),
    23: param =>
        // Bump save version to support Singapore MRT under construction and Sentosa Express line.
        JSON.stringify({ ...JSON.parse(param), version: 24 }),
    24: param => {
        // Bump save version to add tram in gzmtr-int stations' and gzmtr-line-badge attributes.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p.graph);
        graph
            .filterNodes(
                (node, attr) =>
                    (node.startsWith('stn') && attr.type === StationType.GzmtrInt) ||
                    (node.startsWith('misc_node') && attr.type === MiscNodeType.GzmtrLineBadge)
            )
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.tram = false;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 25, graph: graph.export() });
    },
    25: param =>
        // Bump save version to support JR East basic station, important station,
        // line badge, single color line style, and single color pattern style.
        JSON.stringify({ ...JSON.parse(param), version: 26 }),
    26: param => {
        // Add the span option to gzmtrLineBadge. #602
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.GzmtrLineBadge)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.span = true;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 27, graph: graph.export() });
    },
    27: param => {
        // Bump save version to support Foshan Metro stations and foshan key in gzmtr-int.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.GzmtrInt)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                for (let i = 0; i < attr.transfer.length; i = i + 1)
                    for (let j = 0; j < attr.transfer[i].length; j = j + 1) attr.transfer[i][j].push('gz');
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 28, graph: graph.export() });
    },
    28: param =>
        // Bump save version to support Qingdao Metro station.
        JSON.stringify({ ...JSON.parse(param), version: 29 }),
    29: param =>
        // Bump save version to support Singapore MRT facilities.
        JSON.stringify({ ...JSON.parse(param), version: 30 }),
    30: param =>
        // Bump save version to support Guangzhou Metro interchange station 2024.
        JSON.stringify({ ...JSON.parse(param), version: 31 }),
    31: param => {
        // Bump save version to support Railway line color
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterEdges((line, attrs) => attrs.style === LineStyleType.ChinaRailway)
            .forEach(line => {
                const s = graph.getEdgeAttributes(line)[LineStyleType.ChinaRailway];
                graph.mergeEdgeAttributes(line, {
                    [LineStyleType.ChinaRailway]: {
                        ...s,
                        color: [CityCode.Shanghai, 'jsr', '#000000', MonoColour.white],
                    },
                });
            });
        return JSON.stringify({ ...p, version: 32, graph: graph.export() });
    },
    32: param =>
        // Bump save version to support Singapore MRT line badges and LRT style.
        JSON.stringify({ ...JSON.parse(param), version: 33 }),
    33: param => {
        // Bump save version to support parallel lines and sort elements.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph.forEachDirectedEdge(edge => {
            graph.setEdgeAttribute(edge, 'parallelIndex', -1);
            graph.updateEdgeAttribute(edge, 'zIndex', zIndex => Math.max(-10, (zIndex ?? 0) - 5));
        });
        graph.forEachNode(node => {
            graph.updateNodeAttribute(node, 'zIndex', zIndex => Math.min(10, (zIndex ?? 0) + 5));
        });
        return JSON.stringify({ ...p, version: 34, graph: graph.export() });
    },
    34: param =>
        // Bump save version to support Qingdao Metro facilities.
        JSON.stringify({ ...JSON.parse(param), version: 35 }),
    35: param =>
        // Bump save version to support Tokyo Metro stations.
        JSON.stringify({ ...JSON.parse(param), version: 36 }),
    36: param =>
        // Bump save version to support London Underground stations.
        JSON.stringify({ ...JSON.parse(param), version: 37 }),
    37: param =>
        // Bump save version to support Shanghai 2024 facilities.
        JSON.stringify({ ...JSON.parse(param), version: 38 }),
    38: param =>
        // Bump save version to support Guangzhou 2024 facilities.
        JSON.stringify({ ...JSON.parse(param), version: 39 }),
    39: param => {
        // Bump save version to support Qingdao facilities name change.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Facilities)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                if (attr.type === 'qingdao_airport') attr.type = 'airport_qingdao';
                else if (attr.type === 'qingdao_coach_station') attr.type = 'coach_station_qingdao';
                else if (attr.type === 'qingdao_cruise_terminal') attr.type = 'cruise_terminal_qingdao';
                else if (attr.type === 'qingdao_railway') attr.type = 'railway_qingdao';
                else if (attr.type === 'qingdao_tram') attr.type = 'tram_qingdao';
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 40, graph: graph.export() });
    },
    40: param =>
        // Bump save version to support Guangdong Intercity Railway.
        JSON.stringify({ ...JSON.parse(param), version: 41 }),
};
