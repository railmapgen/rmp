import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Button,
    Flex,
    HStack,
    Icon,
    Link,
    SystemStyleObject,
    Text,
    Tooltip,
    useColorModeValue,
} from '@chakra-ui/react';
import { LanguageCode } from '@railmapgen/rmg-translate';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconContext } from 'react-icons';
import { MdCode, MdExpandLess, MdExpandMore, MdOpenInNew } from 'react-icons/md';
import { Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { MAX_MASTER_NODE_FREE } from '../../../constants/master';
import { MiscNodeType } from '../../../constants/nodes';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setToolsPanelExpansion } from '../../../redux/app/app-slice';
import { setMode, setTheme } from '../../../redux/runtime/runtime-slice';
import { usePaletteTheme } from '../../../util/hooks';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import miscNodes from '../../svgs/nodes/misc-nodes';
import stations from '../../svgs/stations/stations';
import ThemeButton from '../theme-button';
import { localizedMiscNodes, localizedStaions } from './localized-order';

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

const selectIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeDasharray="2" fill="none" />
    </svg>
);

const EXPAND_ANIMATION_DURATION = 0.3; // in second

const ToolsPanel = () => {
    const { i18n, t } = useTranslation();
    const dispatch = useRootDispatch();
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        preference: {
            toolsPanel: { expand: isToolsExpanded },
        },
    } = useRootSelector(state => state.app);
    const {
        mode,
        count: { masters: masterNodesCount },
    } = useRootSelector(state => state.runtime);
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');

    const handleThemeApplied = React.useCallback((theme: Theme) => {
        dispatch(setTheme(theme));
    }, []);
    const { theme, requestThemeChange } = usePaletteTheme({ onThemeApplied: handleThemeApplied });

    // text should only be appended after the expansion animation is complete
    const [isTextShown, setIsTextShown] = React.useState(isToolsExpanded);
    const handleExpand = () => {
        if (isToolsExpanded) setIsTextShown(false);
        else setTimeout(() => setIsTextShown(true), (EXPAND_ANIMATION_DURATION + 0.02) * 1000);
        dispatch(setToolsPanelExpansion(!isToolsExpanded));
    };

    // Track selected line path and style
    const [selectedPath, setSelectedPath] = React.useState<LinePathType | undefined>();
    const [selectedStyle, setSelectedStyle] = React.useState<LineStyleType>(LineStyleType.SingleColor);

    // Parse current mode to extract path and style if in line mode
    React.useEffect(() => {
        if (mode.startsWith('line-')) {
            const parts = mode.slice(5).split('/');
            const path = parts[0] as LinePathType;
            const style = parts[1] as LineStyleType | undefined;
            setSelectedPath(path);
            if (style) {
                setSelectedStyle(style);
            }
        } else {
            setSelectedPath(undefined);
        }
    }, [mode]);

    const isStyleCompatible = (styleType: LineStyleType, pathType: LinePathType): boolean => {
        const style = lineStyles[styleType];
        const pathSupported = style?.metadata.supportLinePathType.includes(pathType);
        const subscriptionOk = !style?.isPro || activeSubscriptions.RMP_CLOUD;
        return pathSupported && subscriptionOk;
    };

    const isPathCompatible = (pathType: LinePathType, styleType: LineStyleType): boolean => {
        const path = linePaths[pathType];
        const styleSupported = lineStyles[styleType]?.metadata.supportLinePathType.includes(pathType);
        const subscriptionOk = !path?.isPro || activeSubscriptions.RMP_CLOUD;
        return styleSupported && subscriptionOk;
    };

    const findCompatibleStyle = (pathType: LinePathType, currentStyle: LineStyleType): LineStyleType => {
        // Check if current style is compatible with the path
        if (isStyleCompatible(currentStyle, pathType)) {
            return currentStyle;
        }
        // Find first compatible style, fallback to SingleColor
        const compatibleEntry = Object.entries(lineStyles).find(([styleType, _]) =>
            isStyleCompatible(styleType as LineStyleType, pathType)
        );
        return (compatibleEntry?.[0] as LineStyleType) ?? LineStyleType.SingleColor;
    };

    const findCompatiblePath = (styleType: LineStyleType, currentPath: LinePathType | undefined): LinePathType => {
        // Check if current path is compatible with the style
        if (currentPath && isPathCompatible(currentPath, styleType)) {
            return currentPath;
        }
        // Find first compatible path, fallback to Diagonal
        const compatibleEntry = Object.entries(linePaths).find(([pathType, _]) =>
            isPathCompatible(pathType as LinePathType, styleType)
        );
        return (compatibleEntry?.[0] as LinePathType) ?? LinePathType.Diagonal;
    };

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));

    const handleLine = (pathType: LinePathType) => {
        setSelectedPath(pathType);
        const compatibleStyle = findCompatibleStyle(pathType, selectedStyle);
        setSelectedStyle(compatibleStyle);
        dispatch(setMode(`line-${pathType}/${compatibleStyle}`));
    };

    const handleLineStyle = (styleType: LineStyleType) => {
        setSelectedStyle(styleType);
        const compatiblePath = findCompatiblePath(styleType, selectedPath);
        setSelectedPath(compatiblePath);
        dispatch(setMode(`line-${compatiblePath}/${styleType}`));
    };

    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));

    const isMasterDisabled = !activeSubscriptions.RMP_CLOUD && masterNodesCount + 1 > MAX_MASTER_NODE_FREE;

    return (
        <Flex
            flexShrink="0"
            direction="column"
            width={isToolsExpanded ? 450 : 10}
            maxWidth="100%"
            height="100%"
            bg={bgColor}
            zIndex="5"
            transition={`width ${EXPAND_ANIMATION_DURATION}s ease-in-out`}
        >
            <Button
                aria-label="Menu"
                leftIcon={
                    isTextShown ? (
                        <MdExpandMore size={40} transform="rotate(90)" />
                    ) : (
                        <MdExpandLess size={40} transform="rotate(90)" />
                    )
                }
                onClick={handleExpand}
                sx={buttonStyle}
            >
                {isTextShown ? t('panel.tools.showLess') : undefined}
            </Button>

            <Flex className="tools" overflow="auto">
                <Accordion width="100%" allowMultiple defaultIndex={[0, 1, 2]}>
                    <Button
                        aria-label="select"
                        leftIcon={selectIcon}
                        onClick={() => dispatch(setMode(mode === 'select' ? 'free' : 'select'))}
                        variant={mode === 'select' ? 'solid' : 'outline'}
                        sx={buttonStyle}
                    >
                        {isTextShown ? t('panel.tools.select') : undefined}
                    </Button>
                    <AccordionItem>
                        <AccordionButton sx={accordionButtonStyle}>
                            {isTextShown && (
                                <Box as="span" flex="1" textAlign="left">
                                    {t('panel.tools.section.lineDrawing')}
                                </Box>
                            )}
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            <Flex>
                                <ThemeButton theme={theme} onClick={requestThemeChange} />
                                <Text fontWeight="600" pl="1" alignSelf="center">
                                    {isTextShown ? t('color') : undefined}
                                </Text>
                            </Flex>

                            <Text fontWeight="600" pl="2.5" pt="2" fontSize="sm">
                                {isTextShown ? t('panel.tools.section.linePath') : undefined}
                            </Text>
                            {Object.values(LinePathType)
                                .filter(type => type !== LinePathType.Simple || activeSubscriptions.RMP_CLOUD)
                                .map(type => (
                                    <Button
                                        key={type}
                                        aria-label={type}
                                        leftIcon={linePaths[type].icon}
                                        onClick={() => handleLine(type)}
                                        variant={selectedPath === type ? 'solid' : 'outline'}
                                        isDisabled={selectedStyle ? !isPathCompatible(type, selectedStyle) : false}
                                        sx={buttonStyle}
                                    >
                                        {isTextShown ? t(linePaths[type].metadata.displayName) : undefined}
                                    </Button>
                                ))}

                            <Text fontWeight="600" pl="2.5" pt="2" fontSize="sm">
                                {isTextShown ? t('panel.tools.section.lineStyle') : undefined}
                            </Text>
                            {Object.entries(lineStyles).map(([styleType, style]) => (
                                <Button
                                    key={styleType}
                                    aria-label={styleType}
                                    onClick={() => handleLineStyle(styleType as LineStyleType)}
                                    variant={selectedStyle === styleType ? 'solid' : 'outline'}
                                    isDisabled={
                                        selectedPath
                                            ? !isStyleCompatible(styleType as LineStyleType, selectedPath)
                                            : false
                                    }
                                    sx={buttonStyle}
                                    fontSize="xs"
                                >
                                    {isTextShown ? t(style.metadata.displayName) : undefined}
                                </Button>
                            ))}

                            <Button
                                aria-label={MiscNodeType.Virtual}
                                leftIcon={miscNodes[MiscNodeType.Virtual].icon}
                                onClick={() => handleMiscNode(MiscNodeType.Virtual)}
                                variant={mode === `misc-node-${MiscNodeType.Virtual}` ? 'solid' : 'outline'}
                                sx={buttonStyle}
                            >
                                {isTextShown ? t(miscNodes[MiscNodeType.Virtual].metadata.displayName) : undefined}
                            </Button>
                            <LearnHowToAdd type="line" expand={isTextShown} />
                        </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                        <AccordionButton sx={accordionButtonStyle}>
                            {isTextShown && (
                                <Box as="span" flex="1" textAlign="left">
                                    {t('panel.tools.section.stations')}
                                </Box>
                            )}
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            {localizedStaions[i18n.language as LanguageCode]?.map(type => (
                                <Button
                                    key={type}
                                    aria-label={type}
                                    leftIcon={stations[type].icon}
                                    onClick={() => handleStation(type)}
                                    variant={mode === `station-${type}` ? 'solid' : 'outline'}
                                    sx={buttonStyle}
                                >
                                    {isTextShown ? t(stations[type].metadata.displayName) : undefined}
                                </Button>
                            ))}
                            <LearnHowToAdd type="station" expand={isTextShown} />
                        </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                        <AccordionButton sx={accordionButtonStyle}>
                            {isTextShown && (
                                <Box as="span" flex="1" textAlign="left">
                                    {t('panel.tools.section.miscellaneousNodes')}
                                </Box>
                            )}
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel sx={accordionPanelStyle}>
                            <Button
                                aria-label={MiscNodeType.Master}
                                leftIcon={miscNodes[MiscNodeType.Master].icon}
                                onClick={() => handleMiscNode(MiscNodeType.Master)}
                                variant={mode === `misc-node-${MiscNodeType.Master}` ? 'solid' : 'outline'}
                                isDisabled={isMasterDisabled}
                                sx={buttonStyle}
                            >
                                {isTextShown ? t(miscNodes[MiscNodeType.Master].metadata.displayName) : undefined}
                                {isTextShown ? (
                                    <>
                                        <Badge ml="1" colorScheme="green">
                                            New
                                        </Badge>
                                        <Tooltip label={t('header.settings.proWithTrial')}>
                                            <Badge
                                                ml="1"
                                                color="gray.50"
                                                background="radial-gradient(circle, #3f5efb, #fc466b)"
                                                mr="auto"
                                            >
                                                PRO
                                            </Badge>
                                        </Tooltip>
                                    </>
                                ) : undefined}
                            </Button>
                            {localizedMiscNodes[i18n.language as LanguageCode]
                                ?.filter(
                                    type =>
                                        type !== MiscNodeType.Virtual &&
                                        type !== MiscNodeType.I18nText &&
                                        type !== MiscNodeType.Master
                                )
                                .map(type => (
                                    <Button
                                        key={type}
                                        aria-label={type}
                                        leftIcon={miscNodes[type].icon}
                                        onClick={() => handleMiscNode(type)}
                                        variant={mode === `misc-node-${type}` ? 'solid' : 'outline'}
                                        sx={buttonStyle}
                                    >
                                        {isTextShown ? t(miscNodes[type].metadata.displayName) : undefined}
                                    </Button>
                                ))}
                            <LearnHowToAdd type="misc-node" expand={isTextShown} />
                        </AccordionPanel>
                    </AccordionItem>
                </Accordion>
            </Flex>
        </Flex>
    );
};

export default ToolsPanel;

export const LearnHowToAdd = (props: { type: 'station' | 'misc-node' | 'line'; expand: boolean }) => {
    const { type, expand } = props;
    const { t } = useTranslation();

    const doc = type === 'misc-node' ? 'nodes' : type === 'station' ? 'stations' : 'line-styles';
    const fontSize = type === 'line' ? 'xs' : undefined;
    const size = type === 'line' ? '30px' : '40px';

    return (
        <HStack fontSize={fontSize}>
            {type !== 'line' && (
                <IconContext.Provider value={{ style: { padding: 5 }, size }}>
                    <MdCode />
                </IconContext.Provider>
            )}
            {expand && (
                <>
                    <Link
                        color="teal.500"
                        href={`https://github.com/railmapgen/rmp/blob/main/docs/${doc}.md`}
                        isExternal
                    >
                        {t(`panel.tools.learnHowToAdd.${type}`)}
                    </Link>
                    <Icon as={MdOpenInNew} color="teal.500" mr="auto" />
                </>
            )}
        </HStack>
    );
};
