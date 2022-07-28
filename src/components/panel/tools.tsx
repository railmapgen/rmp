import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, IconButton } from '@chakra-ui/react';
import { RmgSidePanelBody } from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMode, setTheme } from '../../redux/runtime/runtime-slice';
import { StationType } from '../../constants/stations';
import { MiscNodeType } from '../../constants/node';
import { LineType } from '../../constants/lines';
import stations from '../station/stations';
import miscNodes from '../misc/misc-nodes';
import lines from '../line/lines';
import ColourModal from './colour-modal/colour-modal';
import ThemeButton from './theme-button';

const ToolsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { mode, theme } = useRootSelector(state => state.runtime);

    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));
    const handleLine = (type: LineType) => dispatch(setMode(`line-${type}`));
    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));

    return (
        <Flex direction="column" height="100%" width={50} overflow="hidden">
            <RmgSidePanelBody>
                {Object.values(StationType).map(type => (
                    <IconButton
                        key={type}
                        aria-label="Station"
                        icon={stations[type].icon}
                        onClick={() => handleStation(type)}
                    />
                ))}
                {Object.values(MiscNodeType).map(type => (
                    <IconButton
                        key={type}
                        aria-label="Misc Node"
                        icon={miscNodes[type].icon}
                        onClick={() => handleMiscNode(type)}
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
                <ThemeButton theme={theme} onClick={() => setIsModalOpen(true)} />
                <ColourModal
                    isOpen={isModalOpen}
                    defaultTheme={theme}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={nextTheme => dispatch(setTheme(nextTheme))}
                />
            </RmgSidePanelBody>
        </Flex>
    );
};

export default ToolsPanel;
