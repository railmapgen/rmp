import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor } from '../components/panels/details/color-field';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import stations from '../components/svgs/stations/stations';
import {
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    StnId,
    Theme,
} from '../constants/constants';
import { LinePathType, LineStylesWithColor, LineStyleType } from '../constants/lines';
import { ExternalStationAttributes, StationType, StationWithColor } from '../constants/stations';

const StationsWithoutNameOffset = [StationType.ShmetroBasic2020];

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
        !Object.values(StationsWithoutNameOffset).includes(currentStnType) ||
        !Object.values(StationsWithoutNameOffset).includes(newStnType)
    ) {
        (
            newAttrs as Exclude<
                ExternalStationAttributes[keyof ExternalStationAttributes],
                ShmetroBasic2020StationAttributes | undefined
            >
        ).nameOffsetX = graph.getNodeAttribute(
            selectedFirst,
            currentStnType as Exclude<StationType, StationType.ShmetroBasic2020>
        )!.nameOffsetX;
        (
            newAttrs as Exclude<
                ExternalStationAttributes[keyof ExternalStationAttributes],
                ShmetroBasic2020StationAttributes | undefined
            >
        ).nameOffsetY = graph.getNodeAttribute(
            selectedFirst,
            currentStnType as Exclude<StationType, StationType.ShmetroBasic2020>
        )!.nameOffsetY;
    }
    if (StationWithColor.includes(newStnType) && StationWithColor.includes(currentStnType)) {
        (newAttrs as AttributesWithColor).color = structuredClone(
            (graph.getNodeAttribute(selectedFirst, currentStnType) as AttributesWithColor)!.color
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
    newLinePathType: LinePathType
) => {
    const currentLinePathType = graph.getEdgeAttribute(selectedFirst, 'type');
    const currentLineStyleType = graph.getEdgeAttribute(selectedFirst, 'style');
    if (lineStyles[currentLineStyleType].metadata.supportLinePathType.includes(newLinePathType)) {
        graph.removeEdgeAttribute(selectedFirst, currentLinePathType);
        const newAttrs = structuredClone(linePaths[newLinePathType].defaultAttrs);
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
    lines: LineId[]
) =>
    lines
        .filter(edge => currentLinePathType === 'any' || graph.getEdgeAttribute(edge, 'type') === currentLinePathType)
        .forEach(edgeId => {
            changeLinePathType(graph, edgeId, newLinePathType);
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
        if (LineStylesWithColor.includes(currentLineStyleType) && LineStylesWithColor.includes(newLineStyleType))
            (newAttrs as AttributesWithColor).color = (oldAttrs as AttributesWithColor).color;
        else if (LineStylesWithColor.includes(newLineStyleType) && theme)
            (newAttrs as AttributesWithColor).color = theme;
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
        .filter(edge => LineStylesWithColor.includes(graph.getEdgeAttribute(edge, 'style')))
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
        if ((attrs as AttributesWithColor)['color'] !== undefined) {
            const color = (attrs as AttributesWithColor)['color'];
            if (
                currentColor === 'any' ||
                (color[0] == currentColor[0] &&
                    color[1] == currentColor[1] &&
                    color[2] == currentColor[2] &&
                    color[3] == currentColor[3])
            )
                (attrs as AttributesWithColor)['color'] = newColor;
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
