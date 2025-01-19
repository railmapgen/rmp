import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, LineId, MiscNodeId, StnId } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import {
    addSelected,
    clearSelected,
    refreshEdgesThunk,
    refreshNodesThunk,
    removeSelected,
    setActive,
    setMode,
    setSelected,
} from '../redux/runtime/runtime-slice';
import { getMousePosition, pointerPosToSVGCoord, roundToNearestN } from '../util/helpers';
import { makeParallelIndex } from '../util/parallel';
import { getLines, getNodes } from '../util/process-elements';
import SvgLayer from './svg-layer';
import { linePaths } from './svgs/lines/lines';
import singleColor from './svgs/lines/styles/single-color';
import miscNodes from './svgs/nodes/misc-nodes';
import { default as stations } from './svgs/stations/stations';

const connectableNodesType = [
    ...Object.values(StationType),
    MiscNodeType.Virtual,
    MiscNodeType.Master,
    MiscNodeType.LondonArrow,
];

const SvgCanvas = () => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const refreshAndSave = () => {
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
        dispatch(saveGraph(graph.current.export()));
    };
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { autoParallel },
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
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
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
                    const [source, target] = [
                        active! as StnId | MiscNodeId,
                        id!.slice(prefix.length) as StnId | MiscNodeId,
                    ];
                    const parallelIndex = autoParallel
                        ? makeParallelIndex(graph.current, type, source, target, 'from')
                        : -1;
                    graph.current.addDirectedEdgeWithKey(newLineId, source, target, {
                        visible: true,
                        zIndex: 0,
                        type,
                        // deep copy to prevent mutual reference
                        [type]: structuredClone(linePaths[type].defaultAttrs),
                        style: LineStyleType.SingleColor,
                        [LineStyleType.SingleColor]: { color: theme },
                        reconcileId: '',
                        parallelIndex,
                    });
                    if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type });
                }
            });
            dispatch(refreshEdgesThunk());
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
            // new stations must not have existing lines, so leave it to 0 if auto parallel is on
            const parallelIndex = autoParallel ? 0 : -1;
            graph.current.addDirectedEdgeWithKey(`line_${nanoid(10)}`, source, id, {
                visible: true,
                zIndex,
                type: linePathType,
                [linePathType]: structuredClone(typeAttr),
                style: lineStyleType,
                [lineStyleType]: structuredClone(styleAttr),
                reconcileId: '',
                parallelIndex,
            });
            graph.current.addDirectedEdgeWithKey(`line_${nanoid(10)}`, id, target, {
                visible: true,
                zIndex,
                type: linePathType,
                [linePathType]: structuredClone(typeAttr),
                style: lineStyleType,
                [lineStyleType]: structuredClone(styleAttr),
                reconcileId: '',
                parallelIndex,
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
    const elements = React.useMemo(
        () => [...getLines(graph.current), ...getNodes(graph.current)],
        [refreshEdges, refreshNodes]
    );

    const SingleColor = singleColor.component;

    return (
        <>
            <SvgLayer
                elements={elements}
                handlePointerDown={handlePointerDown}
                handlePointerMove={handlePointerMove}
                handlePointerUp={handlePointerUp}
                handleEdgePointerDown={handleEdgePointerDown}
            />
            {mode.startsWith('line') && active && active !== 'background' && (
                <SingleColor
                    id="line_create_in_progress___no_use"
                    type={mode.slice(5) as LinePathType}
                    path={linePaths[mode.slice(5) as LinePathType].generatePath(
                        graph.current.getNodeAttribute(active, 'x'),
                        graph.current.getNodeAttribute(active, 'x') - movingPosition.x,
                        graph.current.getNodeAttribute(active, 'y'),
                        graph.current.getNodeAttribute(active, 'y') - movingPosition.y,
                        // @ts-expect-error
                        linePaths[mode.slice(5) as LinePathType].defaultAttrs
                    )}
                    styleAttrs={{ color: theme }}
                    newLine
                    handlePointerDown={() => {}} // no use
                />
            )}
        </>
    );
};

export default SvgCanvas;
