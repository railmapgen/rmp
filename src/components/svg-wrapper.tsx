import React from 'react';
import { nanoid } from 'nanoid';
import { useRootDispatch, useRootSelector } from '../redux';
import { Size, useWindowSize } from '../util/hooks';
import { getMousePosition } from '../util/helpers';
import { setActive, setMode, setRefresh } from '../redux/runtime/runtime-slice';
import SvgCanvas from './svg-canvas-graph';
import { StationType } from '../constants/stations';

const SvgWrapper = () => {
    const dispatch = useRootDispatch();
    const hardRefresh = () => dispatch(setRefresh());

    const { mode, active } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMin, setSvgViewBoxMin] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMinTmp, setSvgViewBoxMinTmp] = React.useState({ x: 0, y: 0 });
    const handleBackgroundDown = (e: React.PointerEvent<SVGSVGElement>) => {
        // dispatch(clearSelected()); // some bug here if I want to deselect on empty place
        const { x, y } = getMousePosition(e);
        if (mode.startsWith('station')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            graph.current.addNode(`stn_${rand}`, {
                x: x + svgViewBoxMin.x,
                y: y + svgViewBoxMin.y,
                type: mode.slice(8) as StationType,
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

    const [svgViewBoxZoom, setSvgViewBoxZoom] = React.useState(2);
    const handleBackgroundWheel = React.useCallback(
        (e: React.WheelEvent<SVGSVGElement>) => {
            if (e.deltaY > 0) setSvgViewBoxZoom(svgViewBoxZoom - 0.2);
            else if (e.deltaY < 0) setSvgViewBoxZoom(svgViewBoxZoom + 0.2);
        },
        [svgViewBoxZoom, setSvgViewBoxZoom]
    );

    const size: Size = useWindowSize();
    const height = (size.height ?? 1280) - 32;
    const width = (size.width ?? 720) - 350;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            height={height}
            width={width}
            viewBox={`${svgViewBoxMin.x} ${svgViewBoxMin.y} ${height / svgViewBoxZoom} ${width / svgViewBoxZoom}`}
            onMouseDown={handleBackgroundDown}
            onMouseMove={handleBackgroundMove}
            onMouseUp={handleBackgroundUp}
            onWheel={handleBackgroundWheel}
        >
            <SvgCanvas />
        </svg>
    );
};

export default SvgWrapper;
