import { Box, Divider, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdArrowDownward, MdArrowUpward, MdDelete } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../theme-button';
import { InterchangeInfo } from './interchange-field';

interface InterchangeCardProps {
    interchangeList: InterchangeInfo[];
    maximumTransfers: number;
    onAdd?: (index: number, info: InterchangeInfo) => void;
    onDelete?: (index: number) => void;
    onUpdate?: (index: number, info: InterchangeInfo) => void;
    onUp?: (index: number) => void;
    onDown?: (index: number) => void;
    foshan?: boolean;
}

export default function InterchangeCard(props: InterchangeCardProps) {
    const { interchangeList, maximumTransfers, onAdd, onDelete, onUpdate, onDown, onUp, foshan } = props;
    const dispatch = useRootDispatch();
    const {
        paletteAppClip: { input, output },
        theme: runtimeTheme,
    } = useRootSelector(state => state.runtime);

    const { t } = useTranslation();

    const [indexRequestedTheme, setIndexRequestedTheme] = React.useState<number>();
    React.useEffect(() => {
        if (indexRequestedTheme === undefined) {
            return;
        }
        if (output) {
            onUpdate?.(indexRequestedTheme, [
                ...output,
                interchangeList[indexRequestedTheme][4],
                interchangeList[indexRequestedTheme][5],
            ]);
            setIndexRequestedTheme(undefined);
        } else if (!input) {
            setIndexRequestedTheme(undefined);
        }
    }, [input, output]);

    const interchangeFields: RmgFieldsField[][] = interchangeList.map((it, i) => [
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: it[4],
            minW: '40px',
            onChange: val => onUpdate?.(i, [it[0], it[1], it[2], it[3], val, it[5], ...it.slice(6)]),
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: it[5],
            minW: '40px',
            onChange: val => onUpdate?.(i, [it[0], it[1], it[2], it[3], it[4], val, ...it.slice(6)]),
        },
        {
            type: 'switch',
            label: t('panel.details.stations.gzmtrInt.foshan'),
            isChecked: it[6] === 'fs',
            minW: '20px',
            hidden: !foshan,
            onChange: val =>
                onUpdate?.(i, [it[0], it[1], it[2], it[3], it[4], it[5], val ? 'fs' : 'gz', ...it.slice(7)]),
        },
    ]);

    return (
        <RmgCard direction="column">
            {interchangeList.length === 0 && (
                <HStack spacing={0.5} data-testid={`interchange-card-stack`}>
                    <Text as="i" flex={1} align="center" fontSize="md" colorScheme="gray">
                        {t('panel.details.stations.interchange.noInterchanges')}
                    </Text>

                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={t('panel.details.stations.interchange.add')}
                        onClick={() => onAdd?.(0, [...runtimeTheme, '', ''])}
                        icon={<MdAdd />}
                    />
                </HStack>
            )}

            {interchangeList.map((it, i) => (
                <VStack key={`${it.toString()}-${i}`} spacing={0.5} data-testid={`interchange-card-stack-${i}`} my={2}>
                    <HStack>
                        <ThemeButton
                            theme={[it[0], it[1], it[2], it[3]]}
                            onClick={() => {
                                setIndexRequestedTheme(i);
                                dispatch(openPaletteAppClip([it[0], it[1], it[2], it[3]]));
                            }}
                        />

                        <RmgFields fields={interchangeFields[i]} />
                    </HStack>
                    <HStack width="100%">
                        {onAdd && (
                            <IconButton
                                flex="1"
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.add')}
                                onClick={() => onAdd?.(i + 1, [...runtimeTheme, '', ''])}
                                icon={<MdAdd />}
                                isDisabled={interchangeList.length >= maximumTransfers}
                            />
                        )}

                        {onUp && (
                            <IconButton
                                flex="1"
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.up')}
                                onClick={() => onUp?.(i)} // duplicate last leg
                                icon={<MdArrowUpward />}
                                isDisabled={i === 0}
                            />
                        )}

                        {onDown && (
                            <IconButton
                                flex="1"
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.down')}
                                onClick={() => onDown?.(i)} // duplicate last leg
                                icon={<MdArrowDownward />}
                                isDisabled={i === interchangeList.length - 1}
                            />
                        )}

                        {onDelete && (
                            <IconButton
                                flex="1"
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.remove')}
                                onClick={() => onDelete?.(i)}
                                icon={<MdDelete />}
                            />
                        )}
                    </HStack>
                    <Divider />
                </VStack>
            ))}
        </RmgCard>
    );
}
