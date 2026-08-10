import {
    Box,
    HStack,
    IconButton,
    Switch,
    Tab,
    Table,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
} from '@chakra-ui/react';
import { RmgThrottledSlider } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRestartAlt } from 'react-icons/md';
import { CityCode, Theme } from '../../constants/constants';
import {
    DEFAULT_MAP_STYLE,
    MAP_LABEL_GROUPS,
    MapLabelKind,
    MapRailKind,
    MapRoadKind,
    MapStyle,
} from '../../map/map-style';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMapStyle } from '../../redux/param/param-slice';
import { getContrastingColor } from '../../util/color';
import { usePaletteTheme } from '../../util/hooks';
import ThemeButton from '../panels/theme-button';

const roadKinds: MapRoadKind[] = ['path', 'local', 'collector', 'arterial'];
const railKinds: MapRailKind[] = ['metro', 'national'];

const PaletteColorInput = (props: { value: string; isDisabled?: boolean; onChange: (value: string) => void }) => {
    const paletteTheme = React.useMemo<Theme>(
        () => [CityCode.Other, 'other', props.value as Theme[2], getContrastingColor(props.value as `#${string}`)],
        [props.value]
    );
    const { theme, requestThemeChange } = usePaletteTheme({
        theme: paletteTheme,
        onThemeApplied: nextTheme => props.onChange(nextTheme[2]),
    });

    return <ThemeButton theme={theme} onClick={requestThemeChange} size="sm" isDisabled={props.isDisabled} />;
};

const ScaleSlider = (props: {
    value: number;
    label: string;
    isDisabled?: boolean;
    onChange: (value: number) => void;
}) => {
    /**
     * Slider movement is kept local until the gesture ends. Each persisted style
     * update also recompiles map CSS and writes the project save, neither of which
     * needs to run for every pointer event.
     */
    const [draftValue, setDraftValue] = React.useState(props.value);

    React.useEffect(() => setDraftValue(props.value), [props.value]);

    return (
        <HStack width="160px" minWidth="160px" spacing="2">
            <Box flex="1">
                <RmgThrottledSlider
                    aria-label={props.label}
                    defaultValue={props.value}
                    min={0.25}
                    max={4}
                    step={0.05}
                    isDisabled={props.isDisabled}
                    onChange={setDraftValue}
                    onChangeEnd={props.onChange}
                />
            </Box>
            <Text width="44px" textAlign="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {draftValue.toFixed(2)}×
            </Text>
        </HStack>
    );
};

const ScaleAndSwitchHeader = (props: { scaleLabel: string; enabledLabel: string }) => (
    <HStack justify="flex-end" spacing="3">
        <Text width="160px" textAlign="center">
            {props.scaleLabel}
        </Text>
        <Text width="40px" textAlign="right">
            {props.enabledLabel}
        </Text>
    </HStack>
);

const ScaleAndSwitch = (props: {
    value: number;
    scaleLabel: string;
    switchLabel: string;
    isChecked: boolean;
    isScaleDisabled: boolean;
    isSwitchDisabled: boolean;
    onScaleChange: (value: number) => void;
    onEnabledChange: (enabled: boolean) => void;
}) => (
    <HStack justify="flex-end" spacing="3">
        <Box opacity={props.isChecked && !props.isScaleDisabled ? 1 : 0.5}>
            <ScaleSlider
                label={props.scaleLabel}
                value={props.value}
                isDisabled={props.isScaleDisabled || !props.isChecked}
                onChange={props.onScaleChange}
            />
        </Box>
        <Box width="40px" minWidth="40px" display="flex" justifyContent="flex-end">
            <Switch
                aria-label={props.switchLabel}
                isChecked={props.isChecked}
                isDisabled={props.isSwitchDisabled}
                onChange={({ target: { checked } }) => props.onEnabledChange(checked)}
            />
        </Box>
    </HStack>
);

export const MapStyleSection = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const mapStyle = useRootSelector(state => state.param.present.mapStyle);

    /** Appearance controls are subscribed; label and railway visibility remain free. */
    const isSubscriber = useRootSelector(state => state.account.activeSubscriptions.RMP_CLOUD);

    const saveStyle = (style: MapStyle) => dispatch(setMapStyle(style));

    const updateRoad = (kind: MapRoadKind, patch: Partial<MapStyle['roads'][MapRoadKind]>) => {
        saveStyle({
            ...mapStyle,
            roads: {
                ...mapStyle.roads,
                [kind]: { ...mapStyle.roads[kind], ...patch },
            },
        });
    };

    const updateRail = (kind: MapRailKind, patch: Partial<MapStyle['rails'][MapRailKind]>) => {
        saveStyle({
            ...mapStyle,
            rails: {
                ...mapStyle.rails,
                [kind]: { ...mapStyle.rails[kind], ...patch },
            },
        });
    };

    const updateLabel = (kind: MapLabelKind, patch: Partial<MapStyle['labels']['categories'][MapLabelKind]>) => {
        saveStyle({
            ...mapStyle,
            labels: {
                ...mapStyle.labels,
                categories: {
                    ...mapStyle.labels.categories,
                    [kind]: { ...mapStyle.labels.categories[kind], ...patch },
                },
            },
        });
    };

    return (
        <Box width="100%" mb="3">
            <HStack justify="space-between">
                <Text as="b" fontSize="xl">
                    {t('map.style.title')}
                </Text>
                <Tooltip label={t('map.style.reset')} hasArrow>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={t('map.style.reset')}
                        icon={<MdRestartAlt />}
                        isDisabled={!isSubscriber}
                        onClick={() => saveStyle(structuredClone(DEFAULT_MAP_STYLE))}
                    />
                </Tooltip>
            </HStack>

            <Text as="b" display="block" mt="3" mb="1">
                {t('map.style.roads.title')}
            </Text>
            <Table size="sm">
                <Thead>
                    <Tr>
                        <Th px="1">{t('map.style.type')}</Th>
                        <Th px="1">{t('map.style.roads.casingColor')}</Th>
                        <Th px="1">{t('map.style.roads.color')}</Th>
                        <Th px="1">
                            <ScaleAndSwitchHeader
                                scaleLabel={t('map.style.widthScale')}
                                enabledLabel={t('map.style.enabled')}
                            />
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {roadKinds.map(kind => (
                        <Tr key={kind} data-testid={`map-style-road-${kind}`}>
                            <Td px="1">
                                <Text>{t(`map.style.roads.${kind}`)}</Text>
                            </Td>
                            <Td px="1" opacity={mapStyle.roads[kind].enabled ? 1 : 0.5}>
                                {kind === 'path' ? (
                                    <Text color="gray.500">—</Text>
                                ) : (
                                    <PaletteColorInput
                                        value={mapStyle.roads[kind].casingColor}
                                        isDisabled={!isSubscriber || !mapStyle.roads[kind].enabled}
                                        onChange={casingColor => updateRoad(kind, { casingColor })}
                                    />
                                )}
                            </Td>
                            <Td px="1" opacity={mapStyle.roads[kind].enabled ? 1 : 0.5}>
                                <PaletteColorInput
                                    value={mapStyle.roads[kind].color}
                                    isDisabled={!isSubscriber || !mapStyle.roads[kind].enabled}
                                    onChange={color => updateRoad(kind, { color })}
                                />
                            </Td>
                            <Td px="1">
                                <ScaleAndSwitch
                                    scaleLabel={t('map.style.widthScale')}
                                    switchLabel={`${t(`map.style.roads.${kind}`)} ${t('map.style.enabled')}`}
                                    value={mapStyle.roads[kind].widthScale}
                                    isChecked={mapStyle.roads[kind].enabled}
                                    isScaleDisabled={!isSubscriber}
                                    isSwitchDisabled={!isSubscriber}
                                    onScaleChange={widthScale => updateRoad(kind, { widthScale })}
                                    onEnabledChange={enabled => updateRoad(kind, { enabled })}
                                />
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <Text as="b" display="block" mt="4" mb="1">
                {t('map.style.rails.title')}
            </Text>
            <Table size="sm">
                <Thead>
                    <Tr>
                        <Th px="1">{t('map.style.type')}</Th>
                        <Th px="1">{t('map.style.roads.color')}</Th>
                        <Th px="1">
                            <ScaleAndSwitchHeader
                                scaleLabel={t('map.style.widthScale')}
                                enabledLabel={t('map.style.enabled')}
                            />
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {railKinds.map(kind => (
                        <Tr key={kind} data-testid={`map-style-rail-${kind}`}>
                            <Td px="1">{t(`map.style.rails.${kind}`)}</Td>
                            <Td px="1" opacity={mapStyle.rails[kind].enabled ? 1 : 0.5}>
                                <PaletteColorInput
                                    value={mapStyle.rails[kind].color}
                                    isDisabled={!isSubscriber || !mapStyle.rails[kind].enabled}
                                    onChange={color => updateRail(kind, { color })}
                                />
                            </Td>
                            <Td px="1">
                                <ScaleAndSwitch
                                    scaleLabel={t('map.style.widthScale')}
                                    switchLabel={`${t(`map.style.rails.${kind}`)} ${t('map.style.enabled')}`}
                                    value={mapStyle.rails[kind].widthScale}
                                    isChecked={mapStyle.rails[kind].enabled}
                                    isScaleDisabled={!isSubscriber}
                                    isSwitchDisabled={false}
                                    onScaleChange={widthScale => updateRail(kind, { widthScale })}
                                    onEnabledChange={enabled => updateRail(kind, { enabled })}
                                />
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <Text as="b" display="block" mt="4" mb="1">
                {t('map.style.labels.title')}
            </Text>
            <HStack data-testid="map-style-labels" mb="2">
                <Text flex="1">{t('map.style.labels.enabled')}</Text>
                <Switch
                    aria-label={t('map.style.labels.enabled')}
                    isChecked={mapStyle.labels.enabled}
                    onChange={({ target: { checked } }) =>
                        saveStyle({ ...mapStyle, labels: { ...mapStyle.labels, enabled: checked } })
                    }
                />
            </HStack>
            <Tabs isFitted isLazy size="sm" variant="enclosed">
                <TabList>
                    {MAP_LABEL_GROUPS.map(group => (
                        <Tab key={group.name}>{t(`map.style.labels.groups.${group.name}`)}</Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {MAP_LABEL_GROUPS.map(group => (
                        <TabPanel key={group.name} px="0" py="2">
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th px="1">{t('map.style.type')}</Th>
                                        <Th px="1">{t('map.style.labels.color')}</Th>
                                        <Th px="1">{t('map.style.labels.strokeColor')}</Th>
                                        <Th px="1">
                                            <ScaleAndSwitchHeader
                                                scaleLabel={t('map.style.labels.sizeScale')}
                                                enabledLabel={t('map.style.enabled')}
                                            />
                                        </Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {group.kinds.map(kind => {
                                        const category = mapStyle.labels.categories[kind];
                                        const isCategoryVisible = mapStyle.labels.enabled && category.enabled;
                                        const isAppearanceDisabled = !isSubscriber || !isCategoryVisible;

                                        return (
                                            <Tr key={kind} data-testid={`map-style-label-${kind}`}>
                                                <Td px="1">{t(`map.style.labels.categories.${kind}`)}</Td>
                                                <Td px="1" opacity={isCategoryVisible ? 1 : 0.5}>
                                                    <PaletteColorInput
                                                        value={category.color}
                                                        isDisabled={isAppearanceDisabled}
                                                        onChange={color => updateLabel(kind, { color })}
                                                    />
                                                </Td>
                                                <Td px="1" opacity={isCategoryVisible ? 1 : 0.5}>
                                                    <PaletteColorInput
                                                        value={category.strokeColor}
                                                        isDisabled={isAppearanceDisabled}
                                                        onChange={strokeColor => updateLabel(kind, { strokeColor })}
                                                    />
                                                </Td>
                                                <Td px="1">
                                                    <ScaleAndSwitch
                                                        scaleLabel={t('map.style.labels.sizeScale')}
                                                        switchLabel={`${t(`map.style.labels.categories.${kind}`)} ${t('map.style.enabled')}`}
                                                        value={category.sizeScale}
                                                        isChecked={category.enabled}
                                                        isScaleDisabled={!isSubscriber || !mapStyle.labels.enabled}
                                                        isSwitchDisabled={!mapStyle.labels.enabled}
                                                        onScaleChange={sizeScale => updateLabel(kind, { sizeScale })}
                                                        onEnabledChange={enabled => updateLabel(kind, { enabled })}
                                                    />
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Box>
    );
};
