import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import { Events, LineId, MiscNodeId, NodeAttributes, NodeType, StnId, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { STATION_TYPE_VALUES, StationAttributes, StationType } from '../constants/stations';
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
import { useMakeStationName } from '../util/random-station-names';
import { autoChangeStationIntType } from '../util/change-types';
import { AttributesWithColor, dynamicColorInjection } from './panels/details/color-field';
import { linePaths } from './svgs/lines/lines';
import diagonalPath from './svgs/lines/paths/diagonal';
import singleColor from './svgs/lines/styles/single-color';
import miscNodes from './svgs/nodes/misc-nodes';
import virtual from './svgs/nodes/virtual';
import stations from './svgs/stations/stations';

type NodeID = StnId | MiscNodeId;

const VirtualNodeComponent = virtual.component;
const diagonalPathGenerator = diagonalPath.generatePath;
const SingleColorComponent = singleColor.component;
const OFFSET = 10;

const PredictNextNode = () => {
    const dispatch = useRootDispatch();
    const refreshAndSave = () => {
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    };
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { autoParallel },
    } = useRootSelector(state => state.app);
    const {
        selected,
        theme: runtimeTheme,
        count: { mostFrequentStationType },
    } = useRootSelector(state => state.runtime);

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

    const stationType = selectedID.startsWith('stn_')
        ? (window.graph.getNodeAttribute(selectedID, 'type') as StationType)
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
    const path1 = diagonalPathGenerator(curPos.x, nextPos1.x, curPos.y, nextPos1.y, {
        ...diagonalPath.defaultAttrs,
        startFrom: path1StartFrom,
    });
    const path2StartFrom = switchStartFrom ? 'to' : 'from';
    const path2 = diagonalPathGenerator(curPos.x, nextPos2.x, curPos.y, nextPos2.y, {
        ...diagonalPath.defaultAttrs,
        startFrom: path2StartFrom,
    });

    const handlePointerDown = async (nodeType: NodeType, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();
        const { x, y } = getMousePosition(e);
        dispatch(setPointerPosition({ x, y }));

        const rand = nanoid(10);
        const isStation = STATION_TYPE_VALUES.has(nodeType as StationType);
        const nextID: NodeID = isStation ? `stn_${rand}` : `misc_node_${rand}`;

        // deep copy to prevent mutual reference
        const attr = structuredClone({ ...stations, ...miscNodes }[nodeType].defaultAttrs);
        // inject runtime color if registered in dynamicColorInjection
        if (dynamicColorInjection.has(nodeType)) (attr as AttributesWithColor).color = runtimeTheme;
        // Add random names for stations
        if (isStation) (attr as StationAttributes).names = await makeStationName(nodeType as StationType);

        window.graph.addNode(nextID, {
            visible: true,
            zIndex: 0,
            x: isStation ? nextPos2.x : nextPos1.x,
            y: isStation ? nextPos2.y : nextPos1.y,
            type: nodeType,
            [nodeType]: attr,
        });
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type: nodeType });

        const pathType = LinePathType.Diagonal;
        const newLineId: LineId = `line_${nanoid(10)}`;
        const [source, target] = [selectedID as NodeID, nextID];
        const parallelIndex = autoParallel ? 0 : -1;
        const startFrom = isStation ? path2StartFrom : path1StartFrom;
        window.graph.addDirectedEdgeWithKey(newLineId, source, target, {
            visible: true,
            zIndex: 0,
            type: pathType,
            [pathType]: {
                // deep copy to prevent mutual reference
                ...structuredClone(linePaths[pathType].defaultAttrs),
                startFrom,
            },
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color: mostFrequentTheme },
            reconcileId: '',
            parallelIndex,
        });
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type: pathType });

        if (source.startsWith('stn')) {
            autoChangeStationIntType(window.graph, source as StnId, 'int');
        }

        refreshAndSave();
        dispatch(setActive(nextID));
        dispatch(setSelected(new Set([nextID])));
    };

    return (
        <g id="prediction" opacity="0.5" className="removeMe">
            <SingleColorComponent
                id="line_prediction_1"
                type={LinePathType.Diagonal}
                path={path1}
                styleAttrs={{ color: mostFrequentTheme }}
                newLine
                handlePointerDown={() => {}}
            />
            <SingleColorComponent
                id="line_prediction_2"
                type={LinePathType.Diagonal}
                path={path2}
                styleAttrs={{ color: mostFrequentTheme }}
                newLine
                handlePointerDown={() => {}}
            />
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
            <StationComponent
                id="stn_virtual_prediction_2"
                attrs={stationAttrs}
                x={nextPos2.x}
                y={nextPos2.y}
                handlePointerDown={(_, e) => {
                    handlePointerDown(mostFrequentStationType, e);
                }}
                handlePointerMove={() => {}}
                handlePointerUp={() => {}}
            />
        </g>
    );
};

export default PredictNextNode;
