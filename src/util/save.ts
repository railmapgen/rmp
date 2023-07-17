import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { nanoid } from 'nanoid';

import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes, Theme } from '../constants/constants';
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

export const CURRENT_VERSION = 14;

/**
 * Load Shanghai template only if the param is missing or invalid.
 */
const getInitialParam = async () => JSON.stringify((await import('../saves/shanghai.json')).default);

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
        console.warn(`Upgrade save to version: ${version}`);
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
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        // Add style and single color attrs to all existing lines.
        graph
            .filterEdges((edge, attr, source, target, sourceAttr, targetAttr, undirected) => edge.startsWith('line'))
            .forEach(edge => {
                // @ts-expect-error We are dealing with old saves.
                const color = graph.getEdgeAttribute(edge, 'color') as Theme;
                // @ts-expect-error We are dealing with old saves.
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
        // Bump save version to add rotate and italic in text misc node.
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
        // Bump save version to support Suzhou stations.
        JSON.stringify({ ...JSON.parse(param), version: 14 }),
};
