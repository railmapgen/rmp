import {
    Badge,
    Box,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    Switch,
    Text,
    Tooltip,
    useStyleConfig,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeId } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import { isLinePolicyVisible } from '../../../util/line-path-availability';
import {
    MAX_PARALLEL_LINES_FREE,
    MAX_PARALLEL_LINES_PRO,
    ParallelLinePathAttributes,
    makeParallelIndex,
    supportsParallelLinePath,
} from '../../../util/parallel';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import stations from '../../svgs/stations/stations';
import InfoMultipleSection from './info-multiple-selection';
import LineTypeSection from './line-type-section';
import ReconcileSection from './reconcile-section';
import StationTypeSection from './station-type-section';

const ExportVisibilityField = (props: {
    label: string;
    proLabel: string;
    isChecked: boolean;
    isDisabled: boolean;
    onChange: (visible: boolean) => void;
}) => {
    const styles = useStyleConfig('RmgLabel');

    return (
        <FormControl aria-label={props.label} className="rmg-label__one-line" flex={1} minW={276} sx={styles}>
            <FormLabel size="xs">
                <HStack spacing="1">
                    <Text>{props.label}</Text>
                    {props.isDisabled && (
                        <Tooltip label={props.proLabel}>
                            <Badge color="gray.50" background="radial-gradient(circle, #3f5efb, #fc466b)">
                                PRO
                            </Badge>
                        </Tooltip>
                    )}
                </HStack>
            </FormLabel>
            <Switch
                isChecked={props.isChecked}
                isDisabled={props.isDisabled}
                onChange={({ target: { checked } }) => props.onChange(checked)}
            />
        </FormControl>
    );
};

export default function InfoSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        selected,
        count: { parallel: parallelLinesCount },
    } = useRootSelector(state => state.runtime);
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const selectedEdgeAttributes =
        selected.size === 1 && selectedFirst && graph.current.hasEdge(selectedFirst)
            ? graph.current.getEdgeAttributes(selectedFirst)
            : undefined;
    const isSelectedEdgePolicyVisible = selectedEdgeAttributes
        ? isLinePolicyVisible(selectedEdgeAttributes, mapEnabled, activeSubscriptions.RMP_CLOUD)
        : true;
    const selectedVisible = selectedFirst
        ? graph.current.hasNode(selectedFirst)
            ? graph.current.getNodeAttribute(selectedFirst, 'visible')
            : selectedEdgeAttributes
              ? selectedEdgeAttributes.visible && isSelectedEdgePolicyVisible
              : true
        : true;
    const isVisibilityPolicyRestricted = !!selectedEdgeAttributes && !isSelectedEdgePolicyVisible;

    const refreshSelectedElements = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));

        let hasNode = false;
        let hasEdge = false;
        selected.forEach(id => {
            if (graph.current.hasNode(id)) hasNode = true;
            if (graph.current.hasEdge(id)) hasEdge = true;
        });

        if (hasNode) dispatch(refreshNodesThunk());
        if (hasEdge) dispatch(refreshEdgesThunk());
    }, [dispatch, selected]);

    const handleVisibleChange = (visible: boolean) => {
        if (isVisibilityPolicyRestricted) return;
        if (graph.current.hasNode(selectedFirst)) graph.current.setNodeAttribute(selectedFirst, 'visible', visible);
        if (graph.current.hasEdge(selectedFirst)) graph.current.setEdgeAttribute(selectedFirst, 'visible', visible);
        refreshSelectedElements();
    };
    const handleZIndexChange = (val: number) => {
        const zIndex = Math.min(Math.max(val, -10), 10);
        if (graph.current.hasNode(selectedFirst)) graph.current.setNodeAttribute(selectedFirst, 'zIndex', zIndex);
        if (graph.current.hasEdge(selectedFirst)) graph.current.setEdgeAttribute(selectedFirst, 'zIndex', zIndex);
        refreshSelectedElements();
    };
    const handleParallelSwitch = (val: boolean, startFrom: 'from' | 'to') => {
        let parallelIndex = -1; // default to turn off
        if (val) {
            const attr = graph.current.getEdgeAttributes(selectedFirst);
            const [source, target] = graph.current.extremities(selectedFirst) as [NodeId, NodeId];
            parallelIndex = makeParallelIndex(graph.current, attr.type, source, target, startFrom);
        }
        handleParallelIndexChange(parallelIndex);
    };
    const handleParallelIndexChange = (parallelIndex: number) => {
        graph.current.setEdgeAttribute(selectedFirst, 'parallelIndex', parallelIndex);
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    };

    const identityFields: RmgFieldsField[] = [];
    const fields: RmgFieldsField[] = [];
    // deal with undefined, single and multiple selection
    if (selected.size === 0) {
        // add nothing as the details panel will be closed
    } else if (selected.size === 1) {
        identityFields.push({
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
                (parallelLinesCount > maximumParallelLines && parallelIndex < 0) || !supportsParallelLinePath(type);
            const isParallelInputDisabled = parallelLinesCount > maximumParallelLines && parallelIndex >= 0;
            fields.push({
                type: 'switch',
                label: t('panel.details.info.parallel'),
                isDisabled: isParallelSwitchDisabled,
                isChecked: parallelIndex >= 0,
                onChange: val => handleParallelSwitch(val, (attr[attr.type] as ParallelLinePathAttributes).startFrom),
                oneLine: true,
                minW: 276,
            });
            if (!isParallelSwitchDisabled && parallelIndex >= 0) {
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

            {identityFields.length > 0 && <RmgFields fields={identityFields} minW={130} />}
            {selected.size === 1 && (
                <ExportVisibilityField
                    label={t('panel.details.info.visible')}
                    proLabel={t('header.settings.pro')}
                    isChecked={selectedVisible}
                    isDisabled={isVisibilityPolicyRestricted}
                    onChange={handleVisibleChange}
                />
            )}
            {fields.length > 0 && <RmgFields fields={fields} minW={130} />}

            {selected.size === 1 &&
                selectedFirst!.startsWith('stn') &&
                graph.current.hasNode(selectedFirst) &&
                graph.current.getNodeAttribute(selectedFirst, 'type') in stations && <StationTypeSection />}

            {selected.size === 1 &&
                selectedFirst!.startsWith('line') &&
                graph.current.hasEdge(selectedFirst) &&
                graph.current.getEdgeAttribute(selectedFirst, 'type') in linePaths &&
                graph.current.getEdgeAttribute(selectedFirst, 'style') in lineStyles && (
                    <>
                        <ReconcileSection />
                        <LineTypeSection />
                    </>
                )}

            {selected.size > 1 && <InfoMultipleSection />}
        </Box>
    );
}
