import React from 'react';
import { Station, StationAttributes, StationComponentProps, StationType } from '../../constants/constants';

const ShmetroIntStation = (props: StationComponentProps) => {
    const { id, x, y, names, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        nameOffsetX = defaultShmetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultShmetroIntStationAttributes.nameOffsetY,
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

    const textX = nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : 0;
    const textY = nameOffsetY === 'up' ? -27 : nameOffsetY === 'bottom' ? 15 : 0;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const dominantBaseline = nameOffsetY === 'up' ? 'auto' : nameOffsetY === 'bottom' ? 'hanging' : 'middle';

    return React.useMemo(
        () => (
            <g id={`stn_${id}`} transform={`translate(${x}, ${y})`}>
                <circle
                    id={`stn_circle_${id}`}
                    r={10}
                    stroke="black"
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
                <g transform={`translate(${textX}, ${textY})`}>
                    <text textAnchor={textAnchor} dominantBaseline={dominantBaseline}>
                        {names[0]}
                    </text>
                    <text fontSize={10} dy={12} textAnchor={textAnchor} dominantBaseline={dominantBaseline}>
                        {names[1]}
                    </text>
                </g>
            </g>
        ),
        [id, x, y, ...names, nameOffsetX, nameOffsetY, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * <ShmetroIntStation /> specific props.
 */
export interface ShmetroIntStationAttributes extends StationAttributes {
    nameOffsetX: 'left' | 'middle' | 'right';
    nameOffsetY: 'up' | 'middle' | 'bottom';
}

const defaultShmetroIntStationAttributes: ShmetroIntStationAttributes = { nameOffsetX: 'right', nameOffsetY: 'up' };

const shmetroIntStationFields = [
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
};

export default shmetroIntStation;
