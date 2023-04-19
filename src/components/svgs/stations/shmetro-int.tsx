import React from 'react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
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

    const textDX = nameOffsetX === 'left' ? -13.33 : nameOffsetX === 'right' ? 13.33 : 0;
    // if icon grows the same direction of the text, add the extra icon length to text
    const textX = (Math.abs(textDX) + width / 2) * Math.sign(textDX);
    const textDY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY[nameOffsetY].lineHeight + 6.67) *
        NAME_DY[nameOffsetY].polarity;
    const textY = (Math.abs(textDY) + height / 2) * Math.sign(textDY);
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
                        strokeWidth="1.33"
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
                        fontSize={12.67}
                        lineHeight={12.67}
                        grow="up"
                        baseOffset={1}
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\').map(s => (nameOffsetX === 'right' ? '\u00A0' : '') + s)}
                        fontSize={6.67}
                        lineHeight={6.67}
                        grow="down"
                        baseOffset={1.5}
                        className="rmp-name__en"
                    />
                </g>
            </g>
        ),
        [id, x, y, ...names, nameOffsetX, nameOffsetY, rotate, width, height, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * ShmetroIntStation specific props.
 */
export interface ShmetroIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
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
    nameOffsetY: 'top',
    rotate: 0,
    height: 10,
    width: 13,
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
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroInt.nameOffsetY',
        value: (attrs?: ShmetroIntStationAttributes) => (attrs ?? defaultShmetroIntStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: ShmetroIntStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: ShmetroIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
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
