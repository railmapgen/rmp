import { Box, Button, Code, Flex, Heading, IconButton, VStack } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { nanoid } from 'nanoid';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdLink } from 'react-icons/md';
import { LineId } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { addSelected, clearSelected, refreshEdgesThunk, setMode } from '../../../redux/runtime/runtime-slice';
import { getAllLinesNeedToReconcile, reconcileLines } from '../../../util/reconcile';
import { lineStyles } from '../../svgs/lines/lines';

export default function ReconcileSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected, mode } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    if (selected.size !== 1 || !selectedFirst || !graph.current.hasEdge(selectedFirst)) return null;

    const { style, reconcileId } = graph.current.getEdgeAttributes(selectedFirst);
    const supportsReconcile = lineStyles[style]?.metadata.supportsReconcile;
    if (!supportsReconcile) return null;

    const isReconcileEnabled = reconcileId !== '';
    const isInReconcileMode = mode.startsWith('reconcile-');

    const handleReconcileSwitch = (val: boolean) => {
        if (val) {
            const existing = graph.current.getEdgeAttribute(selectedFirst, 'reconcileId');
            graph.current.setEdgeAttribute(selectedFirst, 'reconcileId', existing || nanoid(10));
        } else {
            graph.current.setEdgeAttribute(selectedFirst, 'reconcileId', '');
            if (mode.startsWith('reconcile-')) dispatch(setMode('free'));
        }
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    };

    const handleReconcileAssign = () => {
        if (!reconcileId) return;
        if (mode.startsWith('reconcile-')) dispatch(setMode('free'));
        else dispatch(setMode(`reconcile-${reconcileId}`));
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.info.reconcile'),
            isChecked: isReconcileEnabled,
            onChange: handleReconcileSwitch,
            oneLine: true,
            minW: 276,
        },
    ];

    if (isReconcileEnabled) {
        fields.push({
            type: 'custom',
            label: t('panel.details.info.reconcileId'),
            component: (
                <Box display="flex" alignItems="center" gap={1}>
                    <Code
                        flex={1}
                        fontSize="sm"
                        px={2}
                        py={1}
                        borderRadius="md"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        title={reconcileId}
                    >
                        {reconcileId}
                    </Code>
                    <IconButton
                        aria-label={t('panel.details.info.reconcileAssign')}
                        icon={<MdLink />}
                        size="sm"
                        variant={isInReconcileMode ? 'solid' : 'outline'}
                        colorScheme={isInReconcileMode ? 'blue' : 'gray'}
                        onClick={handleReconcileAssign}
                    />
                </Box>
            ),
            minW: 276,
        });

        // Ordered chain members (or unordered fallback when the chain is dangling)
        const groupEntries = getAllLinesNeedToReconcile(graph.current)[reconcileId] ?? [];
        let memberEdges: LineId[] = [];
        if (groupEntries.length >= 2) {
            const { allReconciledLines, danglingLines } = reconcileLines(graph.current, {
                [reconcileId]: groupEntries,
            });
            memberEdges = allReconciledLines[0]?.map(e => e.edge) ?? danglingLines;
        }
        if (memberEdges.length > 1) {
            fields.push({
                type: 'custom',
                label: t('panel.details.info.reconcileMembers'),
                component: (
                    <VStack alignItems="stretch" w="100%" spacing={0}>
                        {memberEdges.map(edgeId => {
                            const isCurrent = edgeId === selectedFirst;
                            return (
                                <Flex key={edgeId} w="100%" align="stretch">
                                    <Box
                                        w="4px"
                                        bg={isCurrent ? 'blue.500' : 'transparent'}
                                        transition="background-color 0.2s"
                                        flexShrink={0}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        fontFamily="mono"
                                        fontWeight={isCurrent ? 'semibold' : 'normal'}
                                        color={isCurrent ? 'blue.600' : undefined}
                                        onClick={() => {
                                            if (isCurrent) return;
                                            dispatch(clearSelected());
                                            dispatch(addSelected(edgeId));
                                        }}
                                        sx={{ borderRadius: 0, w: '100%', _focus: { boxShadow: 'none' } }}
                                        flex={1}
                                    >
                                        {edgeId}
                                    </Button>
                                </Flex>
                            );
                        })}
                    </VStack>
                ),
                minW: 276,
            });
        }
    }

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.info.reconcile')}
            </Heading>
            <RmgFields fields={fields} minW={130} />
        </Box>
    );
}
