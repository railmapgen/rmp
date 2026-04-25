import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
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
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import {
    PRECISE_NAME_OFFSETS_CUSTOM_VALUE,
    getPreciseNameOffsetsSelectState,
} from '../../panels/details/name-offset-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

export const NAME_DY_HZ_BASIC = {
    top: {
        lineHeight: 12,
        offset: 3.25 + 3.25, // offset + iconRadius
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 18,
        offset: -0.17 + 1 + 5, // offset + iconRadius
    },
};

const HzmetroBasicStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        preciseNameOffsets = defaultStationAttributes.preciseNameOffsets,
        nameOffsetX = defaultHzmetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultHzmetroBasicStationAttributes.nameOffsetY,
        color = defaultHzmetroBasicStationAttributes.color,
        scale = defaultHzmetroBasicStationAttributes.scale,
    } = attrs[StationType.HzmetroBasic] ?? defaultHzmetroBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -4 : nameOffsetX === 'right' ? 4 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_HZ_BASIC[nameOffsetY].lineHeight +
            NAME_DY_HZ_BASIC[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    const defaultNameLayout: NameLayout = {
        x: textX,
        y: textY,
        anchor: textAnchor,
    };
    const { canDrag, dragHandlers, previewPreciseNameOffsets } = useDraggableStationName<StationAttributes>(
        id,
        StationType.HzmetroBasic,
        defaultNameLayout
    );
    const nameLayout = previewPreciseNameOffsets ?? preciseNameOffsets ?? defaultNameLayout;

    return (
        <g>
            <circle
                id={`stn_core_${id}`}
                r={3.25}
                stroke={color[2]}
                strokeWidth="1"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g
                id={`stn_name_${id}`}
                transform={`translate(${nameLayout.x}, ${nameLayout.y}) scale(${scale} 1)`}
                textAnchor={nameLayout.anchor}
                className="rmp-name-outline"
                strokeWidth="2.5"
                style={{ cursor: canDrag ? 'grab' : undefined }}
                {...dragHandlers}
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={18}
                    lineHeight={18}
                    grow="up"
                    baseOffset={1}
                    letterSpacing={2}
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    y="2"
                    text={names[1].split('\n')}
                    dx={nameOffsetX === 'right' ? 1.67 : 0}
                    fontSize={12}
                    lineHeight={12}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

/**
 * HzmetroBasicStation specific props.
 */
export interface HzmetroBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    scale: number;
}

const defaultHzmetroBasicStationAttributes: HzmetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    scale: 1,
    color: [CityCode.Hangzhou, 'hz1', '#e8384a', MonoColour.white],
};

const hzmetroBasicAttrsComponent = (props: AttrsProps<HzmetroBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const customLabel = t('panel.details.stations.common.custom');
    const nameOffsetXSelect = getPreciseNameOffsetsSelectState({
        attrs,
        value: attrs.nameOffsetX ?? defaultHzmetroBasicStationAttributes.nameOffsetX,
        options: {
            left: t('panel.details.stations.common.left'),
            middle: t('panel.details.stations.common.middle'),
            right: t('panel.details.stations.common.right'),
        },
        customLabel,
        disabledOptions:
            (attrs.nameOffsetY ?? defaultHzmetroBasicStationAttributes.nameOffsetY) === 'middle' ? ['middle'] : [],
    });
    const nameOffsetYSelect = getPreciseNameOffsetsSelectState({
        attrs,
        value: attrs.nameOffsetY ?? defaultHzmetroBasicStationAttributes.nameOffsetY,
        options: {
            top: t('panel.details.stations.common.top'),
            middle: t('panel.details.stations.common.middle'),
            bottom: t('panel.details.stations.common.bottom'),
        },
        customLabel,
        disabledOptions:
            (attrs.nameOffsetX ?? defaultHzmetroBasicStationAttributes.nameOffsetX) === 'middle' ? ['middle'] : [],
    });

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0] ?? defaultHzmetroBasicStationAttributes.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultHzmetroBasicStationAttributes.names[1],
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
        {
            type: 'slider',
            label: t('panel.details.stations.hzmetroBasic.scale'),
            value: attrs.scale ?? defaultHzmetroBasicStationAttributes.scale,
            onChange: val => {
                attrs.scale = val;
                handleAttrsUpdate(id, attrs);
            },
            step: 0.025,
            min: 0.5,
            max: 1,
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={StationType.HzmetroBasic} defaultTheme={defaultHzmetroBasicStationAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const hzmetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="white" />
    </svg>
);

const hzmetroBasicStation: Station<HzmetroBasicStationAttributes> = {
    component: HzmetroBasicStation,
    icon: hzmetroBasicStationIcon,
    defaultAttrs: defaultHzmetroBasicStationAttributes,
    attrsComponent: hzmetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.hzmetroBasic.displayName',
        cities: [CityCode.Hangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default hzmetroBasicStation;
