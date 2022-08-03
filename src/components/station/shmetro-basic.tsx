import React from 'react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType } from '../../constants/constants';
import {
    defaultStationAttributes,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../constants/stations';

const ShmetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
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

    const textX = nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : 0;
    const textY = nameOffsetY === 'up' ? -27 : nameOffsetY === 'bottom' ? 15 : 0;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const dominantBaseline = nameOffsetY === 'up' ? 'auto' : nameOffsetY === 'bottom' ? 'hanging' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <circle
                    id={`stn_core_${id}`}
                    r={5}
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
 * <ShmetroBasicStation /> specific props.
 */
export interface ShmetroBasicStationAttributes extends StationAttributes {
    nameOffsetX: 'left' | 'middle' | 'right';
    nameOffsetY: 'up' | 'middle' | 'bottom';
}

const defaultShmetroBasicStationAttributes: ShmetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'up',
};

const shmetroBasicStationFields = [
    {
        type: 'input',
        label: 'panel.details.station.shmetroBasic.nameZh',
        value: (attrs?: ShmetroBasicStationAttributes) => (attrs ?? defaultShmetroBasicStationAttributes).names[0],
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.shmetroBasic.nameEn',
        value: (attrs?: ShmetroBasicStationAttributes) => (attrs ?? defaultShmetroBasicStationAttributes).names[1],
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.names[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroBasic.nameOffsetX',
        value: (attrs?: ShmetroBasicStationAttributes) => (attrs ?? defaultShmetroBasicStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.nameOffsetX = val as 'left' | 'middle' | 'right';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroBasic.nameOffsetY',
        value: (attrs?: ShmetroBasicStationAttributes) => (attrs ?? defaultShmetroBasicStationAttributes).nameOffsetY,
        options: { up: 'up', middle: 'middle', bottom: 'bottom' },
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.nameOffsetY = val as 'up' | 'middle' | 'bottom';
            // return modified attrs
            return attrs;
        },
    },
];

const shmetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="4" stroke="currentColor" fill="none" />
    </svg>
);

const shmetroBasicStation: Station<ShmetroBasicStationAttributes> = {
    component: ShmetroBasicStation,
    icon: shmetroBasicStationIcon,
    defaultAttrs: defaultShmetroBasicStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: shmetroBasicStationFields,
    metadata: {
        displayName: 'panel.details.station.shmetroBasic.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        tags: [],
    },
};

export default shmetroBasicStation;
