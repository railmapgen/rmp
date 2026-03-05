import { Box, FormLabel, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField, RmgLabel, RmgThrottledSlider } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdContentCopy, MdDelete } from 'react-icons/md';
import { AttrsProps, CanvasType, CategoriesType, CityCode, StnId, Theme } from '../../../constants/constants';
import {
    defaultStationAttributes,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import ThemeButton from '../../panels/theme-button';
import { MultilineText } from '../common/multiline-text';

const X_HEIGHT = 5;
const FONT_SIZE = 2 * X_HEIGHT;
const LINE_HEIGHT = 0.85 * FONT_SIZE;
const ROTATE_CONST: {
    [rotate: number]: {
        textDx: number;
        textDy: number;
        /**
         * Used when terminal is true and rotate !== terminalNameRotate.
         */
        textTerminalDx: number;
        /**
         * Used when terminal is true and rotate !== terminalNameRotate.
         */
        textTerminalDy: number;
        textAnchor: React.SVGProps<SVGTextElement>['textAnchor'];
        dominantBaseline: React.SVGProps<SVGTextElement>['dominantBaseline'];
        polarity: -1 | 0 | 1;
        grow: 'up' | 'down' | 'bidirectional';
    };
} = {
    0: {
        textDx: 0,
        textDy: -(X_HEIGHT / 2 + X_HEIGHT * 1.33),
        textTerminalDx: 0,
        textTerminalDy: -(X_HEIGHT / 2),
        textAnchor: 'middle',
        dominantBaseline: 'auto',
        polarity: -1,
        grow: 'up',
    },
    45: {
        textDx: (X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textDy: -(X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textTerminalDx: (X_HEIGHT / 2) * Math.SQRT1_2,
        textTerminalDy: -(X_HEIGHT / 2) * Math.SQRT1_2,
        textAnchor: 'start',
        dominantBaseline: 'auto',
        polarity: -1,
        grow: 'up',
    },
    90: {
        textDx: X_HEIGHT / 2 + X_HEIGHT * 1.33,
        textDy: 0,
        textTerminalDx: X_HEIGHT / 2,
        textTerminalDy: 0,
        textAnchor: 'start',
        dominantBaseline: 'middle',
        polarity: 0,
        grow: 'bidirectional',
    },
    135: {
        textDx: (X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textDy: (X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textTerminalDx: (X_HEIGHT / 2) * Math.SQRT1_2,
        textTerminalDy: (X_HEIGHT / 2) * Math.SQRT1_2,
        textAnchor: 'start',
        dominantBaseline: 'hanging',
        polarity: 1,
        grow: 'down',
    },
    180: {
        textDx: 0,
        textDy: X_HEIGHT / 2 + X_HEIGHT * 1.33,
        textTerminalDx: 0,
        textTerminalDy: X_HEIGHT / 2,
        textAnchor: 'middle',
        dominantBaseline: 'hanging',
        polarity: 1,
        grow: 'down',
    },
    225: {
        textDx: -(X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textDy: (X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textTerminalDx: -(X_HEIGHT / 2) * Math.SQRT1_2,
        textTerminalDy: (X_HEIGHT / 2) * Math.SQRT1_2,
        textAnchor: 'end',
        dominantBaseline: 'hanging',
        polarity: 1,
        grow: 'down',
    },
    270: {
        textDx: -(X_HEIGHT / 2 + X_HEIGHT * 1.33),
        textDy: 0,
        textTerminalDx: -(X_HEIGHT / 2),
        textTerminalDy: 0,
        textAnchor: 'end',
        dominantBaseline: 'middle',
        polarity: 0,
        grow: 'bidirectional',
    },
    315: {
        textDx: -(X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textDy: -(X_HEIGHT / 2 + X_HEIGHT * 1.33) * Math.SQRT1_2,
        textTerminalDx: -(X_HEIGHT / 2) * Math.SQRT1_2,
        textTerminalDy: -(X_HEIGHT / 2) * Math.SQRT1_2,
        textAnchor: 'end',
        dominantBaseline: 'auto',
        polarity: -1,
        grow: 'up',
    },
};

type InterchangeInfo = [...Theme, number];
const defaultTransferInfo = [CityCode.London, 'central', '#DC241F', MonoColour.white, 0] as InterchangeInfo;

interface AccessibleIconProps extends React.SVGProps<SVGGElement> {
    id: StnId;
    stepFreeAccess: 'train' | 'platform';
}

export const AccessibleIcon = React.memo(
    (props: AccessibleIconProps) => {
        const { id, stepFreeAccess, ...svgGProps } = props;
        return (
            <g {...svgGProps}>
                <path
                    fill={stepFreeAccess === 'train' ? '#1C3E93' : 'white'}
                    stroke="#1C3E93"
                    strokeWidth={0.5 * X_HEIGHT}
                    d="M0-31c17.1,0,31,13.9,31,31S17.1,31,0,31S-31,17.1-31,0S-17.1-31,0-31"
                />
                <path
                    fill={stepFreeAccess === 'train' ? 'white' : '#1C3E93'}
                    d="M-10.5,9c1.4,4.9,6,8.4,11.3,8.4c6.5,0,11.8-5.3,11.8-11.8c0-3.4-1.5-6.5-3.8-8.7l0.7-5.1
	c4.6,2.9,7.6,8,7.6,13.8c0,9-7.3,16.3-16.3,16.3c-5.9,0-11-3.1-13.9-7.7L-10.5,9z"
                />
                <path
                    fill={props.stepFreeAccess === 'train' ? 'white' : '#1C3E93'}
                    d="M0.5-20.5c0,2.5,2,4.6,4.6,4.6c2.5,0,4.6-2.1,4.6-4.6s-2.1-4.6-4.6-4.6S0.5-23,0.5-20.5"
                />
                <path
                    fill={stepFreeAccess === 'train' ? 'white' : '#1C3E93'}
                    d="M3-12.4L2.5-9.2h-9.9c0,0-2.1,0.2-2.1,2.2s2.1,2.2,2.1,2.2h9.3l-0.5,3h-12.5c0,0-0.9,0-1.3,0.5
	C-12.8-1-13.2,0-13.2,0l-7,14.2c0,0-0.8,1.8,1.2,2.9c2,1.1,3.3-1,3.3-1l5.5-11.3c0,0,0.5-0.7,1-1c0.6-0.3,1.1-0.3,1.1-0.3H3.4
	c0,0,1.2,0,2.2-0.9c0.9-0.9,1.1-2,1.1-2l1.7-12.4c0,0,0-2.6-2.7-2.7C3.6-14.5,3-12.4,3-12.4"
                />

                {/* Below is an overlay element that has the id info but can not be seen. */}
                <path
                    id={`stn_core_${id}`}
                    fill={stepFreeAccess === 'train' ? '#1C3E93' : 'white'}
                    fillOpacity="0"
                    stroke="#1C3E93"
                    strokeWidth={0.5 * X_HEIGHT}
                    strokeOpacity="0"
                    d="M0-31c17.1,0,31,13.9,31,31S17.1,31,0,31S-31,17.1-31,0S-17.1-31,0-31"
                    className="removeMe"
                />
            </g>
        );
    },
    (prevProps, nextProps) => JSON.stringify(prevProps) === JSON.stringify(nextProps)
);

const LondonTubeBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        transfer = defaultLondonTubeBasicStationAttributes.transfer,
        rotate = defaultLondonTubeBasicStationAttributes.rotate,
        terminal = defaultLondonTubeBasicStationAttributes.terminal,
        terminalNameRotate = defaultLondonTubeBasicStationAttributes.terminalNameRotate,
        stepFreeAccess = defaultLondonTubeBasicStationAttributes.stepFreeAccess,
    } = attrs[StationType.LondonTubeBasic] ?? defaultLondonTubeBasicStationAttributes;

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

    // rotate starts from top-middle while Math.sin/cos starts from middle-right
    const rad = ((rotate - 90) * Math.PI) / 180;
    // 0.5 cover the gap between the station icon and the line
    const height = terminal ? 2 * (0.66 * X_HEIGHT + X_HEIGHT / 2) : 0.66 * X_HEIGHT + 0.5;
    const textRotate = terminal ? terminalNameRotate : rotate;
    // whether the text in the terminal station is positioned other than the rotation
    const isTextTerminal = terminal && rotate !== terminalNameRotate;
    const textDx =
        (isTextTerminal ? ROTATE_CONST[textRotate].textTerminalDx : ROTATE_CONST[textRotate].textDx) + // fixed dx for each rotation
        Math.cos(rad) * Math.max(...transfer[0].map(_ => _[4])) * X_HEIGHT; // dynamic dx of n share tracks
    const textDy =
        (isTextTerminal ? ROTATE_CONST[textRotate].textTerminalDy : ROTATE_CONST[textRotate].textDy) + // fixed dy for each rotation
        Math.sin(rad) * Math.max(...transfer[0].map(_ => _[4])) * X_HEIGHT; // dynamic dy of n share tracks

    const accessibleD =
        -((Math.max(...transfer[0].map(_ => _[4])) + Math.min(...transfer[0].map(_ => _[4]))) / 2) * X_HEIGHT;
    const accessibleDX = Math.sin((rotate * Math.PI) / 180) * accessibleD;
    const accessibleDY = Math.cos((rotate * Math.PI) / 180) * accessibleD;

    return (
        <g id={id}>
            <g
                transform={`translate(${x}, ${y})rotate(${rotate})`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                {stepFreeAccess === 'none' ? (
                    transfer[0].map(info => (
                        <rect
                            id={`stn_core_${id}`}
                            key={`${id}_${info[2]}_${info[4]}`}
                            x={(-X_HEIGHT * 0.66) / 2}
                            y={-X_HEIGHT * 0.66 - X_HEIGHT / 2 - X_HEIGHT * info[4]}
                            width={X_HEIGHT * 0.66}
                            height={height}
                            stroke="none"
                            fill={info[2]}
                        />
                    ))
                ) : (
                    <AccessibleIcon
                        key={`stn_core_${id}`}
                        id={id}
                        stepFreeAccess={stepFreeAccess}
                        transform={`translate(${accessibleDX},${accessibleDY})rotate(${-rotate})scale(0.2333)`}
                    />
                )}
            </g>
            <g
                transform={`translate(${x + textDx}, ${y + textDy})`}
                textAnchor={ROTATE_CONST[textRotate].textAnchor}
                fill="#003888"
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={FONT_SIZE}
                    lineHeight={LINE_HEIGHT}
                    dominantBaseline={ROTATE_CONST[textRotate].dominantBaseline}
                    grow={ROTATE_CONST[textRotate].grow}
                    baseOffset={0}
                    {...getLangStyle(TextLanguage.tube)}
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
    /**
     * When terminal is set, station name position is controlled by terminalNameRotate.
     */
    terminalNameRotate: Rotate;
    stepFreeAccess: 'none' | 'train' | 'platform';
}

const defaultLondonTubeBasicStationAttributes: LondonTubeBasicStationAttributes = {
    names: ['Station'],
    transfer: [[defaultTransferInfo]],
    rotate: 0,
    terminal: false,
    terminalNameRotate: 0,
    stepFreeAccess: 'none',
};

const londonTubeBasicAttrsComponent = (props: AttrsProps<LondonTubeBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const terminalNameRotateOptions: Record<number, string> = Object.fromEntries([
        [(attrs.rotate + 0) % 360, ((attrs.rotate + 0) % 360).toString()],
        [(attrs.rotate + 90) % 360, ((attrs.rotate + 90) % 360).toString()],
        [(attrs.rotate + 270) % 360, ((attrs.rotate + 270) % 360).toString()],
    ]);

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
                if (attrs.terminal) attrs.terminalNameRotate = attrs.rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.londonTubeBasic.terminal'),
            isChecked: attrs.terminal,
            isDisabled: attrs.transfer[0].length > 1,
            onChange: (val: boolean) => {
                attrs.terminal = val;
                attrs.terminalNameRotate = attrs.rotate;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.londonTubeBasic.terminalNameRotate'),
            value: attrs.terminalNameRotate,
            options: terminalNameRotateOptions,
            onChange: val => {
                attrs.terminalNameRotate = val as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            hidden: !attrs.terminal || attrs.stepFreeAccess !== 'none',
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.londonTubeCommon.stepFreeAccess'),
            value: attrs.stepFreeAccess,
            options: {
                none: t('panel.details.stations.londonTubeCommon.stepFreeAccessNone'),
                train: t('panel.details.stations.londonTubeCommon.stepFreeAccessTrain'),
                platform: t('panel.details.stations.londonTubeCommon.stepFreeAccessPlatform'),
            },
            onChange: val => {
                attrs.stepFreeAccess = val as 'none' | 'train' | 'platform';
                attrs.terminal = false;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    const transfer = attrs.transfer ?? defaultLondonTubeBasicStationAttributes.transfer;

    const handleAdd = (setIndex: number) => (interchangeInfo: InterchangeInfo) => {
        const newTransferInfo = structuredClone(transfer);
        if (newTransferInfo.length <= setIndex) {
            for (let i = newTransferInfo.length; i <= setIndex; i++) {
                newTransferInfo[i] = [defaultTransferInfo];
            }
        }
        newTransferInfo[setIndex].push(interchangeInfo);

        attrs.transfer = newTransferInfo;
        handleAttrsUpdate(id, attrs);
    };

    const handleDelete = (setIndex: number) => (interchangeIndex: number) => {
        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex ? set.filter((_, intIdx) => intIdx !== interchangeIndex) : set
            );

            attrs.transfer = newTransferInfo;
            handleAttrsUpdate(id, attrs);
        }
    };

    const handleUpdate = (setIndex: number) => (interchangeIndex: number, interchangeInfo: InterchangeInfo) => {
        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex
                    ? set.map((int, intIdx) =>
                          intIdx === interchangeIndex
                              ? ([0, 1, 2, 3, 4, 5, 6].map(i =>
                                    interchangeInfo[i] === undefined ? int[i] : interchangeInfo[i]
                                ) as InterchangeInfo)
                              : int
                      )
                    : set
            );

            attrs.transfer = newTransferInfo;
            handleAttrsUpdate(id, attrs);
        }
    };

    return (
        <>
            <RmgFields fields={fields} />
            <RmgLabel label={t('panel.details.stations.interchange.title')}>
                <VStack align="flex-start">
                    <FormLabel size="xs">{t('panel.details.stations.londonTubeBasic.shareTracks')}</FormLabel>
                    <InterchangeCard
                        interchangeList={transfer[0]}
                        onAdd={handleAdd(0)}
                        onDelete={handleDelete(0)}
                        onUpdate={handleUpdate(0)}
                    />
                </VStack>
            </RmgLabel>
        </>
    );
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
        paletteAppClip: { input, output },
    } = useRootSelector(state => state.runtime);

    const { t } = useTranslation();

    const [indexRequestedTheme, setIndexRequestedTheme] = React.useState<number>();
    React.useEffect(() => {
        if (indexRequestedTheme === undefined) {
            return;
        }
        if (output) {
            onUpdate?.(indexRequestedTheme, [...output, interchangeList[indexRequestedTheme][4]]);
            setIndexRequestedTheme(undefined);
        } else if (!input) {
            setIndexRequestedTheme(undefined);
        }
    }, [input, output]);

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

                    <RmgLabel label={t('panel.details.stations.londonTubeBasic.shareTracksIndex')}>
                        <RmgThrottledSlider
                            defaultValue={it[4]}
                            min={-5}
                            max={5}
                            step={1}
                            onThrottledChange={val => onUpdate?.(i, [it[0], it[1], it[2], it[3], val])}
                        />
                    </RmgLabel>

                    <VStack>
                        {onAdd && i === interchangeList.length - 1 ? (
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.copy')}
                                onClick={() => {
                                    const info = structuredClone(interchangeList.slice(-1)[0]);
                                    info[4] = Math.max(...interchangeList.map(_ => _[4])) + 1;
                                    onAdd?.(info);
                                }} // duplicate last leg
                                icon={<MdContentCopy />}
                            />
                        ) : (
                            <Box minW={8} />
                        )}

                        {onDelete && i !== 0 && (
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
