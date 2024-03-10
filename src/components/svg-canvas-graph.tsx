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
import { getMousePosition, getTouchPosition, isMobileDevice, roundToNearestN } from '../util/helpers';
import { getLines, getMiscNodes, getStations } from '../util/process-elements';
import reconcileLines, { generateReconciledPath } from '../util/reconcile';
import { UnknownLineStyle, UnknownNode } from './svgs/common/unknown';
import LineWrapper from './svgs/lines/line-wrapper';
import { linePaths, lineStyles } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import allStations from './svgs/stations/stations';

const SvgCanvas = () => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const { svgViewBoxZoom } = useRootSelector(state => state.param);
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
    // the element position of pointer up
    const [elementPosition, setElementPosition] = React.useState({ x: 0, y: 0 });

    const handleNodeDown = (node: StnId | MiscNodeId, { x, y }: { x: number; y: number }) => {
        if (mode === 'select') dispatch(setMode('free'));

        dispatch(setActive(node));
        setOffset({ x, y });
        setMovingPosition({ x: 0, y: 0 });
    };
    const handleNodeMove = (node: StnId | MiscNodeId, { x, y }: { x: number; y: number }, altKey: boolean) => {
        setMovingPosition({
            x: ((offset.x - x) * svgViewBoxZoom) / 100,
            y: ((offset.y - y) * svgViewBoxZoom) / 100,
        });
        if (mode === 'free' && active === node) {
            [...(selected.has(active) ? [undefined] : [active]), ...selected]
                .filter(s => graph.current.hasNode(s))
                .forEach(s => {
                    graph.current.updateNodeAttributes(s, attr => ({
                        ...attr,
                        x: roundToNearestN(attr.x - ((offset.x - x) * svgViewBoxZoom) / 100, altKey ? 1 : 5),
                        y: roundToNearestN(attr.y - ((offset.y - y) * svgViewBoxZoom) / 100, altKey ? 1 : 5),
                    }));
                });
            dispatch(setRefreshNodes());
            dispatch(setRefreshEdges());
        }
    };
    const handleNodeUp = (node: StnId | MiscNodeId, shiftKey: boolean) => {
        if (mode.startsWith('line')) {
            if (!keepLastPath) dispatch(setMode('free'));

            const connectableNodesType = [...Object.values(StationType), MiscNodeType.Virtual];
            const couldActiveBeConnected =
                graph.current.hasNode(active) &&
                connectableNodesType.includes(graph.current.getNodeAttribute(active, 'type'));

            const prefixes = ['stn_core_', 'virtual_circle_'];
            prefixes.forEach(prefix => {
                const elems = document.elementsFromPoint(elementPosition.x, elementPosition.y);
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
                // check the movingPosition and if it's 0, it must be a click not move
                if (movingPosition.x === 0 && movingPosition.y === 0) {
                    // one click, add it to selected
                    if (!mode.startsWith('line')) {
                        if (!shiftKey) {
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
                    }
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
    };
    const handleEdgeClick = useEvent((edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => {
        if (!e.shiftKey) dispatch(clearSelected());
        if (e.shiftKey && selected.has(edge)) dispatch(removeSelected(edge));
        else dispatch(addSelected(edge));
    });

    const handlePointerDown = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        if (!isMobileDevice) {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            handleNodeDown(node, getMousePosition(e));
        }
    });

    const handlePointerMove = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        if (!isMobileDevice) {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setElementPosition({ x: e.clientX, y: e.clientY });
            handleNodeMove(node, getMousePosition(e), e.altKey);
        }
    });

    const handlePointerUp = useEvent((node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => {
        if (!isMobileDevice) {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            handleNodeUp(node, e.shiftKey);
        }
    });

    const handleTouchStart = useEvent((node: StnId | MiscNodeId, e: React.TouchEvent<SVGElement>) => {
        if (isMobileDevice) {
            e.stopPropagation();
            handleNodeDown(node, getTouchPosition(e));
        }
    });

    const handleTouchMove = useEvent((node: StnId | MiscNodeId, e: React.TouchEvent<SVGElement>) => {
        if (isMobileDevice) {
            e.stopPropagation();
            setElementPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            handleNodeMove(node, getTouchPosition(e), e.altKey);
        }
    });

    const handleTouchEnd = useEvent((node: StnId | MiscNodeId, e: React.TouchEvent<SVGElement>) => {
        if (isMobileDevice) {
            e.stopPropagation();
            handleNodeUp(node, e.shiftKey);
        }
    });

    // These are elements that the svg draws from.
    // They are updated by the refresh triggers in the runtime state.
    const [stations, setStations] = React.useState(getStations(graph.current));
    const [nodes, setNodes] = React.useState(getMiscNodes(graph.current));
    const [lines, setLines] = React.useState(getLines(graph.current));
    const [reconciledLines, setReconciledLines] = React.useState([] as LineId[][]);
    const [danglingLines, setDanglingLines] = React.useState([] as LineId[]);
    React.useEffect(() => {
        setStations(getStations(graph.current));
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
                        handleClick={handleEdgeClick}
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
                        handleClick={handleEdgeClick}
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
                        handleClick={handleEdgeClick}
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
                        handleTouchStart={handleTouchStart}
                        handleTouchMove={handleTouchMove}
                        handleTouchEnd={handleTouchEnd}
                    />
                );
            })}
            {stations.map(station => {
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
                        handleTouchStart={handleTouchStart}
                        handleTouchMove={handleTouchMove}
                        handleTouchEnd={handleTouchEnd}
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
