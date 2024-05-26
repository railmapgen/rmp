import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, LineId, MiscNodeId, StnId } from '../constants/constants';
import { ExternalLineStyleAttributes, LinePathType, LineStyleComponentProps, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import {
    addSelected,
    clearSelected,
    removeSelected,
    setActive,
    setMode,
    setRefreshEdges,
    setRefreshNodes,
    setSelected,
} from '../redux/runtime/runtime-slice';
import { getMousePosition, pointerPosToSVGCoord, roundToNearestN } from '../util/helpers';
import { getLines, getMiscNodes, getStations } from '../util/process-elements';
import reconcileLines, { generateReconciledPath } from '../util/reconcile';
import { UnknownLineStyle, UnknownNode } from './svgs/common/unknown';
import LineWrapper from './svgs/lines/line-wrapper';
import { linePaths, lineStyles } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';
import allStations from './svgs/stations/stations';

const SvgCanvas = () => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const refreshAndSave = () => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    };
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const {
        selected,
        refresh: { nodes: refreshNodes, edges: refreshEdges },
        mode,
        active,
        keepLastPath,
        theme,
    } = useRootSelector(state => state.runtime);

    // the position of pointer down
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    // the position of pointer move
    const [movingPosition, setMovingPosition] = React.useState({ x: 0, y: 0 });

    const handlePointerDown = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();

        if (mode === 'select') dispatch(setMode('free'));

        const el = e.currentTarget;
        const { x, y } = getMousePosition(e);
        el.setPointerCapture(e.pointerId);

        setOffset({ x, y });

        dispatch(setActive(node));

        if (!e.shiftKey) {
            // no shift key -> non multiple selection case
            if (!selected.has(node)) {
                // set the current as the only one no matter what the previous selected were
                dispatch(setSelected(new Set<StnId | MiscNodeId>([node])));
            } else {
                // no-op as users may drag the previously selected node(s) for the current selected
            }
        } else {
            // shift key pressed -> multiple selection case
            if (selected.has(node)) {
                // remove current if it is already in the multiple selection
                dispatch(removeSelected(node));
            } else {
                // add current in the multiple selection
                dispatch(addSelected(node));
            }
        }
        // console.log('down ', graph.current.getNodeAttributes(node));
    });
    const handlePointerMove = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        const { x, y } = getMousePosition(e);

        if (mode === 'free' && active === node) {
            selected.forEach(s => {
                if (graph.current.hasNode(s)) {
                    graph.current.updateNodeAttributes(s, attr => ({
                        ...attr,
                        x: roundToNearestN(attr.x - ((offset.x - x) * svgViewBoxZoom) / 100, e.altKey ? 1 : 5),
                        y: roundToNearestN(attr.y - ((offset.y - y) * svgViewBoxZoom) / 100, e.altKey ? 1 : 5),
                    }));
                }
            });
            dispatch(setRefreshNodes());
            dispatch(setRefreshEdges());
            // console.log('move ', graph.current.getNodeAttributes(node));
        } else if (mode.startsWith('line')) {
            setMovingPosition({
                x: ((offset.x - x) * svgViewBoxZoom) / 100,
                y: ((offset.y - y) * svgViewBoxZoom) / 100,
            });
        }
    });
    const handlePointerUp = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        if (mode.startsWith('line')) {
            if (!keepLastPath) dispatch(setMode('free'));

            const connectableNodesType = [...Object.values(StationType), MiscNodeType.Virtual, MiscNodeType.Master];
            const couldActiveBeConnected =
                graph.current.hasNode(active) &&
                connectableNodesType.includes(graph.current.getNodeAttribute(active, 'type'));

            const prefixes = ['stn_core_', 'virtual_circle_'];
            prefixes.forEach(prefix => {
                const elems = document.elementsFromPoint(e.clientX, e.clientY);
                const id = elems[0].attributes?.getNamedItem('id')?.value;
                // all connectable nodes have prefixes in their mask/event elements' ids
                const couldIDBeConnected = id?.startsWith(prefix);

                if (couldActiveBeConnected && couldIDBeConnected) {
                    const type = mode.slice(5) as LinePathType;
                    const newLineId = `line_${nanoid(10)}`;
                    graph.current.addDirectedEdgeWithKey(newLineId, active, id!.slice(prefix.length), {
                        visible: true,
                        zIndex: 0,
                        type,
                        // deep copy to prevent mutual reference
                        [type]: structuredClone(linePaths[type].defaultAttrs),
                        style: LineStyleType.SingleColor,
                        [LineStyleType.SingleColor]: { color: theme },
                        reconcileId: '',
                    });
                    if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type });
                }
            });
            dispatch(setRefreshEdges());
            dispatch(saveGraph(graph.current.export()));
        } else if (mode === 'free') {
            if (active) {
                // the node is pointed down before
                // check the offset and if it's not 0, it must be a click not move
                const { x, y } = getMousePosition(e);
                if (offset.x - x === 0 && offset.y - y === 0) {
                    // no-op for click as the node is already added in pointer down
                } else {
                    // its a moving node operation, save the final coordinate
                    dispatch(saveGraph(graph.current.export()));
                }
            } else {
                // no-op for a new node is just placed, already added to selected in pointer down
            }
        }
        dispatch(setActive(undefined));
        // console.log('up ', graph.current.getNodeAttributes(node));
    });
    const handleEdgePointerDown = useEvent((edge: LineId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();
        if (!e.shiftKey) dispatch(clearSelected());
        if (e.shiftKey && selected.has(edge)) dispatch(removeSelected(edge));
        else dispatch(addSelected(edge));

        if (mode.startsWith('station') || mode.startsWith('misc-node-virtual') || mode.startsWith('misc-node-master')) {
            const x = e.clientX - document.getElementById('canvas')!.getBoundingClientRect().left;
            const y = e.clientY - document.getElementById('canvas')!.getBoundingClientRect().top;
            // Add station in the current line
            const isStation = mode.startsWith('station');
            const rand = nanoid(10);
            const id = isStation ? (`stn_${rand}` as StnId) : (`misc_node_${rand}` as MiscNodeId);
            const stnType = isStation ? (mode.slice(8) as StationType) : (mode.slice(10) as MiscNodeType);
            const { x: svgX, y: svgY } = pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin);
            // deep copy to prevent mutual reference
            const attr = isStation
                ? structuredClone(stations[stnType as StationType].defaultAttrs)
                : structuredClone(miscNodes[stnType as MiscNodeType].defaultAttrs);
            if ('color' in attr) attr.color = theme;
            graph.current.addNode(id, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN(svgX, 5),
                y: roundToNearestN(svgY, 5),
                type: stnType,
                [stnType]: attr,
            });

            const edgeAttrs = graph.current.getEdgeAttributes(edge);
            const { zIndex, type: linePathType, style: lineStyleType } = edgeAttrs;
            const typeAttr = edgeAttrs[linePathType];
            const styleAttr = edgeAttrs[lineStyleType];
            const [source, target] = graph.current.extremities(edge);
            graph.current.addDirectedEdgeWithKey(`line_${nanoid(10)}`, source, id, {
                visible: true,
                zIndex,
                type: linePathType,
                [linePathType]: structuredClone(typeAttr),
                style: lineStyleType,
                [lineStyleType]: structuredClone(styleAttr),
                reconcileId: '',
            });
            graph.current.addDirectedEdgeWithKey(`line_${nanoid(10)}`, id, target, {
                visible: true,
                zIndex,
                type: linePathType,
                [linePathType]: structuredClone(typeAttr),
                style: lineStyleType,
                [lineStyleType]: structuredClone(styleAttr),
                reconcileId: '',
            });
            graph.current.dropEdge(edge);
            refreshAndSave();
            if (isAllowProjectTelemetry) {
                rmgRuntime.event(Events.ADD_STATION, { type: stnType });
                rmgRuntime.event(Events.ADD_LINE, { type: linePathType });
            }
            dispatch(setMode('free'));
            dispatch(setSelected(new Set([id])));
        }
    });

    // These are elements that the svg draws from.
    // They are updated by the refresh triggers in the runtime state.
    const [stationsElem, setStationsElem] = React.useState(getStations(graph.current));
    const [nodes, setNodes] = React.useState(getMiscNodes(graph.current));
    const [lines, setLines] = React.useState(getLines(graph.current));
    const [reconciledLines, setReconciledLines] = React.useState([] as LineId[][]);
    const [danglingLines, setDanglingLines] = React.useState([] as LineId[]);
    React.useEffect(() => {
        setStationsElem(getStations(graph.current));
        setNodes(getMiscNodes(graph.current));
    }, [refreshNodes]);
    React.useEffect(() => {
        setLines(getLines(graph.current));
        const { allReconciledLines, danglingLines } = reconcileLines(graph.current);
        setReconciledLines(allReconciledLines);
        setDanglingLines(danglingLines);
    }, [refreshEdges]);

    return (
        <>
            {danglingLines.map(edge => {
                const [source, target] = graph.current.extremities(edge);
                const sourceAttr = graph.current.getNodeAttributes(source);
                const targetAttr = graph.current.getNodeAttributes(target);
                return (
                    <LineWrapper
                        id={edge}
                        key={edge}
                        x1={sourceAttr.x}
                        y1={sourceAttr.y}
                        x2={targetAttr.x}
                        y2={targetAttr.y}
                        newLine={false}
                        type={LinePathType.Simple}
                        attrs={linePaths[LinePathType.Simple].defaultAttrs}
                        styleType={LineStyleType.SingleColor}
                        styleAttrs={{ color: ['', '', '#c0c0c0', '#fff'] }}
                        onPointerDown={handleEdgePointerDown}
                    />
                );
            })}
            {reconciledLines.map(reconciledLine => {
                const path = generateReconciledPath(graph.current, reconciledLine);
                if (!path) return <></>;

                const id = reconciledLine.at(0)!;
                const type = graph.current.getEdgeAttribute(id, 'type');
                const style = graph.current.getEdgeAttribute(id, 'style');
                const styleAttrs = graph.current.getEdgeAttribute(id, style) as NonNullable<
                    ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]
                >;
                const StyleComponent = (lineStyles[style]?.component ?? UnknownLineStyle) as React.FC<
                    LineStyleComponentProps<NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>>
                >;

                return (
                    <StyleComponent
                        id={id}
                        key={id}
                        type={type}
                        path={path}
                        styleAttrs={styleAttrs}
                        newLine={false}
                        handlePointerDown={handleEdgePointerDown}
                    />
                );
            })}
            {lines.map(({ edge, x1, y1, x2, y2, type, attr, style, styleAttr }) => {
                return (
                    <LineWrapper
                        id={edge}
                        key={edge}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        newLine={false}
                        type={type}
                        attrs={attr}
                        styleType={style}
                        styleAttrs={styleAttr}
                        onPointerDown={handleEdgePointerDown}
                    />
                );
            })}
            {nodes.map(n => {
                const { node, x, y, type } = n;
                const MiscNodeComponent = miscNodes[type]?.component ?? UnknownNode;
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
            {stationsElem.map(station => {
                const { node, x, y, type } = station;
                const StationComponent = allStations[type]?.component ?? UnknownNode;
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
            {mode.startsWith('line') && active && active !== 'background' && (
                <LineWrapper
                    // @ts-expect-error
                    id="create_in_progress___no_use"
                    x1={graph.current.getNodeAttribute(active, 'x')}
                    y1={graph.current.getNodeAttribute(active, 'y')}
                    x2={graph.current.getNodeAttribute(active, 'x') - movingPosition.x}
                    y2={graph.current.getNodeAttribute(active, 'y') - movingPosition.y}
                    newLine={true}
                    type={mode.slice(5) as LinePathType}
                    attrs={linePaths[mode.slice(5) as LinePathType].defaultAttrs}
                    styleType={LineStyleType.SingleColor}
                    styleAttrs={{ color: theme }}
                />
            )}
        </>
    );
};

export default SvgCanvas;
