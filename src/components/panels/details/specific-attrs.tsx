import { Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, NodeId } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import { makeParallelIndex } from '../../../util/parallel';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import miscNodes from '../../svgs/nodes/misc-nodes';
import stations from '../../svgs/stations/stations';

const nodes = { ...stations, ...miscNodes };

export const NodeSpecificAttributes = () => {
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();
    const [id] = selected;

    const type = window.graph.getNodeAttribute(id, 'type');
    const AttrsComponent = type in nodes && (nodes[type].attrsComponent as React.FC<AttrsProps<any>>);
    const attrs = (window.graph.getNodeAttribute(id, type) ?? {}) as any;

    const handleAttrsUpdate = (selectedFirst: string, attrs: any) => {
        const type = window.graph.getNodeAttribute(selectedFirst, 'type');
        window.graph.mergeNodeAttributes(selectedFirst, { [type]: attrs });
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
    };

    return AttrsComponent ? (
        <AttrsComponent id={id} attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />
    ) : (
        <Text fontSize="xs" m="var(--chakra-space-1)">
            {t('panel.details.unknown.error', { category: t('panel.details.unknown.node') })}
        </Text>
    );
};

export const LineSpecificAttributes = () => {
    const dispatch = useRootDispatch();
    const {
        preference: { autoParallel },
    } = useRootSelector(state => state.app);
    const { selected } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();
    const [id] = selected;

    const { type, style, parallelIndex, reconcileId } = window.graph.getEdgeAttributes(id);
    const attrs = (window.graph.getEdgeAttribute(id, type) ?? {}) as any;
    const PathAttrsComponent = type in linePaths && linePaths[type].attrsComponent;
    const styleAttrs = (window.graph.getEdgeAttribute(id, style) ?? {}) as any;
    const StyleAttrsComponent = style in lineStyles && lineStyles[style].attrsComponent;

    const recalculateParallelIndex = (id: string, startFrom: 'from' | 'to') => {
        let parallelIndex = -1;
        if (autoParallel) {
            const [source, target] = window.graph.extremities(id) as [NodeId, NodeId];
            parallelIndex = makeParallelIndex(window.graph, type, source, target, startFrom);
        }
        window.graph.setEdgeAttribute(id, 'parallelIndex', parallelIndex);
    };
    const handlePathAttrsUpdate = (id: string, attrs: any) => {
        window.graph.mergeEdgeAttributes(id, { [type]: attrs });
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshEdgesThunk());
    };

    const handleStyleAttrsUpdate = (id: string, attrs: any) => {
        window.graph.mergeEdgeAttributes(id, { [style]: attrs });
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshEdgesThunk());
    };

    return (
        <>
            {PathAttrsComponent ? (
                <PathAttrsComponent
                    id={id}
                    attrs={attrs}
                    recalculateParallelIndex={recalculateParallelIndex}
                    handleAttrsUpdate={handlePathAttrsUpdate}
                    parallelIndex={parallelIndex}
                />
            ) : (
                <Text fontSize="xs" m="var(--chakra-space-1)">
                    {t('panel.details.unknown.error', { category: t('panel.details.unknown.linePath') })}
                </Text>
            )}
            {StyleAttrsComponent ? (
                <StyleAttrsComponent
                    id={id}
                    attrs={styleAttrs}
                    handleAttrsUpdate={handleStyleAttrsUpdate}
                    reconcileId={reconcileId}
                />
            ) : (
                <Text fontSize="xs" m="var(--chakra-space-1)">
                    {t('panel.details.unknown.error', { category: t('panel.details.unknown.lineStyle') })}
                </Text>
            )}
        </>
    );
};
