import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, MiscNodeId, NodeType, RuntimeMode, StnId } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { redoAction, saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom, undoAction } from '../redux/param/param-slice';
import {
    addSelected,
    clearSelected,
    setActive,
    setKeepLastPath,
    setMode,
    setRefreshEdges,
    setRefreshNodes,
    setSelected,
    setSelectStart,
    setSelectMoving,
} from '../redux/runtime/runtime-slice';
import { exportSelectedNodesAndEdges, importSelectedNodesAndEdges } from '../util/clipboard';
import { FONTS_CSS } from '../util/fonts';
import { findEdgesConnectedByNodes, findNodesExist, findNodesInRectangle } from '../util/graph';
import { getMousePosition, isMacClient, roundToNearestN } from '../util/helpers';
import { Size, useWindowSize } from '../util/hooks';
import SvgCanvas from './svg-canvas-graph';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const SvgWrapper = () => {
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
        mode,
        lastTool,
        active,
        selected,
        keepLastPath,
        theme,
        selectStart,
        selectMoving,
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);

    const size: Size = useWindowSize();
    const height = (size.height ?? 1280) - 40;
    const width = (size.width ?? 720) - 40;

    // Find nodes existence on each update and load fonts if needed.
    React.useEffect(() => {
        const nodesExist = findNodesExist(graph.current);

        Object.entries(nodesExist)
            // find nodes that exist and require additional fonts
            .filter(([type, exists]) => exists && type in FONTS_CSS)
            // only type is needed
            .map(([type, _]) => type as NodeType)
            // only load fonts that are not loaded before
            .filter(type => FONTS_CSS[type] && document.getElementById(FONTS_CSS[type]!.cssName) === null)
            // get the css name
            .map(type => FONTS_CSS[type]!.cssName)
            // remove duplicates
            .filter((type, i, arr) => i === arr.findIndex(t => t === type))
            .forEach(css => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.id = css!;
                link.href = import.meta.env.BASE_URL + `styles/${css!}.css`;
                document.head.append(link);
            });
    }, [refreshNodes]);

    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [svgViewBoxMinTmp, setSvgViewBoxMinTmp] = React.useState({ x: 0, y: 0 });
    const handleBackgroundDown = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        const { x, y } = getMousePosition(e);
        if (mode.startsWith('station')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const type = mode.slice(8) as StationType;

            // deep copy to prevent mutual reference
            const attr = structuredClone(stations[type].defaultAttrs);
            // special tweaks for AttributesWithColor
            if ('color' in attr) attr.color = theme;

            graph.current.addNode(`stn_${rand}`, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN((x * svgViewBoxZoom) / 100 + svgViewBoxMin.x, 10),
                y: roundToNearestN((y * svgViewBoxZoom) / 100 + svgViewBoxMin.y, 10),
                type,
                [type]: attr,
            });
            // console.log('down', active, offset);
            refreshAndSave();
            if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type });
        } else if (mode.startsWith('misc-node')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const type = mode.slice(10) as MiscNodeType;
            graph.current.addNode(`misc_node_${rand}`, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN((x * svgViewBoxZoom) / 100 + svgViewBoxMin.x, 10),
                y: roundToNearestN((y * svgViewBoxZoom) / 100 + svgViewBoxMin.y, 10),
                type,
                // deep copy to prevent mutual reference
                [type]: structuredClone(miscNodes[type].defaultAttrs),
            });
            refreshAndSave();
            if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type });
        } else if (mode === 'free' || mode.startsWith('line')) {
            // deselect line tool if user clicks on the background
            if (mode.startsWith('line')) {
                dispatch(setMode('free'));
                // also turn keepLastPath off to exit keeping drawing lines
                if (keepLastPath) dispatch(setKeepLastPath(false));
            }

            // set initial position of the pointer, this is used in handleBackgroundMove
            setOffset({ x, y });
            setSvgViewBoxMinTmp(svgViewBoxMin);
            if (!e.shiftKey) {
                // when user holding the shift key and mis-click the background
                // preserve the current selection
                dispatch(setActive('background'));
                dispatch(clearSelected());
            }
            // console.log(x, y, svgViewBoxMin);
        } else if (mode === 'select') {
            dispatch(
                setSelectStart({
                    x: (x * svgViewBoxZoom) / 100 + svgViewBoxMin.x,
                    y: (y * svgViewBoxZoom) / 100 + svgViewBoxMin.y,
                })
            );
            dispatch(
                setSelectMoving({
                    x: (x * svgViewBoxZoom) / 100 + svgViewBoxMin.x,
                    y: (y * svgViewBoxZoom) / 100 + svgViewBoxMin.y,
                })
            );
        }
    });
    const handleBackgroundMove = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (mode === 'select') {
            if (selectStart.x != 0 && selectStart.y != 0) {
                const { x, y } = getMousePosition(e);
                dispatch(
                    setSelectMoving({
                        x: (x * svgViewBoxZoom) / 100 + svgViewBoxMin.x,
                        y: (y * svgViewBoxZoom) / 100 + svgViewBoxMin.y,
                    })
                );
            }
        } else if (active === 'background') {
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
        if (mode === 'select') {
            const { x, y } = getMousePosition(e);
            if (!e.shiftKey) {
                dispatch(clearSelected());
            }
            findNodesInRectangle(
                graph.current,
                selectStart.x,
                selectStart.y,
                (x * svgViewBoxZoom) / 100 + svgViewBoxMin.x,
                (y * svgViewBoxZoom) / 100 + svgViewBoxMin.y
            ).forEach(node => {
                dispatch(addSelected(node));
            });
            dispatch(setMode('free'));
            // They were commented as adding React.useEffect() below.
            // dispatch(setSelectStart({ x: 0, y: 0 }));
            // dispatch(setSelectMoving({ x: 0, y: 0 }));
        }
        if (active === 'background' && !e.shiftKey) {
            dispatch(setActive(undefined)); // svg mouse event only
            // console.log('up', active);
        }
    });

    const handleBackgroundWheel = useEvent((e: React.WheelEvent<SVGSVGElement>) => {
        let newSvgViewBoxZoom = svgViewBoxZoom;
        if (e.deltaY > 0 && svgViewBoxZoom + 10 < 400) newSvgViewBoxZoom = svgViewBoxZoom + 10;
        else if (e.deltaY < 0 && svgViewBoxZoom - 10 > 0) newSvgViewBoxZoom = svgViewBoxZoom - 10;
        dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));

        // the position the pointer points will still be in the same place after zooming
        const { x, y } = getMousePosition(e);
        const bbox = e.currentTarget.getBoundingClientRect();
        // calculate the proportion of the pointer in the canvas
        const [x_factor, y_factor] = [x / bbox.width, y / bbox.height];
        // the final svgViewBoxMin will be the position the pointer points minus
        // the left/top part of the new canvas (new width/height times the proportion)
        dispatch(
            setSvgViewBoxMin({
                x: svgViewBoxMin.x + (x * svgViewBoxZoom) / 100 - ((width * newSvgViewBoxZoom) / 100) * x_factor,
                y: svgViewBoxMin.y + (y * svgViewBoxZoom) / 100 - ((height * newSvgViewBoxZoom) / 100) * y_factor,
            })
        );
    });

    const handleKeyDown = useEvent(async (e: React.KeyboardEvent<SVGSVGElement>) => {
        // tabIndex need to be on the element to make onKeyDown worked
        // https://www.delftstack.com/howto/react/onkeydown-react/
        if (isMacClient ? e.key === 'Backspace' : e.key === 'Delete') {
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
        } else if (e.key === 'i' || e.key === 'j' || e.key === 'k' || e.key === 'l') {
            const d = 10;
            const x_factor = (e.key === 'j' ? -1 : e.key === 'l' ? 1 : 0) * d;
            const y_factor = (e.key === 'i' ? -1 : e.key === 'k' ? 1 : 0) * d;
            if (selected.length > 0) {
                selected
                    .filter(s => graph.current.hasNode(s))
                    .forEach(s => {
                        graph.current.updateNodeAttribute(s, 'x', x => (x ?? 0) + x_factor);
                        graph.current.updateNodeAttribute(s, 'y', y => (y ?? 0) + y_factor);
                        refreshAndSave();
                    });
            }
        } else if (e.key === 'f' && lastTool) {
            dispatch(setMode(lastTool as RuntimeMode));
        } else if (e.key === 'z' && (isMacClient ? e.metaKey && !e.shiftKey : e.ctrlKey)) {
            if (isMacClient) e.preventDefault(); // Cmd Z will step backward in safari and chrome
            dispatch(undoAction());
        } else if (e.key === 'c' && (isMacClient ? e.metaKey && !e.shiftKey : e.ctrlKey)) {
            const nodes = new Set(selected as (StnId | MiscNodeId)[]);
            const edges = findEdgesConnectedByNodes(graph.current, nodes);
            const s = exportSelectedNodesAndEdges(graph.current, nodes, new Set(edges));
            navigator.clipboard.writeText(s);
        } else if (e.key === 'v' && (isMacClient ? e.metaKey && !e.shiftKey : e.ctrlKey)) {
            // Firefox does not allow JavaScript to read the clipboard for privacy reasons.
            // Set dom.events.testing.asyncClipboard and dom.events.asyncClipboard.readText
            // to true in about:config will remove such restrictions.
            // https://www.reddit.com/r/firefox/comments/xlmktf/comment/ipl8y5a/
            const s = await navigator.clipboard.readText();
            const { nodes } = importSelectedNodesAndEdges(
                s,
                graph.current,
                (width * svgViewBoxZoom) / 200 + svgViewBoxMin.x,
                (height * svgViewBoxZoom) / 200 + svgViewBoxMin.y
            );
            refreshAndSave();
            // select copied nodes automatically
            dispatch(clearSelected());
            dispatch(setSelected(nodes));
        } else if (
            (isMacClient && e.key === 'z' && e.metaKey && e.shiftKey) ||
            (!isMacClient && e.key === 'y' && e.ctrlKey)
        ) {
            dispatch(redoAction());
        }
    });

    const [selectCoord, setSelectCoord] = React.useState({ sx: 0, sy: 0, ex: 0, ey: 0 });
    React.useEffect(() => {
        setSelectCoord({
            sx: selectStart.x <= selectMoving.x ? selectStart.x : selectMoving.x,
            ex: selectStart.x > selectMoving.x ? selectStart.x : selectMoving.x,
            sy: selectStart.y <= selectMoving.y ? selectStart.y : selectMoving.y,
            ey: selectStart.y > selectMoving.y ? selectStart.y : selectMoving.y,
        });
    }, [selectMoving.x, selectMoving.y]);
    React.useEffect(() => {
        if (mode === 'free') {
            dispatch(setSelectStart({ x: 0, y: 0 }));
            dispatch(setSelectMoving({ x: 0, y: 0 }));
        }
    }, [mode === 'select']);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            id="canvas"
            style={{ position: 'fixed', top: 40, left: 40, userSelect: 'none' }}
            height={height}
            width={width}
            viewBox={`${svgViewBoxMin.x} ${svgViewBoxMin.y} ${(width * svgViewBoxZoom) / 100} ${
                (height * svgViewBoxZoom) / 100
            }`}
            onPointerDown={handleBackgroundDown}
            onPointerMove={handleBackgroundMove}
            onPointerUp={handleBackgroundUp}
            onWheel={handleBackgroundWheel}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <SvgCanvas />
            {mode === 'select' && selectStart.x != 0 && selectStart.y != 0 && (
                <rect
                    x={selectCoord.sx}
                    y={selectCoord.sy}
                    width={selectCoord.ex - selectCoord.sx}
                    height={selectCoord.ey - selectCoord.sy}
                    rx="2"
                    stroke="#b5b5b6"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    fill="#b5b5b6"
                    opacity="0.75"
                />
            )}
        </svg>
    );
};

export default SvgWrapper;
