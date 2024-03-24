import { Box, HStack, IconButton, NumberInput, NumberInputField, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdContentCopy, MdDelete } from 'react-icons/md';
import { AttrsProps, CanvasType, CategoriesType, CityCode, Theme } from '../../../constants/constants';
import {
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../../panels/theme-button';
import { MultilineText } from '../common/multiline-text';

const X_HEIGHT = 5;
const ROTATE_CONST: {
    [rotate: number]: {
        textDx: number;
        textDy: number;
        textAnchor: 'start' | 'middle' | 'end';
        lineHeight: 0 | 6.67 | 12.67;
        polarity: -1 | 0 | 1;
    };
} = {
    0: {
        textDx: 0,
        textDy: -(X_HEIGHT / 2 + X_HEIGHT * 1.33),
        textAnchor: 'middle',
        lineHeight: 6.67,
        polarity: -1,
    },
    45: {
        textDx: 1,
        textDy: -16.25,
        textAnchor: 'start',
        lineHeight: 6.67,
        polarity: -1,
    },
    90: {
        textDx: 12,
        textDy: 0,
        textAnchor: 'start',
        lineHeight: 0,
        polarity: 0,
    },
    135: {
        textDx: 5,
        textDy: 21,
        textAnchor: 'start',
        lineHeight: 12.67,
        polarity: 1,
    },
    180: {
        textDx: 0,
        textDy: X_HEIGHT / 2 + X_HEIGHT * 1.33,
        textAnchor: 'middle',
        lineHeight: 12.67,
        polarity: 1,
    },
    225: {
        textDx: -5,
        textDy: 21,
        textAnchor: 'end',
        lineHeight: 12.67,
        polarity: 1,
    },
    270: {
        textDx: -12,
        textDy: 0,
        textAnchor: 'end',
        lineHeight: 0,
        polarity: 0,
    },
    315: {
        textDx: -1,
        textDy: -16.25,
        textAnchor: 'end',
        lineHeight: 6.67,
        polarity: -1,
    },
};

type InterchangeInfo = [...Theme, number];
const defaultTransferInfo = [CityCode.London, 'central', '#DC241F', MonoColour.white, 0] as InterchangeInfo;

const LondonTubeBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        transfer = defaultLondonTubeBasicStationAttributes.transfer,
        rotate = defaultLondonTubeBasicStationAttributes.rotate,
        terminal = defaultLondonTubeBasicStationAttributes.terminal,
        stepFreeAccess = defaultLondonTubeBasicStationAttributes.stepFreeAccess,
    } = attrs[StationType.LondonTubeBasic] ?? defaultLondonTubeBasicStationAttributes;

    const textDy =
        ROTATE_CONST[rotate].textDy + // fixed dy for each rotation
        (names[0].split('\n').length - 1) * ROTATE_CONST[rotate].lineHeight * ROTATE_CONST[rotate].polarity; // dynamic dy of n lines

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    const height = terminal ? (0.66 * X_HEIGHT + X_HEIGHT / 2) * 2 : X_HEIGHT * 0.66 + 0.1;

    return (
        <g id={id}>
            <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                {transfer[0].map(info => (
                    <rect
                        id={`stn_core_${id}`}
                        key={`${id}_${info[2]}_${info[4]}`}
                        x={(-X_HEIGHT * 0.66) / 2}
                        y={-X_HEIGHT * 0.66 - X_HEIGHT / 2}
                        width={X_HEIGHT * 0.66}
                        height={height}
                        stroke="none"
                        fill={info[2]}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                ))}
            </g>
            <g
                transform={`translate(${x + ROTATE_CONST[rotate].textDx}, ${y + textDy})`}
                textAnchor={ROTATE_CONST[rotate].textAnchor}
                fill="#003888"
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={X_HEIGHT}
                    lineHeight={2 * X_HEIGHT}
                    grow="up"
                    baseOffset={1}
                    className="rmp-name__tube"
                />
            </g>
        </g>
    );
};

/**
 * LondonTubeBasicStation specific props.
 */
export interface LondonTubeBasicStationAttributes extends StationAttributes {
    transfer: InterchangeInfo[][];
    rotate: Rotate;
    terminal: boolean;
    stepFreeAccess: 'none' | 'train' | 'platform';
}

const defaultLondonTubeBasicStationAttributes: LondonTubeBasicStationAttributes = {
    names: ['Station'],
    transfer: [[defaultTransferInfo]],
    rotate: 0,
    terminal: false,
    stepFreeAccess: 'none',
};

const londonTubeBasicAttrsComponent = (props: AttrsProps<LondonTubeBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.rotate'),
            value: attrs.rotate,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: val => {
                attrs.rotate = Number(val) as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.londonTube.terminal'),
            isChecked: attrs.terminal,
            isDisabled: attrs.transfer[0].length > 1,
            onChange: (val: boolean) => {
                attrs.terminal = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.londonTube.stepFreeAccess'),
            value: attrs.stepFreeAccess,
            options: {
                none: t('panel.details.stations.londonTubeBasic.stepFreeAccessNone'),
                train: t('panel.details.stations.londonTubeBasic.stepFreeAccessTrain'),
                platform: t('panel.details.stations.londonTubeBasic.stepFreeAccessPlatform'),
            },
            onChange: val => {
                attrs.stepFreeAccess = val as 'none' | 'train' | 'platform';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonTubeBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="6" y="9" width="12" height="6" stroke="currentColor" fill="currentColor" />
    </svg>
);

const londonTubeBasicStation: Station<LondonTubeBasicStationAttributes> = {
    component: LondonTubeBasicStation,
    icon: londonTubeBasicStationIcon,
    defaultAttrs: defaultLondonTubeBasicStationAttributes,
    attrsComponent: londonTubeBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.londonTubeBasic.displayName',
        cities: [CityCode.London],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default londonTubeBasicStation;

interface InterchangeCardProps {
    interchangeList: InterchangeInfo[];
    onAdd?: (info: InterchangeInfo) => void;
    onDelete?: (index: number) => void;
    onUpdate?: (index: number, info: InterchangeInfo) => void;
}

function InterchangeCard(props: InterchangeCardProps) {
    const { interchangeList, onAdd, onDelete, onUpdate } = props;
    const dispatch = useRootDispatch();
    const {
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);

    const { t } = useTranslation();

    const [indexRequestedTheme, setIndexRequestedTheme] = React.useState<number>();

    React.useEffect(() => {
        if (indexRequestedTheme !== undefined && output) {
            onUpdate?.(indexRequestedTheme, [...output, interchangeList[indexRequestedTheme][4]]);
            setIndexRequestedTheme(undefined);
        }
    }, [output?.toString()]);

    return (
        <RmgCard direction="column">
            {interchangeList.length === 0 && (
                <HStack spacing={0.5} data-testid={`interchange-card-stack`}>
                    <Text as="i" flex={1} align="center" fontSize="md" colorScheme="gray">
                        {t('panel.details.stations.interchange.noTrackShare')}
                    </Text>

                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={t('panel.details.stations.interchange.add')}
                        onClick={() => onAdd?.(defaultTransferInfo)}
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

                    <RmgLabel label={t('panel.details.stations.londonTubeBasic.shareTracks')}>
                        <NumberInput
                            key={i}
                            width="80px"
                            inputMode="numeric"
                            mr="2"
                            mb="2"
                            value={it[4]}
                            onChange={val => onUpdate?.(i, [it[0], it[1], it[2], it[3], Number(val)])}
                        >
                            <NumberInputField />
                        </NumberInput>
                    </RmgLabel>

                    <VStack>
                        {onAdd && i === interchangeList.length - 1 ? (
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
                    </VStack>
                </HStack>
            ))}
        </RmgCard>
    );
}
