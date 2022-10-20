import React from 'react';
import useEvent from 'react-use-event-hook';
import { nanoid } from 'nanoid';
import { StnId, LineId, MiscNodeId, MiscEdgeId } from '../constants/constants';
import { LineType } from '../constants/lines';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/app/app-slice';
import { setActive, addSelected, setRefresh, setMode, clearSelected } from '../redux/runtime/runtime-slice';
import { MiscEdgeType } from '../constants/edges';
import allStations from './station/stations';
import allLines from './line/lines';
import miscNodes from './nodes/misc-nodes';
import miscEdges from './edges/misc-edges';
import { getMousePosition, roundToNearestN } from '../util/helpers';
import reconcileLines, { generateReconciledPath } from '../util/reconcile';
import { getStations, getMiscNodes, getLines, getMiscEdges } from '../util/processElements';

const EDGES = { ...allLines, ...miscEdges };

const SvgCanvas = () => {
    const dispatch = useRootDispatch();

    const {
        selected,
        refresh: { all: refreshAll, reconcileLine },
        mode,
        active,
        theme,
    } = useRootSelector(state => state.runtime);
    const { svgViewBoxZoom } = useRootSelector(state => state.app);
    const refreshAndSave = () => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    };

    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [newLinePosition, setNewLinePosition] = React.useState({ x: 0, y: 0 });

    const handlePointerDown = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();

        const el = e.currentTarget;
        const { x, y } = getMousePosition(e);
        el.setPointerCapture(e.pointerId);

        setOffset({ x, y });

        dispatch(setActive(node)); // svg mouse event only
        // details panel only, remove all if this is not a multiple selection
        if (!e.shiftKey && selected.length <= 1) dispatch(clearSelected());
        dispatch(addSelected(node)); // details panel only
        // console.log('down ', graph.current.getNodeAttributes(node));
    });
    const handlePointerMove = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();

        const { x, y } = getMousePosition(e);

        if (mode === 'free' && active === node) {
            selected.forEach(s => {
                graph.current.updateNodeAttributes(s, attr => ({
                    ...attr,
                    x: roundToNearestN(attr.x - ((offset.x - x) * svgViewBoxZoom) / 100, e.altKey ? 1 : 5),
                    y: roundToNearestN(attr.y - ((offset.y - y) * svgViewBoxZoom) / 100, e.altKey ? 1 : 5),
                }));
            });
            refreshAndSave();
            // console.log('move ', graph.current.getNodeAttributes(node));
        } else if (mode.startsWith('line') || mode.startsWith('misc-edge')) {
            setNewLinePosition({
                x: ((offset.x - x) * svgViewBoxZoom) / 100,
                y: ((offset.y - y) * svgViewBoxZoom) / 100,
            });
        }
    });
    const handlePointerUp = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();

        if (mode.startsWith('line') || mode.startsWith('misc-edge')) {
            dispatch(setMode('free'));

            const prefixs = ['stn_core_', 'virtual_circle_'];
            prefixs.forEach(prefix => {
                const elems = document.elementsFromPoint(e.clientX, e.clientY);
                const id = elems[0].attributes?.getNamedItem('id')?.value;
                if (id?.startsWith(prefix)) {
                    const type = mode.startsWith('line')
                        ? (mode.slice(5) as LineType)
                        : (mode.slice(10) as MiscEdgeType);
                    const newLineId = `${mode.startsWith('line') ? 'line' : 'misc_edge'}_${nanoid(10)}`;
                    graph.current.addDirectedEdgeWithKey(newLineId, active, id.slice(prefix.length), {
                        visible: true,
                        zIndex: 0,
                        color: theme,
                        type,
                        // deep copy to prevent mutual reference
                        [type]: JSON.parse(JSON.stringify(EDGES[type].defaultAttrs)),
                        reconcileId: '',
                    });
                }
            });
        } else if (mode === 'free') {
            // check the offset and if it's not 0, it must be a click not move
            // then dispatch the current station/line to display the details
            const { x, y } = getMousePosition(e);
            if (offset.x - x === 0 && offset.y - y === 0) {
                dispatch(setActive(node)); // svg mouse event only
            }
        }
        dispatch(setActive(undefined)); // svg mouse event only
        refreshAndSave();
        // console.log('up ', graph.current.getNodeAttributes(node));
    });
    const handleEdgeClick = useEvent((edge: LineId | MiscEdgeId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => {
        dispatch(clearSelected());
        dispatch(addSelected(edge));
    });

    // These are states that the svg draws from.
    // They are updated by refresh trigger in runtime slice.
    const [stations, setStations] = React.useState(getStations(graph.current));
    const [lines, setLines] = React.useState(getLines(graph.current));
    const [nodes, setNodes] = React.useState(getMiscNodes(graph.current));
    const [edges, setEdges] = React.useState(getMiscEdges(graph.current));
    const [allReconciledLines, setAllReconciledLines] = React.useState([] as LineId[][]);
    const [danglingLines, setDanglingLines] = React.useState([] as LineId[]);
    React.useEffect(() => {
        setStations(getStations(graph.current));
        setLines(getLines(graph.current));
        setNodes(getMiscNodes(graph.current));
        setEdges(getMiscEdges(graph.current));
    }, [refreshAll]);
    React.useEffect(() => {
        const { allReconciledLines, danglingLines } = reconcileLines(graph.current);
        setAllReconciledLines(allReconciledLines);
        setDanglingLines(danglingLines);
    }, []);
    React.useEffect(() => {
        const { allReconciledLines, danglingLines } = reconcileLines(graph.current);
        setAllReconciledLines(allReconciledLines);
        setDanglingLines(danglingLines);
    }, [reconcileLine]);

    const DrawLineComponent =
        mode.startsWith('line') || mode.startsWith('misc-edge')
            ? EDGES[mode.startsWith('line') ? (mode.slice(5) as LineType) : (mode.slice(10) as MiscEdgeType)].component
            : (props: any) => <></>;

    return (
        <>
            {danglingLines.map(edge => {
                const LineComponent = allLines[LineType.Simple].component;
                const [source, target] = graph.current.extremities(edge);
                const sourceAttr = graph.current.getNodeAttributes(source);
                const targetAttr = graph.current.getNodeAttributes(target);
                return (
                    <LineComponent
                        id={edge as LineId}
                        key={edge}
                        x1={sourceAttr.x}
                        y1={sourceAttr.y}
                        x2={targetAttr.x}
                        y2={targetAttr.y}
                        newLine={false}
                        attrs={graph.current.getEdgeAttributes(edge)}
                        handleClick={handleEdgeClick}
                    />
                );
            })}
            {allReconciledLines.map(reconciledLine => {
                const path = generateReconciledPath(graph.current, reconciledLine);
                if (path === '') return <></>;
                const color = graph.current.getEdgeAttribute(reconciledLine[0], 'color');

                // TODO: reconciled line could be clicked

                return (
                    <path
                        key={reconciledLine.join(',')}
                        d={path}
                        fill="none"
                        stroke={color[2]}
                        strokeWidth={5}
                        strokeLinejoin="round"
                    />
                );
            })}
            {nodes.map(n => {
                const { node, x, y, type } = n;
                const MiscNodeComponent = miscNodes[type].component;
                return (
                    <MiscNodeComponent
                        id={node}
                        key={node}
                        x={x}
                        y={y}
                        // @ts-expect-error
                        attrs={n[type]}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                    />
                );
            })}
            {[...lines, ...edges].map(({ edge, x1, y1, x2, y2, attr, type }) => {
                const EdgeComponent = EDGES[type].component;
                return (
                    <EdgeComponent
                        // @ts-expect-error
                        id={edge as LineId | MiscEdgeId}
                        key={edge}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        newLine={false}
                        attrs={attr}
                        handleClick={handleEdgeClick}
                    />
                );
            })}
            {stations.map(station => {
                const { node, x, y, type } = station;
                const StationComponent = allStations[type].component;
                return (
                    <StationComponent
                        id={node}
                        key={node}
                        x={x}
                        y={y}
                        attrs={{ [type]: station[type] }}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                    />
                );
            })}
            {(mode.startsWith('line') || mode.startsWith('misc-edge')) && active && (
                <DrawLineComponent
                    // @ts-expect-error
                    id="create_in_progress___no_use"
                    x1={graph.current.getNodeAttribute(active, 'x')}
                    y1={graph.current.getNodeAttribute(active, 'y')}
                    x2={graph.current.getNodeAttribute(active, 'x') - newLinePosition.x}
                    y2={graph.current.getNodeAttribute(active, 'y') - newLinePosition.y}
                    newLine={true}
                    attrs={{
                        visible: true,
                        zIndex: 0,
                        color: theme,
                        type: LineType.Diagonal,
                        reconcileId: '',
                    }}
                />
            )}
        </>
    );
};

export default SvgCanvas;
