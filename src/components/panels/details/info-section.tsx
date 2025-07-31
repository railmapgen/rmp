import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MiscNodeId, StnId } from '../../../constants/constants';
import { LinePathType } from '../../../constants/lines';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import {
    MAX_PARALLEL_LINES_FREE,
    MAX_PARALLEL_LINES_PRO,
    NonSimpleLinePathAttributes,
    makeParallelIndex,
} from '../../../util/parallel';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import stations from '../../svgs/stations/stations';
import InfoMultipleSection from './info-multiple-selection';
import LineTypeSection from './line-type-section';
import StationTypeSection from './station-type-section';

export default function InfoSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph]);

    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        selected,
        count: { parallel: parallelLinesCount },
    } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const handleZIndexChange = (val: number) => {
        const zIndex = Math.min(Math.max(val, -10), 10);
        if (graph.current.hasNode(selectedFirst)) graph.current.setNodeAttribute(selectedFirst, 'zIndex', zIndex);
        if (graph.current.hasEdge(selectedFirst)) graph.current.setEdgeAttribute(selectedFirst, 'zIndex', zIndex);
        hardRefresh();
    };
    const handleParallelSwitch = (val: boolean, startFrom: 'from' | 'to') => {
        let parallelIndex = -1; // default to turn off
        if (val) {
            const attr = graph.current.getEdgeAttributes(selectedFirst);
            const [source, target] = graph.current.extremities(selectedFirst) as [
                StnId | MiscNodeId,
                StnId | MiscNodeId,
            ];
            parallelIndex = makeParallelIndex(graph.current, attr.type, source, target, startFrom);
        }
        handleParallelIndexChange(parallelIndex);
    };
    const handleParallelIndexChange = (parallelIndex: number) => {
        graph.current.setEdgeAttribute(selectedFirst, 'parallelIndex', parallelIndex);
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    };

    const fields: RmgFieldsField[] = [];
    // deal with undefined, single and multiple selection
    if (selected.size === 0) {
        // add nothing as the details panel will be closed
    } else if (selected.size === 1) {
        fields.push({
            type: 'input',
            label: t('panel.details.info.id'),
            value: selectedFirst!,
            minW: 276,
        });
        fields.push({
            type: 'select',
            label: t('panel.details.info.zIndex'),
            value: selectedFirst
                ? graph.current.hasNode(selectedFirst)
                    ? graph.current.getNodeAttribute(selectedFirst, 'zIndex')
                    : graph.current.hasEdge(selectedFirst)
                      ? graph.current.getEdgeAttribute(selectedFirst, 'zIndex')
                      : 0
                : 0,
            options: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i - 10, (i - 10).toString()])),
            onChange: val => handleZIndexChange(Number(val)),
        });
        if (graph.current.hasEdge(selectedFirst)) {
            const attr = graph.current.getEdgeAttributes(selectedFirst);
            const { parallelIndex, type } = attr;
            const maximumParallelLines = activeSubscriptions.RMP_CLOUD
                ? MAX_PARALLEL_LINES_PRO
                : MAX_PARALLEL_LINES_FREE;
            const isParallelSwitchDisabled =
                (parallelLinesCount > maximumParallelLines && parallelIndex < 0) || type === LinePathType.Simple;
            const isParallelInputDisabled = parallelLinesCount > maximumParallelLines && parallelIndex >= 0;
            fields.push({
                type: 'switch',
                label: t('panel.details.info.parallel'),
                isDisabled: isParallelSwitchDisabled,
                isChecked: parallelIndex >= 0,
                onChange: val => handleParallelSwitch(val, (attr[attr.type] as NonSimpleLinePathAttributes).startFrom),
                oneLine: true,
                minW: 276,
            });
            if (parallelIndex >= 0) {
                fields.push({
                    type: 'input',
                    label: t('panel.details.info.parallelIndex'),
                    variant: 'number',
                    isDisabled: isParallelInputDisabled,
                    value: attr.parallelIndex.toString(),
                    onChange: val => handleParallelIndexChange(Number(val)),
                    minW: 276,
                });
            }
        }
    } else if (selected.size > 1) {
        fields.push({
            type: 'input',
            label: t('panel.details.info.type'),
            value: t('panel.details.multipleSelection.title'),
            minW: 276,
        });
    }

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.info.title')}
            </Heading>

            <RmgFields fields={fields} minW={130} />

            {selected.size === 1 &&
                selectedFirst!.startsWith('stn') &&
                graph.current.hasNode(selectedFirst) &&
                graph.current.getNodeAttribute(selectedFirst, 'type') in stations && <StationTypeSection />}

            {selected.size === 1 &&
                selectedFirst!.startsWith('line') &&
                graph.current.hasEdge(selectedFirst) &&
                graph.current.getEdgeAttribute(selectedFirst, 'type') in linePaths &&
                graph.current.getEdgeAttribute(selectedFirst, 'style') in lineStyles && <LineTypeSection />}

            {selected.size > 1 && <InfoMultipleSection />}
        </Box>
    );
}
