import { useEffect, useRef } from 'react';
import { useRootDispatch } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import { syncCurrentNodeVersion } from './timeline';

/**
 * This hook register the events callback of window.graph
 * and serialize the graph into state.param.graph.
 */
export const useGraphEvents = () => {
    const dispatch = useRootDispatch();
    const graph = useRef(window.graph);

    useEffect(() => {
        function onEvent(nodeId?: string) {
            if (nodeId && window.graph.hasNode(nodeId)) {
                syncCurrentNodeVersion(window.graph, nodeId);
            }
            dispatch(saveGraph(window.graph.export()));
        }

        // Add event listener
        graph.current.on('nodeAdded', onEvent);
        graph.current.on('edgeAdded', onEvent);
        graph.current.on('nodeAttributesUpdated', onEvent);
        graph.current.on('edgeAttributesUpdated', onEvent);

        // Call handler right away so state gets updated with initial window size
        onEvent(undefined);

        // Remove only the listeners registered by this hook
        return () => {
            graph.current.off('nodeAdded', onEvent);
            graph.current.off('edgeAdded', onEvent);
            graph.current.off('nodeAttributesUpdated', onEvent);
            graph.current.off('edgeAttributesUpdated', onEvent);
        };
    }, []); // Empty array ensures that effect is only run on mount
};
