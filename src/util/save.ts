import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { updateGraphKeys } from 'graphology-utils';
import { nanoid } from 'nanoid';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { TextAttributes } from '../components/svgs/nodes/text';
import { BjsubwayBasicStationAttributes } from '../components/svgs/stations/bjsubway-basic';
import { BjsubwayIntStationAttributes } from '../components/svgs/stations/bjsubway-int';
import { FoshanMetroBasicStationAttributes } from '../components/svgs/stations/foshan-metro-basic';
import { GuangdongIntercityRailwayStationAttributes } from '../components/svgs/stations/guangdong-intercity-railway';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
import { JREastBasicStationAttributes } from '../components/svgs/stations/jr-east-basic';
import { JREastImportantStationAttributes } from '../components/svgs/stations/jr-east-important';
import { KunmingRTBasicStationAttributes } from '../components/svgs/stations/kunmingrt-basic';
import { KunmingRTIntStationAttributes } from '../components/svgs/stations/kunmingrt-int';
import { MRTBasicStationAttributes } from '../components/svgs/stations/mrt-basic';
import { MRTIntStationAttributes } from '../components/svgs/stations/mrt-int';
import { MTRStationAttributes } from '../components/svgs/stations/mtr';
import { ShanghaiSuburbanRailwayStationAttributes } from '../components/svgs/stations/shanghai-suburban-railway';
import { ShmetroBasicStationAttributes } from '../components/svgs/stations/shmetro-basic';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import { ShmetroIntStationAttributes } from '../components/svgs/stations/shmetro-int';
import { ShmetroOsysiStationAttributes } from '../components/svgs/stations/shmetro-osysi';
import { SuzhouRTBasicStationAttributes } from '../components/svgs/stations/suzhourt-basic';
import { SuzhouRTIntStationAttributes } from '../components/svgs/stations/suzhourt-int';
import { TokyoMetroBasicStationAttributes } from '../components/svgs/stations/tokyo-metro-basic';
import { TokyoMetroIntStationAttributes } from '../components/svgs/stations/tokyo-metro-int';
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
import { TextLanguage } from './fonts';

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
    images?: { id: string; base64: string }[];
}

export const CURRENT_VERSION = 68;

/**
 * Parse the version from a save string without fully validating the save.
 *
 * @param saveStr The save string.
 * @returns The version number.
 * @throws Error if the version cannot be parsed.
 */
export const parseVersionFromSave = (saveStr: string): number => {
    const save = JSON.parse(saveStr);
    if ('version' in save && Number.isInteger(save.version)) {
        return save.version;
    }
    // Invalid JSON or missing version field
    throw new Error('Cannot parse version from the uploaded file');
};

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
        logger.warn(`Upgrade save from version: ${originalSave.version} to version: ${version}`);
        // Backup original param in case of bugs in the upgrades.
        try {
            localStorage.setItem(LocalStorageKey.PARAM_BACKUP, originalParam);
        } catch (error) {
            if (error instanceof Error && error.name == 'QuotaExceededError') {
                logger.error('Failed to backup original param due to local storage quota exceeded.');
                localStorage.removeItem(LocalStorageKey.PARAM_BACKUP);
                // Remove the previous backup to free up some spaces.
                // This should give users the maximum 5mb for their work.
            }
        }
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
    41: param => {
        // Bump save version to replace all \\ to \n.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        const replaceFunc = (names: [string, ...string[]]) =>
            names.map(name => name.replaceAll('\\', '\n')) as [string, ...string[]];
        graph.forEachNode((node, attr) => {
            const type = graph.getNodeAttribute(node, 'type');
            let names;
            if (type === StationType.BjsubwayBasic)
                names = replaceFunc((attr[type] as BjsubwayBasicStationAttributes).names);
            else if (type === StationType.BjsubwayInt)
                names = replaceFunc((attr[type] as BjsubwayIntStationAttributes).names);
            else if (type === StationType.FoshanMetroBasic)
                names = replaceFunc((attr[type] as FoshanMetroBasicStationAttributes).names);
            else if (type === StationType.GuangdongIntercityRailway)
                names = replaceFunc((attr[type] as GuangdongIntercityRailwayStationAttributes).names);
            else if (type === StationType.GzmtrBasic)
                names = replaceFunc((attr[type] as GzmtrBasicStationAttributes).names);
            else if (type === StationType.GzmtrInt)
                names = replaceFunc((attr[type] as GzmtrIntStationAttributes).names);
            else if (type === StationType.JREastBasic)
                names = replaceFunc((attr[type] as JREastBasicStationAttributes).names);
            else if (type === StationType.JREastImportant)
                names = replaceFunc((attr[type] as JREastImportantStationAttributes).names);
            else if (type === StationType.KunmingRTBasic)
                names = replaceFunc((attr[type] as KunmingRTBasicStationAttributes).names);
            else if (type === StationType.KunmingRTInt)
                names = replaceFunc((attr[type] as KunmingRTIntStationAttributes).names);
            else if (type === StationType.MRTBasic)
                names = replaceFunc((attr[type] as MRTBasicStationAttributes).names);
            else if (type === StationType.MRTInt) names = replaceFunc((attr[type] as MRTIntStationAttributes).names);
            else if (type === StationType.MTR) names = replaceFunc((attr[type] as MTRStationAttributes).names);
            else if (type === StationType.ShanghaiSuburbanRailway)
                names = replaceFunc((attr[type] as ShanghaiSuburbanRailwayStationAttributes).names);
            else if (type === StationType.ShmetroBasic2020)
                names = replaceFunc((attr[type] as ShmetroBasic2020StationAttributes).names);
            else if (type === StationType.ShmetroBasic)
                names = replaceFunc((attr[type] as ShmetroBasicStationAttributes).names);
            else if (type === StationType.ShmetroInt)
                names = replaceFunc((attr[type] as ShmetroIntStationAttributes).names);
            else if (type === StationType.ShmetroOutOfSystemInt)
                names = replaceFunc((attr[type] as ShmetroOsysiStationAttributes).names);
            else if (type === StationType.SuzhouRTBasic)
                names = replaceFunc((attr[type] as SuzhouRTBasicStationAttributes).names);
            else if (type === StationType.SuzhouRTInt)
                names = replaceFunc((attr[type] as SuzhouRTIntStationAttributes).names);
            else if (type === StationType.TokyoMetroBasic)
                names = replaceFunc((attr[type] as TokyoMetroBasicStationAttributes).names);
            else if (type === StationType.TokyoMetroInt)
                names = replaceFunc((attr[type] as TokyoMetroIntStationAttributes).names);
            if (names) {
                // only selected types above will reach here and they all have names field in attr[type]
                (attr[type] as any).names = names;
                graph.mergeNodeAttributes(node, attr);
            }
        });
        return JSON.stringify({ ...p, version: 42, graph: graph.export() });
    },
    42: param => {
        // Bump save version to upgrade gzmtr-int-2024 new fields.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.GzmtrInt2024)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                // default values
                attr.columns = 2;
                attr.topHeavy = false;
                attr.osiPosition = 'none';
                // legacy compatibility
                if (attr.preferVertical && attr.transfer.flat().length === 2) attr.columns = 1;
                // remove legacy fields
                delete attr.preferVertical;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 43, graph: graph.export() });
    },
    43: param =>
        // Bump save version to support Chongqing Rail Transit stations.
        JSON.stringify({ ...JSON.parse(param), version: 44 }),
    44: param => {
        // Bump save version to support Chongqing Rail Transit 2021 stations and facilities.
        // Add isLoop attributes to Chongqing Rail Transit Basic stations.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.ChongqingRTBasic)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.isLoop = false;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 45, graph: graph.export() });
    },
    45: param => {
        // Bump save version to add terminalNameRotate to london-tube-basic.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.LondonTubeBasic)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.terminalNameRotate = attr.rotate;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 46, graph: graph.export() });
    },
    46: param => {
        // Bump save version to add textDistance to chongqingrt-int.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.ChongqingRTInt)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.textDistance = ['near', 'near'];
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 47, graph: graph.export() });
    },
    47: param =>
        // Bump save version to support Chengdu Metro stations.
        JSON.stringify({ ...JSON.parse(param), version: 48 }),
    48: param => {
        // Bump save version to add outline to text.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Text)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.outline = 0;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 49, graph: graph.export() });
    },
    49: param => {
        // Bump save version to rename rapidColor to color for chongqingrt-int-2021
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.ChongqingRTInt2021)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.color = attr.rapidColor;
                attr.rapidColor = undefined;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 50, graph: graph.export() });
    },
    50: param =>
        // Bump save version to support Taipei Metro line badge.
        JSON.stringify({ ...JSON.parse(param), version: 51 }),
    51: param =>
        // Bump save version to support Taiwan railway and hsr facilities.
        JSON.stringify({ ...JSON.parse(param), version: 52 }),
    52: param => {
        // Bump save version to rename some type.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            // @ts-expect-error Rename sh-sub-rwy to shanghai-sub-rwy.
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === 'sh-sub-rwy')
            .forEach(node => {
                graph.setNodeAttribute(node, 'type', StationType.ShanghaiSuburbanRailway);
                // @ts-expect-error Rename sh-sub-rwy to shanghai-sub-rwy.
                const attr = graph.getNodeAttribute(node, 'sh-sub-rwy') as ShanghaiSuburbanRailwayStationAttributes;
                graph.setNodeAttribute(node, StationType.ShanghaiSuburbanRailway, attr);
                // @ts-expect-error Rename sh-sub-rwy to shanghai-sub-rwy.
                graph.removeNodeAttribute(node, 'sh-sub-rwy');
            });
        graph
            // @ts-expect-error Rename gd-intercity-rwy to guangdong-intercity-rwy.
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === 'gd-intercity-rwy')
            .forEach(node => {
                graph.setNodeAttribute(node, 'type', StationType.GuangdongIntercityRailway);
                const attr = graph.getNodeAttribute(
                    node,
                    // @ts-expect-error Rename gd-intercity-rwy to guangdong-intercity-rwy.
                    'gd-intercity-rwy'
                ) as GuangdongIntercityRailwayStationAttributes;
                graph.setNodeAttribute(node, StationType.GuangdongIntercityRailway, attr);
                // @ts-expect-error Rename gd-intercity-rwy to guangdong-intercity-rwy.
                graph.removeNodeAttribute(node, 'gd-intercity-rwy');
            });
        return JSON.stringify({ ...p, version: 53, graph: graph.export() });
    },
    53: param => {
        // Bump save version to match the icon reposition in gzmtr-line-badge.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.GzmtrLineBadge)
            .forEach(node => {
                graph.updateNodeAttribute(node, 'y', y => (y ?? 0) + 12);
            });
        return JSON.stringify({ ...p, version: 54, graph: graph.export() });
    },
    54: param => {
        // Bump save version to update TextLanguage in Text (mtr__zh -> mtr_zh, mtr__en -> mtr_en).
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Text)
            .forEach(node => {
                graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, MiscNodeType.Text) as TextAttributes;
                if ((attr.language as string) === 'mtr__zh') attr.language = TextLanguage.mtr_zh;
                else if ((attr.language as string) === 'mtr__en') attr.language = TextLanguage.mtr_en;
                graph.mergeNodeAttributes(node, { [MiscNodeType.Text]: attr });
            });
        return JSON.stringify({ ...p, version: 55, graph: graph.export() });
    },
    55: param => {
        // Bump save version to add rotation to chengdurt-basic.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.ChengduRTBasic)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.rotation = 0;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 56, graph: graph.export() });
    },
    56: param =>
        // Bump save version to support Osaka Metro stations.
        JSON.stringify({ ...JSON.parse(param), version: 57 }),
    57: param =>
        // Bump save version to support image node.
        JSON.stringify({ ...JSON.parse(param), version: 58 }),
    58: param =>
        // Bump save version to support fill node.
        JSON.stringify({ ...JSON.parse(param), version: 59 }),
    59: param => {
        // Bump save version to add misc_node_ and line_ prefixes to those created by fill.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        const newGraph = updateGraphKeys(
            graph,
            key => {
                const type = graph.getNodeAttribute(key, 'type');
                if (type === MiscNodeType.Virtual && !key.startsWith('misc_node_')) {
                    return `misc_node_${key}`;
                }
                return key;
            },
            key => {
                if (key.startsWith('line_')) return key;
                return `line_${key}`;
            }
        );
        return JSON.stringify({ ...p, version: 60, graph: newGraph.export() });
    },
    60: param => {
        // Bump save version to convert Tokyo Int transfer information to new format.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.TokyoMetroInt)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.transfer = [
                    attr.interchanges.map((int: { lineCode: string; stationCode: string; color: Theme }) => [
                        ...int.color,
                        int.lineCode,
                        int.stationCode,
                    ]),
                ];
                delete attr.interchanges;
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 61, graph: graph.export() });
    },
    61: param =>
        // Bump save version to support construction attribute for bjsubwayBasic.
        JSON.stringify({ ...JSON.parse(param), version: 62 }),
    62: param =>
        // Bump save version to support wuhan rail transit basic and int stations.
        JSON.stringify({ ...JSON.parse(param), version: 63 }),
    63: param =>
        // Bump save version to support Changsha metro stations (csmetro).
        JSON.stringify({ ...JSON.parse(param), version: 64 }),
    64: param =>
        // Bump save version to support Hangzhou Metro stations (hzmetro).
        JSON.stringify({ ...JSON.parse(param), version: 65 }),
    65: param => {
        // Bump save version to update JR East lines information when rotate is greater or equal to 180.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes((node, attr) => node.startsWith('stn') && attr.type === StationType.JREastBasic)
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                if (attr.rotate >= 180) {
                    attr.lines = attr.lines.map((line: number) => -line);
                    attr.rotate = attr.rotate % 180;
                }
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 66, graph: graph.export() });
    },
    66: param => {
        // Bump save version to add scale to bjsubway basic and interchange stations.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes(
                (node, attr) =>
                    node.startsWith('stn') &&
                    (attr.type === StationType.BjsubwayBasic || attr.type === StationType.BjsubwayInt)
            )
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any as
                    | BjsubwayBasicStationAttributes
                    | BjsubwayIntStationAttributes;
                if (typeof (attr as any).scale !== 'number') {
                    (attr as any).scale = 1;
                    graph.mergeNodeAttributes(node, { [type]: attr });
                }
            });
        return JSON.stringify({ ...p, version: 67, graph: graph.export() });
    },
    67: param => {
        // Bump save version to add scale to hzmetro basic and interchange stations.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            .filterNodes(
                (node, attr) =>
                    node.startsWith('stn') &&
                    (attr.type === StationType.HzmetroBasic || attr.type === StationType.HzmetroInt)
            )
            .forEach(node => {
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                if (typeof attr.scale !== 'number') {
                    attr.scale = 1;
                    graph.mergeNodeAttributes(node, { [type]: attr });
                }
                if (type === StationType.HzmetroInt && typeof attr.mirror !== 'boolean') {
                    attr.mirror = false;
                    graph.mergeNodeAttributes(node, { [type]: attr });
                }
            });
        return JSON.stringify({ ...p, version: 68, graph: graph.export() });
    },
};
