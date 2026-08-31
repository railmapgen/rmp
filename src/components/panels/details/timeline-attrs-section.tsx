import { Box, Checkbox, Heading, HStack, Input } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshNodesThunk, refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';
import { getEdgeMileageInKilometers } from '../../../util/map-distance';
import { LineId } from '../../../constants/constants';

/**
 * 时间线属性编辑区域。
 * 节点: "视为车站" 复选框
 * 边: "里程长度" 数值输入框，旁边附带按地图实际长度自动填充的按钮
 */
export default function TimelineAttrsSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const { timelineFeatureEnabled } = useRootSelector(state => state.app.preference);
    const { mapEnabled } = useRootSelector(state => state.param.present);
    const graphRefresh = useRootSelector(state => state.runtime.refresh);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);
    const [isAutoFillEnabled, setIsAutoFillEnabled] = React.useState(false);

    const refresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        if (graph.current.hasNode(selectedFirst)) {
            dispatch(refreshNodesThunk());
        }
        if (graph.current.hasEdge(selectedFirst)) {
            dispatch(refreshEdgesThunk());
        }
    }, [dispatch, selectedFirst]);

    React.useEffect(() => {
        if (!mapEnabled) setIsAutoFillEnabled(false);
    }, [mapEnabled]);

    React.useEffect(() => {
        if (!isAutoFillEnabled || !mapEnabled || selected.size !== 1 || !graph.current.hasEdge(selectedFirst)) return;
        const km = getEdgeMileageInKilometers(graph.current, selectedFirst as LineId);
        const rounded = Number(km.toFixed(1));
        const current = Number(graph.current.getEdgeAttribute(selectedFirst, 'mileage') ?? 0);
        if (Number.isFinite(rounded) && rounded > 0 && current !== rounded) {
            graph.current.setEdgeAttribute(selectedFirst, 'mileage', rounded);
            refresh();
        }
    }, [isAutoFillEnabled, mapEnabled, selectedFirst, selected.size, graphRefresh, refresh]);

    if (!timelineFeatureEnabled) return null;
    graph.current = window.graph;

    if (selected.size !== 1) return null;

    const fields: RmgFieldsField[] = [];
    const isEdge = graph.current.hasEdge(selectedFirst);

    if (isEdge) {
        const mileage = graph.current.getEdgeAttribute(selectedFirst, 'mileage') ?? 1;
        const autoFillDisabled = !mapEnabled;
        const autoFillLabel = t('timeline.mileageAutoFill', '按地图实际长度自动填充');

        fields.push({
            type: 'custom',
            label: t('timeline.mileage', '里程长度'),
            component: (
                <HStack width="100%" spacing={2}>
                    <Input
                        size="sm"
                        type="number"
                        step="0.1"
                        value={Number(mileage).toFixed(1)}
                        onChange={e => {
                            graph.current.setEdgeAttribute(
                                selectedFirst,
                                'mileage',
                                Number((parseFloat(e.target.value) || 1).toFixed(1))
                            );
                            refresh();
                        }}
                    />
                    <Checkbox
                        size="sm"
                        isChecked={isAutoFillEnabled}
                        isDisabled={autoFillDisabled}
                        onChange={event => setIsAutoFillEnabled(event.target.checked)}
                        sx={{
                            '&[data-checked]': {
                                bg: 'rgb(44, 122, 123)',
                                color: 'white',
                            },
                        }}
                    >
                        {autoFillLabel}
                    </Checkbox>
                </HStack>
            ),
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
