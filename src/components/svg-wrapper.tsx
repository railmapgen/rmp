import React from 'react';
import { nanoid } from 'nanoid';
import { useRootDispatch, useRootSelector } from '../redux';
import { Size, useWindowSize } from '../util/hooks';
import { getMousePosition } from '../util/helpers';
import { setActive, setMode, setRefresh, setSvgViewBoxZoom } from '../redux/runtime/runtime-slice';
import SvgCanvas from './svg-canvas-graph';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/node';
import stations from './station/stations';
import miscNodes from './misc/misc-nodes';

const SvgWrapper = () => {
    const dispatch = useRootDispatch();
    const hardRefresh = () => dispatch(setRefresh());

    const { mode, active, svgViewBoxZoom } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMin, setSvgViewBoxMin] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMinTmp, setSvgViewBoxMinTmp] = React.useState({ x: 0, y: 0 });
    // React.useEffect(() => console.log(svgViewBoxMin), [svgViewBoxMin]);
    const handleBackgroundDown = (e: React.PointerEvent<SVGSVGElement>) => {
        // dispatch(clearSelected()); // some bug here if I want to deselect on empty place
        const { x, y } = getMousePosition(e);
        if (mode.startsWith('station')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const type = mode.slice(8) as StationType;
            graph.current.addNode(`stn_${rand}`, {
                visible: true,
                zIndex: 0,
                x: ((x + svgViewBoxMin.x) * svgViewBoxZoom) / 100 / 2,
                y: ((y + svgViewBoxMin.y) * svgViewBoxZoom) / 100 / 2,
                type,
                [type]: stations[type].defaultAttrs,
            });
            // console.log('down', active, offset);
            hardRefresh();
        } else if (mode.startsWith('misc-node')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const type = mode.slice(10) as MiscNodeType;
            graph.current.addNode(`misc_node_${type}_${rand}`, {
                visible: true,
                zIndex: 0,
                x: x + svgViewBoxMin.x,
                y: y + svgViewBoxMin.y,
                type,
                [type]: miscNodes[type].defaultAttrs,
            });
            hardRefresh();
        } else if (mode === 'free') {
            setOffset({ x, y });
            setSvgViewBoxMinTmp(svgViewBoxMin);
            dispatch(setActive('background'));
            // console.log(x, y, svgViewBoxMin);
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

    // const [svgViewBoxZoom, setSvgViewBoxZoom] = React.useState(100);
    const handleBackgroundWheel = React.useCallback(
        (e: React.WheelEvent<SVGSVGElement>) => {
            if (e.deltaY > 0 && svgViewBoxZoom + 10 < 200) dispatch(setSvgViewBoxZoom(svgViewBoxZoom + 10));
            else if (e.deltaY < 0 && svgViewBoxZoom - 10 > 0) dispatch(setSvgViewBoxZoom(svgViewBoxZoom - 10));
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
            viewBox={`${svgViewBoxMin.x} ${svgViewBoxMin.y} ${(height * svgViewBoxZoom) / 100 / 2} ${
                (width * svgViewBoxZoom) / 100 / 2
            }`}
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
