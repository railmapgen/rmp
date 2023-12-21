import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import stations from '../../svgs/stations/stations';
import InfoMultipleSection from './info-multiple-selection';
import LineTypeSection from './line-type-section';
import StationTypeSection from './station-type-section';

export default function InfoSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshEdges, saveGraph]);

    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const handleZIndexChange = (val: number) => {
        const zIndex = Math.min(Math.max(val, -5), 5);
        if (graph.current.hasNode(selectedFirst)) graph.current.setNodeAttribute(selectedFirst, 'zIndex', zIndex);
        if (graph.current.hasEdge(selectedFirst)) graph.current.setEdgeAttribute(selectedFirst, 'zIndex', zIndex);
        hardRefresh();
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
            options: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i - 5, (i - 5).toString()])),
            onChange: val => handleZIndexChange(Number(val)),
        });
    } else if (selected.size > 1) {
        fields.push({
            type: 'input',
            label: t('panel.details.info.type'),
            value: 'multiple selection',
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
