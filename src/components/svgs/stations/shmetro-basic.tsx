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
import { MultilineText, NAME_DY } from '../common/multiline-text';
import {
    PRECISE_NAME_OFFSETS_CUSTOM_VALUE,
    getPreciseNameOffsetsSelectState,
} from '../../panels/details/name-offset-field';

export const NAME_DY_SH_BASIC = {
    top: {
        lineHeight: 6.67,
        offset: 3.5 + 1.5 + 5, // offset + baseOffset + iconRadius
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 12.67,
        offset: -0.17 + 1 + 5, // offset + baseOffset + iconRadius
    },
};

const ShmetroBasicStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        preciseNameOffsets = defaultStationAttributes.preciseNameOffsets,
        nameOffsetX = defaultShmetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultShmetroBasicStationAttributes.nameOffsetY,
    } = attrs[StationType.ShmetroBasic] ?? defaultShmetroBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -13.33 : nameOffsetX === 'right' ? 13.33 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_SH_BASIC[nameOffsetY].lineHeight +
            NAME_DY_SH_BASIC[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const defaultNameLayout: NameLayout = {
        x: textX,
        y: textY,
        anchor: textAnchor,
    };
    const { canDrag, dragHandlers, previewPreciseNameOffsets } = useDraggableStationName<StationAttributes>(
        id,
        StationType.ShmetroBasic,
        defaultNameLayout
    );
    const nameLayout = previewPreciseNameOffsets ?? preciseNameOffsets ?? defaultNameLayout;

    return (
        <g>
            <circle
                id={`stn_core_${id}`}
                r={5}
                stroke="#393332"
                strokeWidth="1"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
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
                    fontSize={12.67}
                    lineHeight={12.67}
                    grow="up"
                    baseOffset={1}
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    dx={nameOffsetX === 'right' ? 1.67 : 0}
                    fontSize={6.67}
                    lineHeight={6.67}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

/**
 * ShmetroBasicStation specific props.
 */
export interface ShmetroBasicStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultShmetroBasicStationAttributes: ShmetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
};

const shmetroBasicAttrsComponent = (props: AttrsProps<ShmetroBasicStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultShmetroBasicStationAttributes.names[1],
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

const shmetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" fill="none" />
    </svg>
);

const shmetroBasicStation: Station<ShmetroBasicStationAttributes> = {
    component: ShmetroBasicStation,
    icon: shmetroBasicStationIcon,
    defaultAttrs: defaultShmetroBasicStationAttributes,
    attrsComponent: shmetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.shmetroBasic.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default shmetroBasicStation;
