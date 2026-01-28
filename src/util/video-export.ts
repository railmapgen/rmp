import { MultiDirectedGraph } from 'graphology';
import WebMWriter from 'webm-writer';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { TextLanguage } from './fonts';
import { makeRenderReadySVGElement } from './download';

export interface VideoExportOptions {
    fps: number;
    duration: number;
    isTransparent: boolean;
    scale: number;
    isSystemFontsOnly: boolean;
    quality: number;
}

export interface AnimationSequence {
    nodes: NodeId[];
    edges: LineId[];
}

// Animation timing constants
const NODE_ANIMATION_RATIO = 0.3; // 30% of animation time for nodes appearing
const EDGE_ANIMATION_RATIO = 0.7; // 70% of animation time for edges drawing
const HORIZONTAL_GROUPING_THRESHOLD = 50; // Threshold for grouping nodes horizontally

/**
 * Determines the order in which nodes and edges should be animated.
 * Nodes are ordered by their spatial position (left to right, then top to bottom).
 * Edges are ordered after their connected nodes based on when both endpoints appear.
 */
export const generateAnimationSequence = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): AnimationSequence => {
    const nodes: NodeId[] = [];
    const edges: LineId[] = [];

    // Collect all nodes with their positions
    const nodePositions: Array<{ id: NodeId; x: number; y: number }> = [];
    graph.forEachNode((node, attr) => {
        nodePositions.push({ id: node as NodeId, x: attr.x, y: attr.y });
    });

    // Sort nodes by spatial position (left to right, then top to bottom)
    nodePositions.sort((a, b) => {
        if (Math.abs(a.x - b.x) > HORIZONTAL_GROUPING_THRESHOLD) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });

    nodes.push(...nodePositions.map(n => n.id));

    // Collect edges and sort them based on when their connected nodes appear
    const edgeList: Array<{ id: LineId; sourceIndex: number; targetIndex: number }> = [];
    graph.forEachEdge((edge, attr, source, target) => {
        const sourceIndex = nodes.indexOf(source as NodeId);
        const targetIndex = nodes.indexOf(target as NodeId);
        edgeList.push({
            id: edge as LineId,
            sourceIndex,
            targetIndex,
        });
    });

    // Sort edges: they should appear after both their source and target nodes
    edgeList.sort((a, b) => {
        const aMax = Math.max(a.sourceIndex, a.targetIndex);
        const bMax = Math.max(b.sourceIndex, b.targetIndex);
        return aMax - bMax;
    });

    edges.push(...edgeList.map(e => e.id));

    return { nodes, edges };
};

/**
 * Creates an SVG element with only the specified nodes and edges visible.
 * Used to generate individual frames for the animation.
 */
const createFrameSVG = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>,
    edgeProgress: Map<LineId, number>, // 0 to 1, representing how much of the edge is drawn
    isSystemFontsOnly: boolean,
    languages: TextLanguage[],
    existsNodeTypes: Set<any>
): Promise<{ elem: SVGSVGElement; width: number; height: number }> => {
    // Create the base SVG element from the current graph
    const { elem, width, height } = await makeRenderReadySVGElement(
        graph,
        false, // don't generate RMP info
        isSystemFontsOnly,
        languages,
        existsNodeTypes,
        2 // SVG version 2
    );

    // Hide nodes that shouldn't be visible yet by removing them from the DOM
    graph.forEachNode(node => {
        if (!visibleNodes.has(node as NodeId)) {
            const nodeElem = elem.querySelector(`#${node}`);
            if (nodeElem) {
                nodeElem.remove();
            }
        }
    });

    // Hide edges that shouldn't be visible yet and apply progress to visible ones
    graph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        const edgeElem = elem.querySelector(`#${edgeId}`);

        if (!edgeElem) return;

        if (!visibleEdges.has(edgeId)) {
            // Edge not visible yet, remove it
            edgeElem.remove();
        } else {
            // Edge is visible, apply progress animation
            const progress = edgeProgress.get(edgeId) || 1;
            if (progress < 1) {
                const pathElem = edgeElem.querySelector('path');
                if (pathElem) {
                    const totalLength = pathElem.getTotalLength();
                    const dashLength = totalLength * progress;
                    pathElem.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
                    pathElem.setAttribute('stroke-dashoffset', '0');
                }
            }
        }
    });

    return { elem, width, height };
};

/**
 * Renders an SVG element to a canvas at the specified scale.
 */
const renderSVGToCanvas = async (
    svgElem: SVGSVGElement,
    width: number,
    height: number,
    scale: number,
    isTransparent: boolean,
    bgColor: string
): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const scaledWidth = (width * scale) / 100;
    const scaledHeight = (height * scale) / 100;
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    const ctx = canvas.getContext('2d')!;

    // Set background if not transparent
    if (!isTransparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    }

    // Convert SVG to data URL
    const svgString = svgElem.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');
    const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
            resolve(canvas);
        };
        img.onerror = reject;
        img.src = src;
    });
};

/**
 * Exports the graph as an animated video file (WebM format).
 * Animates nodes appearing in sequence, followed by edges drawing progressively.
 */
export const exportVideo = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<any>,
    options: VideoExportOptions,
    bgColor: string,
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    const { fps, duration, isTransparent, scale, isSystemFontsOnly, quality } = options;

    // Generate animation sequence
    const sequence = generateAnimationSequence(graph);

    // Validate that we have something to animate
    if (sequence.nodes.length === 0) {
        throw new Error('No nodes to animate');
    }

    const totalFrames = Math.floor(fps * duration);

    // Calculate timing
    const nodeFrames = Math.floor(totalFrames * NODE_ANIMATION_RATIO);
    const edgeFrames = totalFrames - nodeFrames;
    const framesPerNode = sequence.nodes.length > 0 ? nodeFrames / sequence.nodes.length : 0;
    const framesPerEdge = sequence.edges.length > 0 ? edgeFrames / sequence.edges.length : 0;

    // Initialize video writer
    const videoWriter = new WebMWriter({
        quality: quality / 100,
        frameRate: fps,
        transparent: isTransparent,
    });

    // Generate frames
    const visibleNodes = new Set<NodeId>();
    const visibleEdges = new Set<LineId>();
    const edgeProgress = new Map<LineId, number>();

    for (let frame = 0; frame < totalFrames; frame++) {
        // Determine which nodes should be visible
        const currentNodeIndex = Math.floor(frame / framesPerNode);
        for (let i = 0; i <= currentNodeIndex && i < sequence.nodes.length; i++) {
            visibleNodes.add(sequence.nodes[i]);
        }

        // Determine which edges should be visible and their progress
        if (frame >= nodeFrames && sequence.edges.length > 0) {
            const edgeFrame = frame - nodeFrames;
            const currentEdgeIndex = Math.floor(edgeFrame / framesPerEdge);

            // Add completed edges
            for (let i = 0; i < currentEdgeIndex && i < sequence.edges.length; i++) {
                const edge = sequence.edges[i];
                if (!visibleEdges.has(edge)) {
                    visibleEdges.add(edge);
                }
                edgeProgress.set(edge, 1);
            }

            // Add current edge with progress
            if (currentEdgeIndex < sequence.edges.length) {
                const edge = sequence.edges[currentEdgeIndex];
                visibleEdges.add(edge);
                const progress = (edgeFrame % framesPerEdge) / framesPerEdge;
                edgeProgress.set(edge, progress);
            }
        }

        // Create frame SVG
        const { elem, width, height } = await createFrameSVG(
            graph,
            visibleNodes,
            visibleEdges,
            edgeProgress,
            isSystemFontsOnly,
            languages,
            existsNodeTypes
        );

        // Render to canvas
        const canvas = await renderSVGToCanvas(elem, width, height, scale, isTransparent, bgColor);

        // Add frame to video
        videoWriter.addFrame(canvas);

        // Clean up
        elem.remove();

        // Report progress
        if (onProgress) {
            onProgress((frame + 1) / totalFrames);
        }
    }

    // Complete video and return blob
    const blob = await videoWriter.complete();
    return blob;
};
