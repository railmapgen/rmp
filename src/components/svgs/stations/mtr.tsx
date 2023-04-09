import React from 'react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { MultilineText, NAME_DY } from '../common/multiline-text';
import {
    InterchangeField,
    InterchangeInfo,
    StationAttributesWithInterchange,
} from '../../panels/details/interchange-field';

const makeStationPath = (r: number, lineWidth: number, transfer: InterchangeInfo[]): `M${string}` => {
    const y = Math.sqrt(r * r - (lineWidth * lineWidth) / 4);
    const circleCount = transfer.length < 2 ? transfer.length + 1 : transfer.length;
    let d = `M ${-r},0 A ${r},${r},0,0,1,${-lineWidth / 2},-${y} `;
    for (let i = 0; i < circleCount; i = i + 1) {
        d += `A ${r},${r},0,0,1,${i * lineWidth + lineWidth / 2},-${y} `;
    }
    d += `A ${r},${r},0,0,1,${transfer.length * lineWidth - lineWidth / 2},${y} `;
    for (let i = circleCount - 1; i >= 0; i = i - 1) {
        d += `A ${r},${r},0,0,1,${i * lineWidth - lineWidth / 2},${y} `;
    }
    d += `A ${r},${r},0,0,1,${-r},0 Z`;
    return d as `M${string}`;
};

const MTRStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultMTRStationAttributes.nameOffsetX,
        nameOffsetY = defaultMTRStationAttributes.nameOffsetY,
        transfer = defaultMTRStationAttributes.transfer,
        rotate = defaultMTRStationAttributes.rotate,
    } = attrs[StationType.MTR] ?? defaultMTRStationAttributes;

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

    const lineWidth = 5;
    const path = makeStationPath(5, lineWidth, transfer.at(0)!);

    const textX = nameOffsetX === 'left' ? -5 : nameOffsetX === 'right' ? 5 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY[nameOffsetY].lineHeight + 6) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <path
                    transform={`rotate(${rotate})`}
                    d={path}
                    stroke="#132647"
                    strokeWidth="1.5"
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
                {transfer.at(0)!.length > 1 &&
                    transfer
                        .at(0)!
                        .map(info => info[2])
                        .map((color, i) => (
                            <line
                                key={`${i}_${color}`}
                                transform={`rotate(${rotate})`}
                                x1={-lineWidth / 2 + i * lineWidth}
                                x2={lineWidth / 2 + i * lineWidth}
                                stroke={color}
                                strokeWidth="2"
                            />
                        ))}
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <path
                    id={`stn_core_${id}`}
                    transform={`rotate(${rotate})`}
                    d={path}
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor} className="rmp-name-station">
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={10}
                        lineHeight={10}
                        grow="up"
                        className="rmp-name__mtr__zh"
                        fill="#132647"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        fontSize={7.5}
                        lineHeight={7.5}
                        grow="down"
                        className="rmp-name__mtr__en"
                        fill="#132647"
                        fontWeight="600"
                    />
                </g>
            </g>
        ),
        [
            id,
            x,
            y,
            ...names,
            rotate,
            JSON.stringify(transfer),
            nameOffsetX,
            nameOffsetY,
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * MTRStation specific props.
 */
export interface MTRStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    rotate: Rotate;
}

const defaultMTRStationAttributes: MTRStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    transfer: [[]],
};

const mtrStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.mtr.nameZh',
        value: (attrs?: MTRStationAttributes) => (attrs ?? defaultMTRStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: MTRStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultMTRStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.mtr.nameEn',
        value: (attrs?: MTRStationAttributes) => (attrs ?? defaultMTRStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: MTRStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultMTRStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.mtr.nameOffsetX',
        value: (attrs?: MTRStationAttributes) => (attrs ?? defaultMTRStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: MTRStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: MTRStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultMTRStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.mtr.nameOffsetY',
        value: (attrs?: MTRStationAttributes) => (attrs ?? defaultMTRStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: MTRStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: MTRStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultMTRStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.mtr.rotate',
        value: (attrs?: MTRStationAttributes) => attrs?.rotate ?? defaultMTRStationAttributes.rotate,
        hidden: (attrs?: MTRStationAttributes) => (attrs?.transfer?.flat()?.length ?? 0) === 0,
        options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
        onChange: (val: string | number, attrs_: MTRStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultMTRStationAttributes;
            // set value
            attrs.rotate = Number(val) as Rotate;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: (
            <InterchangeField
                stationType={StationType.MTR}
                defaultAttrs={defaultMTRStationAttributes}
                maximumTransfers={[5, 0, 0]}
            />
        ),
    },
];

const mtrStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
);

const mtrStation: Station<MTRStationAttributes> = {
    component: MTRStation,
    icon: mtrStationIcon,
    defaultAttrs: defaultMTRStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: mtrStationFields,
    metadata: {
        displayName: 'panel.details.station.mtr.displayName',
        cities: [CityCode.Hongkong],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default mtrStation;
