import { Box, Heading, Input } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';

type CoordinateAxis = 'x' | 'y';

const isValidCoordinate = (value: string) => value.trim() !== '' && Number.isFinite(Number(value));

export default function NodePositionSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph]);
    const {
        selected,
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const [pos, setPos] = React.useState({ x: 0, y: 0 });
    const [draft, setDraft] = React.useState({ x: '0', y: '0' });
    React.useEffect(() => {
        if (selectedFirst?.startsWith('stn') || selectedFirst?.startsWith('misc_node_')) {
            const x = graph.current.getNodeAttribute(selectedFirst, 'x');
            const y = graph.current.getNodeAttribute(selectedFirst, 'y');
            setPos({ x, y });
            setDraft({ x: x.toString(), y: y.toString() });
        }
    }, [refreshNodes, selectedFirst]);

    const handleDraftChange = React.useCallback((axis: CoordinateAxis, value: string) => {
        setDraft(prev => ({ ...prev, [axis]: value }));
    }, []);

    const handleCoordinateCommit = React.useCallback(
        (axis: CoordinateAxis) => {
            if (!(selectedFirst?.startsWith('stn') || selectedFirst?.startsWith('misc_node_'))) {
                return;
            }

            const value = draft[axis];
            if (!isValidCoordinate(value)) {
                setDraft(prev => ({ ...prev, [axis]: pos[axis].toString() }));
                return;
            }

            const next = Number(value);
            setPos(prev => ({ ...prev, [axis]: next }));
            setDraft(prev => ({ ...prev, [axis]: next.toString() }));

            if (next === pos[axis]) {
                return;
            }

            graph.current.mergeNodeAttributes(selectedFirst, { [axis]: next });
            hardRefresh();
        },
        [draft, hardRefresh, pos, selectedFirst]
    );

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.nodePosition.pos.x'),
            component: (
                <Input
                    variant="flushed"
                    size="sm"
                    h={6}
                    value={draft.x}
                    isInvalid={!isValidCoordinate(draft.x)}
                    onChange={event => handleDraftChange('x', event.target.value)}
                    onBlur={() => handleCoordinateCommit('x')}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
            ),
        },
        {
            type: 'custom',
            label: t('panel.details.nodePosition.pos.y'),
            component: (
                <Input
                    variant="flushed"
                    size="sm"
                    h={6}
                    value={draft.y}
                    isInvalid={!isValidCoordinate(draft.y)}
                    onChange={event => handleDraftChange('y', event.target.value)}
                    onBlur={() => handleCoordinateCommit('y')}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
            ),
        },
    ];

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.nodePosition.title')}
            </Heading>

            <RmgFields fields={fields} minW={130} />
        </Box>
    );
}
