import { MultiDirectedGraph } from 'graphology';
import { useCallback } from 'react';
import { EdgeAttributes, GraphAttributes, LineId, MiscNodeId, NodeAttributes, StnId } from '../../constants/constants';
import { setSelected, setActive, showDetailsPanel, clearSelected } from '../../redux/runtime/runtime-slice';
import { importSelectedNodesAndEdges } from '../clipboard';

export enum MenuCategory {
    STATION = 'station',
    MISC_NODE = 'misc-node',
    LINE = 'line',
    OPERATION = 'operation',
}

export interface MenuLayerData {
    category: MenuCategory;
    items: MenuItemData[];
}

export interface MenuItemData {
    label: string;
    icon?: React.ReactNode;
    action: () => void;
    elementId?: string;
}

/**
 * Custom hook for finding elements near a touch point and organizing them into layers
 * for the radial touch menu. Maximum of 5 layers supported.
 */
export const useNearbyElements = () => {
    const findNearbyElements = useCallback(
        (
            graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
            svgCoord: { x: number; y: number },
            radius: number,
            dispatch: any,
            selectedElements: Set<string>
        ): MenuLayerData[] => {
            const layers: MenuLayerData[] = [];

            // Find stations within radius
            const nearbyStations = graph.filterNodes((nodeId, attrs) => {
                if (!nodeId.startsWith('stn')) return false;
                const distance = Math.sqrt(Math.pow(attrs.x - svgCoord.x, 2) + Math.pow(attrs.y - svgCoord.y, 2));
                return distance <= radius;
            }) as StnId[];

            // Find misc nodes within radius
            const nearbyMiscNodes = graph.filterNodes((nodeId, attrs) => {
                if (!nodeId.startsWith('misc')) return false;
                const distance = Math.sqrt(Math.pow(attrs.x - svgCoord.x, 2) + Math.pow(attrs.y - svgCoord.y, 2));
                return distance <= radius;
            }) as MiscNodeId[];

            // Find lines within radius (check if touch point is near any line path)
            const nearbyLines: LineId[] = [];
            graph.forEachEdge((edgeId, attributes, source, target, sourceAttrs, targetAttrs) => {
                // Simple distance check to line segment (can be improved with proper line-point distance)
                const lineDistance = distanceToLineSegment(
                    svgCoord,
                    { x: sourceAttrs.x, y: sourceAttrs.y },
                    { x: targetAttrs.x, y: targetAttrs.y }
                );
                if (lineDistance <= radius) {
                    nearbyLines.push(edgeId as LineId);
                }
            });

            // Create station layer if there are nearby stations
            if (nearbyStations.length > 0) {
                const stationItems: MenuItemData[] = nearbyStations.slice(0, 8).map(stationId => ({
                    label: `Station ${stationId}`,
                    elementId: stationId,
                    action: () => {
                        dispatch(setSelected(new Set([stationId])));
                        dispatch(setActive(stationId));
                        dispatch(showDetailsPanel());
                    },
                }));

                layers.push({
                    category: MenuCategory.STATION,
                    items: stationItems,
                });
            }

            // Create misc nodes layer if there are nearby misc nodes
            if (nearbyMiscNodes.length > 0) {
                const miscNodeItems: MenuItemData[] = nearbyMiscNodes.slice(0, 8).map(nodeId => ({
                    label: `Node ${nodeId}`,
                    elementId: nodeId,
                    action: () => {
                        dispatch(setSelected(new Set([nodeId])));
                        dispatch(setActive(nodeId));
                        dispatch(showDetailsPanel());
                    },
                }));

                layers.push({
                    category: MenuCategory.MISC_NODE,
                    items: miscNodeItems,
                });
            }

            // Create lines layer if there are nearby lines
            if (nearbyLines.length > 0) {
                const lineItems: MenuItemData[] = nearbyLines.slice(0, 6).map(lineId => ({
                    label: `Line ${lineId}`,
                    elementId: lineId,
                    action: () => {
                        dispatch(setSelected(new Set([lineId])));
                        dispatch(showDetailsPanel());
                    },
                }));

                layers.push({
                    category: MenuCategory.LINE,
                    items: lineItems,
                });
            }

            // Always add operations layer
            const operationItems: MenuItemData[] = [];

            if (layers.length > 0) {
                // If elements are found, add delete and cancel operations
                operationItems.push({
                    label: '删除',
                    action: () => {
                        // Delete selected elements
                        const allElementIds = layers.flatMap(layer =>
                            layer.items.map(item => item.elementId).filter(Boolean)
                        );
                        allElementIds.forEach(id => {
                            if (graph.hasNode(id!)) {
                                graph.dropNode(id!);
                            } else if (graph.hasEdge(id!)) {
                                graph.dropEdge(id!);
                            }
                        });
                        dispatch(clearSelected());
                    },
                });
                operationItems.push({
                    label: '取消',
                    action: () => {
                        dispatch(clearSelected());
                    },
                });
            }

            // Add paste operation if no elements are currently selected
            if (selectedElements.size === 0) {
                operationItems.push({
                    label: '粘贴',
                    action: async () => {
                        try {
                            const clipboardText = await navigator.clipboard.readText();
                            importSelectedNodesAndEdges(clipboardText, graph, false, false, svgCoord.x, svgCoord.y);
                        } catch (error) {
                            console.error('Failed to paste from clipboard:', error);
                        }
                    },
                });
            }

            if (operationItems.length > 0) {
                layers.push({
                    category: MenuCategory.OPERATION,
                    items: operationItems,
                });
            }

            // Return at most 5 layers
            return layers.slice(0, 5);
        },
        []
    );

    return { findNearbyElements };
};

/**
 * Calculate the shortest distance from a point to a line segment
 */
function distanceToLineSegment(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        // Line segment is actually a point
        return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const xx = lineStart.x + param * C;
    const yy = lineStart.y + param * D;

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
}
