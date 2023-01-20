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
    const textDy =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length - 1) *
        NAME_DY[nameOffsetY].lineHeight *
        NAME_DY[nameOffsetY].polarity;
    const textY = textDy + (nameOffsetY === 'top' ? -24 : nameOffsetY === 'bottom' ? 24 : 0);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

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
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor} className="rmp-name-station">
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
                        grow="down"
                        className="rmp-name__en"
                    />
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
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultShmetroBasicStationAttributes: ShmetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
};

const shmetroBasicStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.shmetroBasic.nameZh',
        value: (attrs?: ShmetroBasicStationAttributes) =>
            (attrs ?? defaultShmetroBasicStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.shmetroBasic.nameEn',
        value: (attrs?: ShmetroBasicStationAttributes) =>
            (attrs ?? defaultShmetroBasicStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroBasic.nameOffsetX',
        value: (attrs?: ShmetroBasicStationAttributes) => (attrs ?? defaultShmetroBasicStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: ShmetroBasicStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.shmetroBasic.nameOffsetY',
        value: (attrs?: ShmetroBasicStationAttributes) => (attrs ?? defaultShmetroBasicStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: ShmetroBasicStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: ShmetroBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroBasicStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
];

const shmetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" fill="none" />
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
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default shmetroBasicStation;
