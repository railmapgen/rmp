import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { lineStyles } from '../components/svgs/lines/lines';
import { getLines } from './process-elements';

/**
 * Directly updates the nodes' transform attribute to bypass React's render cycle.
 * Used for high-frequency coordinate updates (e.g., dragging) where Virtual DOM
 * reconciliation would cause noticeable lag.
 */
const offsetNodeTransform = (id: NodeId, dx: number, dy: number) => {
    const el = document.getElementById(id);
    if (!el) return;

    const transform = el.getAttribute('transform') || '';
    const match = transform.match(/translate\(([-\d.]+)[ ,]([-\d.]+)\)/);

    let x = 0;
    let y = 0;

    if (match) {
        x = parseFloat(match[1]);
        y = parseFloat(match[2]);
    }

    const newX = x + dx;
    const newY = y + dy;
    const newTransform = transform.replace(/translate\(([-\d.]+)[ ,]([-\d.]+)\)/, `translate(${newX},${newY})`);

    if (match) {
        el.setAttribute('transform', newTransform);
    } else {
        el.setAttribute('transform', `translate(${newX},${newY}) ${transform}`);
    }
};

/**
 * Synchronizes SVG path data directly to the DOM.
 * Necessary for complex line styles where a single logical line may consist of multiple
 * visual path elements that need to stay in sync during real-time interaction.
 */
const updatePathDRecursive = (id: string, pathD: string) => {
    const root = document.getElementById(id);
    if (!root) return;

    if (root.matches('path[d]')) {
        root.setAttribute('d', pathD);
    }

    root.querySelectorAll<SVGPathElement>('path[d]').forEach(path => {
        path.setAttribute('d', pathD);
    });
};

/**
 * Orchestrates a manual "repaint" of nodes and their connected lines.
 * This is the entry point for imperative UI updates that must happen
 * at 60fps, bypassing the asynchronous nature of React state updates.
 */
export const moveNodesAndRedrawLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[],
    dx: number,
    dy: number
) => {
    const edges = new Set<LineId>();
    nodes.forEach(node => {
        offsetNodeTransform(node, dx, dy);
        const connectedLines = graph.edges(node) as LineId[];
        connectedLines.forEach(line => {
            if (!edges.has(line)) edges.add(line);
        });
    });

    getLines(graph)
        .filter(l => edges.has(l.id as LineId))
        .forEach(l => {
            const style = l.line!.attr.style;
            if (lineStyles[style].pathGenerator) {
                const path = lineStyles[style].pathGenerator!(
                    l.line!.path,
                    l.line!.attr.type,
                    // @ts-expect-error
                    l.line!.attr[style]!
                );
                for (const [key, value] of Object.entries(path)) {
                    updatePathDRecursive(`${style}_${key}_${l.id}`, value);
                }
            } else {
                updatePathDRecursive(`${l.id}.pre`, l.line!.path);
                updatePathDRecursive(l.id, l.line!.path);
                updatePathDRecursive(`${l.id}.post`, l.line!.path);
            }
        });
};
