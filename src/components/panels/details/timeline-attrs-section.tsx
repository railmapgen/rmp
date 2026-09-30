import { Box, Flex, Heading, Input, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAutoFixHigh } from 'react-icons/md';
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
    // 开关配色：选中=主题绿；未选中=中性灰
    const switchBg = useColorModeValue('rgb(44, 122, 123)', 'rgb(72, 187, 120)');

    const refresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        if (graph.current.hasNode(selectedFirst)) {
            dispatch(refreshNodesThunk());
        }
        if (graph.current.hasEdge(selectedFirst)) {
            dispatch(refreshEdgesThunk());
        }
    }, [dispatch, selectedFirst]);

    // 自动填充：当当前线段开启了 autoFillMileage 且真实地图可用时，按实际长度写入 mileage。
    React.useEffect(() => {
        if (!mapEnabled || selected.size !== 1 || !graph.current.hasEdge(selectedFirst)) return;
        const autoFill = graph.current.getEdgeAttribute(selectedFirst, 'autoFillMileage');
        // 旧线段可能没有该属性，默认开启以保持体验一致
        if (autoFill === false) return;
        const km = getEdgeMileageInKilometers(graph.current, selectedFirst as LineId);
        const rounded = Number(km.toFixed(1));
        const current = Number(graph.current.getEdgeAttribute(selectedFirst, 'mileage') ?? 0);
        if (Number.isFinite(rounded) && rounded > 0 && current !== rounded) {
            graph.current.setEdgeAttribute(selectedFirst, 'mileage', rounded);
            refresh();
        }
    }, [mapEnabled, selectedFirst, selected.size, graphRefresh, refresh]);

    if (!timelineFeatureEnabled) return null;
    graph.current = window.graph;

    if (selected.size !== 1) return null;

    const fields: RmgFieldsField[] = [];
    const isEdge = graph.current.hasEdge(selectedFirst);

    if (isEdge) {
        const mileage = graph.current.getEdgeAttribute(selectedFirst, 'mileage') ?? 1;
        // 每条线段独立的自动填充开关：旧线段未设置时默认开启
        const autoFillMileage = graph.current.getEdgeAttribute(selectedFirst, 'autoFillMileage') ?? true;
        const autoFillDisabled = !mapEnabled;
        // 视觉上的开启状态：未开启地理地图时即使属性为 true 也显示为关闭
        const autoFillOn = autoFillMileage && !autoFillDisabled;
        const autoFillLabel = t('timeline.mileageAutoFill', '按地图实际长度自动填充');
        const autoFillDisabledHint = t('timeline.mileageAutoFillDisabled', '需开启真实地图后才能按实际长度自动填充');

        fields.push({
            type: 'custom',
            label: t('timeline.mileage', '里程长度'),
            component: (
                <Flex width="100%" gap={2} align="center">
                    <Input
                        size="sm"
                        type="number"
                        step="0.1"
                        min={0}
                        value={Number(mileage).toFixed(1)}
                        isDisabled={autoFillOn}
                        onChange={e => {
                            graph.current.setEdgeAttribute(
                                selectedFirst,
                                'mileage',
                                Number((parseFloat(e.target.value) || 1).toFixed(1))
                            );
                            refresh();
                        }}
                    />
                    <Tooltip label={autoFillDisabled ? autoFillDisabledHint : autoFillLabel} placement="bottom">
                        <Box
                            as="button"
                            type="button"
                            role="switch"
                            aria-checked={autoFillOn}
                            aria-label={autoFillLabel}
                            flexShrink={0}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            px={2}
                            py={1.5}
                            borderRadius="md"
                            borderWidth={1}
                            borderStyle="solid"
                            borderColor={autoFillOn ? switchBg : 'gray.300'}
                            bg={autoFillOn ? switchBg : 'transparent'}
                            color={autoFillOn ? 'white' : 'gray.600'}
                            cursor={autoFillDisabled ? 'not-allowed' : 'pointer'}
                            opacity={autoFillDisabled ? 0.5 : 1}
                            _hover={
                                autoFillDisabled
                                    ? {}
                                    : {
                                          borderColor: autoFillOn ? switchBg : 'gray.400',
                                          bg: autoFillOn ? switchBg : 'gray.50',
                                      }
                            }
                            _focusVisible={{ outline: '2px solid', outlineColor: switchBg, outlineOffset: 1 }}
                            onClick={() => {
                                if (autoFillDisabled) return;
                                const next = !autoFillMileage;
                                graph.current.setEdgeAttribute(selectedFirst, 'autoFillMileage', next);
                                refresh();
                            }}
                        >
                            <MdAutoFixHigh size="14px" />
                        </Box>
                    </Tooltip>
                </Flex>
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
