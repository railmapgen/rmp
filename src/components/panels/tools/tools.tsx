import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Button,
    Flex,
    SystemStyleObject,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
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

const buttonStyle: SystemStyleObject = {
    justifyContent: 'flex-start',
    p: 0,
    w: '100%',
    h: 10,
};

const accordionButtonStyle: SystemStyleObject = {
    p: 2.5,
    h: 10,
};

const accordionPanelStyle: SystemStyleObject = {
    p: 0,
    display: 'flex',
    flexDirection: 'column',
};

const ToolsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { mode, theme } = useRootSelector(state => state.runtime);
    const bgColor = useColorModeValue('white', 'gray.800');

    const [isToolsExpanded, setIsToolsExpanded] = React.useState(true);
    const [isColourModalOpen, setIsColourModalOpen] = React.useState(false);

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));
    const handleLine = (type: LinePathType) => dispatch(setMode(`line-${type}`));
    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));

    return (
        <Flex
            flexShrink="0"
            direction="column"
            width={isToolsExpanded ? 450 : 10}
            maxWidth="100%"
            height="100%"
            bg={bgColor}
            zIndex="5"
            transition="width 0.3s ease-in-out"
        >
            <Button
                aria-label="Menu"
                leftIcon={
                    isToolsExpanded ? (
                        <MdExpandMore size={40} transform="rotate(90)" />
                    ) : (
                        <MdExpandLess size={40} transform="rotate(90)" />
                    )
                }
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                sx={buttonStyle}
            >
                {isToolsExpanded ? t('panel.tools.showLess') : undefined}
            </Button>

            <Flex className="tools" overflow="auto">
                <Accordion width="100%" allowMultiple defaultIndex={[0, 1, 2]}>
                    <AccordionItem>
                        <AccordionButton sx={accordionButtonStyle}>
                            {isToolsExpanded && (
                                <Box as="span" flex="1" textAlign="left">
                                    {t('panel.tools.section.lineDrawing')}
                                </Box>
                            )}
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            <Flex>
                                <ThemeButton theme={theme} onClick={() => setIsColourModalOpen(true)} />
                                <Text fontWeight="600" pl="1" alignSelf="center">
                                    {isToolsExpanded ? t('color') : undefined}
                                </Text>
                            </Flex>
                            <ColourModal
                                isOpen={isColourModalOpen}
                                defaultTheme={theme}
                                onClose={() => setIsColourModalOpen(false)}
                                onUpdate={nextTheme => dispatch(setTheme(nextTheme))}
                            />

                            {Object.values(LinePathType)
                                .filter(type => type !== LinePathType.Simple)
                                .map(type => (
                                    <Button
                                        key={type}
                                        aria-label={type}
                                        leftIcon={linePaths[type].icon}
                                        onClick={() => handleLine(type)}
                                        variant={mode === `line-${type}` ? 'solid' : 'outline'}
                                        sx={buttonStyle}
                                    >
                                        {isToolsExpanded ? t(linePaths[type].metadata.displayName) : undefined}
                                    </Button>
                                ))}
                            <Button
                                aria-label={MiscNodeType.Virtual}
                                leftIcon={miscNodes[MiscNodeType.Virtual].icon}
                                onClick={() => handleMiscNode(MiscNodeType.Virtual)}
                                variant={mode === `misc-node-${MiscNodeType.Virtual}` ? 'solid' : 'outline'}
                                sx={buttonStyle}
                            >
                                {isToolsExpanded ? t(miscNodes[MiscNodeType.Virtual].metadata.displayName) : undefined}
                            </Button>
                        </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                        <AccordionButton sx={accordionButtonStyle}>
                            {isToolsExpanded && (
                                <Box as="span" flex="1" textAlign="left">
                                    {t('panel.tools.section.stations')}
                                </Box>
                            )}
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            {Object.values(StationType).map(type => (
                                <Button
                                    key={type}
                                    aria-label={type}
                                    leftIcon={stations[type].icon}
                                    onClick={() => handleStation(type)}
                                    variant={mode === `station-${type}` ? 'solid' : 'outline'}
                                    sx={buttonStyle}
                                >
                                    {isToolsExpanded ? t(stations[type].metadata.displayName) : undefined}
                                </Button>
                            ))}
                        </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                        <AccordionButton sx={accordionButtonStyle}>
                            {isToolsExpanded && (
                                <Box as="span" flex="1" textAlign="left">
                                    {t('panel.tools.section.miscellaneousNodes')}
                                </Box>
                            )}
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            {Object.values(MiscNodeType)
                                .filter(type => type !== MiscNodeType.Virtual)
                                .map(type => (
                                    <Button
                                        key={type}
                                        aria-label={type}
                                        leftIcon={miscNodes[type].icon}
                                        onClick={() => handleMiscNode(type)}
                                        variant={mode === `misc-node-${type}` ? 'solid' : 'outline'}
                                        sx={buttonStyle}
                                    >
                                        {isToolsExpanded ? t(miscNodes[type].metadata.displayName) : undefined}
                                    </Button>
                                ))}
                        </AccordionPanel>
                    </AccordionItem>
                </Accordion>
            </Flex>
        </Flex>
    );
};

export default ToolsPanel;
