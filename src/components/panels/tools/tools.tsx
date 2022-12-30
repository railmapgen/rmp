import React from 'react';
import { Flex, IconButton } from '@chakra-ui/react';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setMode, setTheme } from '../../../redux/runtime/runtime-slice';
import { StationType } from '../../../constants/stations';
import { MiscNodeType } from '../../../constants/nodes';
import { LineType } from '../../../constants/lines';
import { MiscEdgeType } from '../../../constants/edges';
import stations from '../../svgs/stations/stations';
import miscNodes from '../../svgs/nodes/misc-nodes';
import lines from '../../svgs/lines/lines';
import miscEdges from '../../svgs/edges/misc-edges';
import ColourModal from '../colour-modal/colour-modal';
import ThemeButton from '../theme-button';

const ToolsPanel = () => {
    const dispatch = useRootDispatch();
    const { mode, theme } = useRootSelector(state => state.runtime);

    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));
    const handleLine = (type: LineType) => dispatch(setMode(`line-${type}`));
    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));
    const handleMiscEdge = (type: MiscEdgeType) => dispatch(setMode(`misc-edge-${type}`));

    return (
        <Flex className="tools" width={50} direction="column" overflow="auto">
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
            {Object.values(LineType).map(type => (
                <IconButton
                    key={type}
                    aria-label={type}
                    size="lg"
                    icon={lines[type].icon}
                    onClick={() => handleLine(type)}
                    variant={mode === `line-${type}` ? 'solid' : 'outline'}
                />
            ))}
            {Object.values(MiscEdgeType).map(type => (
                <IconButton
                    key={type}
                    aria-label={type}
                    size="lg"
                    icon={miscEdges[type].icon}
                    onClick={() => handleMiscEdge(type)}
                    variant={mode === `misc-edge-${type}` ? 'solid' : 'outline'}
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
