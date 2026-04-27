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
import {
    NameLayout,
    PRECISE_NAME_OFFSETS_CUSTOM_VALUE,
    getPreciseNameOffsetsSelectState,
    useDraggableStationName,
} from '../../../util/use-draggable-station-name';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

const NAME_SZ_BASIC = {
    zh: {
        size: 10,
        baseOffset: 1,
    },
    en: {
        size: 5,
        baseOffset: 1.5,
    },
};

const NAME_DY_SZ_BASIC = {
    top: {
        lineHeight: 5,
        offset: 1 + NAME_SZ_BASIC.en.baseOffset + 2.5, // offset + baseOffset + iconRadius
        polarity: -1,
    },
    middle: {
        lineHeight: 0,
        offset: NAME_SZ_BASIC.zh.size / 2,
        polarity: 1,
    },
    bottom: {
        lineHeight: 10,
        offset: 0 + NAME_SZ_BASIC.zh.baseOffset + 2.5, // offset + baseOffset + iconRadius
        polarity: 1,
    },
};

const SuzhouRTBasicStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        preciseNameOffsets = defaultStationAttributes.preciseNameOffsets,
        color = defaultSuzhouRTBasicStationAttributes.color,
        nameOffsetX = defaultSuzhouRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultSuzhouRTBasicStationAttributes.nameOffsetY,
        textVertical = defaultSuzhouRTBasicStationAttributes.textVertical,
    } = attrs[StationType.SuzhouRTBasic] ?? defaultSuzhouRTBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -5 : nameOffsetX === 'right' ? 5 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_SZ_BASIC[nameOffsetY].lineHeight +
            NAME_DY_SZ_BASIC[nameOffsetY].offset) *
        NAME_DY_SZ_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    const textVerticalY = nameOffsetY === 'top' ? -2.5 - 2 : 2.5 + 2; // iconRadius + verticalOffset
    const textVerticalAnchor = nameOffsetY === 'top' ? 'end' : 'start';
    const textVerticalEnX = (names[0].split('\n').length * NAME_SZ_BASIC.zh.size) / 2 + NAME_SZ_BASIC.en.baseOffset;

    const defaultNameLayout: NameLayout = textVertical
        ? { x: 0, y: 0, anchor: 'middle' }
        : {
              x: textX,
              y: textY,
              anchor: textAnchor,
          };
    const { canDrag, dragHandlers, previewPreciseNameOffsets } = useDraggableStationName<StationAttributes>(
        id,
        StationType.SuzhouRTBasic,
        defaultNameLayout
    );
    const nameLayout = previewPreciseNameOffsets ?? preciseNameOffsets ?? defaultNameLayout;

    return (
        <g>
            <circle
                id={`stn_core_${id}`}
                r={3}
                stroke={color[2]}
                strokeWidth="1"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            {!textVertical ? (
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
                        fontSize={NAME_SZ_BASIC.zh.size}
                        lineHeight={NAME_SZ_BASIC.zh.size}
                        grow="up"
                        baseOffset={NAME_SZ_BASIC.zh.baseOffset}
                        {...getLangStyle(TextLanguage.zh)}
                    />
                    <MultilineText
                        text={names[1].split('\n')}
                        fontSize={NAME_SZ_BASIC.en.size}
                        lineHeight={NAME_SZ_BASIC.en.size}
                        grow="down"
                        baseOffset={NAME_SZ_BASIC.en.baseOffset}
                        {...getLangStyle(TextLanguage.en)}
                        fill="gray"
                    />
                </g>
            ) : (
                <g
                    id={`stn_name_${id}`}
                    transform={`translate(${nameLayout.x}, ${nameLayout.y})`}
                    textAnchor={nameLayout.anchor}
                    className="rmp-name-outline"
                    strokeWidth="2.5"
                    style={{ cursor: canDrag ? 'grab' : undefined }}
                    {...dragHandlers}
                >
                    <g transform={`translate(-1, ${textVerticalY})`} textAnchor={textVerticalAnchor}>
                        <MultilineTextVertical
                            text={names[0].split('\n')}
                            fontSize={NAME_SZ_BASIC.zh.size}
                            lineWidth={NAME_SZ_BASIC.zh.size}
                            grow="bidirectional"
                            baseOffset={NAME_SZ_BASIC.zh.baseOffset}
                            dominantBaseline="central"
                            {...getLangStyle(TextLanguage.zh)}
                        />
                    </g>
                    <g
                        transform={`translate(${textVerticalEnX}, ${textVerticalY})rotate(90)`}
                        textAnchor={textVerticalAnchor}
                    >
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={NAME_SZ_BASIC.en.size}
                            lineHeight={NAME_SZ_BASIC.en.size}
                            grow="up"
                            baseOffset={NAME_SZ_BASIC.en.baseOffset}
                            {...getLangStyle(TextLanguage.en)}
                            dominantBaseline="central"
                            fill="gray"
                        />
                    </g>
                </g>
            )}
        </g>
    );
};

/**
 * SuzhouRTBasicStation specific props.
 */
export interface SuzhouRTBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    textVertical: boolean;
}

const defaultSuzhouRTBasicStationAttributes: SuzhouRTBasicStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Suzhou, 'sz1', '#78BA25', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    textVertical: false,
};

const SuzhouRTBasicAttrsComponent = (props: AttrsProps<SuzhouRTBasicStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultSuzhouRTBasicStationAttributes.names[1],
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
                if (val !== 'middle') attrs.textVertical = false;
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
            type: 'switch',
            label: t('panel.details.stations.suzhouRTBasic.textVertical'),
            isChecked: attrs.textVertical ?? defaultSuzhouRTBasicStationAttributes.textVertical,
            isDisabled: attrs.nameOffsetY === 'middle' || attrs.nameOffsetX !== 'middle',
            onChange: (val: boolean) => {
                attrs.textVertical = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.SuzhouRTBasic}
                    defaultTheme={defaultSuzhouRTBasicStationAttributes.color}
                />
            ),
        },
    ];
    return <RmgFields fields={fields} />;
};

const suzhouRTBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" />
    </svg>
);

const suzhouRTBasicStation: Station<SuzhouRTBasicStationAttributes> = {
    component: SuzhouRTBasicStation,
    icon: suzhouRTBasicStationIcon,
    defaultAttrs: defaultSuzhouRTBasicStationAttributes,
    attrsComponent: SuzhouRTBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.suzhouRTBasic.displayName',
        cities: [CityCode.Suzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default suzhouRTBasicStation;
