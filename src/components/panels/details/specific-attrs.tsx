import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import miscNodes from '../../svgs/nodes/misc-nodes';
import stations from '../../svgs/stations/stations';

const nodes = { ...stations, ...miscNodes };

export const NodeSpecificAttributes = () => {
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const id = selected.at(0)!;

    const type = window.graph.getNodeAttribute(id, 'type');
    const AttrsComponent = nodes[type].attrsComponent;
    const attrs = (window.graph.getNodeAttribute(id, type) ?? {}) as any;

    const handleAttrsUpdate = (selectedFirst: string, attrs: any) => {
        const type = window.graph.getNodeAttribute(selectedFirst, 'type');
        window.graph.mergeNodeAttributes(selectedFirst, { [type]: attrs });
        dispatch(setRefreshNodes());
        dispatch(saveGraph(window.graph.export()));
    };

    return AttrsComponent && <AttrsComponent id={id} attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />;
};

export const LineSpecificAttributes = () => {
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const id = selected.at(0)!;

    const type = window.graph.getEdgeAttribute(id, 'type');
    const attrs = (window.graph.getEdgeAttribute(id, type) ?? {}) as any;
    const PathAttrsComponent = linePaths[type].attrsComponent;
    const style = window.graph.getEdgeAttribute(id, 'style');
    const styleAttrs = (window.graph.getEdgeAttribute(id, style) ?? {}) as any;
    const StyleAttrsComponent = lineStyles[style].attrsComponent;

    const handlePathAttrsUpdate = (id: string, attrs: any) => {
        window.graph.mergeEdgeAttributes(id, { [type]: attrs });
        dispatch(setRefreshEdges());
        dispatch(saveGraph(window.graph.export()));
    };

    const handleStyleAttrsUpdate = (id: string, attrs: any) => {
        window.graph.mergeEdgeAttributes(id, { [style]: attrs });
        dispatch(setRefreshEdges());
        dispatch(saveGraph(window.graph.export()));
    };

    return (
        <>
            {PathAttrsComponent && (
                <PathAttrsComponent id={id} attrs={attrs} handleAttrsUpdate={handlePathAttrsUpdate} />
            )}
            {StyleAttrsComponent && (
                <StyleAttrsComponent id={id} attrs={styleAttrs} handleAttrsUpdate={handleStyleAttrsUpdate} />
            )}
        </>
    );
};
