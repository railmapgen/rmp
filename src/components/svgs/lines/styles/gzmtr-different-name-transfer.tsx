import { Coordinates, ICON_FULL_HEIGHT, ICON_FULL_WIDTH } from '@railmapgen/svg-assets/gzmtr';
import React from 'react';
import { LineId, NodeAttributes } from '../../../../constants/constants';
import {
    LinePathType,
    LineStyle,
    LineStyleAttributes,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { Path } from '../../../../constants/path';
import { StationType } from '../../../../constants/stations';
import { getLines } from '../../../../util/process-elements';
import { type RenderGraph, useSvgRenderContext } from '../../../svg-render-context';
import gzmtrInt2024 from '../../stations/gzmtr-int-2024';
import {
    BAND_WIDTH,
    CHANNEL_WIDTH,
    GZMTR_2024_SCALE,
    transferJunction,
    transferRibbon,
} from './gzmtr-transfer-geometry';

type Props = LineStyleComponentProps<LineStyleAttributes>;

/** Restore the full band when a timeline keeps the station in its graph but omits its symbol from the SVG. */
function absentStationRules(id: string) {
    const value = id.replace(/[^\w-]/gu, c => `\\${c.codePointAt(0)!.toString(16)} `);
    const svg = `svg:not(:has(g[id="${value}"]))`;
    return `${svg} [data-transfer-clip="${value}"] { clip-path: none }
            ${svg} [data-transfer-mouth="${value}"] { display: none }`;
}

/** Locate the badges and out-of-station interchange marker relative to the station anchor for the contour calculation. */
function stationJunction(path: Path, node: NodeAttributes) {
    const defaults = gzmtrInt2024.defaultAttrs;
    const {
        transfer = defaults.transfer,
        columns = defaults.columns,
        topHeavy = defaults.topHeavy,
        anchorAt = defaults.anchorAt,
        osiPosition = defaults.osiPosition,
    } = node[StationType.GzmtrInt2024] ?? defaults;
    const entries = transfer.flat();
    if (!entries.length) return;

    // svg-assets centres each row independently, then translates the selected badge to the node.
    const cols = Math.max(1, Math.min(columns, entries.length));
    const rows = Math.ceil(entries.length / cols);
    const shortRow = topHeavy ? rows - 1 : 0;
    const centres: Coordinates[] = [];
    for (let row = 0; row < rows; row++) {
        const count = row === shortRow ? entries.length % cols || cols : cols;
        for (let col = 0; col < count; col++) {
            centres.push([(col - (count - 1) / 2) * ICON_FULL_WIDTH, (row - (rows - 1) / 2) * ICON_FULL_HEIGHT]);
        }
    }
    const [anchorX, anchorY] = centres[anchorAt] ?? [0, 0];
    const badges = centres.map(([x, y], i) => ({
        x: (x - anchorX) * GZMTR_2024_SCALE,
        y: (y - anchorY) * GZMTR_2024_SCALE,
        foshan: entries[i][6] === 'fs',
    }));
    const osi =
        entries.length === 2 && columns === 1 && osiPosition !== 'none'
            ? {
                  x: ((osiPosition === 'left' ? -1 : 1) * ICON_FULL_WIDTH * 0.4 - anchorX) * GZMTR_2024_SCALE,
                  y: -anchorY * GZMTR_2024_SCALE,
              }
            : undefined;
    return transferJunction(path, badges, node, osi);
}

/** Collect junctions at visible Guangzhou 2024 stations attached to this edge. A drawing preview has no edge yet. */
function resolveTransfer(graph: RenderGraph | undefined, id: LineId, path: Path) {
    const junctions: (ReturnType<typeof transferJunction> & { id: string; x: number; y: number })[] = [];
    if (!graph?.hasEdge(id)) return { path, junctions };
    for (const end of new Set(graph.extremities(id))) {
        const node = graph.getNodeAttributes(end);
        if (node.type !== StationType.GzmtrInt2024 || node.visible === false) continue;
        const junction = stationJunction(path, node);
        if (junction) junctions.push({ id: end, x: node.x, y: node.y, ...junction });
    }
    return { path, junctions };
}

const views = new WeakMap<
    Path,
    { graph?: RenderGraph; id: LineId; revision: unknown; view: ReturnType<typeof resolveTransfer> }
>();
/** Share contours between the band and its post component. A graph refresh can change the badges on the same path. */
function transferView(graph: RenderGraph | undefined, id: LineId, path: Path, revision: unknown) {
    const cached = views.get(path);
    if (cached && cached.graph === graph && cached.id === id && cached.revision === revision) return cached.view;
    const view = resolveTransfer(graph, id, path);
    views.set(path, { graph, id, revision, view });
    return view;
}

const dragFrames = new WeakMap<RenderGraph, { time: number; paths: Map<string, Path> }>();
/** Resolve parallel and auto-simple paths once per drag frame for all transfer bands and their junctions. */
function draggedPath(graph: RenderGraph, id: LineId, time: number) {
    let frame = dragFrames.get(graph);
    if (frame?.time !== time) {
        const paths = new Map<string, Path>();
        for (const element of getLines(graph)) {
            if (element.line?.attr.style === LineStyleType.GzmtrDifferentNameTransfer)
                paths.set(element.id, element.line.path);
        }
        frame = { time, paths };
        dragFrames.set(graph, frame);
    }
    return frame.paths.get(id);
}

/** Follow graph updates during an endpoint drag until the renderer supplies a new path. Previews use the input directly. */
function useTransfer(id: LineId, input: Path, preview: boolean) {
    const context = useSvgRenderContext();
    const graph = preview ? undefined : context.graph;
    const [drag, setDrag] = React.useState<{ input: Path; path: Path }>();

    React.useEffect(() => {
        if (!graph?.hasEdge(id)) return;
        const ends = graph.extremities(id);
        let pending = 0;
        const onMove = ({ key }: { key: string }) => {
            if (!ends.includes(key) || pending) return;
            pending = requestAnimationFrame(time => {
                pending = 0;
                const path = draggedPath(graph, id, time);
                if (path) setDrag({ input, path });
            });
        };
        graph.on('nodeAttributesUpdated', onMove);
        return () => {
            graph.off('nodeAttributesUpdated', onMove);
            cancelAnimationFrame(pending);
        };
    }, [graph, id, input]);

    return transferView(graph, id, drag?.input === input ? drag.path : input, context.graphRefresh);
}

/** End both strokes flush with the path and clip the band and its hit target where a station junction takes over. */
function TransferBand({ id, path: input, newLine, handlePointerDown }: Props) {
    const scope = React.useId();
    const { path, junctions } = useTransfer(id, input, newLine);
    const band = transferRibbon(path);
    if (!band) return null;
    const clipped = junctions.length > 0;
    let body = (
        <g fill="none" strokeLinecap="butt" strokeLinejoin="round" mask={clipped ? `url(#${scope})` : undefined}>
            <path d={path.d} stroke="#aaa" strokeWidth={BAND_WIDTH} />
            <path d={path.d} stroke="white" strokeWidth={CHANNEL_WIDTH} />
        </g>
    );
    for (const end of junctions)
        body = (
            <g data-transfer-clip={end.id} clipPath={`url(#${scope}-${end.id})`}>
                {body}
            </g>
        );
    return (
        <g
            onPointerDown={newLine ? undefined : e => handlePointerDown(id, e)}
            pointerEvents={newLine ? 'none' : undefined}
            cursor="pointer"
        >
            {body}
            {clipped && (
                <defs>
                    <style>{junctions.map(end => absentStationRules(end.id)).join('\n')}</style>
                    {junctions.map(end => (
                        <clipPath id={`${scope}-${end.id}`} key={end.id}>
                            <path d={end.clip} clipRule="evenodd" />
                        </clipPath>
                    ))}
                    {/* Composite the strokes before antialiasing their common cut at each mouth. */}
                    <mask
                        id={scope}
                        maskUnits="userSpaceOnUse"
                        x={band.bounds.left - 1}
                        y={band.bounds.top - 1}
                        width={band.bounds.right - band.bounds.left + 2}
                        height={band.bounds.bottom - band.bounds.top + 2}
                    >
                        <path d={band.frame} fill="white" />
                    </mask>
                </defs>
            )}
        </g>
    );
}

/** Paint the grey and white junction contours over stations at the line's z-index while keeping stations clickable. */
function TransferMouths({ id, path, newLine }: Props) {
    const { junctions } = useTransfer(id, path, newLine);
    return (
        <g pointerEvents="none">
            {junctions.map(end => (
                <g key={end.id} data-transfer-mouth={end.id} transform={`translate(${end.x} ${end.y})`}>
                    <path d={end.outer} fill="#aaa" />
                    <path d={end.inner} fill="white" />
                </g>
            ))}
        </g>
    );
}

const gzmtrDifferentNameTransfer: LineStyle<LineStyleAttributes> = {
    component: TransferBand,
    postComponent: TransferMouths,
    // The style refreshes the ribbon and both contours together during node drags.
    pathGenerator: () => ({}),
    defaultAttrs: {},
    attrsComponent: () => null,
    metadata: {
        displayName: 'panel.details.lines.gzmtrDifferentNameTransfer.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
            LinePathType.Simple,
            LinePathType.Bezier,
            LinePathType.Freeform,
        ],
        supportsReconcile: false,
    },
};
export default gzmtrDifferentNameTransfer;
