import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor, dynamicColorInjection } from '../components/panels/details/color-field';
import { InterchangeInfo, StationAttributesWithInterchange } from '../components/panels/details/interchange-field';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { LondonTubeBasicStationAttributes } from '../components/svgs/stations/london-tube-basic';
import { OsakaMetroStationAttributes } from '../components/svgs/stations/osaka-metro';
import { ShanghaiSuburbanRailwayStationAttributes } from '../components/svgs/stations/shanghai-suburban-railway';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import stations from '../components/svgs/stations/stations';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    NodeId,
    StnId,
    Theme,
} from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/nodes';
import { MasterParam } from '../constants/master';
import { makeParallelIndex, NonSimpleLinePathAttributes } from './parallel';

const stationsWithoutNameOffset = [
    StationType.ShmetroBasic2020,
    StationType.LondonTubeBasic,
    StationType.ShanghaiSuburbanRailway,
    StationType.OsakaMetro,
];
type StationsWithoutNameOffset =
    | StationType.ShmetroBasic2020
    | StationType.LondonTubeBasic
    | StationType.ShanghaiSuburbanRailway
    | StationType.OsakaMetro;
type StationsWithoutNameOffsetAttributes =
    | ShmetroBasic2020StationAttributes
    | LondonTubeBasicStationAttributes
    | ShanghaiSuburbanRailwayStationAttributes
    | OsakaMetroStationAttributes;
/**
 * Helper to check if a station type supports the transfer/interchange property.
 * Dynamically checks if the station has a 'transfer' property in its attributes.
 */
const supportsTransferProperty = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId
): boolean => {
    const stationType = graph.getNodeAttribute(station, 'type') as StationType;
    const attrs = graph.getNodeAttribute(station, stationType);
    return !!(attrs && 'transfer' in attrs);
};

/**
 * Change a station's type.
 * @param graph Graph.
 * @param selectedFirst Current station's id.
 * @param newStnType New station's type.
 */
export const changeStationType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selectedFirst: string,
    newStnType: StationType
) => {
    const currentStnType = graph.getNodeAttribute(selectedFirst, 'type') as StationType;
    const names = structuredClone(graph.getNodeAttribute(selectedFirst, currentStnType)!.names);
    for (let i = 0; i < Math.abs(stations[newStnType].defaultAttrs.names.length - names.length); i++) {
        if (stations[newStnType].defaultAttrs.names.length > names.length) {
            names.push('Stn');
        } else {
            names.pop();
        }
    }
    const newAttrs = { ...stations[newStnType].defaultAttrs, names };
    if (
        !Object.values(stationsWithoutNameOffset).includes(currentStnType) ||
        !Object.values(stationsWithoutNameOffset).includes(newStnType)
    ) {
        (
            newAttrs as Exclude<
                ExternalStationAttributes[keyof ExternalStationAttributes],
                StationsWithoutNameOffsetAttributes | undefined
            >
        ).nameOffsetX = graph.getNodeAttribute(
            selectedFirst,
            currentStnType as Exclude<StationType, StationsWithoutNameOffset>
        )!.nameOffsetX;
        (
            newAttrs as Exclude<
                ExternalStationAttributes[keyof ExternalStationAttributes],
                StationsWithoutNameOffsetAttributes | undefined
            >
        ).nameOffsetY = graph.getNodeAttribute(
            selectedFirst,
            currentStnType as Exclude<StationType, StationsWithoutNameOffset>
        )!.nameOffsetY;
    }
    if (dynamicColorInjection.has(newStnType) && dynamicColorInjection.has(currentStnType)) {
        (newAttrs as AttributesWithColor).color = structuredClone(
            (graph.getNodeAttribute(selectedFirst, currentStnType) as AttributesWithColor).color
        );
    }
    graph.removeNodeAttribute(selectedFirst, currentStnType);
    graph.mergeNodeAttributes(selectedFirst, { type: newStnType, [newStnType]: newAttrs });
};

/**
 * Change stations' type of currentStnType to newStnType in batch.
 * @param graph Graph.
 * @param currentStnType Current station's type.
 * @param newStnType New station's type.
 * @param stations Selected stations (undefined for all)
 * @returns Nothing.
 */
export const changeStationsTypeInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentStnType: StationType | 'any',
    newStnType: StationType,
    stations: StnId[]
) =>
    stations
        .filter(node => currentStnType === 'any' || graph.getNodeAttribute(node, 'type') === currentStnType)
        .forEach(stnId => {
            changeStationType(graph, stnId, newStnType);
        });

/**
 * Change a line's path type.
 * @param graph Graph.
 * @param selectedFirst Current line's id.
 * @param newLinePathType New line's path type.
 */
export const changeLinePathType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selectedFirst: string,
    newLinePathType: LinePathType,
    autoParallel: boolean
) => {
    const currentLinePathType = graph.getEdgeAttribute(selectedFirst, 'type');
    const currentLineStyleType = graph.getEdgeAttribute(selectedFirst, 'style');
    if (lineStyles[currentLineStyleType].metadata.supportLinePathType.includes(newLinePathType)) {
        const newAttrs = structuredClone(linePaths[newLinePathType].defaultAttrs);

        // calculate parallel index before changing the type
        // so that makeParallelIndex won't consider this line as an existing line
        let parallelIndex = -1;
        if (autoParallel && newLinePathType !== LinePathType.Simple) {
            const [source, target] = graph.extremities(selectedFirst) as [NodeId, NodeId];
            const startFrom = (newAttrs as NonSimpleLinePathAttributes).startFrom;
            parallelIndex = makeParallelIndex(graph, newLinePathType, source, target, startFrom);
        }
        graph.setEdgeAttribute(selectedFirst, 'parallelIndex', parallelIndex);

        graph.removeEdgeAttribute(selectedFirst, currentLinePathType);
        graph.mergeEdgeAttributes(selectedFirst, { type: newLinePathType, [newLinePathType]: newAttrs });
    }
};

/**
 * Change selected lines' path type to newLineStyleType in batch.
 * @param graph Graph.
 * @param currentLinePathType Current lines' path type.
 * @param newLinePathType New lines' path type.
 * @param lines Selected lines. (undefined for all)
 * @returns Nothing.
 */
export const changeLinePathTypeInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentLinePathType: LinePathType | 'any',
    newLinePathType: LinePathType,
    lines: LineId[],
    autoParallel: boolean
) =>
    lines
        .filter(edge => currentLinePathType === 'any' || graph.getEdgeAttribute(edge, 'type') === currentLinePathType)
        .forEach(edgeId => {
            changeLinePathType(graph, edgeId, newLinePathType, autoParallel);
        });

/**
 * Change a line's style type.
 * @param graph Graph.
 * @param selectedFirst Current line's id.
 * @param newLineStyleType New line's style type.
 * @param theme A handy helper to override color to current theme.
 */
export const changeLineStyleType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selectedFirst: string,
    newLineStyleType: LineStyleType,
    theme: Theme
) => {
    const currentLinePathType = graph.getEdgeAttribute(selectedFirst, 'type');
    const currentLineStyleType = graph.getEdgeAttribute(selectedFirst, 'style');
    if (lineStyles[newLineStyleType].metadata.supportLinePathType.includes(currentLinePathType)) {
        const oldZIndex = graph.getEdgeAttribute(selectedFirst, 'zIndex');
        const oldAttrs = graph.getEdgeAttribute(selectedFirst, currentLineStyleType);
        graph.removeEdgeAttribute(selectedFirst, currentLineStyleType);
        const newAttrs = structuredClone(lineStyles[newLineStyleType].defaultAttrs);
        if (dynamicColorInjection.has(currentLineStyleType) && dynamicColorInjection.has(newLineStyleType))
            (newAttrs as AttributesWithColor).color = (oldAttrs as AttributesWithColor).color;
        else if (dynamicColorInjection.has(newLineStyleType) && theme) (newAttrs as AttributesWithColor).color = theme;
        graph.mergeEdgeAttributes(selectedFirst, { style: newLineStyleType, [newLineStyleType]: newAttrs });
        if (newLineStyleType === LineStyleType.River) graph.setEdgeAttribute(selectedFirst, 'zIndex', -5);
        else graph.setEdgeAttribute(selectedFirst, 'zIndex', oldZIndex ?? 0);
    }
};

/**
 * Change the lines' style type of currentLineStyleType to newLineStyleType in batch.
 * @param graph Graph.
 * @param currentLineStyleType Current lines' type.
 * @param newLineStyleType New lines' type.
 * @param theme New theme.
 * @param lines Selected lines. (undefined for all)
 * @returns Nothing.
 */
export const changeLineStyleTypeInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentLineStyleType: LineStyleType | 'any',
    newLineStyleType: LineStyleType,
    theme: Theme,
    lines: LineId[]
) =>
    lines
        .filter(
            edge => currentLineStyleType === 'any' || graph.getEdgeAttribute(edge, 'style') === currentLineStyleType
        )
        .forEach(edgeId => {
            changeLineStyleType(graph, edgeId, newLineStyleType, theme);
        });

/**
 * Change lines' color from currentLineColor to newLineColor in batch
 * @param graph Graph.
 * @param currentLineColor current theme.
 * @param newLineColor new theme.
 * @param lines selected lines.
 * @returns Nothing.
 */
export const changeLinesColorInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentLineColor: Theme | 'any',
    newLineColor: Theme,
    lines: LineId[]
) =>
    lines
        .filter(edge => dynamicColorInjection.has(graph.getEdgeAttribute(edge, 'style')))
        .forEach(edge => {
            const attr = graph.getEdgeAttributes(edge);
            const color = (attr[attr.style] as AttributesWithColor).color;
            if (
                currentLineColor === 'any' ||
                (color[0] == currentLineColor[0] &&
                    color[1] == currentLineColor[1] &&
                    color[2] == currentLineColor[2] &&
                    color[3] == currentLineColor[3])
            ) {
                graph.mergeEdgeAttributes(edge, { [attr.style]: { color: newLineColor } });
            }
        });

/**
 * Change lines' color from currentLineColor to newLineColor in batch
 * @param graph Graph.
 * @param currentColor current theme.
 * @param newColor new theme.
 * @param stations selected stations. (undefined for all)
 * @param miscNodes selected misc-nodes. (undefined for all)
 * @returns Nothing.
 */
export const changeNodesColorInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentColor: Theme | 'any',
    newColor: Theme,
    stations: StnId[],
    miscNodes: MiscNodeId[]
) => {
    [...stations, ...miscNodes].forEach(node => {
        const thisType = graph.getNodeAttributes(node).type;
        const attrs = graph.getNodeAttribute(node, thisType);
        if ((attrs as AttributesWithColor | MasterParam)['color'] !== undefined) {
            if (thisType !== MiscNodeType.Master) {
                const color = (attrs as AttributesWithColor).color;
                if (
                    currentColor === 'any' ||
                    (color[0] == currentColor[0] &&
                        color[1] == currentColor[1] &&
                        color[2] == currentColor[2] &&
                        color[3] == currentColor[3])
                ) {
                    (attrs as AttributesWithColor).color = newColor;
                }
            } else {
                const color = (attrs as MasterParam).color!.value as Theme | undefined;
                if (
                    currentColor === 'any' ||
                    color === undefined ||
                    (color[0] == currentColor[0] &&
                        color[1] == currentColor[1] &&
                        color[2] == currentColor[2] &&
                        color[3] == currentColor[3])
                ) {
                    (attrs as MasterParam).color!.value = newColor;
                }
            }
        }
        graph.mergeNodeAttributes(node, { [thisType]: attrs });
    });
};

export const changeZIndexInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stations: StnId[],
    miscNodes: MiscNodeId[],
    lines: LineId[],
    value: number
) => {
    [...stations, ...miscNodes].forEach(s => {
        graph.setNodeAttribute(s, 'zIndex', value);
    });
    lines.forEach(s => {
        graph.setEdgeAttribute(s, 'zIndex', value);
    });
};

export const increaseZIndexInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stations: StnId[],
    miscNodes: MiscNodeId[],
    lines: LineId[],
    value: number
) => {
    [...stations, ...miscNodes].forEach(s => {
        const z = graph.getNodeAttribute(s, 'zIndex');
        graph.setNodeAttribute(s, 'zIndex', z + value);
    });
    lines.forEach(s => {
        const z = graph.getEdgeAttribute(s, 'zIndex');
        graph.setEdgeAttribute(s, 'zIndex', z + value);
    });
};

/**
 * Helper to create transfer info from line colors.
 *
 * InterchangeInfo structure:
 * [CityCode, LineCode, Color, TextColor, StationCode, AdditionalInfo, ...FutureExtensions]
 * - Elements 0-3: Theme information (CityCode, LineCode, Color, TextColor)
 * - Element 4: Station code (empty string for auto-fill)
 * - Element 5: Additional info (empty string for auto-fill)
 * - Element 6+: Reserved for future extensions (e.g., 'foshan' indicator for gzmtr-int-2024)
 */
const createTransferInfo = (lineColors: Theme[]): InterchangeInfo[] => {
    return lineColors.map(color => [color[0], color[1], color[2], color[3], '', ''] as InterchangeInfo);
};

/**
 * Helper to update the transfer property on a station.
 */
const updateStationTransfer = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId,
    stationType: StationType,
    transferInfo: InterchangeInfo[]
) => {
    const attrs = graph.getNodeAttribute(station, stationType) as StationAttributesWithInterchange;
    if (attrs) {
        attrs.transfer = [transferInfo];
        graph.mergeNodeAttributes(station, { [stationType]: attrs });
    }
};

/**
 * Helper to find the corresponding station type when changing between basic and interchange.
 */
const makeStationType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId,
    direction: 'int' | 'basic'
) => {
    const getDestinationType = (type: string) => {
        if (type.endsWith('-int') && direction === 'basic') {
            return type.replace(/-int$/, '-basic');
        } else if (type.endsWith('-basic') && direction === 'int') {
            return type.replace(/-basic$/, '-int');
        }
        return undefined;
    };

    const currType = graph.getNodeAttribute(station, 'type') as string;
    const destType = getDestinationType(currType);

    if (!destType) return undefined;
    if (!Object.values(StationType).includes(destType as StationType)) {
        return undefined;
    }
    return destType as StationType;
};

/**
 * Helper to get line colors from a station's connected edges.
 */
const getStationLineColors = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId
): { lineColorStr: Set<string>; lineColor: Theme[] } => {
    const lines = graph.directedEdges(station);
    const lineColorStr: Set<string> = new Set<string>();
    const lineColor: Theme[] = [];

    const getColorStr = (theme: Theme) => {
        if (theme[0] !== CityCode.Other) {
            return theme[0].toString() + '/' + theme[1].toString();
        } else {
            return theme[2].toString() + '/' + theme[3].toString();
        }
    };

    for (const l of lines) {
        const style = graph.getEdgeAttributes(l).style;
        if (!dynamicColorInjection.has(style)) continue;
        const color = (graph.getEdgeAttributes(l)[style] as AttributesWithColor).color;
        if (!lineColorStr.has(getColorStr(color))) {
            lineColorStr.add(getColorStr(color));
            lineColor.push(color);
        }
    }

    return { lineColorStr, lineColor };
};

/**
 * Automatically update station type based on the number of distinct line colors.
 * - Changes to interchange type if multiple line colors are detected
 * - Changes to basic type if only one line color is detected
 * - No-op if the station is already the correct type or has one type for both basic and interchange
 *
 * @param graph Graph instance
 * @param station Station ID
 * @returns true if the type was changed, false otherwise
 */
export const autoUpdateStationType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId
): boolean => {
    const { lineColorStr, lineColor } = getStationLineColors(graph, station);

    if (lineColorStr.size > 1) {
        const type = makeStationType(graph, station, 'int');
        if (type) {
            changeStationType(graph, station, type);
            return true;
        }
    } else if (lineColorStr.size === 1) {
        const type = makeStationType(graph, station, 'basic');
        if (type) {
            changeStationType(graph, station, type);
            changeNodesColorInBatch(graph, 'any', lineColor[0], [station], []);
            return true;
        }
    }

    return false;
};

/**
 * Automatically populate transfer information based on connected line colors.
 * - Merges existing transfer info with new line colors
 * - Filters out transfer info for lines that are no longer connected
 * - Only updates stations that support the transfer property
 *
 * @param graph Graph instance
 * @param station Station ID
 * @returns true if transfer info was updated, false otherwise
 */
export const autoPopulateTransfer = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId
): boolean => {
    if (!supportsTransferProperty(graph, station)) {
        return false;
    }

    const { lineColorStr, lineColor } = getStationLineColors(graph, station);
    const currentType = graph.getNodeAttribute(station, 'type') as StationType;

    const getColorStr = (theme: Theme) => {
        if (theme[0] !== CityCode.Other) {
            return theme[0].toString() + '/' + theme[1].toString();
        } else {
            return theme[2].toString() + '/' + theme[3].toString();
        }
    };

    // Get current transfer info, defaulting to empty array if not set
    const currentTransfer =
        (graph.getNodeAttribute(station, currentType) as StationAttributesWithInterchange).transfer?.at(0) ?? [];

    // Filter existing transfer info to keep only those still connected
    const existTransferInfo = currentTransfer.filter(t => lineColorStr.has(getColorStr(t as Theme)));

    // Create transfer info for new lines not already in transfer
    const newTransferInfo = createTransferInfo(
        lineColor.filter(t => !currentTransfer.find(c => getColorStr(t) === getColorStr(c as Theme)))
    );

    // Update only if there are changes
    const combinedTransfer = [...existTransferInfo, ...newTransferInfo];
    if (JSON.stringify(currentTransfer) !== JSON.stringify(combinedTransfer)) {
        updateStationTransfer(graph, station, currentType, combinedTransfer);
        return true;
    }

    return false;
};

/**
 * Automatically change the station type AND populate transfer information based on connected lines.
 * This is a convenience wrapper that calls both autoUpdateStationType and autoPopulateTransfer.
 *
 * @param graph Graph instance
 * @param station Station ID
 */
export const checkAndChangeStationIntType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    station: StnId
) => {
    autoUpdateStationType(graph, station);
    autoPopulateTransfer(graph, station);
};
