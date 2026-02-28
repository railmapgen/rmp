import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, beforeEach } from 'vitest';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { StationType } from '../constants/stations';
import {
    exportNodeSpecificAttrs,
    exportEdgeSpecificAttrs,
    parseClipboardData,
    importNodeSpecificAttrs,
    importEdgeSpecificAttrs,
    getSelectedElementsType,
    NodeSpecificAttrsClipboardData,
    EdgeSpecificAttrsClipboardData,
    CLIPBOARD_VERSION,
} from './clipboard';
import { CURRENT_VERSION } from './save';

describe('Unit tests for specific attributes clipboard functions', () => {
    let graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

    beforeEach(() => {
        graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    });

    describe('exportNodeSpecificAttrs', () => {
        it('should export specific attributes from a node', () => {
            const nodeId = 'stn_test1' as NodeId;
            graph.addNode(nodeId, {
                x: 100,
                y: 200,
                type: StationType.ShmetroBasic,
                visible: true,
                zIndex: 0,
                [StationType.ShmetroBasic]: {
                    names: ['测试站', 'Test Station'],
                    nameOffsetX: 'middle',
                    nameOffsetY: 'bottom',
                },
            } as NodeAttributes);

            const result = exportNodeSpecificAttrs(graph, nodeId);
            const parsed = JSON.parse(result) as NodeSpecificAttrsClipboardData;

            expect(parsed.app).toBe('rmp');
            expect(parsed.version).toBe(1);
            expect(parsed.type).toBe('node-attrs');
            expect(parsed.nodeType).toBe(StationType.ShmetroBasic);
            expect(parsed.specificAttrs).toEqual({
                names: ['测试站', 'Test Station'],
                nameOffsetX: 'middle',
                nameOffsetY: 'bottom',
            });
        });

        it('should handle node without specific attributes', () => {
            const nodeId = 'stn_test2' as NodeId;
            graph.addNode(nodeId, {
                x: 100,
                y: 200,
                type: StationType.ShmetroBasic,
                visible: true,
                zIndex: 0,
            } as NodeAttributes);

            const result = exportNodeSpecificAttrs(graph, nodeId);
            const parsed = JSON.parse(result) as NodeSpecificAttrsClipboardData;

            expect(parsed.specificAttrs).toEqual({});
        });
    });

    describe('exportEdgeSpecificAttrs', () => {
        it('should export style attributes and roundCornerFactor from an edge', () => {
            const nodeId1 = 'stn_node1' as NodeId;
            const nodeId2 = 'stn_node2' as NodeId;
            const edgeId = 'line_test1' as LineId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addDirectedEdgeWithKey(edgeId, nodeId1, nodeId2, {
                type: LinePathType.Diagonal,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test',
                parallelIndex: -1,
                [LinePathType.Diagonal]: {
                    startFrom: 'from',
                    offsetFrom: 0,
                    offsetTo: 0,
                    roundCornerFactor: 15,
                },
                [LineStyleType.SingleColor]: {
                    color: ['shanghai', 'sh1', '#e4002b', '#fff'],
                },
            } as EdgeAttributes);

            const result = exportEdgeSpecificAttrs(graph, edgeId);
            const parsed = JSON.parse(result) as EdgeSpecificAttrsClipboardData;

            expect(parsed.app).toBe('rmp');
            expect(parsed.version).toBe(1);
            expect(parsed.type).toBe('edge-attrs');
            expect(parsed.pathType).toBe(LinePathType.Diagonal);
            expect(parsed.styleType).toBe(LineStyleType.SingleColor);
            expect(parsed.roundCornerFactor).toBe(15);
            expect(parsed.styleAttrs).toEqual({
                color: ['shanghai', 'sh1', '#e4002b', '#fff'],
            });
        });

        it('should not include roundCornerFactor if not present (simple path)', () => {
            const nodeId1 = 'stn_node1' as NodeId;
            const nodeId2 = 'stn_node2' as NodeId;
            const edgeId = 'line_test2' as LineId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addDirectedEdgeWithKey(edgeId, nodeId1, nodeId2, {
                type: LinePathType.Simple,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test',
                parallelIndex: -1,
                [LinePathType.Simple]: {
                    offset: 0,
                },
                [LineStyleType.SingleColor]: {
                    color: ['shanghai', 'sh1', '#e4002b', '#fff'],
                },
            } as EdgeAttributes);

            const result = exportEdgeSpecificAttrs(graph, edgeId);
            const parsed = JSON.parse(result) as EdgeSpecificAttrsClipboardData;

            expect(parsed.roundCornerFactor).toBeUndefined();
        });
    });

    describe('parseClipboardData', () => {
        it('should parse node-attrs clipboard data', () => {
            const data: NodeSpecificAttrsClipboardData = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'node-attrs',
                nodeType: StationType.ShmetroBasic,
                specificAttrs: { names: ['Test'] },
            };

            const result = parseClipboardData(JSON.stringify(data));

            expect(result).not.toBeNull();
            expect(result?.type).toBe('node-attrs');
        });

        it('should parse edge-attrs clipboard data', () => {
            const data: EdgeSpecificAttrsClipboardData = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'edge-attrs',
                pathType: LinePathType.Diagonal,
                styleType: LineStyleType.SingleColor,
                roundCornerFactor: 10,
                styleAttrs: {},
            };

            const result = parseClipboardData(JSON.stringify(data));

            expect(result).not.toBeNull();
            expect(result?.type).toBe('edge-attrs');
        });

        it('should parse elements clipboard data', () => {
            const data = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'elements',
                nodesWithAttrs: {},
                edgesWithAttrs: {},
                avgX: 0,
                avgY: 0,
            };

            const result = parseClipboardData(JSON.stringify(data));

            expect(result).not.toBeNull();
            expect(result?.type).toBe('elements');
        });

        it('should return null for invalid data', () => {
            expect(parseClipboardData('not json')).toBeNull();
            expect(parseClipboardData(JSON.stringify({ app: 'other' }))).toBeNull();
            expect(parseClipboardData(JSON.stringify({ app: 'rmp', version: 999 }))).toBeNull();
            // Missing saveVersion should also return null
            expect(parseClipboardData(JSON.stringify({ app: 'rmp', version: CLIPBOARD_VERSION }))).toBeNull();
            // Wrong saveVersion should return null
            expect(
                parseClipboardData(
                    JSON.stringify({
                        app: 'rmp',
                        version: CLIPBOARD_VERSION,
                        saveVersion: CURRENT_VERSION + 1,
                        type: 'elements',
                    })
                )
            ).toBeNull();
        });
    });

    describe('importNodeSpecificAttrs', () => {
        it('should apply attributes to nodes of the same type', () => {
            const nodeId1 = 'stn_test1' as NodeId;
            const nodeId2 = 'stn_test2' as NodeId;

            graph.addNode(nodeId1, {
                x: 100,
                y: 200,
                type: StationType.ShmetroBasic,
                visible: true,
                zIndex: 0,
            });
            graph.addNode(nodeId2, {
                x: 300,
                y: 400,
                type: StationType.ShmetroBasic,
                visible: true,
                zIndex: 0,
            });

            const data: NodeSpecificAttrsClipboardData = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'node-attrs',
                nodeType: StationType.ShmetroBasic,
                specificAttrs: { names: ['新站', 'New Station'], nameOffsetX: 'left' },
            };

            const result = importNodeSpecificAttrs(graph, new Set([nodeId1, nodeId2]), data);

            expect(result).toBe(true);
            expect(graph.getNodeAttribute(nodeId1, StationType.ShmetroBasic)).toEqual({
                names: ['新站', 'New Station'],
                nameOffsetX: 'left',
            });
            expect(graph.getNodeAttribute(nodeId2, StationType.ShmetroBasic)).toEqual({
                names: ['新站', 'New Station'],
                nameOffsetX: 'left',
            });
        });

        it('should not apply attributes to nodes of different type', () => {
            const nodeId = 'stn_test1' as NodeId;

            graph.addNode(nodeId, {
                x: 100,
                y: 200,
                type: StationType.GzmtrBasic,
                visible: true,
                zIndex: 0,
            });

            const data: NodeSpecificAttrsClipboardData = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'node-attrs',
                nodeType: StationType.ShmetroBasic,
                specificAttrs: { names: ['新站', 'New Station'] },
            };

            const result = importNodeSpecificAttrs(graph, new Set([nodeId]), data);

            expect(result).toBe(false);
            expect(graph.getNodeAttribute(nodeId, StationType.ShmetroBasic)).toBeUndefined();
        });
    });

    describe('importEdgeSpecificAttrs', () => {
        it('should apply style attributes to edges of the same style type', () => {
            const nodeId1 = 'stn_node1' as NodeId;
            const nodeId2 = 'stn_node2' as NodeId;
            const edgeId = 'line_test1' as LineId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addDirectedEdgeWithKey(edgeId, nodeId1, nodeId2, {
                type: LinePathType.Diagonal,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test',
                parallelIndex: -1,
            } as EdgeAttributes);

            const data: EdgeSpecificAttrsClipboardData = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'edge-attrs',
                pathType: LinePathType.Diagonal,
                styleType: LineStyleType.SingleColor,
                roundCornerFactor: 20,
                styleAttrs: { color: ['beijing', 'bj1', '#c23a30', '#fff'] },
            };

            const result = importEdgeSpecificAttrs(graph, new Set([edgeId]), data);

            expect(result).toBe(true);
            expect(graph.getEdgeAttribute(edgeId, LineStyleType.SingleColor)).toEqual({
                color: ['beijing', 'bj1', '#c23a30', '#fff'],
            });
            expect(graph.getEdgeAttribute(edgeId, LinePathType.Diagonal)).toEqual({
                roundCornerFactor: 20,
            });
        });

        it('should not apply roundCornerFactor if path type differs', () => {
            const nodeId1 = 'stn_node1' as NodeId;
            const nodeId2 = 'stn_node2' as NodeId;
            const edgeId = 'line_test1' as LineId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addDirectedEdgeWithKey(edgeId, nodeId1, nodeId2, {
                type: LinePathType.Simple,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test',
                parallelIndex: -1,
            } as EdgeAttributes);

            const data: EdgeSpecificAttrsClipboardData = {
                app: 'rmp',
                version: CLIPBOARD_VERSION,
                saveVersion: CURRENT_VERSION,
                type: 'edge-attrs',
                pathType: LinePathType.Diagonal,
                styleType: LineStyleType.SingleColor,
                roundCornerFactor: 20,
                styleAttrs: { color: ['beijing', 'bj1', '#c23a30', '#fff'] },
            };

            const result = importEdgeSpecificAttrs(graph, new Set([edgeId]), data);

            expect(result).toBe(true); // Style still applied
            expect(graph.getEdgeAttribute(edgeId, LineStyleType.SingleColor)).toEqual({
                color: ['beijing', 'bj1', '#c23a30', '#fff'],
            });
            // roundCornerFactor should not be applied to Simple path
            expect(graph.getEdgeAttribute(edgeId, LinePathType.Simple)).toBeUndefined();
        });
    });

    describe('getSelectedElementsType', () => {
        it('should detect all same node type', () => {
            const nodeId1 = 'stn_test1' as NodeId;
            const nodeId2 = 'stn_test2' as NodeId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });

            const result = getSelectedElementsType(graph, new Set([nodeId1, nodeId2]));

            expect(result.allSameType).toBe(true);
            expect(result.category).toBe('node');
            expect(result.nodeType).toBe(StationType.ShmetroBasic);
        });

        it('should detect different node types', () => {
            const nodeId1 = 'stn_test1' as NodeId;
            const nodeId2 = 'stn_test2' as NodeId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.GzmtrBasic, visible: true, zIndex: 0 });

            const result = getSelectedElementsType(graph, new Set([nodeId1, nodeId2]));

            expect(result.allSameType).toBe(false);
            expect(result.category).toBe('node');
        });

        it('should detect all same edge style type', () => {
            const nodeId1 = 'stn_node1' as NodeId;
            const nodeId2 = 'stn_node2' as NodeId;
            const edgeId1 = 'line_test1' as LineId;
            const edgeId2 = 'line_test2' as LineId;

            graph.addNode(nodeId1, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addDirectedEdgeWithKey(edgeId1, nodeId1, nodeId2, {
                type: LinePathType.Diagonal,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test1',
                parallelIndex: -1,
            } as EdgeAttributes);
            graph.addDirectedEdgeWithKey(edgeId2, nodeId2, nodeId1, {
                type: LinePathType.Simple,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test2',
                parallelIndex: -1,
            } as EdgeAttributes);

            const result = getSelectedElementsType(graph, new Set([edgeId1, edgeId2]));

            expect(result.allSameType).toBe(true);
            expect(result.category).toBe('edge');
            expect(result.edgeStyleType).toBe(LineStyleType.SingleColor);
        });

        it('should detect mixed nodes and edges', () => {
            const nodeId = 'stn_test1' as NodeId;
            const nodeId2 = 'stn_test2' as NodeId;
            const edgeId = 'line_test1' as LineId;

            graph.addNode(nodeId, { x: 0, y: 0, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addNode(nodeId2, { x: 100, y: 100, type: StationType.ShmetroBasic, visible: true, zIndex: 0 });
            graph.addDirectedEdgeWithKey(edgeId, nodeId, nodeId2, {
                type: LinePathType.Diagonal,
                style: LineStyleType.SingleColor,
                visible: true,
                zIndex: 0,
                reconcileId: 'test',
                parallelIndex: -1,
            } as EdgeAttributes);

            const result = getSelectedElementsType(graph, new Set([nodeId, edgeId]));

            expect(result.allSameType).toBe(false);
            expect(result.category).toBe('mixed');
        });

        it('should handle empty selection', () => {
            const result = getSelectedElementsType(graph, new Set());

            expect(result.allSameType).toBe(false);
            expect(result.category).toBe(null);
        });
    });
});
