import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshNodesThunk, refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';

/**
 * 时间线属性编辑区域。
 * 节点: "视为车站" 复选框
 * 边: "里程长度" 数值输入框
 */
export default function TimelineAttrsSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const { timelineFeatureEnabled } = useRootSelector(state => state.app.preference);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const refresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        if (graph.current.hasNode(selectedFirst)) {
            dispatch(refreshNodesThunk());
        }
        if (graph.current.hasEdge(selectedFirst)) {
            dispatch(refreshEdgesThunk());
        }
    }, [dispatch, selectedFirst]);

    if (!timelineFeatureEnabled) return null;
    graph.current = window.graph;

    if (selected.size !== 1) return null;

    const fields: RmgFieldsField[] = [];
    const isEdge = graph.current.hasEdge(selectedFirst);

    if (isEdge) {
        const mileage = graph.current.getEdgeAttribute(selectedFirst, 'mileage') ?? 1;

        fields.push({
            type: 'input',
            label: t('timeline.mileage', '里程长度'),
            variant: 'number',
            value: mileage.toString(),
            onChange: (val: string | number) => {
                graph.current.setEdgeAttribute(selectedFirst, 'mileage', parseFloat(String(val)) || 1);
                refresh();
            },
            minW: 276,
        });
    }

    if (fields.length === 0) return null;

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('timeline.attrs.title', '时间线属性')}
            </Heading>
            <RmgFields fields={fields} minW={130} />
        </Box>
    );
}
