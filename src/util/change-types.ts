import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes, Theme } from '../constants/constants';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { LinePathType, LineStyleType, LineStylesWithColor } from '../constants/lines';
import stations from '../components/svgs/stations/stations';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import { AttributesWithColor } from '../components/panels/details/color-field';

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
    const names = graph.getNodeAttribute(selectedFirst, currentStnType)!.names;
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
    graph.removeNodeAttribute(selectedFirst, currentStnType);
    graph.mergeNodeAttributes(selectedFirst, { type: newStnType, [newStnType]: newAttrs });
};

/**
 * Change all the stations' type of currentStnType to newStnType in batch.
 * @param graph Graph.
 * @param currentStnType Current station's type.
 * @param newStnType New station's type.
 * @returns Nothing.
 */
export const changeStationsTypeInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentStnType: StationType,
    newStnType: StationType
) =>
    graph
        .filterNodes((node, attr) => node.startsWith('stn') && attr.type === currentStnType)
        .forEach(stnId => {
            changeStationType(graph, stnId, newStnType);
        });

/**
 * Change all the lines' style type of currentLineStyleType to newLineStyleType in batch.
 * @param graph Graph.
 * @param currentLineStyleType Current lines' type.
 * @param newLineStyleType New lines' type.
 * @param theme New theme.
 * @returns Nothing.
 */
export const changeLineStyleTypeInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentLineStyleType: LineStyleType,
    newLineStyleType: LineStyleType,
    theme: Theme
) =>
    graph
        .filterEdges(edge => graph.getEdgeAttribute(edge, 'style') === currentLineStyleType)
        .forEach(edgeId => {
            changeLineStyleType(graph, edgeId, newLineStyleType, theme);
        });

/**
 * Change selected lines' style type to newLineStyleType in batch.
 * @param graph Graph.
 * @param selected Selected.
 * @param newLineStyleType New lines' type.
 * @param theme New theme.
 * @returns Nothing.
 */
export const changeLineStyleTypeSelected = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selected: Set<Id>,
    newLineStyleType: LineStyleType,
    theme: Theme
) =>
    [...selected]
        .filter(id => id.startsWith('line'))
        .forEach(id => {
            changeLineStyleType(graph, id, newLineStyleType, theme);
        });

/**
 * Change selected lines' path type to newLineStyleType in batch.
 * @param graph Graph.
 * @param selected Selected.
 * @param newLinePathType New lines' type.
 * @returns Nothing.
 */
export const changeLinePathTypeSelected = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selected: Set<Id>,
    newLinePathType: LinePathType
) =>
    [...selected]
        .filter(id => id.startsWith('line'))
        .forEach(id => {
            changeLinePathType(graph, id, newLinePathType);
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
    graph.removeEdgeAttribute(selectedFirst, currentLinePathType);
    const newAttrs = structuredClone(linePaths[newLinePathType].defaultAttrs);
    graph.mergeEdgeAttributes(selectedFirst, { type: newLinePathType, [newLinePathType]: newAttrs });
};

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
    const currentLineStyleType = graph.getEdgeAttribute(selectedFirst, 'style');
    const oldAttrs = graph.getEdgeAttribute(selectedFirst, currentLineStyleType);
    graph.removeEdgeAttribute(selectedFirst, currentLineStyleType);
    const newAttrs = structuredClone(lineStyles[newLineStyleType].defaultAttrs);
    if (LineStylesWithColor.includes(currentLineStyleType) && LineStylesWithColor.includes(newLineStyleType))
        (newAttrs as AttributesWithColor).color = (oldAttrs as AttributesWithColor).color;
    else if (LineStylesWithColor.includes(newLineStyleType) && theme) (newAttrs as AttributesWithColor).color = theme;
    graph.mergeEdgeAttributes(selectedFirst, { style: newLineStyleType, [newLineStyleType]: newAttrs });
    if (newLineStyleType === LineStyleType.River) graph.setEdgeAttribute(selectedFirst, 'zIndex', -5);
    else graph.setEdgeAttribute(selectedFirst, 'zIndex', 0);
};

export const changeLinesColorInBatch = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currentLineColor: Theme,
    newLineColor: Theme
) =>
    graph
        .filterEdges(edge => LineStylesWithColor.includes(graph.getEdgeAttribute(edge, 'style')))
        .forEach(edge => {
            const attr = graph.getEdgeAttributes(edge);
            const color = (attr[attr.style] as AttributesWithColor).color;
            if (
                color[0] == currentLineColor[0] &&
                color[1] == currentLineColor[1] &&
                color[2] == currentLineColor[2] &&
                color[3] == currentLineColor[3]
            ) {
                graph.mergeEdgeAttributes(edge, { [attr.style]: { color: newLineColor } });
            }
        });
