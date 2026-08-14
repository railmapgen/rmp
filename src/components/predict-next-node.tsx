import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import { EdgeAttributes, Events, LineId, NodeAttributes, NodeId, NodeType, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { ExternalStationAttributes, STATION_TYPE_VALUES, StationAttributes, StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import {
    refreshEdgesThunk,
    refreshNodesThunk,
    setActive,
    setPointerPosition,
    setSelected,
} from '../redux/runtime/runtime-slice';
import { getMousePosition } from '../util/helpers';
import { supportsParallelLinePath } from '../util/parallel';
import { useMakeStationName } from '../util/random-station-names';
import { AttributesWithColor, dynamicColorInjection } from './panels/details/color-field';
import { normalizeEdgeAttributes } from './svgs/lines/lines';
import bezierPath from './svgs/lines/paths/bezier';
import { initializeBezierEndpointOffsets } from './svgs/lines/paths/bezier-endpoint';
import diagonalPath from './svgs/lines/paths/diagonal';
import singleColor from './svgs/lines/styles/single-color';
import miscNodes from './svgs/nodes/misc-nodes';
import virtual from './svgs/nodes/virtual';
import stations from './svgs/stations/stations';

const VirtualNodeComponent = virtual.component;
const SingleColorComponent = singleColor.component;
const OFFSET = 10;
type PredictionPathType = LinePathType.Diagonal | LinePathType.Bezier;

const makePredictionEdgeAttrs = (
    pathType: PredictionPathType,
    startFrom: 'from' | 'to',
    color: Theme
): EdgeAttributes =>
    ({
        visible: true,
        zIndex: 0,
        type: pathType,
        [pathType]:
            pathType === LinePathType.Diagonal
                ? { ...structuredClone(diagonalPath.defaultAttrs), startFrom }
                : structuredClone(bezierPath.defaultAttrs),
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: { color },
        reconcileId: '',
        parallelIndex: -1,
    }) as EdgeAttributes;

const PredictNextNode = () => {
    const dispatch = useRootDispatch();
    const refreshAndSave = () => {
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    };
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { autoParallel, randomStationsNames },
    } = useRootSelector(state => state.app);
    const {
        selected,
        theme: runtimeTheme,
        count: { mostFrequentStationType },
        lastTool,
    } = useRootSelector(state => state.runtime);
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const predictionPathType: PredictionPathType = mapEnabled ? LinePathType.Bezier : LinePathType.Diagonal;
    const makeStationName = useMakeStationName();

    // must have exactly one selected, checked in the parent component
    const selectedID = selected.keys().next().value!;
    // check if the selectedID is a node
    if (!selectedID.startsWith('stn') && !selectedID.startsWith('misc_node')) return undefined;
    // TODO: remove selectedID if it is not existed in redo/undo
    if (!window.graph.hasNode(selectedID)) return undefined;

    const neighbors = window.graph.neighbors(selectedID);
    if (neighbors.length === 0) return undefined;

    const curPos = window.graph.getNodeAttributes(selectedID);
    const sumPos = neighbors.reduce(
        (acc, id) => {
            const attr = window.graph.getNodeAttributes(id);
            return {
                x: acc.x + attr.x,
                y: acc.y + attr.y,
            };
        },
        { x: 0, y: 0 }
    );
    const avgPos = {
        x: sumPos.x / neighbors.length,
        y: sumPos.y / neighbors.length,
    };
    const deltaPos = {
        x: curPos.x - avgPos.x,
        y: curPos.y - avgPos.y,
    };
    const nextPos = {
        x: curPos.x + deltaPos.x,
        y: curPos.y + deltaPos.y,
    };
    const sameSign = Math.sign(deltaPos.x) === Math.sign(deltaPos.y);
    const nextPos1 = {
        x: nextPos.x - OFFSET,
        y: nextPos.y + OFFSET * (sameSign ? 1 : -1),
    };
    const nextPos2 = {
        x: nextPos.x + OFFSET,
        y: nextPos.y + OFFSET * (sameSign ? -1 : 1),
    };

    const isSelectedStation = selectedID.startsWith('stn_');
    const stationType = isSelectedStation
        ? (window.graph.getNodeAttribute(selectedID, 'type') as StationType)
        : lastTool?.startsWith('station-')
          ? (lastTool.slice(8) as StationType)
          : mostFrequentStationType;
    const StationComponent = stations[stationType].component;
    const stationAttrs: NodeAttributes = {
        visible: true,
        zIndex: 0,
        x: nextPos2.x,
        y: nextPos2.y,
        type: stationType,
        [stationType]: stations[stationType].defaultAttrs,
    };
    if (isSelectedStation) {
        const selectedStationAttrs = structuredClone(
            window.graph.getNodeAttribute(selectedID, stationType)
        ) as NonNullable<ExternalStationAttributes[typeof stationType]>;
        Object.assign(stationAttrs, { [stationType]: selectedStationAttrs } as Pick<
            ExternalStationAttributes,
            typeof stationType
        >);
    }

    const allThemes = window.graph.reduceEdges(
        selectedID,
        (acc, edge) => {
            const attr = window.graph.getEdgeAttributes(edge);
            const { style } = attr;
            if (style === LineStyleType.SingleColor) {
                const theme = JSON.stringify(attr[style]!.color);
                if (theme in acc) {
                    acc[theme] += 1;
                } else {
                    acc[theme] = 1;
                }
            }
            return acc;
        },
        {} as Record<string, number>
    );
    const mostFrequentTheme =
        Object.entries(allThemes)
            .filter(([_, count]) => count % 2 !== 0) // Filter themes that appear an odd number of times
            .reduce((max, [theme, count]) => (count > max.count ? { color: JSON.parse(theme) as Theme, count } : max), {
                color: null as Theme | null,
                count: 0,
            }).color ?? runtimeTheme;
    const switchStartFrom =
        deltaPos.x > 0
            ? deltaPos.x > Math.abs(deltaPos.y)
                ? false
                : true
            : -deltaPos.x > Math.abs(deltaPos.y)
              ? true
              : false;
    const path1StartFrom = switchStartFrom ? 'from' : 'to';
    const path2StartFrom = switchStartFrom ? 'to' : 'from';
    let path1;
    let path2;
    if (predictionPathType === LinePathType.Bezier) {
        const bezierPreviewAttrs = initializeBezierEndpointOffsets(
            window.graph,
            selectedID as NodeId,
            undefined,
            makePredictionEdgeAttrs(predictionPathType, path1StartFrom, mostFrequentTheme)
        );
        path1 = bezierPath.generatePath(curPos.x, nextPos1.x, curPos.y, nextPos1.y, bezierPreviewAttrs);
        path2 = bezierPath.generatePath(curPos.x, nextPos2.x, curPos.y, nextPos2.y, bezierPreviewAttrs);
    } else {
        path1 = diagonalPath.generatePath(curPos.x, nextPos1.x, curPos.y, nextPos1.y, {
            ...structuredClone(diagonalPath.defaultAttrs),
            startFrom: path1StartFrom,
        });
        path2 = diagonalPath.generatePath(curPos.x, nextPos2.x, curPos.y, nextPos2.y, {
            ...structuredClone(diagonalPath.defaultAttrs),
            startFrom: path2StartFrom,
        });
    }

    const handlePointerDown = async (nodeType: NodeType, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();
        const { x, y } = getMousePosition(e);
        dispatch(setPointerPosition({ x, y }));

        const rand = nanoid(10);
        const isStation = STATION_TYPE_VALUES.has(nodeType as StationType);
        const nextID: NodeId = isStation ? `stn_${rand}` : `misc_node_${rand}`;

        // preserve attributes from the selected station if applicable
        const attr = structuredClone(
            isStation && nodeType === window.graph.getNodeAttribute(selectedID, 'type')
                ? window.graph.getNodeAttribute(selectedID, nodeType as StationType)
                : { ...stations, ...miscNodes }[nodeType].defaultAttrs
        );
        // inject runtime color if registered in dynamicColorInjection
        if (dynamicColorInjection.has(nodeType)) (attr as AttributesWithColor).color = runtimeTheme;
        // Override station names for non-default creation modes while keeping cloned names in default mode.
        const shouldOverrideStationNames =
            randomStationsNames !== 'default' && (randomStationsNames === 'empty' || activeSubscriptions.RMP_CLOUD);
        if (isStation && shouldOverrideStationNames) {
            (attr as StationAttributes).names = await makeStationName(nodeType as StationType);
        }

        window.graph.addNode(nextID, {
            visible: true,
            zIndex: 0,
            x: isStation ? nextPos2.x : nextPos1.x,
            y: isStation ? nextPos2.y : nextPos1.y,
            type: nodeType,
            [nodeType]: attr,
        });
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type: nodeType });

        const pathType = predictionPathType;
        const newLineId: LineId = `line_${nanoid(10)}`;
        const [source, target] = [selectedID as NodeId, nextID];
        const parallelIndex = autoParallel && supportsParallelLinePath(pathType) ? 0 : -1;
        const startFrom = isStation ? path2StartFrom : path1StartFrom;
        const edgeAttrs = makePredictionEdgeAttrs(pathType, startFrom, mostFrequentTheme);
        edgeAttrs.parallelIndex = parallelIndex;
        window.graph.addDirectedEdgeWithKey(newLineId, source, target, edgeAttrs);
        normalizeEdgeAttributes(window.graph, [newLineId], 'created');
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type: pathType });

        refreshAndSave();
        dispatch(setActive(nextID));
        dispatch(setSelected(new Set([nextID])));
    };

    return (
        <g id="prediction" opacity="0.5" className="removeMe">
            <SingleColorComponent
                id="line_prediction_1"
                type={predictionPathType}
                path={path1}
                styleAttrs={{ color: mostFrequentTheme }}
                newLine
                handlePointerDown={() => {}}
            />
            <SingleColorComponent
                id="line_prediction_2"
                type={predictionPathType}
                path={path2}
                styleAttrs={{ color: mostFrequentTheme }}
                newLine
                handlePointerDown={() => {}}
            />
            <g transform={`translate(${nextPos1.x}, ${nextPos1.y})`}>
                <VirtualNodeComponent
                    id="misc_node_virtual_prediction_1"
                    attrs={{}}
                    x={nextPos1.x}
                    y={nextPos1.y}
                    handlePointerDown={(_, e) => {
                        handlePointerDown(MiscNodeType.Virtual, e);
                    }}
                    handlePointerMove={() => {}}
                    handlePointerUp={() => {}}
                />
            </g>
            <g transform={`translate(${nextPos2.x}, ${nextPos2.y})`}>
                <StationComponent
                    id="stn_virtual_prediction_2"
                    attrs={stationAttrs}
                    x={nextPos2.x}
                    y={nextPos2.y}
                    handlePointerDown={(_, e) => {
                        handlePointerDown(stationType, e);
                    }}
                    handlePointerMove={() => {}}
                    handlePointerUp={() => {}}
                />
            </g>
        </g>
    );
};

export default PredictNextNode;
