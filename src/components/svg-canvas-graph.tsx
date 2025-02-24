import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, LineId, MiscNodeId, SnapLine, SnapPoint, StnId } from '../constants/constants';
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
import {
    findNodesInRectangle,
    getNearestSnapLine,
    getNearestSnapPoints,
    getSnapLineDistance,
    getSnapLines,
    isNodeSupportSnapLine,
} from '../util/graph';
import {
    getCanvasSize,
    getMousePosition,
    getViewpointSize,
    makeSnapLinesPath,
    pointerPosToSVGCoord,
    roundToMultiple,
} from '../util/helpers';
import { useWindowSize } from '../util/hooks';
import { makeParallelIndex } from '../util/parallel';
import { getLines, getNodes } from '../util/process-elements';
import SvgLayer from './svg-layer';
import SnapPointGuideLines from './snap-point-guide-lines';
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
        preference: { autoParallel, gridLines: useGridLines, snapLines: useSnapLines },
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
    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    // the position of pointer down, defined by the pointer down event, undefined if on pointer up
    const [pointerPosition, setPointerPosition] = React.useState<{ x: number; y: number }>();
    // the offset between the pointer down and the current pointer position
    const [pointerOffset, setPointerOffset] = React.useState({ dx: 0, dy: 0 });

    // all possible snap lines in the current view, pre-calculated for performance
    const [snapLines, setSnapLines] = React.useState<SnapLine[]>([]);
    // nodes in the current svg view, pre-calculated for performance
    const [nodesInViewRange, setNodesInViewRange] = React.useState<(StnId | MiscNodeId)[]>([]);
    // the active (drawn) snap lines for the current dragging node (length <= 2)
    // it is only valid in one dragging operation and will be reset in pointer up
    const [activeSnapLines, setActiveSnapLines] = React.useState<SnapLine[]>([]);
    // calculate all possible snap lines in the current view
    // note only the nearest 2 of them will be drawn
    React.useEffect(
        () => {
            if (!pointerPosition || !useSnapLines) return;
            const svgViewRange = getViewpointSize(svgViewBoxMin, svgViewBoxZoom, width, height);
            const nodesInViewRange = findNodesInRectangle(
                graph.current,
                ...(Object.values(svgViewRange) as [number, number, number, number])
            );
            setNodesInViewRange(nodesInViewRange);
            setSnapLines(getSnapLines(graph.current, nodesInViewRange));
        },
        // the dependency array is carefully selected to prevent unnecessary recalculation
        // it will only be calculated on the pointer down event, or every times the view box
        // changes when the pointer is down
        [svgViewBoxMin, svgViewBoxZoom, width, height, pointerPosition]
    );

    // the active snap points, only used when there is only one active snap line
    const [activeSnapPoint, setActiveSnapPoint] = React.useState<SnapPoint | undefined>(undefined);

    const handlePointerDown = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();

        if (mode === 'select') dispatch(setMode('free'));

        const el = e.currentTarget;
        const { x, y } = getMousePosition(e);
        el.setPointerCapture(e.pointerId);

        setActiveSnapLines([]);
        setActiveSnapPoint(undefined);
        setPointerPosition({ x, y });

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
            if (!e.altKey && useSnapLines) {
                // node start position (fromX, fromY)
                const fromX = graph.current.getNodeAttribute(node, 'x');
                const fromY = graph.current.getNodeAttribute(node, 'y');
                // current pointer position (toX, toY)
                // this is similar to the pointer offset but different to line_create_in_progress
                // the final position is calculated based on the offset and the snap lines,
                // so we need to save here for further calculation instead of directly using it
                const toX = fromX - ((pointerPosition!.x - x) * svgViewBoxZoom) / 100;
                const toY = fromY - ((pointerPosition!.y - y) * svgViewBoxZoom) / 100;
                // node final position (newX, newY)
                let newX = toX;
                let newY = toY;

                if (isNodeSupportSnapLine(node, graph.current)) {
                    // previous move operation may have active polylines
                    // use and check if they are still valid, if not, remove and recalculate
                    let nowSnapLines = activeSnapLines;
                    let nowSnapPoint = activeSnapPoint;

                    // check if cursor left the polyline and remove it from active polylines
                    if (nowSnapLines.length !== 0) {
                        nowSnapLines = nowSnapLines.filter(l => getSnapLineDistance(l, toX, toY) <= 6);
                    }

                    // check if the current snap point should be removed
                    if (nowSnapPoint) {
                        if (nowSnapLines.length === 0) {
                            // no active snap line, remove the snap point
                            nowSnapPoint = undefined;
                        } else if (Math.hypot(toX - nowSnapPoint.x, toY - nowSnapPoint.y) > 6) {
                            // cursor left the snap point, remove it
                            nowSnapPoint = undefined;
                        }
                    }

                    // when there is no snap point and only one snap line, add a snap point from this snap line to give visual hint
                    if (!nowSnapPoint && nowSnapLines.length === 1) {
                        const snapLine = nowSnapLines[0];
                        const { snapPoint, distance } = getNearestSnapPoints(
                            graph.current,
                            nodesInViewRange.filter(node => !selected.has(node)),
                            toX,
                            toY,
                            snapLine
                        );

                        // the cursor is close enough to the snap point, make it active snap point
                        if (distance <= 3) {
                            nowSnapPoint = snapPoint;
                        }
                    }

                    // find the nearest polyline to the cursor and add it to active polylines
                    if ((nowSnapLines.length === 1 && !nowSnapPoint) || nowSnapLines.length === 0) {
                        const { l, d } = getNearestSnapLine(
                            toX,
                            toY,
                            snapLines,
                            nodesInViewRange.filter(
                                node => !selected.has(node) && !nowSnapLines.some(ap => ap.node === node)
                            )
                        );
                        // two parallel lines cannot intersect at a point
                        const flag =
                            nowSnapLines.length === 0 || !nowSnapLines.some(ap => ap.a === l.a && ap.b === l.b);
                        // Two non-parallel lines intersect at a point
                        if (d < 3 && nowSnapLines.length < 2 && flag) {
                            nowSnapLines.push(l);
                        }
                    }

                    // calculate the final position based on the activePolylines
                    if (nowSnapLines.length === 1) {
                        if (nowSnapPoint) {
                            newX = nowSnapPoint.x;
                            newY = nowSnapPoint.y;
                        } else {
                            const l = nowSnapLines[0];
                            if (l.a == 0) {
                                newY = -l.c / l.b;
                            } else if (l.b == 0) {
                                newX = -l.c / l.a;
                            } else {
                                const k = -l.a / l.b;
                                const b = -l.c / l.b;
                                newY = k * newX + b;
                            }
                        }
                    } else if (nowSnapLines.length === 2) {
                        const l1 = nowSnapLines[0];
                        const l2 = nowSnapLines[1];
                        const determinant = l1.a * l2.b - l2.a * l1.b;
                        if (determinant !== 0) {
                            newX = -(l1.c * l2.b - l2.c * l1.b) / determinant;
                            newY = -(l1.a * l2.c - l2.a * l1.c) / determinant;
                        }
                    }
                    setActiveSnapLines(nowSnapLines);
                    setActiveSnapPoint(nowSnapPoint);
                }

                // update all the selected nodes' position based on the offset of the current moving node
                const offsetX = newX - fromX;
                const offsetY = newY - fromY;
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) {
                        graph.current.updateNodeAttributes(s, attr => ({
                            ...attr,
                            x: roundToMultiple(attr.x + offsetX, 0.01),
                            y: roundToMultiple(attr.y + offsetY, 0.01),
                        }));
                    }
                });
            } else {
                // legacy round position to nearest 5 mode
                setActiveSnapLines([]);
                setActiveSnapPoint(undefined);
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) {
                        graph.current.updateNodeAttributes(s, attr => ({
                            ...attr,
                            x: roundToMultiple(
                                attr.x - ((pointerPosition!.x - x) * svgViewBoxZoom) / 100,
                                e.altKey ? 0.01 : 5
                            ),
                            y: roundToMultiple(
                                attr.y - ((pointerPosition!.y - y) * svgViewBoxZoom) / 100,
                                e.altKey ? 0.01 : 5
                            ),
                        }));
                    }
                });
            }
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
        } else if (mode.startsWith('line')) {
            setPointerOffset({
                dx: ((pointerPosition!.x - x) * svgViewBoxZoom) / 100,
                dy: ((pointerPosition!.y - y) * svgViewBoxZoom) / 100,
            });
        }
    });
    const handlePointerUp = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        if (mode.startsWith('line')) {
            if (!keepLastPath) dispatch(setMode('free'));

            const couldActiveBeConnected =
                graph.current.hasNode(active) &&
                connectableNodesType.includes(graph.current.getNodeAttribute(active, 'type'));

            const prefixes = ['stn_core_', 'virtual_circle_', 'misc_node_connectable_'];
            prefixes.forEach(prefix => {
                const elems = document.elementsFromPoint(e.clientX, e.clientY);
                const id = elems[0].attributes?.getNamedItem('id')?.value;
                // all connectable nodes have prefixes in their mask/event elements' ids
                const couldIDBeConnected = id?.startsWith(prefix);

                if (couldActiveBeConnected && couldIDBeConnected) {
                    const type = mode.slice(5) as LinePathType;
                    const newLineId: LineId = `line_${nanoid(10)}`;
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
                    dispatch(setSelected(new Set([newLineId])));
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
                if (pointerPosition!.x - x === 0 && pointerPosition!.y - y === 0) {
                    // no-op for click as the node is already added in pointer down
                } else {
                    // its a moving node operation, save the final coordinate
                    dispatch(saveGraph(graph.current.export()));
                }
            } else {
                // no-op for a new node is just placed, already added to selected in pointer down
            }
        }
        setActiveSnapLines([]);
        setActiveSnapPoint(undefined);
        setPointerPosition(undefined);
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
                x: roundToMultiple(svgX, 5),
                y: roundToMultiple(svgY, 5),
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
                        graph.current.getNodeAttribute(active, 'x') - pointerOffset.dx,
                        graph.current.getNodeAttribute(active, 'y'),
                        graph.current.getNodeAttribute(active, 'y') - pointerOffset.dy,
                        // @ts-expect-error
                        linePaths[mode.slice(5) as LinePathType].defaultAttrs
                    )}
                    styleAttrs={{ color: theme }}
                    newLine
                    handlePointerDown={() => {}} // no use
                />
            )}
            {activeSnapLines.length !== 0 &&
                activeSnapLines.map(p => (
                    <path
                        key={`snap_line_${p.a}_${p.b}_${p.c}_${p.node}`}
                        d={linePaths[LinePathType.Simple].generatePath(
                            ...makeSnapLinesPath(p, getViewpointSize(svgViewBoxMin, svgViewBoxZoom, width, height)),
                            linePaths[LinePathType.Simple].defaultAttrs
                        )}
                        stroke="cyan"
                        strokeWidth={svgViewBoxZoom / 75}
                    />
                ))}
            {activeSnapPoint && <SnapPointGuideLines activeSnapPoint={activeSnapPoint} />}
        </>
    );
};

export default SvgCanvas;
