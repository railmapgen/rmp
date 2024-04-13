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
import { getMousePosition, roundToNearestN } from '../util/helpers';
import { makeParallelIndex } from '../util/parallel';
import { getLines, getNodes, getZIndexFromElement } from '../util/process-elements';
import { UnknownLineStyle, UnknownNode } from './svgs/common/unknown';
import { linePaths, lineStyles } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import allStations from './svgs/stations/stations';
import singleColor from './svgs/lines/styles/single-color';

const SvgCanvas = () => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { autoParallel },
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

            const connectableNodesType = [...Object.values(StationType), MiscNodeType.Virtual];
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
    const handleEdgeClick = useEvent((edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => {
        if (!e.shiftKey) dispatch(clearSelected());
        if (e.shiftKey && selected.has(edge)) dispatch(removeSelected(edge));
        else dispatch(addSelected(edge));
    });

    // These are elements that the svg draws from.
    // They are updated by the refresh triggers in the runtime state.

    // const [nodes, setNodes] = React.useState(getNodes(graph.current));
    // const [lines, setLines] = React.useState(getLines(graph.current));
    // React.useEffect(() => setNodes(getNodes(graph.current)), [refreshNodes]);
    // React.useEffect(() => setLines(getLines(graph.current)), [refreshEdges]);
    // const elements = [...lines, ...nodes];
    // elements.sort((a, b) => getZIndexFromElement(a) - getZIndexFromElement(b));

    const elements = React.useMemo(
        () =>
            [...getLines(graph.current), ...getNodes(graph.current)].sort(
                (a, b) => getZIndexFromElement(a) - getZIndexFromElement(b)
            ),
        [refreshEdges, refreshNodes]
    );

    const SingleColor = singleColor.component;

    return (
        <>
            {elements.map(element => {
                if (element.type === 'line') {
                    const type = element.line!.attr.type;
                    const style = element.line!.attr.style;
                    const styleAttrs = element.line!.attr[style] as NonNullable<
                        ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]
                    >;
                    // HELP NEEDED: Why component is not this type?
                    const StyleComponent = (lineStyles[style]?.component ?? UnknownLineStyle) as React.FC<
                        LineStyleComponentProps<
                            NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>
                        >
                    >;

                    return (
                        <StyleComponent
                            key={element.id}
                            id={element.id as LineId}
                            type={type}
                            path={element.line!.path}
                            styleAttrs={styleAttrs}
                            newLine={false}
                            handleClick={handleEdgeClick}
                        />
                    );
                } else if (element.type === 'station') {
                    const attr = element.station!;
                    const type = attr.type as StationType;
                    const StationComponent = allStations[type]?.component ?? UnknownNode;

                    return (
                        <StationComponent
                            key={element.id}
                            id={element.id as StnId}
                            x={attr.x}
                            y={attr.y}
                            attrs={attr}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                        />
                    );
                } else if (element.type === 'misc-node') {
                    const attr = element.miscNode!;
                    const type = attr.type as MiscNodeType;
                    const MiscNodeComponent = miscNodes[type]?.component ?? UnknownNode;

                    return (
                        <MiscNodeComponent
                            key={element.id}
                            id={element.id as MiscNodeId}
                            x={attr.x}
                            y={attr.y}
                            // @ts-expect-error
                            attrs={attr[type]}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                        />
                    );
                }
            })}
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
                    handleClick={() => {}} // no use
                />
            )}
        </>
    );
};

export default SvgCanvas;
