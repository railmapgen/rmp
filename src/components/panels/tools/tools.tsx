import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdCircle, MdExpandLess, MdExpandMore } from 'react-icons/md';
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
import ColourUtil from '../colour-util';
import ThemeButton from '../theme-button';

const buttonStyle: SystemStyleObject = {
    justifyContent: 'flex-start',
    p: 0,
    pl: '5px',
    pr: '5px',
    maxH: 50,
    minH: 50,
};

const accordionPanelStyle: SystemStyleObject = {
    p: '0',
    display: 'flex',
    flexDirection: 'column',
};

const ToolsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { mode, theme } = useRootSelector(state => state.runtime);

    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));
    const handleLine = (type: LinePathType) => dispatch(setMode(`line-${type}`));
    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));

    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Flex
            flexShrink="0"
            direction="column"
            width={isOpen ? 400 : 50}
            maxWidth="100%"
            height="100%"
            zIndex="5"
            transition="width 0.3s ease-in-out"
        >
            <Button
                aria-label="Menu"
                leftIcon={
                    isOpen ? (
                        <MdExpandMore size={40} transform="rotate(90)" />
                    ) : (
                        <MdExpandLess size={40} transform="rotate(90)" />
                    )
                }
                onClick={() => setIsOpen(!isOpen)}
                sx={buttonStyle}
            >
                {isOpen ? t('panel.tools.showLess') : undefined}
            </Button>

            <Flex className="tools" overflow="auto">
                <Accordion width="100%" allowMultiple defaultIndex={[0, 1, 2]}>
                    <AccordionItem>
                        <AccordionButton sx={{ minH: 50, maxH: 50 }}>
                            <Box as="span" flex="1" textAlign="left">
                                {isOpen ? t('panel.tools.section.lineDrawing') : undefined}
                            </Box>
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            {/* <Button
                                aria-label="Color"
                                leftIcon={<MdCircle />}
                                color={theme[3]}
                                bg={theme[2]}
                                size="lg"
                                style={{ minHeight: 50, minWidth: 50 }}
                                _hover={{ bg: ColourUtil.fade(theme[2], 0.7) }}
                                onClick={() => setIsModalOpen(true)}
                                sx={buttonStyle}
                            >
                                {isOpen ? t('Color') : undefined}
                            </Button> */}
                            <ThemeButton theme={theme} onClick={() => setIsModalOpen(true)} />
                            <ColourModal
                                isOpen={isModalOpen}
                                defaultTheme={theme}
                                onClose={() => setIsModalOpen(false)}
                                onUpdate={nextTheme => dispatch(setTheme(nextTheme))}
                            />

                            {Object.values(LinePathType).map(type => (
                                <Button
                                    key={type}
                                    aria-label={type}
                                    leftIcon={linePaths[type].icon}
                                    onClick={() => handleLine(type)}
                                    variant={mode === `line-${type}` ? 'solid' : 'outline'}
                                    sx={buttonStyle}
                                >
                                    {isOpen ? t(linePaths[type].metadata.displayName) : undefined}
                                </Button>
                            ))}
                            <Button
                                aria-label={MiscNodeType.Virtual}
                                leftIcon={miscNodes[MiscNodeType.Virtual].icon}
                                onClick={() => handleMiscNode(MiscNodeType.Virtual)}
                                variant={mode === `misc-node-${MiscNodeType.Virtual}` ? 'solid' : 'outline'}
                                sx={buttonStyle}
                            >
                                {isOpen ? t(miscNodes[MiscNodeType.Virtual].metadata.displayName) : undefined}
                            </Button>
                        </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                        <AccordionButton sx={{ minH: 50, maxH: 50 }}>
                            <Box as="span" flex="1" textAlign="left">
                                {isOpen ? t('panel.tools.section.stations') : undefined}
                            </Box>
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
                                    {isOpen ? t(stations[type].metadata.displayName) : undefined}
                                </Button>
                            ))}
                        </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                        <AccordionButton sx={{ minH: 50, maxH: 50 }}>
                            <Box as="span" flex="1" textAlign="left">
                                {isOpen ? t('panel.tools.section.miscellaneousNodes') : undefined}
                            </Box>
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
                                        {isOpen ? t(miscNodes[type].metadata.displayName) : undefined}
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
