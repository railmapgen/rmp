import { MultiDirectedGraph } from 'graphology';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { describe, expect, it } from 'vitest';
import { linePaths } from '../components/svgs/lines/lines';
import { RayGuidedPathAttributes } from '../components/svgs/lines/paths/ray-guided';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    NodeAttributes,
    NodeId,
    Theme,
} from '../constants/constants';
import { ExternalLinePathAttributes, LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { generateClosedPath } from './generate-closed-path';

const THEME: Theme = [CityCode.Other, 'test', '#000000', MonoColour.white];
type PathAttrs = NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>;

const addVirtualNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: NodeId,
    x: number,
    y: number
) => {
    graph.addNode(id, {
        x,
        y,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
        visible: true,
        zIndex: 0,
    });
};

const addEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: LineId,
    source: NodeId,
    target: NodeId,
    type: LinePathType,
    pathAttrs: PathAttrs
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type,
        [type]: pathAttrs,
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: { color: THEME },
        reconcileId: '',
        parallelIndex: -1,
    });
};

const legacyGenerateClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[],
    edges: LineId[]
) => {
    if (nodes.length !== edges.length + 1 || nodes.length < 3) return undefined;

    let pathString = '';

    for (let i = 0; i < edges.length; i++) {
        const sourceNodeId = nodes[i];
        const targetNodeId = nodes[i + 1];
        const edgeId = edges[i];

        const sourceAttrs = graph.getNodeAttributes(sourceNodeId);
        const targetAttrs = graph.getNodeAttributes(targetNodeId);
        const edgeAttrs = graph.getEdgeAttributes(edgeId);
        const pathType = edgeAttrs.type;
        const initialPathAttr = edgeAttrs[pathType]!;
        const finalPathAttr = structuredClone(initialPathAttr);

        const isReversed = graph.source(edgeId) !== sourceNodeId;
        if (isReversed) {
            if ('startFrom' in finalPathAttr) {
                finalPathAttr.startFrom = finalPathAttr.startFrom === 'from' ? 'to' : 'from';
            }
            if (pathType === LinePathType.RayGuided) {
                const rayGuidedAttr = finalPathAttr as RayGuidedPathAttributes;
                [rayGuidedAttr.startAngle, rayGuidedAttr.endAngle] = [rayGuidedAttr.endAngle, rayGuidedAttr.startAngle];
                [rayGuidedAttr.offsetFrom, rayGuidedAttr.offsetTo] = [rayGuidedAttr.offsetTo, rayGuidedAttr.offsetFrom];
            }
        }

        let segment =
            linePaths[pathType]?.generatePath(
                sourceAttrs.x,
                targetAttrs.x,
                sourceAttrs.y,
                targetAttrs.y,
                finalPathAttr as any
            ).d || `M ${sourceAttrs.x} ${sourceAttrs.y} L ${targetAttrs.x} ${targetAttrs.y}`;

        if (i > 0) {
            segment = segment.split(' ').slice(3).join(' ');
        }

        pathString += (i > 0 ? ' ' : '') + segment;
    }

    return `${pathString} Z`;
};

describe('generateClosedPath', () => {
    it('should return undefined for invalid loop definitions', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addVirtualNode(graph, 'misc_node_a', 0, 0);
        addVirtualNode(graph, 'misc_node_b', 100, 0);

        expect(generateClosedPath(graph, ['misc_node_a', 'misc_node_b'], ['line_a'])).toBeUndefined();
        expect(generateClosedPath(graph, ['misc_node_a', 'misc_node_b', 'misc_node_a'], ['line_a'])).toBeUndefined();
    });

    it('should match the legacy output for a rounded perpendicular loop', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addVirtualNode(graph, 'misc_node_a', 0, 0);
        addVirtualNode(graph, 'misc_node_b', 120, 0);
        addVirtualNode(graph, 'misc_node_c', 120, 100);

        addEdge(graph, 'line_ab', 'misc_node_a', 'misc_node_b', LinePathType.Perpendicular, {
            ...structuredClone(linePaths[LinePathType.Perpendicular].defaultAttrs),
            startFrom: 'from',
            offsetFrom: 10,
            offsetTo: -5,
            roundCornerFactor: 18.33,
        });
        addEdge(graph, 'line_bc', 'misc_node_b', 'misc_node_c', LinePathType.Perpendicular, {
            ...structuredClone(linePaths[LinePathType.Perpendicular].defaultAttrs),
            startFrom: 'to',
            offsetFrom: -10,
            offsetTo: 5,
            roundCornerFactor: 18.33,
        });
        addEdge(graph, 'line_ca', 'misc_node_c', 'misc_node_a', LinePathType.Diagonal, {
            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
            startFrom: 'from',
            offsetFrom: 6,
            offsetTo: -4,
            roundCornerFactor: 10,
        });

        const nodes: NodeId[] = ['misc_node_a', 'misc_node_b', 'misc_node_c', 'misc_node_a'];
        const edges: LineId[] = ['line_ab', 'line_bc', 'line_ca'];

        expect(generateClosedPath(graph, nodes, edges)?.d).toBe(legacyGenerateClosedPath(graph, nodes, edges));
    });

    it('should match the legacy output when traversing a diagonal edge in reverse', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addVirtualNode(graph, 'misc_node_a', 0, 0);
        addVirtualNode(graph, 'misc_node_b', 100, 0);
        addVirtualNode(graph, 'misc_node_c', 100, 80);

        addEdge(graph, 'line_ba', 'misc_node_b', 'misc_node_a', LinePathType.Diagonal, {
            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
            startFrom: 'from',
            offsetFrom: 8,
            offsetTo: -5,
            roundCornerFactor: 0,
        });
        addEdge(graph, 'line_bc', 'misc_node_b', 'misc_node_c', LinePathType.Perpendicular, {
            ...structuredClone(linePaths[LinePathType.Perpendicular].defaultAttrs),
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 6,
            roundCornerFactor: 0,
        });
        addEdge(graph, 'line_ca', 'misc_node_c', 'misc_node_a', LinePathType.Diagonal, {
            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
            startFrom: 'to',
            offsetFrom: 2,
            offsetTo: 4,
            roundCornerFactor: 0,
        });

        const nodes: NodeId[] = ['misc_node_a', 'misc_node_b', 'misc_node_c', 'misc_node_a'];
        const edges: LineId[] = ['line_ba', 'line_bc', 'line_ca'];

        expect(generateClosedPath(graph, nodes, edges)?.d).toBe(legacyGenerateClosedPath(graph, nodes, edges));
    });

    it('should match the legacy output when traversing a ray-guided edge in reverse', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addVirtualNode(graph, 'misc_node_a', 0, 0);
        addVirtualNode(graph, 'misc_node_b', 120, 120);
        addVirtualNode(graph, 'misc_node_c', 0, 160);

        addEdge(graph, 'line_ba', 'misc_node_b', 'misc_node_a', LinePathType.RayGuided, {
            ...structuredClone(linePaths[LinePathType.RayGuided].defaultAttrs),
            startAngle: 90,
            endAngle: 0,
            offsetFrom: 10,
            offsetTo: 20,
            roundCornerFactor: 0,
        });
        addEdge(graph, 'line_bc', 'misc_node_b', 'misc_node_c', LinePathType.Diagonal, {
            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 10,
        });
        addEdge(graph, 'line_ca', 'misc_node_c', 'misc_node_a', LinePathType.Perpendicular, {
            ...structuredClone(linePaths[LinePathType.Perpendicular].defaultAttrs),
            startFrom: 'to',
            offsetFrom: 4,
            offsetTo: 8,
            roundCornerFactor: 18.33,
        });

        const nodes: NodeId[] = ['misc_node_a', 'misc_node_b', 'misc_node_c', 'misc_node_a'];
        const edges: LineId[] = ['line_ba', 'line_bc', 'line_ca'];

        expect(generateClosedPath(graph, nodes, edges)?.d).toBe(legacyGenerateClosedPath(graph, nodes, edges));
    });
});
