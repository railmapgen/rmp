import React from 'react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    defaultStationAttributes,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { MultilineText, NAME_DY } from '../common/multiline-text';

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

    const textX = nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : 0;
    const textDy =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length - 1) *
        NAME_DY[nameOffsetY].lineHeight *
        NAME_DY[nameOffsetY].polarity;
    const textY = textDy + (nameOffsetY === 'up' ? -24 : nameOffsetY === 'bottom' ? 24 : 0);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id}>
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
                <g
                    transform={`translate(${x + textX}, ${y + textY})`}
                    textAnchor={textAnchor}
                    className="rmp-name-station"
                >
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={16}
                        lineHeight={16}
                        grow="up"
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        fontSize={10}
                        lineHeight={10}
                        grow="bottom"
                        className="rmp-name__en"
                    />
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
        type: 'textarea',
        label: 'panel.details.station.shmetroInt.nameZh',
        value: (attrs?: ShmetroIntStationAttributes) =>
            (attrs ?? defaultShmetroIntStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.shmetroInt.nameEn',
        value: (attrs?: ShmetroIntStationAttributes) =>
            (attrs ?? defaultShmetroIntStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroInt.nameOffsetX',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: ShmetroIntStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
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
        disabledOptions: (attrs?: ShmetroIntStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as 'up' | 'middle' | 'bottom';
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
        type: 'input',
        label: 'panel.details.station.shmetroInt.rotate',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).rotate,
        validator: (val: string) => Number.isInteger(val) && Number(val) >= 0 && Number(val) < 180,
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.rotate = Math.abs(Number(val)) % 180;
            // return modified attrs
            return attrs;
        },
    },
];

const shmetroIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="4.5" y="7" height="10" width="15" ry="5" stroke="currentColor" fill="none" />
    </svg>
);

const shmetroIntStation: Station<ShmetroIntStationAttributes> = {
    component: ShmetroIntStation,
    icon: shmetroIntStationIcon,
    defaultAttrs: defaultShmetroIntStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: shmetroIntStationFields,
    metadata: {
        displayName: 'panel.details.station.shmetroInt.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default shmetroIntStation;
