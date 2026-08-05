import { Divider, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdArrowDownward, MdArrowUpward, MdDelete } from 'react-icons/md';
import { usePaletteTheme } from '../../../../util/hooks';
import ThemeButton from '../../../panels/theme-button';
import {
    createDefaultLondonTubeLineBadgeItem,
    duplicateLondonTubeLineBadgeItem,
    LondonTubeLineBadgeItem,
    normalizeFilledLineName,
    normalizeFilledWalkingLineName,
    normalizeLondonTubeLineBadgeItem,
    toFilledItem,
    toFilledWalkingItem,
} from './london-tube-line-badge-utils';

const LondonTubeLineBadgeItemCard = (props: {
    item: LondonTubeLineBadgeItem;
    index: number;
    totalItems: number;
    onUpdate: (index: number, item: LondonTubeLineBadgeItem) => void;
    onAdd: (index: number, item: LondonTubeLineBadgeItem) => void;
    onDelete: (index: number) => void;
    onUp: (index: number) => void;
    onDown: (index: number) => void;
}) => {
    const { item, index, totalItems, onUpdate, onAdd, onDelete, onUp, onDown } = props;
    const { t } = useTranslation();

    const { theme, requestThemeChange } = usePaletteTheme({
        theme: item.color,
        onThemeApplied: color => onUpdate(index, { ...item, color }),
    });

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.nodes.londonTubeLineBadge.lineName'),
            value: item.lineName,
            onChange: value =>
                onUpdate(index, {
                    ...item,
                    lineName:
                        item.kind === 'filled'
                            ? normalizeFilledLineName(value.toString())
                            : normalizeFilledWalkingLineName(value.toString()),
                }),
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.londonTubeLineBadge.walking'),
            isChecked: item.kind === 'filled-walking',
            onChange: value => onUpdate(index, value ? toFilledWalkingItem(item) : toFilledItem(item)),
            minW: 'full',
            oneLine: true,
        },
        {
            type: 'input',
            label: t('panel.details.nodes.londonTubeLineBadge.walkingTarget'),
            value: item.kind === 'filled-walking' ? item.walkingTarget : '',
            hidden: item.kind !== 'filled-walking',
            onChange: value =>
                item.kind === 'filled-walking' &&
                onUpdate(index, {
                    ...item,
                    walkingTarget: value.toString().replace(/\r?\n/g, ' ').trim(),
                }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.londonTubeLineBadge.distance'),
            value: item.kind === 'filled-walking' ? item.distance : '',
            hidden: item.kind !== 'filled-walking',
            onChange: value =>
                item.kind === 'filled-walking' &&
                onUpdate(index, {
                    ...item,
                    distance: value.toString().replace(/\r?\n/g, ' ').trim(),
                }),
            minW: 'full',
        },
    ];

    return (
        <VStack spacing={0.5} data-testid={`london-tube-line-badge-card-${index}`} my={2}>
            <HStack align="flex-start" width="100%">
                <ThemeButton theme={theme} onClick={requestThemeChange} />
                <RmgFields fields={fields} />
            </HStack>
            <HStack width="100%">
                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.nodes.londonTubeLineBadge.addItem')}
                    onClick={() => onAdd(index, item)}
                    icon={<MdAdd />}
                />
                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.stations.interchange.up')}
                    onClick={() => onUp(index)}
                    icon={<MdArrowUpward />}
                    isDisabled={index === 0}
                />
                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.stations.interchange.down')}
                    onClick={() => onDown(index)}
                    icon={<MdArrowDownward />}
                    isDisabled={index === totalItems - 1}
                />
                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.stations.interchange.remove')}
                    onClick={() => onDelete(index)}
                    icon={<MdDelete />}
                    isDisabled={totalItems <= 1}
                />
            </HStack>
            <Divider />
        </VStack>
    );
};

const LineFlagItemsField = (props: {
    items: LondonTubeLineBadgeItem[];
    onChange: (items: LondonTubeLineBadgeItem[]) => void;
}) => {
    const { items, onChange } = props;
    const { t } = useTranslation();

    const handleAdd = (index: number, item?: LondonTubeLineBadgeItem) => {
        const insertIndex = item ? index + 1 : index;
        const nextItem = item ? duplicateLondonTubeLineBadgeItem(item) : createDefaultLondonTubeLineBadgeItem();
        const nextItems = [...items.slice(0, insertIndex), nextItem, ...items.slice(insertIndex)].map(
            normalizeLondonTubeLineBadgeItem
        );
        onChange(nextItems);
    };

    const handleUpdate = (index: number, item: LondonTubeLineBadgeItem) => {
        const nextItems = items.map((currentItem, currentIndex) =>
            currentIndex === index ? normalizeLondonTubeLineBadgeItem(item) : currentItem
        );
        onChange(nextItems);
    };

    const handleDelete = (index: number) => {
        if (items.length <= 1) return;
        onChange(items.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleUp = (index: number) => {
        if (index === 0) return;
        const nextItems = [...items];
        [nextItems[index - 1], nextItems[index]] = [nextItems[index], nextItems[index - 1]];
        onChange(nextItems);
    };

    const handleDown = (index: number) => {
        if (index >= items.length - 1) return;
        const nextItems = [...items];
        [nextItems[index], nextItems[index + 1]] = [nextItems[index + 1], nextItems[index]];
        onChange(nextItems);
    };

    return (
        <RmgCard direction="column">
            {items.length === 0 ? (
                <HStack spacing={0.5}>
                    <Text as="i" flex={1} align="center" fontSize="md" colorScheme="gray">
                        {t('panel.details.nodes.londonTubeLineBadge.noItems')}
                    </Text>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={t('panel.details.nodes.londonTubeLineBadge.addItem')}
                        onClick={() => handleAdd(0)}
                        icon={<MdAdd />}
                    />
                </HStack>
            ) : (
                items.map((item, index) => (
                    <LondonTubeLineBadgeItemCard
                        key={`item-${index}`}
                        item={item}
                        index={index}
                        totalItems={items.length}
                        onUpdate={handleUpdate}
                        onAdd={handleAdd}
                        onDelete={handleDelete}
                        onUp={handleUp}
                        onDown={handleDown}
                    />
                ))
            )}
        </RmgCard>
    );
};

export default LineFlagItemsField;
