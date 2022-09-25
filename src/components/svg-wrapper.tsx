import React from 'react';
import useEvent from 'react-use-event-hook';
import { nanoid } from 'nanoid';
import { useRootDispatch, useRootSelector } from '../redux';
import { Size, useWindowSize } from '../util/hooks';
import { getMousePosition, roundToNearestN } from '../util/helpers';
import { clearSelected, setActive, setMode, setRefresh } from '../redux/runtime/runtime-slice';
import { setSvgViewBoxZoom, setSvgViewBoxMin } from '../redux/app/app-slice';
import SvgCanvas from './svg-canvas-graph';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/node';
import stations from './station/stations';
import miscNodes from './misc/misc-nodes';
import { saveGraph } from '../redux/app/app-slice';

const SvgWrapper = () => {
    const dispatch = useRootDispatch();
    const refreshAndSave = () => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    };

    const { mode, active, selected } = useRootSelector(state => state.runtime);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.app);
    const graph = React.useRef(window.graph);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMinTmp, setSvgViewBoxMinTmp] = React.useState({ x: 0, y: 0 });
    const handleBackgroundDown = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        const { x, y } = getMousePosition(e);
        if (mode.startsWith('station')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const type = mode.slice(8) as StationType;
            graph.current.addNode(`stn_${rand}`, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN((x * svgViewBoxZoom) / 100 + svgViewBoxMin.x, 10),
                y: roundToNearestN((y * svgViewBoxZoom) / 100 + svgViewBoxMin.y, 10),
                type,
                // deep copy to prevent mutual reference
                [type]: JSON.parse(JSON.stringify(stations[type].defaultAttrs)),
            });
            // console.log('down', active, offset);
            refreshAndSave();
        } else if (mode.startsWith('misc-node')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const type = mode.slice(10) as MiscNodeType;
            graph.current.addNode(`misc_node_${type}_${rand}`, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN((x * svgViewBoxZoom) / 100 + svgViewBoxMin.x, 10),
                y: roundToNearestN((y * svgViewBoxZoom) / 100 + svgViewBoxMin.y, 10),
                type,
                // deep copy to prevent mutual reference
                [type]: JSON.parse(JSON.stringify(miscNodes[type].defaultAttrs)),
            });
            refreshAndSave();
        } else if (mode === 'free' || mode.startsWith('line')) {
            // deselect line tool if user clicks on the background
            if (mode.startsWith('line')) dispatch(setMode('free'));

            setOffset({ x, y });
            setSvgViewBoxMinTmp(svgViewBoxMin);
            if (!e.shiftKey) {
                // when user holding the shift key and mis-click the background
                // preserve the current selection
                dispatch(setActive('background'));
                dispatch(clearSelected());
            }
            // console.log(x, y, svgViewBoxMin);
        }
    });
    const handleBackgroundMove = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (active === 'background') {
            const { x, y } = getMousePosition(e);
            dispatch(
                setSvgViewBoxMin({
                    x: svgViewBoxMinTmp.x + ((offset.x - x) * svgViewBoxZoom) / 100,
                    y: svgViewBoxMinTmp.y + ((offset.y - y) * svgViewBoxZoom) / 100,
                })
            );
            // console.log('move', active, { x: offset.x - x, y: offset.y - y }, svgViewBoxMin);
        }
    });
    const handleBackgroundUp = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        // when user holding the shift key and mis-click the background
        // preserve the current selection
        if (active === 'background' && !e.shiftKey) {
            dispatch(setActive(undefined)); // svg mouse event only
            // console.log('up', active);
        }
    });

    // const [svgViewBoxZoom, setSvgViewBoxZoom] = React.useState(100);
    const handleBackgroundWheel = useEvent((e: React.WheelEvent<SVGSVGElement>) => {
        if (e.deltaY > 0 && svgViewBoxZoom + 10 < 400) dispatch(setSvgViewBoxZoom(svgViewBoxZoom + 10));
        else if (e.deltaY < 0 && svgViewBoxZoom - 10 > 0) dispatch(setSvgViewBoxZoom(svgViewBoxZoom - 10));
    });
    const handleKeyDown = useEvent((e: React.KeyboardEvent<SVGSVGElement>) => {
        // tabIndex need to be on the element to make onKeyDown worked
        // https://www.delftstack.com/howto/react/onkeydown-react/
        if (e.key === 'Delete') {
            // remove all the selected nodes and edges
            if (selected.length > 0) {
                selected
                    .filter(s => graph.current.hasNode(s) || graph.current.hasEdge(s))
                    .forEach(s => {
                        dispatch(clearSelected());
                        graph.current.hasNode(s) ? graph.current.dropNode(s) : graph.current.dropEdge(s);
                        refreshAndSave();
                    });
            }
        } else if (e.key.startsWith('Arrow')) {
            const d = 100;
            const x_factor = e.key.endsWith('Left') ? -1 : e.key.endsWith('Right') ? 1 : 0;
            const y_factor = e.key.endsWith('Up') ? -1 : e.key.endsWith('Down') ? 1 : 0;
            dispatch(
                setSvgViewBoxMin({
                    x: svgViewBoxMin.x + ((d * svgViewBoxZoom) / 100) * x_factor,
                    y: svgViewBoxMin.y + ((d * svgViewBoxZoom) / 100) * y_factor,
                })
            );
        }
    });

    const size: Size = useWindowSize();
    const height = (size.height ?? 1280) - 40;
    const width = (size.width ?? 720) - 50 - (selected.length ? 300 : 0);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            id="canvas"
            height={height}
            width={width}
            viewBox={`${svgViewBoxMin.x} ${svgViewBoxMin.y} ${(width * svgViewBoxZoom) / 100} ${
                (height * svgViewBoxZoom) / 100
            } `}
            onPointerDown={handleBackgroundDown}
            onPointerMove={handleBackgroundMove}
            onPointerUp={handleBackgroundUp}
            onWheel={handleBackgroundWheel}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <SvgCanvas />
        </svg>
    );
};

export default SvgWrapper;
