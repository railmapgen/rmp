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
import { NameLayout, useDraggableStationName } from '../../../util/use-draggable-station-name';
import {
    PRECISE_NAME_OFFSETS_CUSTOM_VALUE,
    getPreciseNameOffsetsSelectState,
} from '../../panels/details/name-offset-field';
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

const WuhanRTIntStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        preciseNameOffsets = defaultStationAttributes.preciseNameOffsets,
        nameOffsetX = defaultWuhanRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultWuhanRTIntStationAttributes.nameOffsetY,
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

    const radius = 7.5;
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

    return (
        <g>
            {/* White circle background */}
            <circle
                id={`stn_core_${id}`}
                r={radius}
                fill="white"
                stroke="#0067a1"
                strokeWidth="1.2"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            {/* Transfer icon - scaled to fill the circle */}
            <g transform="scale(0.32)">
                <path
                    fill="#0067a1"
                    fillRule="evenodd"
                    d="M42.16,44.08c0-6.09,6.41-7.73,8.38-7.73,0,0-.01-1.41,0-1.41-6.85,0-12.27,4.18-12.27,9.14v8.54h-4.18l6.13,7.27,6.13-7.27h-4.18v-8.54Z"
                    transform="translate(-49.84, -50.15)"
                />
                <path
                    fill="#0067a1"
                    fillRule="evenodd"
                    d="M57.53,56.22c0,6.09-6.41,7.73-8.38,7.73,0,0,.01,1.41,0,1.41,6.85,0,12.27-4.18,12.27-9.14v-8.54h4.18s-6.13-7.27-6.13-7.27l-6.13,7.27h4.18v8.54Z"
                    transform="translate(-49.84, -50.15)"
                />
            </g>
            <g
                id={`stn_name_${id}`}
                transform={`translate(${nameLayout.x}, ${nameLayout.y})`}
                textAnchor={nameLayout.anchor}
                className="rmp-name-outline"
                strokeWidth="2.5"
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
export interface WuhanRTIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultWuhanRTIntStationAttributes: WuhanRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
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
                if (val === PRECISE_NAME_OFFSETS_CUSTOM_VALUE) return;
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
                if (val === PRECISE_NAME_OFFSETS_CUSTOM_VALUE) return;
                attrs.nameOffsetY = val as NameOffsetY;
                delete attrs.preciseNameOffsets;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const wuhanRTIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="10" fill="white" stroke="currentColor" strokeWidth="1.2" />
        <g transform="translate(12, 12) scale(0.35)">
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
