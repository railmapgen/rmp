import { Box, HStack, IconButton, Text } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdContentCopy, MdDelete } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../theme-button';
import { InterchangeInfo } from './interchange-field';

interface InterchangeCardProps {
    interchangeList: InterchangeInfo[];
    onAdd?: (info: InterchangeInfo) => void;
    onDelete?: (index: number) => void;
    onUpdate?: (index: number, info: InterchangeInfo) => void;
}

export default function InterchangeCard(props: InterchangeCardProps) {
    const { interchangeList, onAdd, onDelete, onUpdate } = props;
    const dispatch = useRootDispatch();
    const {
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);

    const { t } = useTranslation();

    const [indexRequestedTheme, setIndexRequestedTheme] = React.useState<number>();

    React.useEffect(() => {
        if (indexRequestedTheme !== undefined && output) {
            onUpdate?.(indexRequestedTheme, [
                ...output,
                interchangeList[indexRequestedTheme][4],
                interchangeList[indexRequestedTheme][5],
            ]);
            setIndexRequestedTheme(undefined);
        }
    }, [output?.toString()]);

    const interchangeFields: RmgFieldsField[][] = interchangeList.map((it, i) => [
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: it[4],
            minW: '80px',
            onChange: val => onUpdate?.(i, [it[0], it[1], it[2], it[3], val, it[5]]),
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: it[5],
            minW: '80px',
            onChange: val => onUpdate?.(i, [it[0], it[1], it[2], it[3], it[4], val]),
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
                        onClick={() => onAdd?.([CityCode.Shanghai, '', '#aaaaaa', MonoColour.white, '', ''])}
                        icon={<MdAdd />}
                    />
                </HStack>
            )}

            {interchangeList.map((it, i) => (
                <HStack key={i} spacing={0.5} data-testid={`interchange-card-stack-${i}`}>
                    <RmgLabel label={t('color')} minW="40px" noLabel={i !== 0}>
                        <ThemeButton
                            theme={[it[0], it[1], it[2], it[3]]}
                            onClick={() => {
                                setIndexRequestedTheme(i);
                                dispatch(openPaletteAppClip([it[0], it[1], it[2], it[3]]));
                            }}
                        />
                    </RmgLabel>

                    <RmgFields fields={interchangeFields[i]} noLabel={i !== 0} />

                    {onAdd && i === interchangeFields.length - 1 ? (
                        <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label={t('panel.details.stations.interchange.copy')}
                            onClick={() => onAdd?.(interchangeList.slice(-1)[0])} // duplicate last leg
                            icon={<MdContentCopy />}
                        />
                    ) : (
                        <Box minW={8} />
                    )}

                    {onDelete && (
                        <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label={t('panel.details.stations.interchange.remove')}
                            onClick={() => onDelete?.(i)}
                            icon={<MdDelete />}
                        />
                    )}
                </HStack>
            ))}
        </RmgCard>
    );
}
