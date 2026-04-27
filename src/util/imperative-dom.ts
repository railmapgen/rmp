import { MultiDirectedGraph } from 'graphology';
import { lineStyles } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { Path } from '../constants/path';
import { getLines } from './process-elements';

type NodeTransformElementId = NodeId | `${NodeId}.pre` | `${NodeId}.post`;

/**
 * Directly updates the nodes' transform attribute to bypass React's render cycle.
 * Used for high-frequency coordinate updates (e.g., dragging) where Virtual DOM
 * reconciliation would cause noticeable lag.
 * @param id The SVG group id to move: the main node layer, or its `.pre` / `.post` companion layer.
 * @param dx The horizontal offset to apply in SVG coordinates.
 * @param dy The vertical offset to apply in SVG coordinates.
 */
const offsetNodeTransform = (id: NodeTransformElementId, dx: number, dy: number) => {
    const el = document.getElementById(id);
    if (!el) return;

    const transform = el.getAttribute('transform') || '';
    const regex = /translate\(([-\d.]+)[,\s]+([-\d.]+)\)/;
    const match = transform.match(regex);

    let x = 0;
    let y = 0;

    if (match) {
        x = parseFloat(match[1]);
        y = parseFloat(match[2]);
    }

    const newX = x + dx;
    const newY = y + dy;
    const newTransform = transform.replace(regex, `translate(${newX},${newY})`);

    if (match) {
        el.setAttribute('transform', newTransform);
    } else {
        el.setAttribute('transform', `translate(${newX},${newY}) ${transform}`);
    }
};

/**
 * Offsets every rendered SVG layer for a logical node so split station/node renderers stay visually aligned.
 * @param id The logical node id whose rendered layers should be moved together.
 * @param dx The horizontal offset to apply in SVG coordinates.
 * @param dy The vertical offset to apply in SVG coordinates.
 */
const offsetNodeTransforms = (id: NodeId, dx: number, dy: number) => {
    const layerIds: NodeTransformElementId[] = [id, `${id}.pre`, `${id}.post`];
    layerIds.forEach(layerId => offsetNodeTransform(layerId, dx, dy));
};

/**
 * Synchronizes SVG path data directly to the DOM.
 * Necessary for complex line styles where a single logical line may consist of multiple
 * visual path elements that need to stay in sync during real-time interaction.
 */
const updatePathDRecursive = (id: string, pathD: Path) => {
    const root = document.getElementById(id);
    root?.querySelectorAll<SVGPathElement>('path[d]').forEach(path => {
        updatePathD(path, pathD);
    });
};

const updatePathD = (elem: SVGPathElement, pathD: Path) => {
    elem.setAttribute('d', pathD.d);
};

/**
 * Orchestrates a manual "repaint" of nodes and their connected lines.
 * This is the entry point for imperative UI updates that must happen
 * at 60fps, bypassing the asynchronous nature of React state updates.
 * @param graph The current graph model used to discover connected lines and regenerate their paths.
 * @param nodes The logical node ids being moved in the current drag operation.
 * @param dx The horizontal offset to apply in SVG coordinates.
 * @param dy The vertical offset to apply in SVG coordinates.
 */
export const moveNodesAndRedrawLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[],
    dx: number,
    dy: number
) => {
    const edges = new Set<LineId>();
    nodes.forEach(node => {
        offsetNodeTransforms(node, dx, dy);
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
                    const elem = document.getElementById(`${style}_${key}_${l.id}`);
                    if (elem instanceof SVGPathElement) updatePathD(elem, value);
                }
            } else {
                updatePathDRecursive(`${l.id}.pre`, l.line!.path);
                updatePathDRecursive(l.id, l.line!.path);
                updatePathDRecursive(`${l.id}.post`, l.line!.path);
            }
        });
};
