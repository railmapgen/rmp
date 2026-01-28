import { describe, expect, it } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { generateAnimationSequence } from './video-export';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';

describe('generateAnimationSequence', () => {
    it('should order nodes from left to right, top to bottom', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add nodes at different positions
        graph.addNode('node1', {
            visible: true,
            zIndex: 0,
            x: 100,
            y: 100,
            type: StationType.LondonTubeBasic,
        });
        graph.addNode('node2', {
            visible: true,
            zIndex: 0,
            x: 200,
            y: 100,
            type: StationType.LondonTubeBasic,
        });
        graph.addNode('node3', {
            visible: true,
            zIndex: 0,
            x: 150,
            y: 200,
            type: StationType.LondonTubeBasic,
        });

        const sequence = generateAnimationSequence(graph);

        // Should be ordered: node1 (100, 100), node2 (200, 100), node3 (150, 200)
        expect(sequence.nodes).toEqual(['node1', 'node2', 'node3']);
    });

    it('should order edges after their connected nodes', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add nodes
        graph.addNode('node1', {
            visible: true,
            zIndex: 0,
            x: 100,
            y: 100,
            type: StationType.LondonTubeBasic,
        });
        graph.addNode('node2', {
            visible: true,
            zIndex: 0,
            x: 200,
            y: 100,
            type: StationType.LondonTubeBasic,
        });
        graph.addNode('node3', {
            visible: true,
            zIndex: 0,
            x: 300,
            y: 100,
            type: StationType.LondonTubeBasic,
        });

        // Add edges
        graph.addDirectedEdgeWithKey('edge1', 'node1', 'node2', {
            visible: true,
            zIndex: 0,
            type: 'diagonal' as any,
            style: 'single-color' as any,
            reconcileId: '',
            parallelIndex: -1,
        });
        graph.addDirectedEdgeWithKey('edge2', 'node2', 'node3', {
            visible: true,
            zIndex: 0,
            type: 'diagonal' as any,
            style: 'single-color' as any,
            reconcileId: '',
            parallelIndex: -1,
        });

        const sequence = generateAnimationSequence(graph);

        // Nodes should be ordered left to right
        expect(sequence.nodes).toEqual(['node1', 'node2', 'node3']);
        
        // edge1 connects node1-node2 (max index 1)
        // edge2 connects node2-node3 (max index 2)
        // So edge1 should come before edge2
        expect(sequence.edges).toEqual(['edge1', 'edge2']);
    });

    it('should handle empty graph', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        const sequence = generateAnimationSequence(graph);

        expect(sequence.nodes).toEqual([]);
        expect(sequence.edges).toEqual([]);
    });
});
