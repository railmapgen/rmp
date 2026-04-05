import { describe, expect, it } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes, TimelineEntry } from '../constants/constants';
import { StationType } from '../constants/stations';
import { generateAnimationSequence } from './video-export';

const makeGraph = () => new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

const addNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    x: number,
    y: number
) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y,
        type: StationType.LondonTubeBasic,
    });
};

const addEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    startFrom: 'from' | 'to' = 'from'
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: 'diagonal' as any,
        style: 'single-color' as any,
        reconcileId: '',
        parallelIndex: -1,
        diagonal: {
            startFrom,
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 7.5,
        },
    });
};

const toTimeline = (...entries: Array<Id | TimelineEntry>) => entries;

describe('generateAnimationSequence', () => {
    it('renders strictly in timeline order when timeline exists', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');

        graph.setAttribute('timeline', toTimeline('stn_b', 'line_bc', 'stn_c', 'stn_a', 'line_ab'));

        const sequence = generateAnimationSequence(graph);

        expect(sequence.steps).toEqual([
            { id: 'stn_b', kind: 'node', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
        ]);
        expect(sequence.nodes).toEqual(['stn_b', 'stn_c', 'stn_a']);
        expect(sequence.edges).toEqual(['line_bc', 'line_ab']);
    });

    it('combines original line direction with timeline reverse flag', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b', 'to');

        graph.setAttribute('timeline', toTimeline({ id: 'line_ab' }, { id: 'line_ab', reverse: true }));

        const sequence = generateAnimationSequence(graph);

        expect(sequence.steps).toEqual([
            { id: 'line_ab', kind: 'edge', reverse: true },
            { id: 'line_ab', kind: 'edge', reverse: false },
        ]);
    });

    it('falls back to spatial order when timeline is absent', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 100, 100);
        addNode(graph, 'stn_b', 200, 100);
        addNode(graph, 'stn_c', 150, 200);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');

        const sequence = generateAnimationSequence(graph);

        expect(sequence.nodes).toEqual(['stn_a', 'stn_b', 'stn_c']);
        expect(sequence.edges).toEqual(['line_ab', 'line_bc']);
        expect(sequence.steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'stn_b', kind: 'node', reverse: false },
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
        ]);
    });
});
