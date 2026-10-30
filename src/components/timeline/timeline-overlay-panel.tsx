import {
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    HStack,
    IconButton,
    Stack,
    Text,
    Tooltip,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { MdClose, MdDelete, MdLock } from 'react-icons/md';
import {
    createTimelineOverlayModule,
    TIMELINE_OVERLAY_REGISTRY,
    TimelineOverlayModule,
    TimelineOverlayRegion,
} from '../../constants/timeline-overlays';
import { moveTimelineOverlayModule } from '../../util/timeline';
import SubscriptionBadge from '../subscription-badge';

const prefix = 'header.timelinePage.overlayEditor';

interface TimelineOverlayPanelProps {
    modules: readonly TimelineOverlayModule[];
    selectedId?: string;
    addRegion?: TimelineOverlayRegion;
    hasExportSubscription: boolean;
    mapEnabled: boolean;
    onChange: (modules: TimelineOverlayModule[]) => void;
    onSelect: (id: string | undefined) => void;
    onCloseCatalog: () => void;
    onDone: () => void;
}

export default function TimelineOverlayPanel({
    modules,
    selectedId,
    addRegion,
    hasExportSubscription,
    mapEnabled,
    onChange,
    onSelect,
    onCloseCatalog,
    onDone,
}: TimelineOverlayPanelProps) {
    const { t } = useTranslation();
    const background = useColorModeValue('white', 'gray.800');
    const muted = useColorModeValue('gray.600', 'gray.300');
    const selected = modules.find(module => module.id === selectedId);
    const locked = selected?.region === 'top-right' && !hasExportSubscription;
    const definition = selected && TIMELINE_OVERLAY_REGISTRY[selected.type];
    const updateSettings = (key: string, value: unknown) => {
        if (!selected || locked) return;
        onChange(
            modules.map(module =>
                module.id === selected.id
                    ? ({ ...module, settings: { ...module.settings, [key]: value } } as TimelineOverlayModule)
                    : module
            )
        );
    };
    const settings = selected?.settings as Record<string, unknown> | undefined;
    const fields: RmgFieldsField[] =
        definition?.fields.map(field => {
            const common = { label: t(field.labelKey), minW: 'full' as const, isDisabled: locked };
            if (field.type === 'boolean')
                return {
                    ...common,
                    type: 'switch' as const,
                    oneLine: true,
                    isChecked: settings?.[field.key] === true,
                    onChange: (value: boolean) => updateSettings(field.key, value),
                };
            if (field.type === 'select')
                return {
                    ...common,
                    type: 'select' as const,
                    value: String(settings?.[field.key] ?? ''),
                    options: Object.fromEntries(
                        Object.entries(field.options ?? {}).map(([value, label]) => [value, t(label)])
                    ),
                    onChange: (value: string | number) =>
                        updateSettings(
                            field.key,
                            typeof settings?.[field.key] === 'boolean' ? value === 'true' : value
                        ),
                };
            return {
                ...common,
                type: 'slider' as const,
                label: `${t(field.labelKey)} (${settings?.[field.key]})`,
                value: Number(settings?.[field.key] ?? 20),
                min: field.min ?? 12,
                max: field.max ?? 48,
                step: field.step ?? 1,
                onChange: (value: number) => updateSettings(field.key, value),
            };
        }) ?? [];
    const add = (type: TimelineOverlayModule['type']) => {
        if (
            !addRegion ||
            (!hasExportSubscription && addRegion === 'top-right') ||
            (type === 'line-length' && !mapEnabled)
        )
            return;
        const module = createTimelineOverlayModule(type, addRegion);
        const inserted = moveTimelineOverlayModule(
            [...modules, module],
            module.id,
            addRegion,
            addRegion.startsWith('bottom') ? 0 : modules.filter(item => item.region === addRegion).length,
            hasExportSubscription
        );
        onChange(inserted);
        onCloseCatalog();
        onSelect(module.id);
    };

    return (
        <Flex position="absolute" inset={0} zIndex={4} bg={background} direction="column" data-overlay-editor-panel>
            <HStack justify="space-between" p={4} borderBottomWidth="1px" flexShrink={0}>
                <Heading size="sm">{t(`${prefix}.title`)}</Heading>
                <Button size="sm" colorScheme="purple" onClick={onDone}>
                    {t('header.timelinePage.settings.done')}
                </Button>
            </HStack>
            <Stack p={4} spacing={4} overflowY="auto" flex={1}>
                {addRegion ? (
                    <>
                        <HStack justify="space-between">
                            <Text fontWeight="semibold">
                                {t(`${prefix}.addToRegion`, { region: t(`${prefix}.regions.${addRegion}`) })}
                            </Text>
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={t(`${prefix}.closeCatalog`)}
                                icon={<MdClose />}
                                onClick={onCloseCatalog}
                            />
                        </HStack>
                        {Object.entries(TIMELINE_OVERLAY_REGISTRY).map(([type, item]) => {
                            const unavailable = type === 'line-length' && !mapEnabled;
                            return (
                                <Tooltip
                                    key={type}
                                    label={t('header.timelinePage.settings.showLineLengthMapOnly')}
                                    isDisabled={!unavailable}
                                >
                                    <Box>
                                        <Button
                                            width="full"
                                            justifyContent="flex-start"
                                            variant="outline"
                                            isDisabled={
                                                unavailable || (addRegion === 'top-right' && !hasExportSubscription)
                                            }
                                            onClick={() => add(type as TimelineOverlayModule['type'])}
                                        >
                                            {t(item.labelKey)}
                                        </Button>
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </>
                ) : selected && definition ? (
                    <>
                        <Heading size="sm">{t(definition.labelKey)}</Heading>
                        {locked && (
                            <HStack color={muted}>
                                <MdLock />
                                <Text fontSize="sm">{t(`${prefix}.subscriberLocked`)}</Text>
                                <SubscriptionBadge subscription="RMP_EXPORT" />
                            </HStack>
                        )}
                        <Divider />
                        <RmgFields fields={fields} />
                        {selected.type === 'line-length' && !mapEnabled && (
                            <Text fontSize="sm" color={muted}>
                                {t('header.timelinePage.settings.showLineLengthMapOnly')}
                            </Text>
                        )}
                        {selected.type === 'timed-text' && (
                            <Text fontSize="sm" color={muted}>
                                {t(`${prefix}.timedTextHint`)}
                            </Text>
                        )}
                        <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            leftIcon={<MdDelete />}
                            isDisabled={locked}
                            onClick={() => {
                                if (locked) return;
                                onChange(modules.filter(module => module.id !== selected.id));
                                onSelect(undefined);
                            }}
                        >
                            {t(`${prefix}.remove`)}
                        </Button>
                    </>
                ) : (
                    <Text color={muted} fontSize="sm">
                        {t(`${prefix}.hint`)}
                    </Text>
                )}
            </Stack>
        </Flex>
    );
}
