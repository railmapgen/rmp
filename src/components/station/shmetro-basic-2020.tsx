import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { Theme } from '../../constants/constants';
import {
    defaultStationAttributes,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../constants/stations';

type ROTATE = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

const ROTATE_CONST: {
    [rotate: number]: {
        textDx: number;
        textDy: number;
        textAnchor: 'start' | 'middle' | 'end';
        dominantBaseline: 'auto' | 'middle' | 'hanging';
    };
} = {
    0: {
        textDx: 0,
        textDy: -27,
        textAnchor: 'middle',
        dominantBaseline: 'auto',
    },
    45: {
        textDx: 12,
        textDy: -27,
        textAnchor: 'start',
        dominantBaseline: 'auto',
    },
    90: {
        textDx: 12,
        textDy: 0,
        textAnchor: 'start',
        dominantBaseline: 'middle',
    },
    135: {
        textDx: 12,
        textDy: 15,
        textAnchor: 'start',
        dominantBaseline: 'hanging',
    },
    180: {
        textDx: 0,
        textDy: 15,
        textAnchor: 'middle',
        dominantBaseline: 'hanging',
    },
    225: {
        textDx: -12,
        textDy: 15,
        textAnchor: 'end',
        dominantBaseline: 'hanging',
    },
    270: {
        textDx: -12,
        textDy: 0,
        textAnchor: 'end',
        dominantBaseline: 'middle',
    },
    315: {
        textDx: -12,
        textDy: -27,
        textAnchor: 'end',
        dominantBaseline: 'auto',
    },
};

const ShmetroBasic2020Station = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        color = defaultShmetroBasic2020StationAttributes.color,
        rotate = defaultShmetroBasic2020StationAttributes.rotate,
    } = attrs[StationType.ShmetroBasic2020] ?? defaultShmetroBasic2020StationAttributes;

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

    return React.useMemo(
        () => (
            <g id={`stn_${id}`}>
                <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                    <rect
                        id={`stn_core_${id}`}
                        x="-2.5"
                        y="-10"
                        width="5"
                        height="10"
                        stroke="none"
                        fill={color[2]}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </g>
                <g transform={`translate(${x + ROTATE_CONST[rotate].textDx}, ${y + ROTATE_CONST[rotate].textDy})`}>
                    <text
                        textAnchor={ROTATE_CONST[rotate].textAnchor}
                        dominantBaseline={ROTATE_CONST[rotate].dominantBaseline}
                    >
                        {names[0]}
                    </text>
                    <text
                        fontSize={10}
                        dy={12}
                        textAnchor={ROTATE_CONST[rotate].textAnchor}
                        dominantBaseline={ROTATE_CONST[rotate].dominantBaseline}
                    >
                        {names[1]}
                    </text>
                </g>
            </g>
        ),
        [id, x, y, ...names, rotate, color, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * <ShmetroBasic2020Station /> specific props.
 */
export interface ShmetroBasic2020StationAttributes extends StationAttributes {
    rotate: ROTATE;
    color: Theme;
}

const defaultShmetroBasic2020StationAttributes: ShmetroBasic2020StationAttributes = {
    ...defaultStationAttributes,
    rotate: 0,
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const shmetroBasic2020StationFields = [
    {
        type: 'input',
        label: 'panel.details.station.shmetroBasic2020.nameZh',
        value: (attrs?: ShmetroBasic2020StationAttributes) =>
            (attrs ?? defaultShmetroBasic2020StationAttributes).names[0],
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: ShmetroBasic2020StationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasic2020StationAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.shmetroBasic2020.nameEn',
        value: (attrs?: ShmetroBasic2020StationAttributes) =>
            (attrs ?? defaultShmetroBasic2020StationAttributes).names[1],
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: ShmetroBasic2020StationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasic2020StationAttributes;
            // set value
            attrs.names[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroBasic2020.rotate',
        value: (attrs?: ShmetroBasic2020StationAttributes) =>
            (attrs ?? defaultShmetroBasic2020StationAttributes).rotate,
        options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
        onChange: (val: string | number, attrs_: ShmetroBasic2020StationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasic2020StationAttributes;
            // set value
            attrs.rotate = Number(val) as ROTATE;
            // return modified attrs
            return attrs;
        },
    },
];

const shmetroBasic2020StationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="6" y="9" width="12" height="6" stroke="currentColor" fill="none" />
    </svg>
);

const shmetroBasic2020Station: Station<ShmetroBasic2020StationAttributes> = {
    component: ShmetroBasic2020Station,
    icon: shmetroBasic2020StationIcon,
    defaultAttrs: defaultShmetroBasic2020StationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: shmetroBasic2020StationFields,
    tags: ['station', 'shmetro'],
    displayName: 'panel.details.station.shmetroBasic2020.displayName',
};

export default shmetroBasic2020Station;
