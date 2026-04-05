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
import { useNameDrag } from '../../../util/use-name-drag';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { getNameOffsetField } from '../../panels/details/name-offset-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

export const NAME_DY_KM_BASIC = {
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

const KunmingRTBasicStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        preciseNameOffsets = defaultStationAttributes.preciseNameOffsets,
        nameOffsetX = defaultKunmingRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultKunmingRTBasicStationAttributes.nameOffsetY,
        color = defaultKunmingRTBasicStationAttributes.color,
    } = attrs[StationType.KunmingRTBasic] ?? defaultKunmingRTBasicStationAttributes;

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

    const nameDragHandlers = useNameDrag(id);

    const textX = nameOffsetX === 'left' ? -13.33 : nameOffsetX === 'right' ? 13.33 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_KM_BASIC[nameOffsetY].lineHeight +
            NAME_DY_KM_BASIC[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <circle id={`stn_core_${id}`} r="5" stroke={color[2]} strokeWidth="1.33" fill="white" />
            <g
                id={`stn_name_${id}`}
                transform={`translate(${preciseNameOffsets ? `${preciseNameOffsets.x}, ${preciseNameOffsets.y}` : `${textX}, ${textY}`})`}
                textAnchor={preciseNameOffsets ? preciseNameOffsets.anchor : textAnchor}
                className="rmp-name-outline"
                strokeWidth="2.5"
                {...nameDragHandlers}
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
 * KunmingRTBasicStation specific props.
 */
export interface KunmingRTBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultKunmingRTBasicStationAttributes: KunmingRTBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    color: [CityCode.Kunming, 'km1', '#ea3222', MonoColour.white],
};

const KunmingRTBasicAttrsComponent = (props: AttrsProps<KunmingRTBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

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
            value: attrs.names.at(1) ?? defaultKunmingRTBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        ...getNameOffsetField({
            id,
            attrs,
            nameOffsetX: attrs.nameOffsetX,
            nameOffsetY: attrs.nameOffsetY,
            preciseNameOffsets: attrs.preciseNameOffsets,
            handleAttrsUpdate,
        }),
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.KunmingRTBasic}
                    defaultTheme={defaultKunmingRTBasicStationAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const kunmingRTBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle r="5" cx="12" cy="12" stroke="currentColor" strokeWidth="1.33" fill="none" />
    </svg>
);

const kunmingRTBasicStation: Station<KunmingRTBasicStationAttributes> = {
    component: KunmingRTBasicStation,
    icon: kunmingRTBasicStationIcon,
    defaultAttrs: defaultKunmingRTBasicStationAttributes,
    attrsComponent: KunmingRTBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.kunmingRTBasic.displayName',
        cities: [CityCode.Kunming],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default kunmingRTBasicStation;
