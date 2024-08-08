import { Box, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdContentCopy, MdDelete } from 'react-icons/md';
import { CityCode } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import { InterchangeInfo } from '../../panels/details/interchange-field';
import ThemeButton from '../../panels/theme-button';

export const defaultGZMTRTransferInfo = [
    CityCode.Guangzhou,
    '',
    '#AAAAAA',
    MonoColour.white,
    '',
    '',
    'gz',
] as InterchangeInfo;

/**
 * A Guangzhou Metro specified interchange card props.
 * For general use, see `src\components\panels\details\interchange-card.tsx`
 */
interface InterchangeCardGZMTRProps {
    interchangeList: InterchangeInfo[];
    onAdd?: (info: InterchangeInfo) => void;
    onDelete?: (index: number) => void;
    onUpdate?: (index: number, info: InterchangeInfo) => void;
}

/**
 * A Guangzhou Metro specified interchange card.
 * For general use, see `src\components\panels\details\interchange-card.tsx`
 */
export function InterchangeCardGZMTR(props: InterchangeCardGZMTRProps) {
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
                interchangeList[indexRequestedTheme][6],
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
            onChange: val => onUpdate?.(i, [it[0], it[1], it[2], it[3], val, it[5], it[6]]),
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: it[5],
            minW: '80px',
            onChange: val => onUpdate?.(i, [it[0], it[1], it[2], it[3], it[4], val, it[6]]),
        },
    ]);

    const handleFoshanChange = (it: InterchangeInfo, i: number, foshan: boolean) =>
        onUpdate?.(i, [it[0], it[1], it[2], it[3], it[4], it[5], foshan ? 'fs' : 'gz']);

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
                        onClick={() => onAdd?.(defaultGZMTRTransferInfo)}
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

                    <VStack>
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

                        <RmgFields
                            fields={[
                                {
                                    type: 'switch',
                                    label: t('panel.details.stations.gzmtrInt.foshan'),
                                    isChecked: it[6] === 'fs',
                                    onChange: val => handleFoshanChange(it, i, val),
                                },
                            ]}
                        />
                    </VStack>
                </HStack>
            ))}
        </RmgCard>
    );
}
