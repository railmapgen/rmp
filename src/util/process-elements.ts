import { MultiDirectedGraph } from 'graphology';
import { StnId, LineId, MiscNodeId, NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/nodes';
import {
    ExternalLinePathAttributes,
    ExternalLineStyleAttributes,
    LineStyleType,
    LinePathType,
} from '../constants/lines';

/**
 * This file contains helper methods to extract stations/miscNodes/lines
 * from MultiDirectedGraph and return elements that svg-canvas can directly use in
 * various aforementioned components.
 */

type StationElem = NodeAttributes & { node: StnId; type: StationType };
export const getStations = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): StationElem[] =>
    graph
        .filterNodes((node, attr) => node.startsWith('stn'))
        .map(node => [node, graph.getNodeAttributes(node)] as [StnId, NodeAttributes])
        .filter(([node, attr]) => attr.visible)
        .map(([node, attr]) => ({
            node: node as StnId,
            visible: attr.visible,
            zIndex: attr.zIndex,
            x: attr.x,
            y: attr.y,
            type: attr.type as StationType,
            [attr.type]: attr[attr.type],
        }));

type LineElem = {
    edge: LineId;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    type: LinePathType;
    attr: ExternalLinePathAttributes[keyof ExternalLinePathAttributes];
    style: LineStyleType;
    styleAttr: ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes];
};
export const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): LineElem[] =>
    graph
        .filterDirectedEdges(
            (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                edge.startsWith('line') && attr.visible && attr.reconcileId === ''
        )
        .map(edge => {
            const [source, target] = graph.extremities(edge);
            const sourceAttr = graph.getNodeAttributes(source);
            const targetAttr = graph.getNodeAttributes(target);
            const type = graph.getEdgeAttribute(edge, 'type') as LinePathType;
            const attr = graph.getEdgeAttribute(
                edge,
                type
            ) as ExternalLinePathAttributes[keyof ExternalLinePathAttributes];
            const style = graph.getEdgeAttribute(edge, 'style') as LineStyleType;
            const styleAttr = graph.getEdgeAttribute(
                edge,
                style
            ) as ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes];
            return {
                edge: edge as LineId,
                x1: sourceAttr.x,
                y1: sourceAttr.y,
                x2: targetAttr.x,
                y2: targetAttr.y,
                type,
                attr,
                style,
                styleAttr,
            };
        });

type MiscNodeElem = NodeAttributes & { node: MiscNodeId; type: MiscNodeType };
export const getMiscNodes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): MiscNodeElem[] =>
    graph
        .filterNodes((node, attr) => node.startsWith('misc_node'))
        .map(node => [node, graph.getNodeAttributes(node)] as [MiscNodeId, NodeAttributes])
        .filter(([node, attr]) => attr.visible)
        .map(([node, attr]) => ({
            node,
            visible: attr.visible,
            zIndex: attr.zIndex,
            x: attr.x,
            y: attr.y,
            type: attr.type as MiscNodeType,
            [attr.type]: attr[attr.type],
        }));
