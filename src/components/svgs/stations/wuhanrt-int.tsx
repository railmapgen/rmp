import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import {
    NameLayout,
    getPreciseNameOffsetsSelectState,
    useDraggableStationName,
} from '../../../util/use-draggable-station-name';
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const NAME_DY_WUHAN_INT = {
    top: {
        lineHeight: 6.67,
        offset: 2.5 + 7, // offset + baseOffset + radius
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 10,
        offset: -0.17 + 1 + 7, // offset + baseOffset + radius
    },
};

const WUHAN_RT_INT_COLOUR = '#0066a3';
const WUHAN_RT_INT_RADIUS = 7.5;
const WUHAN_RT_INT_SOURCE_CX = 274.42;
const WUHAN_RT_INT_SOURCE_CY = 273.92;
const WUHAN_RT_INT_SOURCE_RADIUS = 199.58;
const WUHAN_RT_INT_SOURCE_SCALE = WUHAN_RT_INT_RADIUS / WUHAN_RT_INT_SOURCE_RADIUS;
const WUHAN_RT_INT_STROKE_WIDTH = 1.2;
const WUHAN_RT_INT_SOURCE_STROKE_WIDTH = WUHAN_RT_INT_STROKE_WIDTH / WUHAN_RT_INT_SOURCE_SCALE;

const WuhanRTIntTwoLineIcon = (props: { color: string }) => {
    const { color } = props;

    return (
        <g>
            <circle
                r={WUHAN_RT_INT_RADIUS}
                fill="var(--chakra-colors-chakra-body-bg)"
                stroke={color}
                strokeWidth={WUHAN_RT_INT_STROKE_WIDTH}
            />
            <g transform="scale(0.32)">
                <path
                    fill={color}
                    fillRule="evenodd"
                    d="M42.16,44.08c0-6.09,6.41-7.73,8.38-7.73,0,0-.01-1.41,0-1.41-6.85,0-12.27,4.18-12.27,9.14v8.54h-4.18l6.13,7.27,6.13-7.27h-4.18v-8.54Z"
                    transform="translate(-49.84, -50.15)"
                />
                <path
                    fill={color}
                    fillRule="evenodd"
                    d="M57.53,56.22c0,6.09-6.41,7.73-8.38,7.73,0,0,.01,1.41,0,1.41,6.85,0,12.27-4.18,12.27-9.14v-8.54h4.18s-6.13-7.27-6.13-7.27l-6.13,7.27h4.18v8.54Z"
                    transform="translate(-49.84, -50.15)"
                />
            </g>
        </g>
    );
};

const WuhanRTIntThreeLineIcon = (props: { color: string }) => {
    const { color } = props;

    return (
        <g
            transform={`scale(${WUHAN_RT_INT_SOURCE_SCALE}) translate(${-WUHAN_RT_INT_SOURCE_CX} ${-WUHAN_RT_INT_SOURCE_CY})`}
        >
            <circle
                cx={WUHAN_RT_INT_SOURCE_CX}
                cy={WUHAN_RT_INT_SOURCE_CY}
                r={WUHAN_RT_INT_SOURCE_RADIUS}
                fill="var(--chakra-colors-chakra-body-bg)"
                stroke={color}
                strokeMiterlimit={10}
                strokeWidth={WUHAN_RT_INT_SOURCE_STROKE_WIDTH}
            />
            <path
                fill={color}
                stroke={color}
                strokeMiterlimit={10}
                strokeWidth="8"
                d="M189.1,164.03s-57.86,38.79-5.12,135.74c.09.17.19.34.28.52l33.73-10.16.34-.1-17.81,78.58-76.06-40.65,32.71-15.29s-62.52-124.06,31.94-148.65Z"
            />
            <path
                fill={color}
                stroke={color}
                strokeMiterlimit={10}
                strokeWidth="8"
                d="M408,262.55s-.02-.35-.08-1c-.91-8.89-10.99-74.14-111.98-77.39l-3.29,34.26-63.29-61.94,75.87-37.55-4.84,34.65s135.68-4.65,107.61,108.97Z"
            />
            <path
                fill={color}
                stroke={color}
                strokeMiterlimit={10}
                strokeWidth="8"
                d="M216.58,393.19s70.45,32.52,123.1-56.9l-24.19-23.03,78.39-19.74-2.13,82.65-26.32-21.29s-74.32,116.13-148.84,38.32Z"
            />
        </g>
    );
};

const WuhanRTIntStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        preciseNameOffsets = defaultStationAttributes.preciseNameOffsets,
        nameOffsetX = defaultWuhanRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultWuhanRTIntStationAttributes.nameOffsetY,
        transfer = defaultWuhanRTIntStationAttributes.transfer,
    } = attrs[StationType.WuhanRTInt] ?? defaultWuhanRTIntStationAttributes;

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

    const radius = WUHAN_RT_INT_RADIUS;
    const textX = nameOffsetX === 'left' ? -radius - 1 : nameOffsetX === 'right' ? radius + 1 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_WUHAN_INT[nameOffsetY].lineHeight +
            NAME_DY_WUHAN_INT[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    const defaultNameLayout: NameLayout = {
        x: textX,
        y: textY,
        anchor: textAnchor,
    };
    const { canDrag, dragHandlers, previewPreciseNameOffsets } = useDraggableStationName<StationAttributes>(
        id,
        StationType.WuhanRTInt,
        defaultNameLayout
    );
    const nameLayout = previewPreciseNameOffsets ?? preciseNameOffsets ?? defaultNameLayout;
    const hasThreeOrMoreTransfers = (transfer[0]?.length ?? 0) >= 3;

    return (
        <g>
            {hasThreeOrMoreTransfers ? (
                <WuhanRTIntThreeLineIcon color={WUHAN_RT_INT_COLOUR} />
            ) : (
                <WuhanRTIntTwoLineIcon color={WUHAN_RT_INT_COLOUR} />
            )}
            <circle
                id={`stn_core_${id}`}
                r={radius}
                fill="transparent"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g
                id={`stn_name_${id}`}
                transform={`translate(${nameLayout.x}, ${nameLayout.y})`}
                textAnchor={nameLayout.anchor}
                style={{ cursor: canDrag ? 'grab' : undefined }}
                {...dragHandlers}
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={10}
                    lineHeight={10}
                    grow="up"
                    baseOffset={1}
                    fontWeight="bold"
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    dx={nameOffsetX === 'right' ? 1.67 : 0}
                    fontSize={6.67}
                    lineHeight={6.67}
                    grow="down"
                    baseOffset={1.5}
                    fontWeight="bold"
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

/**
 * WuhanRTIntStation specific props.
 */
export interface WuhanRTIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultWuhanRTIntStationAttributes: WuhanRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [[]],
};

const wuhanRTIntAttrsComponent = (props: AttrsProps<WuhanRTIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const customLabel = t('panel.details.stations.common.custom');
    const nameOffsetXSelect = getPreciseNameOffsetsSelectState({
        attrs,
        value: attrs.nameOffsetX,
        options: {
            left: t('panel.details.stations.common.left'),
            middle: t('panel.details.stations.common.middle'),
            right: t('panel.details.stations.common.right'),
        },
        customLabel,
        disabledOptions: attrs.nameOffsetY === 'middle' ? ['middle'] : [],
    });
    const nameOffsetYSelect = getPreciseNameOffsetsSelectState({
        attrs,
        value: attrs.nameOffsetY,
        options: {
            top: t('panel.details.stations.common.top'),
            middle: t('panel.details.stations.common.middle'),
            bottom: t('panel.details.stations.common.bottom'),
        },
        customLabel,
        disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
    });

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultWuhanRTIntStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: nameOffsetXSelect.value,
            options: nameOffsetXSelect.options,
            disabledOptions: nameOffsetXSelect.disabledOptions,
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                delete attrs.preciseNameOffsets;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: nameOffsetYSelect.value,
            options: nameOffsetYSelect.options,
            disabledOptions: nameOffsetYSelect.disabledOptions,
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                delete attrs.preciseNameOffsets;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.stations.interchange.title'),
            component: (
                <InterchangeField
                    stationType={StationType.WuhanRTInt}
                    defaultAttrs={defaultWuhanRTIntStationAttributes}
                    maximumTransfers={[1000, 0, 0]}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const wuhanRTIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle
            cx="12"
            cy="12"
            r="10"
            fill="var(--chakra-colors-chakra-body-bg)"
            stroke="currentColor"
            strokeWidth={WUHAN_RT_INT_STROKE_WIDTH}
        />
        <g transform="translate(12, 12)">
            <g transform="scale(0.426667)">
                <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M42.16,44.08c0-6.09,6.41-7.73,8.38-7.73,0,0-.01-1.41,0-1.41-6.85,0-12.27,4.18-12.27,9.14v8.54h-4.18l6.13,7.27,6.13-7.27h-4.18v-8.54Z"
                    transform="translate(-49.84, -50.15)"
                />
                <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M57.53,56.22c0,6.09-6.41,7.73-8.38,7.73,0,0,.01,1.41,0,1.41,6.85,0,12.27-4.18,12.27-9.14v-8.54h4.18s-6.13-7.27-6.13-7.27l-6.13,7.27h4.18v8.54Z"
                    transform="translate(-49.84, -50.15)"
                />
            </g>
        </g>
    </svg>
);

const wuhanRTIntStation: Station<WuhanRTIntStationAttributes> = {
    component: WuhanRTIntStation,
    icon: wuhanRTIntStationIcon,
    defaultAttrs: defaultWuhanRTIntStationAttributes,
    attrsComponent: wuhanRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.wuhanRTInt.displayName',
        cities: [CityCode.Wuhan],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default wuhanRTIntStation;
