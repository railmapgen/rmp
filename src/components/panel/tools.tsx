import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAddCircleOutline, MdHorizontalRule } from 'react-icons/md';
import { Flex, IconButton } from '@chakra-ui/react';
import { RmgSidePanelBody } from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMode } from '../../redux/runtime/runtime-slice';

const ToolsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const mode = useRootSelector(state => state.runtime.mode);

    const handleStation = () => dispatch(setMode('station'));
    const handleLine = () => dispatch(setMode('line'));

    return (
        <Flex direction="column" height="100%" width={50} overflow="hidden">
            <RmgSidePanelBody>
                <IconButton
                    aria-label={t('panel.tools.station')}
                    icon={<MdAddCircleOutline />}
                    onClick={handleStation}
                />
                <IconButton
                    aria-label={mode === 'line' ? t('panel.tools.inline') : t('panel.tools.line')}
                    icon={<MdHorizontalRule />}
                    onClick={handleLine}
                />
            </RmgSidePanelBody>
        </Flex>
    );
};

export default ToolsPanel;
