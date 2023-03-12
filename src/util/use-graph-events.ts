import { useEffect, useRef } from 'react';
import { useRootDispatch } from '../redux';
import { saveGraph } from '../redux/param/param-slice';

/**
 * This hook register the events callback of window.graph
 * and serialize the graph into state.param.graph.
 */
export const useGraphEvents = () => {
    const dispatch = useRootDispatch();
    const graph = useRef(window.graph);

    useEffect(() => {
        function onEvent(payload: any) {
            dispatch(saveGraph(graph.current.export()));
        }

        // Add event listener
        graph.current.on('nodeAdded', onEvent);
        graph.current.on('edgeAdded', onEvent);
        graph.current.on('nodeAttributesUpdated', onEvent);
        graph.current.on('edgeAttributesUpdated', onEvent);

        // Call handler right away so state gets updated with initial window size
        onEvent(undefined);

        // Remove event listener on cleanup
        return () => {
            graph.current.removeAllListeners();
        };
    }, []); // Empty array ensures that effect is only run on mount
};
