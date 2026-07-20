import {
    Box,
    HStack,
    IconButton,
    Switch,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    VStack,
} from '@chakra-ui/react';
import { RmgThrottledSlider } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRestartAlt } from 'react-icons/md';
import { CityCode, Theme } from '../../constants/constants';
import { DEFAULT_MAP_STYLE, MapRailKind, MapRoadKind, MapStyle } from '../../map/map-style';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMapStyle } from '../../redux/param/param-slice';
import { getContrastingColor } from '../../util/color';
import { usePaletteTheme } from '../../util/hooks';
import ThemeButton from '../panels/theme-button';

const roadKinds: MapRoadKind[] = ['path', 'local', 'collector', 'arterial'];
const railKinds: MapRailKind[] = ['metro', 'national'];

const PaletteColorInput = (props: { value: string; onChange: (value: string) => void }) => {
    const paletteTheme = React.useMemo<Theme>(
        () => [CityCode.Other, 'other', props.value as Theme[2], getContrastingColor(props.value as `#${string}`)],
        [props.value]
    );
    const { theme, requestThemeChange } = usePaletteTheme({
        theme: paletteTheme,
        onThemeApplied: nextTheme => props.onChange(nextTheme[2]),
    });

    return <ThemeButton theme={theme} onClick={requestThemeChange} />;
};

const ScaleSlider = (props: { value: number; label: string; onChange: (value: number) => void }) => {
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

export const MapStyleSection = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const mapStyle = useRootSelector(state => state.param.mapStyle);

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
                        <Th px="1">{t('map.style.widthScale')}</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {roadKinds.map(kind => (
                        <Tr key={kind}>
                            <Td px="1">{t(`map.style.roads.${kind}`)}</Td>
                            <Td px="1">
                                {kind === 'path' ? (
                                    <Text color="gray.500">—</Text>
                                ) : (
                                    <PaletteColorInput
                                        value={mapStyle.roads[kind].casingColor}
                                        onChange={casingColor => updateRoad(kind, { casingColor })}
                                    />
                                )}
                            </Td>
                            <Td px="1">
                                <PaletteColorInput
                                    value={mapStyle.roads[kind].color}
                                    onChange={color => updateRoad(kind, { color })}
                                />
                            </Td>
                            <Td px="1">
                                <ScaleSlider
                                    label={t('map.style.widthScale')}
                                    value={mapStyle.roads[kind].widthScale}
                                    onChange={widthScale => updateRoad(kind, { widthScale })}
                                />
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <Text as="b" display="block" mt="4" mb="1">
                {t('map.style.rails.title')}
            </Text>
            <VStack align="stretch" spacing="1">
                {railKinds.map(kind => (
                    <HStack key={kind}>
                        <Text flex="1">{t(`map.style.rails.${kind}`)}</Text>
                        <PaletteColorInput
                            value={mapStyle.rails[kind].color}
                            onChange={color => updateRail(kind, { color })}
                        />
                        <ScaleSlider
                            label={t('map.style.widthScale')}
                            value={mapStyle.rails[kind].widthScale}
                            onChange={widthScale => updateRail(kind, { widthScale })}
                        />
                    </HStack>
                ))}
            </VStack>

            <Text as="b" display="block" mt="4" mb="1">
                {t('map.style.labels.title')}
            </Text>
            <VStack align="stretch" spacing="1">
                <HStack>
                    <Text flex="1">{t('map.style.labels.enabled')}</Text>
                    <Switch
                        isChecked={mapStyle.labels.enabled}
                        onChange={({ target: { checked } }) =>
                            saveStyle({ ...mapStyle, labels: { ...mapStyle.labels, enabled: checked } })
                        }
                    />
                </HStack>
                <HStack>
                    <Text flex="1">{t('map.style.labels.sizeScale')}</Text>
                    <ScaleSlider
                        label={t('map.style.labels.sizeScale')}
                        value={mapStyle.labels.sizeScale}
                        onChange={sizeScale => saveStyle({ ...mapStyle, labels: { ...mapStyle.labels, sizeScale } })}
                    />
                </HStack>
            </VStack>
        </Box>
    );
};
