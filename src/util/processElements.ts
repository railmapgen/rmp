import { MultiDirectedGraph } from 'graphology';
import {
    StnId,
    LineId,
    MiscNodeId,
    NodeAttributes,
    EdgeAttributes,
    GraphAttributes,
    MiscEdgeId,
} from '../constants/constants';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/nodes';
import { LineType } from '../constants/lines';
import { MiscEdgeType } from '../constants/edges';

/**
 * This file contains helper methods to extract stations/miscNodes/lines/miscEdges
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
    attr: EdgeAttributes;
    type: LineType;
};
export const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): LineElem[] =>
    graph
        .filterDirectedEdges(
            (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                edge.startsWith('line') && attr.visible && attr.reconcileId === ''
        )
        .map(edge => {
            const [source, target] = graph.extremities(edge);
            const attr = graph.getEdgeAttributes(edge);
            const sourceAttr = graph.getNodeAttributes(source);
            const targetAttr = graph.getNodeAttributes(target);
            return {
                edge: edge as LineId,
                x1: sourceAttr.x,
                y1: sourceAttr.y,
                x2: targetAttr.x,
                y2: targetAttr.y,
                attr: attr,
                type: attr.type as LineType,
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

type MiscEdgeElem = {
    edge: MiscEdgeId;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    attr: EdgeAttributes;
    type: MiscEdgeType;
};
export const getMiscEdges = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): MiscEdgeElem[] =>
    graph
        .filterDirectedEdges(
            (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                edge.startsWith('misc_edge') && attr.visible && attr.reconcileId === ''
        )
        .map(edge => {
            const [source, target] = graph.extremities(edge);
            const attr = graph.getEdgeAttributes(edge);
            const sourceAttr = graph.getNodeAttributes(source);
            const targetAttr = graph.getNodeAttributes(target);
            return {
                edge: edge as MiscEdgeId,
                x1: sourceAttr.x,
                y1: sourceAttr.y,
                x2: targetAttr.x,
                y2: targetAttr.y,
                attr: attr,
                type: attr.type as MiscEdgeType,
            };
        });
