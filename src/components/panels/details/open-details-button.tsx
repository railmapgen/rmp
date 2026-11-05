import { Button, Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdEdit } from 'react-icons/md';
import { MiscNodeType } from '../../../constants/nodes';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { showDetailsPanel } from '../../../redux/runtime/runtime-slice';
import { isPortraitClient, isTouchClient } from '../../../util/helpers';
import { linePaths } from '../../svgs/lines/lines';
import miscNodes from '../../svgs/nodes/misc-nodes';
import stations from '../../svgs/stations/stations';

export default function OpenDetailsButton() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected, isDetailsOpen } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);
    const background = useColorModeValue('white', 'gray.800');
    const color = useColorModeValue('black', 'white');
    const hoverBackground = useColorModeValue('blue.50', 'gray.700');

    if (!(isPortraitClient() || isTouchClient()) || isDetailsOpen !== 'hide') return null;

    const [selectedFirst] = selected;
    let icon = <MdEdit />;
    if (selected.size === 1 && graph.current.hasNode(selectedFirst)) {
        const { type } = graph.current.getNodeAttributes(selectedFirst);
        icon = stations[type as StationType]?.icon ?? miscNodes[type as MiscNodeType]?.icon ?? icon;
    } else if (selected.size === 1 && graph.current.hasEdge(selectedFirst)) {
        icon = linePaths[graph.current.getEdgeAttribute(selectedFirst, 'type')]?.icon ?? icon;
    }

    return (
        <Button
            aria-label={t('open details panel')}
            onClick={() => dispatch(showDetailsPanel())}
            style={{
                position: 'fixed',
                bottom: 140,
                right: 0,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
            }}
            colorScheme="blue"
            variant="outline"
            borderWidth="2.5px"
            borderColor="blue.500"
            bg={background}
            color={color}
            _hover={{ bg: hoverBackground }}
            flexDirection="column"
            gap="6px"
            width="48px"
            minWidth="48px"
            height="auto"
            minHeight="48px"
            px="6px"
            pt="14px"
            pb="10px"
            borderRadius="16px"
            sx={{ '& > svg': { width: '32px', height: '32px', flexShrink: 0, pointerEvents: 'none' } }}
        >
            <Text
                as="span"
                fontSize="14px"
                lineHeight="1"
                fontWeight="normal"
                sx={{ writingMode: 'vertical-rl', textOrientation: 'sideways', transform: 'rotate(180deg)' }}
            >
                {t('panel.details.header')}
            </Text>
            {icon}
        </Button>
    );
}
