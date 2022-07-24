import React from 'react';
import { nanoid } from 'nanoid';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { StnId, LineId, NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { LineType } from '../constants/lines';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/app/app-slice';
import { setActive, addSelected, setRefresh, setMode, clearSelected } from '../redux/runtime/runtime-slice';
import allStations from './station/stations';
import allLines from './line/lines';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { getMousePosition } from '../util/helpers';

type stationElem = { node: StnId } & NodeAttributes;
type lineElem = { edge: LineId; x1: number; x2: number; y1: number; y2: number; attr: EdgeAttributes };

const getStations = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): stationElem[] =>
    graph.mapNodes((node, attr) => ({
        node: node as StnId,
        x: attr.x,
        y: attr.y,
        type: attr.type,
        [attr.type]: attr[attr.type],
    }));
const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): lineElem[] =>
    graph.mapEdges((edge, attr, source, target, sourceAttr, targetAttr, undirected) => ({
        edge: edge as LineId,
        x1: sourceAttr.x,
        y1: sourceAttr.y,
        x2: targetAttr.x,
        y2: targetAttr.y,
        attr,
    }));

const SvgCanvas = () => {
    const dispatch = useRootDispatch();

    const { refresh, mode, active } = useRootSelector(state => state.runtime);
    const hardRefresh = () => dispatch(setRefresh());

    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [newLinePosition, setNewLinePosition] = React.useState({ x: 0, y: 0 });

    const handlePointerDown = (node: StnId, e: React.PointerEvent<SVGElement>) => {
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
    const handlePointerMove = (node: StnId, e: React.PointerEvent<SVGElement>) => {
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
            setNewLinePosition({ x: offset.x - x, y: offset.y - y });
        }
    };
    const handlePointerUp = (node: StnId, e: React.PointerEvent<SVGElement>) => {
        e.preventDefault();

        if (mode.startsWith('line')) {
            dispatch(setMode('free'));

            const elems = document.elementsFromPoint(e.clientX, e.clientY);
            const id = elems[0].attributes?.getNamedItem('id')?.value;
            if (id?.startsWith('stn_circle_')) {
                const type = mode.slice(5) as LineType;
                graph.current.addEdgeWithKey(`line_${nanoid(10)}`, active, id.slice(11), {
                    color: ['' as CityCode, '', MonoColour.black, MonoColour.white],
                    type,
                    [type]: allLines[type].defaultAttrs,
                });
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
    React.useEffect(() => {
        setStations(getStations(graph.current));
        setLines(getLines(graph.current));
    }, [refresh]);

    const DrawLineComponent = mode.startsWith('line')
        ? allLines[mode.slice(5) as LineType].component
        : (props: any) => <></>;

    return (
        <>
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
            {stations.map(line => {
                const { node, x, y, type } = line;
                const StationComponent = allStations[type].component;
                return (
                    <StationComponent
                        id={node}
                        key={node}
                        x={x}
                        y={y}
                        attrs={{ [type]: line[type] }}
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
                    attrs={{ color: ['' as CityCode, '', MonoColour.black, MonoColour.white], type: LineType.Diagonal }}
                />
            )}
        </>
    );
};

export default SvgCanvas;
