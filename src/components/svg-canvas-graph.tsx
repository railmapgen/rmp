import React from 'react';
import { nanoid } from 'nanoid';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { StnId, LineId, MiscNodeId, NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { LineType } from '../constants/lines';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/app/app-slice';
import { setActive, addSelected, setRefresh, setMode, clearSelected } from '../redux/runtime/runtime-slice';
import { MiscNodeType } from '../constants/node';
import allStations from './station/stations';
import allLines from './line/lines';
import miscNodes from './misc/misc-nodes';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { getMousePosition } from '../util/helpers';
import { StationType } from '../constants/stations';
import reconcileLines, { generateReconciledPath } from '../util/reconcile';
import { roundPathCorners } from '../util/pathRounding';

type StationElem = NodeAttributes & { node: StnId; type: StationType };
type LineElem = { edge: LineId; x1: number; x2: number; y1: number; y2: number; attr: EdgeAttributes };

const getStations = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): StationElem[] =>
    graph
        .filterNodes((node, attr) => node.startsWith('stn'))
        .map(node => [node, graph.getNodeAttributes(node)] as [StnId, NodeAttributes])
        .map(([node, attr]) => ({
            node: node as StnId,
            visible: attr.visible,
            zIndex: attr.zIndex,
            x: attr.x,
            y: attr.y,
            type: attr.type as StationType,
            [attr.type]: attr[attr.type],
        }));
const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): LineElem[] =>
    graph
        .filterDirectedEdges(
            (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                // source.startsWith('stn') && target.startsWith('stn')
                attr.reconcileId === ''
        )
        .map(edge => {
            const [source, target] = graph.extremities(edge);
            const sourceAttr = graph.getNodeAttributes(source);
            const targetAttr = graph.getNodeAttributes(target);
            return {
                edge: edge as LineId,
                x1: sourceAttr.x,
                y1: sourceAttr.y,
                x2: targetAttr.x,
                y2: targetAttr.y,
                attr: graph.getEdgeAttributes(edge),
            };
        });

type MiscNodeElem = NodeAttributes & { node: MiscNodeId; type: MiscNodeType };
const getMiscNodes = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): MiscNodeElem[] =>
    graph
        .filterNodes((node, attr) => node.startsWith('misc_node'))
        .map(node => [node, graph.getNodeAttributes(node)] as [MiscNodeId, NodeAttributes])
        .map(([node, attr]) => ({
            node,
            visible: attr.visible,
            zIndex: attr.zIndex,
            x: attr.x,
            y: attr.y,
            type: attr.type as MiscNodeType,
            [attr.type]: attr[attr.type],
        }));

const SvgCanvas = () => {
    const dispatch = useRootDispatch();

    const { refresh, mode, active, svgViewBoxZoom, theme } = useRootSelector(state => state.runtime);
    const hardRefresh = () => dispatch(setRefresh());

    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [newLinePosition, setNewLinePosition] = React.useState({ x: 0, y: 0 });

    const handlePointerDown = (node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.preventDefault();

        const el = e.currentTarget;
        const { x, y } = getMousePosition(e);
        el.setPointerCapture(e.pointerId);

        setOffset({ x, y });

        dispatch(setActive(node)); // svg mouse event only
        dispatch(clearSelected()); // details panel only
        dispatch(addSelected(node)); // details panel only
        hardRefresh();
        // console.log('down ', graph.current.getNodeAttributes(node));
    };
    const handlePointerMove = (node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.preventDefault();

        const { x, y } = getMousePosition(e);

        if (mode === 'free' && active === node) {
            graph.current.updateNodeAttributes(node, attr => ({
                ...attr,
                x: attr.x - (offset.x - x),
                y: attr.y - (offset.y - y),
            }));
            hardRefresh();
            // console.log('move ', graph.current.getNodeAttributes(node));
        } else if (mode.startsWith('line')) {
            setNewLinePosition({
                x: ((offset.x - x) * svgViewBoxZoom) / 100 / 2,
                y: ((offset.y - y) * svgViewBoxZoom) / 100 / 2,
            });
        }
    };
    const handlePointerUp = (node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.preventDefault();

        if (mode.startsWith('line')) {
            dispatch(setMode('free'));

            const elems = document.elementsFromPoint(e.clientX, e.clientY);
            const id = elems[0].attributes?.getNamedItem('id')?.value;
            console.log(elems, id);
            if (id?.startsWith('stn_circle_')) {
                const type = mode.slice(5) as LineType;
                graph.current.addDirectedEdgeWithKey(`line_${nanoid(10)}`, active, id.slice(11), {
                    visible: true,
                    zIndex: 0,
                    color: theme,
                    type,
                    [type]: allLines[type].defaultAttrs,
                    reconcileId: '',
                });
            } else if (id?.startsWith('virtual_circle_')) {
                const type = mode.slice(5) as LineType;
                const edge = graph.current.addDirectedEdgeWithKey(`line_${nanoid(10)}`, active, id.slice(15), {
                    visible: true,
                    zIndex: 0,
                    color: theme,
                    type,
                    [type]: allLines[type].defaultAttrs,
                    reconcileId: '',
                });
                console.log(edge);
            }
        } else if (mode === 'free') {
            // check the offset and if it's not 0, it must be a click not move
            // then dispatch the current station/line to display the details
            const { x, y } = getMousePosition(e);
            if (offset.x - x === 0 && offset.y - y === 0) {
                dispatch(setActive(node)); // svg mouse event only
            }
        }
        dispatch(setActive(undefined)); // svg mouse event only
        dispatch(saveGraph(JSON.stringify(graph.current.export())));
        hardRefresh();
        // console.log('up ', graph.current.getNodeAttributes(node));
    };
    const handleEdgeClick = React.useCallback(
        (edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => {
            dispatch(clearSelected());
            dispatch(addSelected(edge));
        },
        [dispatch, clearSelected, addSelected]
    );

    const [stations, setStations] = React.useState(getStations(graph.current));
    const [lines, setLines] = React.useState(getLines(graph.current));
    const [virtual, setVirtual] = React.useState(getMiscNodes(graph.current));
    const [allReconciledLines, setAllReconciledLines] = React.useState([] as LineId[][]);
    const [danglingLines, setDanglingLines] = React.useState([] as LineId[]);
    React.useEffect(() => {
        const { allReconciledLines, danglingLines } = reconcileLines(graph.current);
        setAllReconciledLines(allReconciledLines);
        setDanglingLines(danglingLines);
    }, []);
    React.useEffect(() => {
        setStations(getStations(graph.current));
        setLines(getLines(graph.current));
        setVirtual(getMiscNodes(graph.current));
        const { allReconciledLines, danglingLines } = reconcileLines(graph.current);
        // console.log(allReconciledLines, danglingLines);
        setAllReconciledLines(allReconciledLines);
        setDanglingLines(danglingLines);
    }, [refresh]);

    const DrawLineComponent = mode.startsWith('line')
        ? allLines[mode.slice(5) as LineType].component
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
            {virtual.map(v => {
                const { node, x, y, type } = v;
                const MiscNodeComponent = miscNodes[type].component;
                return (
                    <MiscNodeComponent
                        id={node}
                        key={node}
                        x={x}
                        y={y}
                        attrs={{ [type]: v[type] }}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                    />
                );
            })}
            {lines.map(({ edge, x1, y1, x2, y2, attr }) => {
                const LineComponent = allLines[attr.type].component;
                return (
                    <LineComponent
                        id={edge as LineId}
                        key={edge}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
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
            {mode.startsWith('line') && active && (
                <DrawLineComponent
                    // @ts-expect-error
                    id="create_in_progress___no_use"
                    x1={graph.current.getNodeAttribute(active, 'x')}
                    y1={graph.current.getNodeAttribute(active, 'y')}
                    x2={graph.current.getNodeAttribute(active, 'x') - newLinePosition.x}
                    y2={graph.current.getNodeAttribute(active, 'y') - newLinePosition.y}
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
