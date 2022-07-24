import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAddCircleOutline, MdHorizontalRule } from 'react-icons/md';
import { Flex, IconButton } from '@chakra-ui/react';
import { RmgSidePanelBody } from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMode } from '../../redux/runtime/runtime-slice';
import { StationType } from '../../constants/stations';
import { LineType } from '../../constants/lines';
import stations from '../station/stations';
import lines from '../line/lines';

const ToolsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const mode = useRootSelector(state => state.runtime.mode);

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));
    const handleLine = (type: LineType) => dispatch(setMode(`line-${type}`));

    return (
        <Flex direction="column" height="100%" width={50} overflow="hidden">
            <RmgSidePanelBody>
                {Object.values(StationType).map(type => (
                    <IconButton
                        key={type}
                        aria-label={mode.startsWith('station') ? t('panel.tools.inline') : t('panel.tools.line')}
                        icon={stations[type].icon}
                        onClick={() => handleStation(type)}
                    />
                ))}
                {Object.values(LineType).map(type => (
                    <IconButton
                        key={type}
                        aria-label={mode.startsWith('line') ? t('panel.tools.inline') : t('panel.tools.line')}
                        icon={lines[type].icon}
                        onClick={() => handleLine(type)}
                    />
                ))}
            </RmgSidePanelBody>
        </Flex>
    );
};

export default ToolsPanel;
