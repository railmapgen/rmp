import { MultiDirectedGraph } from 'graphology';
import {
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    NodeId,
    StnId,
} from '../constants/constants';
import { StationAttributes } from '../constants/stations';
import i18n from '../i18n/config';
import { RootDispatch } from '../redux';
import { setSelected } from '../redux/runtime/runtime-slice';
import { importSelectedNodesAndEdges } from './clipboard';
import { toCamelCase } from './helpers';

/** Radius in SVG units to search for nearby elements */
export const TOUCH_RADIUS = 30;

export enum MenuCategory {
    STATION = 'station',
    MISC_NODE = 'misc-node',
    LINE = 'line',
    OPERATION = 'operation',
}

export interface MenuLayerData {
    [MenuCategory.STATION]: MenuItemData[];
    [MenuCategory.MISC_NODE]: MenuItemData[];
    [MenuCategory.LINE]: MenuItemData[];
    [MenuCategory.OPERATION]: MenuItemData[];
}

export interface MenuItemData {
    label: string;
    icon?: React.ReactNode;
    action: () => void;
    /**
     * The ID of the element this item represents (station ID, line ID, etc.)
     * Optional, as operations do not correspond to a specific element.
     */
    elementId: string;
}

export const emptyMenuLayerData: MenuLayerData = {
    [MenuCategory.STATION]: [],
    [MenuCategory.MISC_NODE]: [],
    [MenuCategory.LINE]: [],
    [MenuCategory.OPERATION]: [],
};

/**
 * Custom hook for finding elements near a touch point and organizing them into layers
 * for the radial touch menu. Maximum of 5 layers supported.
 */
export const findNearbyElements = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    svgCoord: { x: number; y: number },
    dispatch: RootDispatch
): MenuLayerData => {
    const data = structuredClone(emptyMenuLayerData);

    // Find stations within radius
    const nearbyStations = graph.filterNodes((nodeId, attrs) => {
        if (!nodeId.startsWith('stn')) return false;
        const distance = Math.sqrt(Math.pow(attrs.x - svgCoord.x, 2) + Math.pow(attrs.y - svgCoord.y, 2));
        return distance <= TOUCH_RADIUS;
    }) as StnId[];

    // Find misc nodes within radius
    const nearbyMiscNodes = graph.filterNodes((nodeId, attrs) => {
        if (!nodeId.startsWith('misc')) return false;
        const distance = Math.sqrt(Math.pow(attrs.x - svgCoord.x, 2) + Math.pow(attrs.y - svgCoord.y, 2));
        return distance <= TOUCH_RADIUS;
    }) as MiscNodeId[];

    // Find lines connected to nearby nodes
    const nearbyNodes = [...nearbyStations, ...nearbyMiscNodes];
    const nearbyLines: LineId[] = [];
    if (nearbyNodes.length > 0) {
        graph.forEachEdge((edgeId, attributes, source, target) => {
            // Only include lines that are connected to nearby nodes
            if (nearbyNodes.includes(source as NodeId) || nearbyNodes.includes(target as NodeId)) {
                nearbyLines.push(edgeId as LineId);
            }
        });
    }

    // Create station layer if there are nearby stations
    if (nearbyStations.length > 0) {
        const stationItems: MenuItemData[] = nearbyStations.slice(0, 8).map(stationId => {
            const type = graph.getNodeAttribute(stationId, 'type');
            const attr = graph.getNodeAttribute(stationId, type) as StationAttributes;
            return {
                label: attr.names[0],
                elementId: stationId,
                action: () => dispatch(setSelected(new Set([stationId]))),
            };
        });

        data[MenuCategory.STATION] = stationItems;
    }

    // Create misc nodes layer if there are nearby misc nodes
    if (nearbyMiscNodes.length > 0) {
        const miscNodeItems: MenuItemData[] = nearbyMiscNodes.slice(0, 8).map(nodeId => {
            const type = graph.getNodeAttribute(nodeId, 'type');
            const i18nType = toCamelCase(type);
            return {
                label: i18n.t(`panel.details.nodes.${i18nType}.displayName`),
                elementId: nodeId,
                action: () => dispatch(setSelected(new Set([nodeId]))),
            };
        });

        data[MenuCategory.MISC_NODE] = miscNodeItems;
    }

    // Create lines layer if there are nearby lines
    if (nearbyLines.length > 0) {
        const lineItems: MenuItemData[] = nearbyLines.slice(0, 6).map(lineId => {
            const [source, target] = graph.extremities(lineId);
            const sourceType = graph.getNodeAttribute(source, 'type');
            const targetType = graph.getNodeAttribute(target, 'type');
            let sourceLabel = '',
                targetLabel = '';
            if (source.startsWith('stn')) {
                const sourceAttr = graph.getNodeAttribute(source, sourceType) as StationAttributes;
                sourceLabel = sourceAttr.names[0];
            } else {
                sourceLabel = i18n.t(`panel.details.nodes.${toCamelCase(sourceType)}.displayName`);
            }
            if (target.startsWith('stn')) {
                const targetAttr = graph.getNodeAttribute(target, targetType) as StationAttributes;
                targetLabel = targetAttr.names[0];
            } else {
                targetLabel = i18n.t(`panel.details.nodes.${toCamelCase(targetType)}.displayName`);
            }
            return {
                label: `${sourceLabel} - ${targetLabel}`,
                elementId: lineId,
                action: () => dispatch(setSelected(new Set([lineId]))),
            };
        });

        data[MenuCategory.LINE] = lineItems;
    }

    // Always add operations layer
    const operationItems: MenuItemData[] = [];
    operationItems.push({
        label: i18n.t('contextMenu.paste'),
        action: async () => {
            try {
                const clipboardText = await navigator.clipboard.readText();
                importSelectedNodesAndEdges(clipboardText, graph, false, false, svgCoord.x, svgCoord.y);
            } catch (error) {
                console.error('Failed to paste from clipboard:', error);
            }
        },
        elementId: 'operation-paste',
    });
    data[MenuCategory.OPERATION] = operationItems;

    return data;
};
