import React from 'react';
import { Flex, IconButton } from '@chakra-ui/react';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setMode, setTheme } from '../../../redux/runtime/runtime-slice';
import { StationType } from '../../../constants/stations';
import { MiscNodeType } from '../../../constants/nodes';
import { LinePathType } from '../../../constants/lines';
import stations from '../../svgs/stations/stations';
import miscNodes from '../../svgs/nodes/misc-nodes';
import { linePaths } from '../../svgs/lines/lines';
import ColourModal from '../colour-modal/colour-modal';
import ThemeButton from '../theme-button';

const ToolsPanel = () => {
    const dispatch = useRootDispatch();
    const { mode, theme } = useRootSelector(state => state.runtime);

    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));
    const handleLine = (type: LinePathType) => dispatch(setMode(`line-${type}`));
    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));

    return (
        <Flex className="tools" width={50} direction="column" overflow="auto">
            {Object.values(LinePathType).map(type => (
                <IconButton
                    key={type}
                    aria-label={type}
                    size="lg"
                    icon={linePaths[type].icon}
                    onClick={() => handleLine(type)}
                    variant={mode === `line-${type}` ? 'solid' : 'outline'}
                />
            ))}
            {Object.values(StationType).map(type => (
                <IconButton
                    key={type}
                    aria-label={type}
                    size="lg"
                    icon={stations[type].icon}
                    onClick={() => handleStation(type)}
                    variant={mode === `station-${type}` ? 'solid' : 'outline'}
                />
            ))}
            {Object.values(MiscNodeType).map(type => (
                <IconButton
                    key={type}
                    aria-label={type}
                    size="lg"
                    icon={miscNodes[type].icon}
                    onClick={() => handleMiscNode(type)}
                    variant={mode === `misc-node-${type}` ? 'solid' : 'outline'}
                />
            ))}
            <ThemeButton theme={theme} onClick={() => setIsModalOpen(true)} />
            <ColourModal
                isOpen={isModalOpen}
                defaultTheme={theme}
                onClose={() => setIsModalOpen(false)}
                onUpdate={nextTheme => dispatch(setTheme(nextTheme))}
            />
        </Flex>
    );
};

export default ToolsPanel;
