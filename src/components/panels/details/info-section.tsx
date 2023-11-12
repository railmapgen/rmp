import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootSelector, useRootDispatch } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefreshNodes, setRefreshEdges } from '../../../redux/runtime/runtime-slice';
import StationTypeSection from './station-type-section';
import LineTypeSection from './line-type-section';
import { MiscNodeType } from '../../../constants/nodes';
import { StationAttributes } from '../../../constants/stations';

export default function InfoSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshEdges, saveGraph]);

    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const handleZIndexChange = (val: number) => {
        const zIndex = Math.min(Math.max(val, -5), 5);
        if (graph.current.hasNode(selectedFirst)) graph.current.setNodeAttribute(selectedFirst, 'zIndex', zIndex);
        if (graph.current.hasEdge(selectedFirst)) graph.current.setEdgeAttribute(selectedFirst, 'zIndex', zIndex);
        hardRefresh();
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.info.id'),
            value: selected.length > 0 ? selected.join(', ') : 'undefined',
            minW: 276,
        },
        {
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
        },
    ];
    const selectField: RmgFieldsField[] = [];

    // deal with undefined and multiple selection
    if (selected.length === 0) {
        // do nothing as the details panel will be closed
    } else if (selected.length > 1) {
        fields.push({
            type: 'input',
            label: t('panel.details.info.type'),
            value: 'multiple selection',
            minW: 276,
        });
        selected.forEach(node => {
            const value = node.startsWith('stn')
                ? (
                      graph.current.getNodeAttributes(node)[
                          graph.current.getNodeAttributes(node).type
                      ] as StationAttributes
                  ).names[0] +
                  '/' +
                  (
                      graph.current.getNodeAttributes(node)[
                          graph.current.getNodeAttributes(node).type
                      ] as StationAttributes
                  ).names[1]
                : graph.current.getNodeAttributes(node).type;
            selectField.push({
                type: 'input',
                label: node,
                value: value,
            });
        });
    }

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.info.title')}
            </Heading>

            <RmgFields fields={fields} minW={130} />

            {selected.length === 1 && selectedFirst!.startsWith('stn') && graph.current.hasNode(selectedFirst) && (
                <StationTypeSection />
            )}

            {selected.length === 1 && selectedFirst!.startsWith('line') && graph.current.hasEdge(selectedFirst) && (
                <LineTypeSection />
            )}

            {selected.length > 1 && (
                <>
                    <Heading as="h5" size="sm">
                        {t('Selected Objects')} ({selected.length})
                    </Heading>
                    <RmgFields fields={selectField} minW={130} />
                </>
            )}
        </Box>
    );
}
