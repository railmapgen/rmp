import React from 'react';
import { nanoid } from 'nanoid';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { StnId, LineId } from '../constants/constants';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/app/app-slice';
import { setActive, addSelected, setRefresh, setMode, clearSelected } from '../redux/runtime/runtime-slice';
import Station from './station/station';
import SimpleLine from './line/simple-line';
import DiagonalLine from './line/diagonal-line';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { Size, useWindowSize } from '../util/hooks';

const getMousePosition = (e: React.MouseEvent) => {
    const bbox = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bbox.left;
    const y = e.clientY - bbox.top;
    return { x, y };
};

const SvgCanvas = () => {
    const dispatch = useRootDispatch();

    const refresh = useRootSelector(state => state.runtime.refresh);
    const hardRefresh = () => dispatch(setRefresh());
    const mode = useRootSelector(state => state.runtime.mode);

    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [newLinePosition, setNewLinePosition] = React.useState({ x: 0, y: 0 });
    const active = useRootSelector(state => state.runtime.active);

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
        } else if (mode === 'line') {
            setNewLinePosition({ x: offset.x - x, y: offset.y - y });
        }
    };
    const handlePointerUp = (node: StnId, e: React.PointerEvent<SVGElement>) => {
        e.preventDefault();

        if (mode === 'line') {
            dispatch(setMode('free'));

            const elems = document.elementsFromPoint(e.clientX, e.clientY);
            const id = elems[0].attributes?.getNamedItem('id')?.value;
            if (id?.startsWith('stn_circle_')) {
                graph.current.addEdgeWithKey(`line_${nanoid(10)}`, active, id.slice(11), {
                    color: ['' as CityCode, '', MonoColour.black, MonoColour.white],
                    type: 'diagonal',
                    diagonal: {
                        startFrom: 'from',
                        offsetFrom: 0,
                        offsetTo: 0,
                    },
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
    const handleEdgeClick = (edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => {
        dispatch(clearSelected());
        dispatch(addSelected(edge));
    };

    const [svgViewBoxMin, setSvgViewBoxMin] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMinTmp, setSvgViewBoxMinTmp] = React.useState({ x: 0, y: 0 });
    const handleBackgroundDown = (e: React.PointerEvent<SVGSVGElement>) => {
        // dispatch(clearSelected()); // some bug here if I want to deselect on empty place
        const { x, y } = getMousePosition(e);
        if (mode === 'station') {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            graph.current.addNode(`stn_${rand}`, {
                x: x + svgViewBoxMin.x,
                y: y + svgViewBoxMin.y,
                names: [`车站${rand}`, `Stn ${rand}`],
            });
            // console.log(x, y, svgViewBoxMin);
            hardRefresh();
        } else if (mode === 'free') {
            setOffset({ x, y });
            setSvgViewBoxMinTmp(svgViewBoxMin);
            dispatch(setActive('background'));
            // console.log('down', active, offset);
        }
    };
    const handleBackgroundMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (active === 'background') {
            const { x, y } = getMousePosition(e);
            setSvgViewBoxMin({ x: svgViewBoxMinTmp.x + (offset.x - x), y: svgViewBoxMinTmp.y + (offset.y - y) });
            // console.log('move', active, { x: offset.x - x, y: offset.y - y }, svgViewBoxMin);
        }
    };
    const handleBackgroundUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (active === 'background') {
            dispatch(setActive(undefined)); // svg mouse event only
            // console.log('up', active);
        }
    };

    const size: Size = useWindowSize();
    const height = (size.height ?? 1280) - 32;
    const width = (size.width ?? 720) - 350;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            height={height}
            width={width}
            viewBox={`${svgViewBoxMin.x} ${svgViewBoxMin.y} ${height / 2} ${width / 2}`}
            onMouseDown={handleBackgroundDown}
            onMouseMove={handleBackgroundMove}
            onMouseUp={handleBackgroundUp}
        >
            {mode === 'line' && active && (
                <DiagonalLine
                    // @ts-expect-error
                    id="create_in_progress___no_use"
                    x1={graph.current.getNodeAttribute(active, 'x')}
                    y1={graph.current.getNodeAttribute(active, 'y')}
                    x2={graph.current.getNodeAttribute(active, 'x') - newLinePosition.x}
                    y2={graph.current.getNodeAttribute(active, 'y') - newLinePosition.y}
                    attrs={{ color: ['' as CityCode, '', MonoColour.black, MonoColour.white], type: 'diagonal' }}
                />
            )}
            {React.useMemo(() => {
                return graph.current.mapEdges((edge, attr, source, target, sourceAttr, targetAttr, undirected) => (
                    <DiagonalLine
                        id={edge as LineId}
                        key={edge}
                        x1={sourceAttr.x}
                        y1={sourceAttr.y}
                        x2={targetAttr.x}
                        y2={targetAttr.y}
                        attrs={attr}
                        onClick={handleEdgeClick}
                    />
                ));
            }, [refresh])}
            {React.useMemo(() => {
                return graph.current.mapNodes((node, attr) => (
                    <Station
                        id={node as StnId}
                        key={node}
                        x={attr.x}
                        y={attr.y}
                        names={attr.names}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                    />
                ));
            }, [refresh])}
        </svg>
    );
};

export default SvgCanvas;
