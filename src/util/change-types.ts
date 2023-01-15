import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import stations from '../components/svgs/stations/stations';

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
    graph.removeNodeAttribute(selectedFirst, currentStnType);
    const newAttrs = { ...stations[newStnType].defaultAttrs, names };
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
