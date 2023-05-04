import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { LinePathType, LineStyleType } from '../constants/lines';
import stations from '../components/svgs/stations/stations';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';

const StationsWithoutNameOffset = [StationType.ShmetroBasic2020];

/**
 * Change a station's type.
 * @param graph Graph.
 * @param selectedFirst Current station's id.
 * @param newType New station's type.
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
 * Change a line's path type.
 * @param graph Graph.
 * @param selectedFirst Current line's id.
 * @param newType New line's path type.
 */
export const changeLinePathType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selectedFirst: string,
    newLinePathType: LinePathType
) => {
    const currentLinePathType = graph.getEdgeAttribute(selectedFirst, 'type') as LinePathType;
    graph.removeEdgeAttribute(selectedFirst, currentLinePathType);
    const newAttrs = JSON.parse(JSON.stringify(linePaths[newLinePathType].defaultAttrs));
    graph.mergeEdgeAttributes(selectedFirst, { type: newLinePathType, [newLinePathType]: newAttrs });
};

/**
 * Change a line's style type.
 * @param graph Graph.
 * @param selectedFirst Current line's id.
 * @param newType New line's style type.
 * @param theme A handy helper to override color to current theme.
 */
export const changeLineStyleType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selectedFirst: string,
    newLineStyleType: LineStyleType,
    theme?: Theme
) => {
    const currentLineStyleType = graph.getEdgeAttribute(selectedFirst, 'style') as LineStyleType;
    graph.removeEdgeAttribute(selectedFirst, currentLineStyleType);
    const newAttrs = JSON.parse(JSON.stringify(lineStyles[newLineStyleType].defaultAttrs));
    if (newLineStyleType === LineStyleType.SingleColor && theme) (newAttrs as SingleColorAttributes).color = theme;
    graph.mergeEdgeAttributes(selectedFirst, { style: newLineStyleType, [newLineStyleType]: newAttrs });
    if (newLineStyleType === LineStyleType.River) graph.setEdgeAttribute(selectedFirst, 'zIndex', -5);
    else graph.setEdgeAttribute(selectedFirst, 'zIndex', 0);
};
