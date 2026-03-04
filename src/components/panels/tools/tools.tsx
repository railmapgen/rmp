import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Button,
    Checkbox,
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
import { getLinePathAndStyle, RuntimeMode, Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { MAX_MASTER_NODE_FREE } from '../../../constants/master';
import { MiscNodeType } from '../../../constants/nodes';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import {
    setShowOnlyFavorites,
    setToolsPanelExpansion,
    toggleFavoriteLineStyle,
    toggleFavoriteMiscNode,
    toggleFavoriteStation,
} from '../../../redux/app/app-slice';
import { setMode, setTheme } from '../../../redux/runtime/runtime-slice';
import { usePaletteTheme } from '../../../util/hooks';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import miscNodes from '../../svgs/nodes/misc-nodes';
import stations from '../../svgs/stations/stations';
import ThemeButton from '../theme-button';
import FavoriteButton from './favorite-button';
import { localizedMiscNodes, localizedStaions } from './localized-order';

const buttonStyle: SystemStyleObject = {
    justifyContent: 'flex-start',
    p: 0,
    w: '100%',
    h: 10,
    _focus: { boxShadow: 'none' },
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
            toolsPanel: { expand: isToolsExpanded, showOnlyFavorites, hideLearnHowToAdd },
            favorites,
        },
    } = useRootSelector(state => state.app);
    const {
        mode,
        lastTool,
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

    const handleStation = (type: StationType) => dispatch(setMode(`station-${type}`));

    const isStyleCompatible = (styleType: LineStyleType, pathType: LinePathType): boolean => {
        const style = lineStyles[styleType];
        const pathSupported = style.metadata.supportLinePathType.includes(pathType);
        const subscriptionOK = !style.isPro || activeSubscriptions.RMP_CLOUD;
        return pathSupported && subscriptionOK;
    };
    const isPathCompatible = (pathType: LinePathType, styleType: LineStyleType): boolean => {
        const path = linePaths[pathType];
        const styleSupported = lineStyles[styleType].metadata.supportLinePathType.includes(pathType);
        const subscriptionOK = !path.isPro || activeSubscriptions.RMP_CLOUD;
        return styleSupported && subscriptionOK;
    };
    const handleLine = (pathType: LinePathType) => {
        let { style: currentStyle } = getLinePathAndStyle(mode);
        // When user click the background and mode becomes 'free', we try to recover last used style.
        if (!currentStyle && lastTool) currentStyle = getLinePathAndStyle(lastTool as RuntimeMode).style;
        // If current style is compatible with new path, keep it; otherwise use SingleColor
        const newStyle =
            currentStyle && isStyleCompatible(currentStyle, pathType) ? currentStyle : LineStyleType.SingleColor;
        dispatch(setMode(`line-${pathType}/${newStyle}`));
    };
    const handleLineStyle = (styleType: LineStyleType) => {
        let { path: currentPath } = getLinePathAndStyle(mode);
        // When user click the background and mode becomes 'free', we try to recover last used path.
        if (!currentPath && lastTool) currentPath = getLinePathAndStyle(lastTool as RuntimeMode).path;
        // If current path is compatible with new style, keep it; otherwise use Diagonal
        const newPath = currentPath && isPathCompatible(currentPath, styleType) ? currentPath : LinePathType.Diagonal;
        dispatch(setMode(`line-${newPath}/${styleType}`));
    };

    const handleMiscNode = (type: MiscNodeType) => dispatch(setMode(`misc-node-${type}`));

    const { path: currentPath, style: currentStyle } = getLinePathAndStyle(mode);
    const isMasterDisabled = !activeSubscriptions.RMP_CLOUD && masterNodesCount + 1 > MAX_MASTER_NODE_FREE;

    // Filter logic: only show items that are favorited when showOnlyFavorites is true
    // Handle error cases: filter out any IDs that don't exist in the current data
    // Note: Line paths are always shown regardless of favorites filter

    const filteredLineStyles = React.useMemo(() => {
        const allStyles = Object.entries(lineStyles);
        if (!showOnlyFavorites) return allStyles;
        return allStyles.filter(([styleType]) => favorites.lineStyles.includes(styleType as LineStyleType));
    }, [showOnlyFavorites, favorites.lineStyles]);

    const filteredStations = React.useMemo(() => {
        const allStations = localizedStaions[i18n.language as LanguageCode] || [];
        if (!showOnlyFavorites) return allStations;
        return allStations.filter(type => favorites.stations.includes(type));
    }, [showOnlyFavorites, favorites.stations, i18n.language]);

    const filteredMiscNodes = React.useMemo(() => {
        const allMiscNodes =
            localizedMiscNodes[i18n.language as LanguageCode]?.filter(
                type => type !== MiscNodeType.Virtual && type !== MiscNodeType.I18nText && type !== MiscNodeType.Master
            ) || [];
        if (!showOnlyFavorites) return allMiscNodes;
        return allMiscNodes.filter(type => favorites.miscNodes.includes(type));
    }, [showOnlyFavorites, favorites.miscNodes, i18n.language]);

    const linePathCount = Object.values(LinePathType).filter(
        type => type !== LinePathType.Simple || activeSubscriptions.RMP_CLOUD
    ).length;
    const lineDrawingVisibleCount = linePathCount + 2; // color + virtual
    const lineStylesVisibleCount = filteredLineStyles.length;
    const stationsVisibleCount = filteredStations.length;
    const miscellaneousVisibleCount = filteredMiscNodes.length + 1; // master

    const shouldHideLineDrawingAccordionButton = showOnlyFavorites;
    const shouldHideLineStylesAccordionButton = showOnlyFavorites && lineStylesVisibleCount <= 3;
    const shouldHideStationsAccordionButton = showOnlyFavorites && stationsVisibleCount <= 3;
    const shouldHideMiscAccordionButton = showOnlyFavorites && miscellaneousVisibleCount <= 3;

    const lineDrawingContent = (
        <>
            <Flex>
                <ThemeButton theme={theme} onClick={requestThemeChange} />
                <Text fontWeight="600" pl="1" alignSelf="center">
                    {isTextShown ? t('color') : undefined}
                </Text>
            </Flex>

            {Object.values(LinePathType)
                .filter(type => type !== LinePathType.Simple || activeSubscriptions.RMP_CLOUD)
                .map(type => (
                    <Button
                        key={type}
                        aria-label={type}
                        leftIcon={linePaths[type].icon}
                        onClick={() => handleLine(type)}
                        variant={currentPath === type ? 'solid' : 'outline'}
                        isDisabled={currentStyle ? !isPathCompatible(type, currentStyle) : false}
                        sx={buttonStyle}
                    >
                        {isTextShown ? t(linePaths[type].metadata.displayName) : undefined}
                    </Button>
                ))}

            <HStack spacing={0} w="100%">
                <Button
                    aria-label={MiscNodeType.Virtual}
                    leftIcon={miscNodes[MiscNodeType.Virtual].icon}
                    onClick={() => handleMiscNode(MiscNodeType.Virtual)}
                    variant={mode === `misc-node-${MiscNodeType.Virtual}` ? 'solid' : 'outline'}
                    sx={buttonStyle}
                    flex={1}
                >
                    {isTextShown ? t(miscNodes[MiscNodeType.Virtual].metadata.displayName) : undefined}
                </Button>
                {isTextShown && (
                    <FavoriteButton
                        isFavorite={favorites.miscNodes.includes(MiscNodeType.Virtual)}
                        onToggle={() => dispatch(toggleFavoriteMiscNode(MiscNodeType.Virtual))}
                        ariaLabel={`favorite-${MiscNodeType.Virtual}`}
                    />
                )}
            </HStack>
        </>
    );

    const lineStylesContent = (
        <>
            {filteredLineStyles.map(([styleType, style]) => (
                <HStack key={styleType} spacing={0} w="100%">
                    <Button
                        aria-label={styleType}
                        leftIcon={<Box boxSize="40px" />}
                        onClick={() => handleLineStyle(styleType as LineStyleType)}
                        variant={currentStyle === styleType ? 'solid' : 'outline'}
                        isDisabled={currentPath ? !isStyleCompatible(styleType as LineStyleType, currentPath) : false}
                        sx={buttonStyle}
                        flex={1}
                    >
                        {isTextShown ? t(style.metadata.displayName) : undefined}
                    </Button>
                    {isTextShown && (
                        <FavoriteButton
                            isFavorite={favorites.lineStyles.includes(styleType as LineStyleType)}
                            onToggle={() => dispatch(toggleFavoriteLineStyle(styleType as LineStyleType))}
                            ariaLabel={`favorite-${styleType}`}
                        />
                    )}
                </HStack>
            ))}

            <LearnHowToAdd type="line-styles" expand={isTextShown} hidden={hideLearnHowToAdd} />
        </>
    );

    const stationsContent = (
        <>
            {filteredStations.map(type => (
                <HStack key={type} spacing={0} w="100%">
                    <Button
                        aria-label={type}
                        leftIcon={stations[type].icon}
                        onClick={() => handleStation(type)}
                        variant={mode === `station-${type}` ? 'solid' : 'outline'}
                        sx={buttonStyle}
                        flex={1}
                    >
                        {isTextShown ? t(stations[type].metadata.displayName) : undefined}
                    </Button>
                    {isTextShown && (
                        <FavoriteButton
                            isFavorite={favorites.stations.includes(type)}
                            onToggle={() => dispatch(toggleFavoriteStation(type))}
                            ariaLabel={`favorite-${type}`}
                        />
                    )}
                </HStack>
            ))}
            <LearnHowToAdd type="station" expand={isTextShown} hidden={hideLearnHowToAdd} />
        </>
    );

    const miscellaneousContent = (
        <>
            <HStack spacing={0} w="100%">
                <Button
                    aria-label={MiscNodeType.Master}
                    leftIcon={miscNodes[MiscNodeType.Master].icon}
                    onClick={() => handleMiscNode(MiscNodeType.Master)}
                    variant={mode === `misc-node-${MiscNodeType.Master}` ? 'solid' : 'outline'}
                    isDisabled={isMasterDisabled}
                    sx={buttonStyle}
                    flex={1}
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
                {isTextShown && (
                    <FavoriteButton
                        isFavorite={favorites.miscNodes.includes(MiscNodeType.Master)}
                        onToggle={() => dispatch(toggleFavoriteMiscNode(MiscNodeType.Master))}
                        ariaLabel={`favorite-${MiscNodeType.Master}`}
                    />
                )}
            </HStack>
            {filteredMiscNodes.map(type => (
                <HStack key={type} spacing={0} w="100%">
                    <Button
                        aria-label={type}
                        leftIcon={miscNodes[type].icon}
                        onClick={() => handleMiscNode(type)}
                        variant={mode === `misc-node-${type}` ? 'solid' : 'outline'}
                        sx={buttonStyle}
                        flex={1}
                    >
                        {isTextShown ? t(miscNodes[type].metadata.displayName) : undefined}
                    </Button>
                    {isTextShown && (
                        <FavoriteButton
                            isFavorite={favorites.miscNodes.includes(type)}
                            onToggle={() => dispatch(toggleFavoriteMiscNode(type))}
                            ariaLabel={`favorite-${type}`}
                        />
                    )}
                </HStack>
            ))}
            <LearnHowToAdd type="misc-node" expand={isTextShown} hidden={hideLearnHowToAdd} />
        </>
    );

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

            {isTextShown && (
                <Checkbox
                    isChecked={showOnlyFavorites}
                    onChange={e => dispatch(setShowOnlyFavorites(e.target.checked))}
                    px={2}
                    py={1}
                >
                    {t('panel.tools.showOnlyFavorites')}
                </Checkbox>
            )}

            <Flex className="tools" overflow="auto">
                <Accordion width="100%" allowMultiple defaultIndex={[0, 2, 3]}>
                    <Button
                        aria-label="select"
                        leftIcon={selectIcon}
                        onClick={() => dispatch(setMode(mode === 'select' ? 'free' : 'select'))}
                        variant={mode === 'select' ? 'solid' : 'outline'}
                        sx={buttonStyle}
                    >
                        {isTextShown ? t('panel.tools.select') : undefined}
                    </Button>
                    {shouldHideLineDrawingAccordionButton ? (
                        <Box sx={accordionPanelStyle}>{lineDrawingContent}</Box>
                    ) : (
                        <AccordionItem>
                            <AccordionButton sx={accordionButtonStyle}>
                                {isTextShown && (
                                    <Box as="span" flex="1" textAlign="left">
                                        {t('panel.tools.section.lineDrawing')}
                                    </Box>
                                )}
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel sx={accordionPanelStyle}>{lineDrawingContent}</AccordionPanel>
                        </AccordionItem>
                    )}

                    {shouldHideLineStylesAccordionButton ? (
                        <Box sx={accordionPanelStyle}>{lineStylesContent}</Box>
                    ) : (
                        <AccordionItem>
                            <AccordionButton sx={accordionButtonStyle}>
                                {isTextShown && (
                                    <Box as="span" flex="1" textAlign="left">
                                        {t('panel.tools.section.lineStyles')}
                                    </Box>
                                )}
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel sx={accordionPanelStyle}>{lineStylesContent}</AccordionPanel>
                        </AccordionItem>
                    )}

                    {shouldHideStationsAccordionButton ? (
                        <Box sx={accordionPanelStyle}>{stationsContent}</Box>
                    ) : (
                        <AccordionItem>
                            <AccordionButton sx={accordionButtonStyle}>
                                {isTextShown && (
                                    <Box as="span" flex="1" textAlign="left">
                                        {t('panel.tools.section.stations')}
                                    </Box>
                                )}
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel sx={accordionPanelStyle}>{stationsContent}</AccordionPanel>
                        </AccordionItem>
                    )}

                    {shouldHideMiscAccordionButton ? (
                        <Box sx={accordionPanelStyle}>{miscellaneousContent}</Box>
                    ) : (
                        <AccordionItem>
                            <AccordionButton sx={accordionButtonStyle}>
                                {isTextShown && (
                                    <Box as="span" flex="1" textAlign="left">
                                        {t('panel.tools.section.miscellaneousNodes')}
                                    </Box>
                                )}
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel sx={accordionPanelStyle}>{miscellaneousContent}</AccordionPanel>
                        </AccordionItem>
                    )}
                </Accordion>
            </Flex>
        </Flex>
    );
};

export default ToolsPanel;

const LearnHowToAdd = (props: { type: 'station' | 'misc-node' | 'line-styles'; expand: boolean; hidden: boolean }) => {
    const { type, expand, hidden } = props;
    const { t } = useTranslation();

    const doc = type === 'misc-node' ? 'nodes' : type;

    if (hidden) return null;

    return (
        <HStack>
            <IconContext.Provider value={{ style: { padding: 5 }, size: '40px' }}>
                <MdCode />
            </IconContext.Provider>
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
