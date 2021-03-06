import React from 'react';
import {
    defaultStationAttributes,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../constants/stations';

const ShmetroIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultShmetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultShmetroIntStationAttributes.nameOffsetY,
        rotate = defaultShmetroIntStationAttributes.rotate,
        width = defaultShmetroIntStationAttributes.width,
        height = defaultShmetroIntStationAttributes.height,
    } = attrs[StationType.ShmetroInt] ?? defaultShmetroIntStationAttributes;

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

    const textDx = nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : 0;
    const textDy = nameOffsetY === 'up' ? -27 : nameOffsetY === 'bottom' ? 15 : 0;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const dominantBaseline = nameOffsetY === 'up' ? 'auto' : nameOffsetY === 'bottom' ? 'hanging' : 'middle';

    return React.useMemo(
        () => (
            <g id={`stn_${id}`}>
                <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                    <rect
                        id={`stn_core_${id}`}
                        x={-width / 2}
                        y={-height / 2}
                        height={height}
                        width={width}
                        ry={height / 2}
                        stroke="black"
                        fill="white"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </g>
                <g transform={`translate(${x + textDx}, ${y + textDy})`}>
                    <text textAnchor={textAnchor} dominantBaseline={dominantBaseline}>
                        {names[0]}
                    </text>
                    <text fontSize={10} dy={12} textAnchor={textAnchor} dominantBaseline={dominantBaseline}>
                        {names[1]}
                    </text>
                </g>
            </g>
        ),
        [id, x, y, ...names, nameOffsetX, nameOffsetY, rotate, width, height, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * <ShmetroIntStation /> specific props.
 */
export interface ShmetroIntStationAttributes extends StationAttributes {
    nameOffsetX: 'left' | 'middle' | 'right';
    nameOffsetY: 'up' | 'middle' | 'bottom';
    /**
     * 0 <= rotate < 180
     */
    rotate: number;
    width: number;
    height: number;
}

const defaultShmetroIntStationAttributes: ShmetroIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'up',
    rotate: 0,
    height: 10,
    width: 15,
};

const shmetroIntStationFields = [
    {
        type: 'input',
        label: 'panel.details.station.shmetroInt.nameZh',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).names[0],
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.shmetroInt.nameEn',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).names[1],
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.names[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.shmetroInt.height',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).height,
        validator: (val: string) => Number.isInteger(val),
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.height = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.shmetroInt.width',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).width,
        validator: (val: string) => Number.isInteger(val),
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.width = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroInt.nameOffsetX',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.nameOffsetX = val as 'left' | 'middle' | 'right';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroInt.nameOffsetY',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).nameOffsetY,
        options: { up: 'up', middle: 'middle', bottom: 'bottom' },
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as 'up' | 'middle' | 'bottom';
            // return modified attrs
            return attrs;
        },
    },
];

const shmetroIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" />
    </svg>
);

const shmetroIntStation: Station<ShmetroIntStationAttributes> = {
    component: ShmetroIntStation,
    icon: shmetroIntStationIcon,
    defaultAttrs: defaultShmetroIntStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: shmetroIntStationFields,
    tags: ['station', 'shmetro', 'interchange'],
    displayName: 'panel.details.station.shmetroInt.displayName',
};

export default shmetroIntStation;
