import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

export const ROTATE_CONST: {
    [rotate: number]: {
        textDx: number;
        textDy: number;
        textAnchor: 'start' | 'middle' | 'end';
        namesPos: 0 | 1;
        lineHeight: 0 | 6.67 | 12.67;
        polarity: -1 | 0 | 1;
    };
} = {
    0: {
        textDx: 0,
        textDy: -17.5,
        textAnchor: 'middle',
        namesPos: 1,
        lineHeight: 6.67,
        polarity: -1,
    },
    45: {
        textDx: 1,
        textDy: -16.25,
        textAnchor: 'start',
        namesPos: 1,
        lineHeight: 6.67,
        polarity: -1,
    },
    90: {
        textDx: 12,
        textDy: 0,
        textAnchor: 'start',
        namesPos: 0,
        lineHeight: 0,
        polarity: 0,
    },
    135: {
        textDx: 5,
        textDy: 21,
        textAnchor: 'start',
        namesPos: 0,
        lineHeight: 12.67,
        polarity: 1,
    },
    180: {
        textDx: 0,
        textDy: 22.5,
        textAnchor: 'middle',
        namesPos: 0,
        lineHeight: 12.67,
        polarity: 1,
    },
    225: {
        textDx: -5,
        textDy: 21,
        textAnchor: 'end',
        namesPos: 0,
        lineHeight: 12.67,
        polarity: 1,
    },
    270: {
        textDx: -12,
        textDy: 0,
        textAnchor: 'end',
        namesPos: 0,
        lineHeight: 0,
        polarity: 0,
    },
    315: {
        textDx: -1,
        textDy: -16.25,
        textAnchor: 'end',
        namesPos: 1,
        lineHeight: 6.67,
        polarity: -1,
    },
};

const ShmetroBasic2020Station = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        color = defaultShmetroBasic2020StationAttributes.color,
        rotate = defaultShmetroBasic2020StationAttributes.rotate,
    } = attrs[StationType.ShmetroBasic2020] ?? defaultShmetroBasic2020StationAttributes;

    const textDy =
        ROTATE_CONST[rotate].textDy + // fixed dy for each rotation
        (names[ROTATE_CONST[rotate].namesPos].split('\n').length - 1) *
            ROTATE_CONST[rotate].lineHeight *
            ROTATE_CONST[rotate].polarity; // dynamic dy of n lines (either zh or en)

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

    return (
        <g id={id}>
            <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                <rect
                    id={`stn_core_${id}`}
                    x="-2"
                    y="-7.83"
                    width="4"
                    height="7.83"
                    stroke="none"
                    fill={color[2]}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
            <g
                transform={`translate(${x + ROTATE_CONST[rotate].textDx}, ${y + textDy})`}
                textAnchor={ROTATE_CONST[rotate].textAnchor}
                className="rmp-name-outline"
                strokeWidth="1"
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
                    dx={rotate >= 45 && rotate <= 135 ? 1.67 : 0}
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
 * ShmetroBasic2020Station specific props.
 */
export interface ShmetroBasic2020StationAttributes extends StationAttributes, ColorAttribute {
    rotate: Rotate;
}

const defaultShmetroBasic2020StationAttributes: ShmetroBasic2020StationAttributes = {
    ...defaultStationAttributes,
    rotate: 0,
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const shmetroBasic2020AttrsComponent = (props: AttrsProps<ShmetroBasic2020StationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultShmetroBasic2020StationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
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
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.ShmetroBasic2020}
                    defaultTheme={defaultShmetroBasic2020StationAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const shmetroBasic2020StationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="6" y="9" width="12" height="6" stroke="currentColor" fill="currentColor" />
    </svg>
);

const shmetroBasic2020Station: Station<ShmetroBasic2020StationAttributes> = {
    component: ShmetroBasic2020Station,
    icon: shmetroBasic2020StationIcon,
    defaultAttrs: defaultShmetroBasic2020StationAttributes,
    attrsComponent: shmetroBasic2020AttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.shmetroBasic2020.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default shmetroBasic2020Station;
