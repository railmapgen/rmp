import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, Id, MiscNodeId, NodeType, RuntimeMode, StationCity, StnId } from '../constants/constants';
import { MAX_MASTER_NODE_FREE } from '../constants/master';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { redoAction, saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom, undoAction } from '../redux/param/param-slice';
import {
    clearSelected,
    refreshEdgesThunk,
    refreshNodesThunk,
    setActive,
    setKeepLastPath,
    setMode,
    setSelected,
} from '../redux/runtime/runtime-slice';
import { exportSelectedNodesAndEdges, importSelectedNodesAndEdges } from '../util/clipboard';
import { FONTS_CSS, loadFontCss } from '../util/fonts';
import { findEdgesConnectedByNodes, findNodesExist, findNodesInRectangle } from '../util/graph';
import { getCanvasSize, getMousePosition, isMacClient, pointerPosToSVGCoord, roundToNearestN } from '../util/helpers';
import { useWindowSize } from '../util/hooks';
import { MAX_PARALLEL_LINES_FREE } from '../util/parallel';
import { getOneStationName } from '../util/random-station-names';
import SvgCanvas from './svg-canvas-graph';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const SvgWrapper = () => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const refreshAndSave = () => {
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
        dispatch(saveGraph(graph.current.export()));
    };

    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { randomStationsNames },
    } = useRootSelector(state => state.app);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const {
        mode,
        lastTool,
        active,
        selected,
        keepLastPath,
        theme,
        refresh: { nodes: refreshNodes },
        masterNodesCount,
        parallelLinesCount,
    } = useRootSelector(state => state.runtime);

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const isMasterDisabled = !activeSubscriptions.RMP_CLOUD && masterNodesCount + 1 > MAX_MASTER_NODE_FREE;
    const isParallelDisabled = !activeSubscriptions.RMP_CLOUD && parallelLinesCount + 1 > MAX_PARALLEL_LINES_FREE;
    const isRandomStationNamesDisabled = !activeSubscriptions.RMP_CLOUD || randomStationsNames === 'none';

    // Find nodes existence on each update and load fonts if needed.
    React.useEffect(() => {
        const nodesExist = findNodesExist(graph.current);

        Object.entries(nodesExist)
            // find nodes that exist and require additional fonts
            .filter(([type, exists]) => exists && type in FONTS_CSS)
            // only type is needed
            .forEach(([type]) => loadFontCss(type as NodeType));
    }, [refreshNodes]);

    // select related
    const [selectStart, setSelectStart] = React.useState({ x: 0, y: 0 }); // pos in the svg user coordinate system
    const [selectMoving, setSelectMoving] = React.useState({ x: 0, y: 0 }); // pos in the svg user coordinate system

    // background moving related
    const [offset, setOffset] = React.useState({ x: 0, y: 0 }); // pos relative to the viewport
    const [svgViewBoxMinTmp, setSvgViewBoxMinTmp] = React.useState({ x: 0, y: 0 }); // temp copy of svgViewBoxMin

    const handleBackgroundDown = useEvent(async (e: React.PointerEvent<SVGSVGElement>) => {
        const { x, y } = getMousePosition(e);
        if (mode.startsWith('station')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const id: StnId = `stn_${rand}`;
            const type = mode.slice(8) as StationType;

            // deep copy to prevent mutual reference
            const attr = structuredClone(stations[type].defaultAttrs);
            // special tweaks for AttributesWithColor
            if ('color' in attr) attr.color = theme;
            // Add random names for stations
            if (!isRandomStationNamesDisabled) {
                const namesActionResult = await dispatch(getOneStationName(StationCity.Shmetro));
                // only proceed if there is no error returned
                if (getOneStationName.fulfilled.match(namesActionResult)) {
                    const names = namesActionResult.payload as [string, ...string[]];
                    // fill or truncate the names array to the station name length
                    if (attr.names.length > names.length) {
                        names.push(...Array(attr.names.length - names.length).fill(names.at(-1)));
                    } else if (attr.names.length < names.length) {
                        names.splice(attr.names.length, names.length - attr.names.length);
                    }
                    attr.names = names;
                }
            }

            const { x: svgX, y: svgY } = pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin);
            graph.current.addNode(id, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN(svgX, 5),
                y: roundToNearestN(svgY, 5),
                type,
                [type]: attr,
            });
            // console.log('down', active, offset);
            refreshAndSave();
            if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type });
            dispatch(setSelected(new Set([id])));
        } else if (mode.startsWith('misc-node')) {
            dispatch(setMode('free'));
            const rand = nanoid(10);
            const id: MiscNodeId = `misc_node_${rand}`;
            const type = mode.slice(10) as MiscNodeType;
            const { x: svgX, y: svgY } = pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin);
            graph.current.addNode(id, {
                visible: true,
                zIndex: 0,
                x: roundToNearestN(svgX, 5),
                y: roundToNearestN(svgY, 5),
                type,
                // deep copy to prevent mutual reference
                [type]: structuredClone(miscNodes[type].defaultAttrs),
            });
            refreshAndSave();
            if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type });
            dispatch(setSelected(new Set([id])));
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
            setSelectStart(pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin));
            setSelectMoving(pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin));
        }
    });
    const handleBackgroundMove = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (mode === 'select') {
            if (selectStart.x != 0 && selectStart.y != 0) {
                const { x, y } = getMousePosition(e);
                setSelectMoving(pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin));
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
        if (mode === 'select') {
            const { x, y } = getMousePosition(e);
            const { x: svgX, y: svgY } = pointerPosToSVGCoord(x, y, svgViewBoxZoom, svgViewBoxMin);
            const nodesInRectangle = findNodesInRectangle(graph.current, selectStart.x, selectStart.y, svgX, svgY);
            const edgesInRectangle = findEdgesConnectedByNodes(graph.current, new Set(nodesInRectangle));
            dispatch(
                setSelected(new Set<Id>([...(e.shiftKey ? selected : []), ...nodesInRectangle, ...edgesInRectangle]))
            );
            dispatch(setMode('free'));
            setSelectStart({ x: 0, y: 0 });
            setSelectMoving({ x: 0, y: 0 });
        }
        // when user holding the shift key and mis-click the background
        // preserve the current selection
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
            if (selected.size > 0) {
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) {
                        graph.current.dropNode(s);
                    } else if (graph.current.hasEdge(s)) {
                        graph.current.dropEdge(s);
                    }
                });
                dispatch(clearSelected());
                refreshAndSave();
            }
        } else if (e.key.startsWith('Arrow')) {
            const d = 100;
            const x_factor = e.key.endsWith('Left') ? -1 : e.key.endsWith('Right') ? 1 : 0;
            const y_factor = e.key.endsWith('Up') ? -1 : e.key.endsWith('Down') ? 1 : 0;
            dispatch(setSvgViewBoxMin(pointerPosToSVGCoord(d * x_factor, d * y_factor, svgViewBoxZoom, svgViewBoxMin)));
        } else if (e.key === 'i' || e.key === 'j' || e.key === 'k' || e.key === 'l') {
            const d = 10;
            const x_factor = (e.key === 'j' ? -1 : e.key === 'l' ? 1 : 0) * d;
            const y_factor = (e.key === 'i' ? -1 : e.key === 'k' ? 1 : 0) * d;
            if (selected.size > 0) {
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) {
                        graph.current.updateNodeAttribute(s, 'x', x => (x ?? 0) + x_factor);
                        graph.current.updateNodeAttribute(s, 'y', y => (y ?? 0) + y_factor);
                        refreshAndSave();
                    }
                });
            }
        } else if (e.key === 'f' && lastTool) {
            dispatch(setMode(lastTool as RuntimeMode));
        } else if (e.key === 'z' && (isMacClient ? e.metaKey && !e.shiftKey : e.ctrlKey)) {
            if (isMacClient) e.preventDefault(); // Cmd Z will step backward in safari and chrome
            dispatch(undoAction());
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
        } else if (e.key === 's') {
            dispatch(setMode('select'));
        } else if ((e.key === 'c' || e.key === 'x') && (isMacClient ? e.metaKey && !e.shiftKey : e.ctrlKey)) {
            const s = exportSelectedNodesAndEdges(graph.current, selected);
            navigator.clipboard.writeText(s);
            if (e.key === 'x') {
                dispatch(clearSelected());
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) graph.current.dropNode(s);
                    else if (graph.current.hasEdge(s)) graph.current.dropEdge(s);
                });
                refreshAndSave();
            }
        } else if (e.key === 'v' && (isMacClient ? e.metaKey && !e.shiftKey : e.ctrlKey)) {
            // Firefox does not allow JavaScript to read the clipboard for privacy reasons.
            // Set dom.events.testing.asyncClipboard and dom.events.asyncClipboard.readText
            // to true in about:config will remove such restrictions.
            // https://www.reddit.com/r/firefox/comments/xlmktf/comment/ipl8y5a/
            const s = await navigator.clipboard.readText();
            const { x: svgMidX, y: svgMidY } = pointerPosToSVGCoord(
                width / 2,
                height / 2,
                svgViewBoxZoom,
                svgViewBoxMin
            );
            const { nodes, edges } = importSelectedNodesAndEdges(
                s,
                graph.current,
                isMasterDisabled,
                isParallelDisabled,
                roundToNearestN(svgMidX, 5),
                roundToNearestN(svgMidY, 5)
            );
            refreshAndSave();
            // select copied nodes automatically
            const allElements = structuredClone(nodes) as Set<Id>;
            edges.forEach(s => allElements.add(s));
            dispatch(setSelected(allElements));
        } else if (
            (isMacClient && e.key === 'z' && e.metaKey && e.shiftKey) ||
            (!isMacClient && e.key === 'y' && e.ctrlKey)
        ) {
            dispatch(redoAction());
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
        }
    });

    const [touchDist, setTouchDist] = React.useState(0);

    const handleTouchStart = useEvent((e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 2) {
            dispatch(setActive(undefined));
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            setTouchDist(dx * dx + dy * dy);
        }
    });

    const handleTouchMove = useEvent((e: React.TouchEvent<SVGSVGElement>) => {
        if (touchDist !== 0 && e.touches.length === 2) {
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            const d = dx * dx + dy * dy;

            let newSvgViewBoxZoom = svgViewBoxZoom;
            if (d - touchDist < 0 && svgViewBoxZoom + 10 <= 390) newSvgViewBoxZoom = svgViewBoxZoom + 10;
            else if (d - touchDist > 0 && svgViewBoxZoom - 10 >= 10) newSvgViewBoxZoom = svgViewBoxZoom - 10;
            dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
            setTouchDist(d);

            // the mid-position the fingers touch will still be in the same place after zooming
            const bbox = e.currentTarget.getBoundingClientRect();
            const [x, y] = [
                (e.touches[0].clientX + e.touches[1].clientX) / 2 - bbox.left,
                (e.touches[0].clientY + e.touches[1].clientY) / 2 - bbox.top,
            ];
            const [x_factor, y_factor] = [x / bbox.width, y / bbox.height];
            dispatch(
                setSvgViewBoxMin({
                    x: svgViewBoxMin.x + (x * svgViewBoxZoom) / 100 - ((width * newSvgViewBoxZoom) / 100) * x_factor,
                    y: svgViewBoxMin.y + (y * svgViewBoxZoom) / 100 - ((height * newSvgViewBoxZoom) / 100) * y_factor,
                })
            );
        }
    });

    const handleTouchEnd = useEvent((e: React.TouchEvent<SVGSVGElement>) => {
        if (touchDist !== 0) {
            setTouchDist(0);
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

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            id="canvas"
            style={{ position: 'fixed', top: 40, left: 40, userSelect: 'none', touchAction: 'none' }}
            height={height}
            width={width}
            viewBox={`${svgViewBoxMin.x} ${svgViewBoxMin.y} ${(width * svgViewBoxZoom) / 100} ${
                (height * svgViewBoxZoom) / 100
            }`}
            onPointerDown={handleBackgroundDown}
            onPointerMove={handleBackgroundMove}
            onPointerUp={handleBackgroundUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
            <defs>
                <pattern id="opaque" width="5" height="5" patternUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="2.5" height="2.5" fill="black" fillOpacity="50%" />
                    <rect x="2.5" y="2.5" width="2.5" height="2.5" fill="black" fillOpacity="50%" />
                </pattern>
            </defs>
        </svg>
    );
};

export default SvgWrapper;
