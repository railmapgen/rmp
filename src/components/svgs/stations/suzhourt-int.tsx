import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const [ICON_WIDTH, ICON_HEIGHT] = [12, 6];

const NAME_SZ_BASIC = {
    zh: {
        size: 10,
        baseOffset: 1,
    },
    en: {
        size: 5,
        baseOffset: 1.5,
    },
};

const NAME_DY_SZ_BASIC = {
    top: {
        lineHeight: 5,
        offset: 1 + NAME_SZ_BASIC.en.baseOffset + 2.5, // offset + baseOffset + iconRadius
        polarity: -1,
    },
    middle: {
        lineHeight: 0,
        offset: NAME_SZ_BASIC.zh.size / 2,
        polarity: 1,
    },
    bottom: {
        lineHeight: 10,
        offset: 0 + NAME_SZ_BASIC.zh.baseOffset + 2.5, // offset + baseOffset + iconRadius
        polarity: 1,
    },
};

const SuzhouRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultSuzhouRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultSuzhouRTIntStationAttributes.nameOffsetY,
        rotate = defaultSuzhouRTIntStationAttributes.rotate,
        transfer = defaultSuzhouRTIntStationAttributes.transfer,
    } = attrs[StationType.SuzhouRTInt] ?? defaultSuzhouRTIntStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -5 : nameOffsetX === 'right' ? 5 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY_SZ_BASIC[nameOffsetY].lineHeight +
            NAME_DY_SZ_BASIC[nameOffsetY].offset) *
        NAME_DY_SZ_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <g transform={`rotate(${rotate})`}>
                    <rect
                        x={-ICON_WIDTH / 2}
                        y={-ICON_HEIGHT / 2}
                        width={ICON_WIDTH}
                        height={ICON_HEIGHT}
                        ry={ICON_HEIGHT / 2}
                        stroke="#616161"
                        strokeWidth="1"
                        fill="white"
                    />
                    {(transfer.at(0) ?? []).length > 0 &&
                        transfer
                            .at(0)!
                            .map(info => info[2])
                            .map((color, i) => (
                                <circle
                                    key={`${i}_${color}`}
                                    r={2}
                                    cx={(5 /* line width, not int > 2 compatible */ / 2) * (i === 0 ? -1 : 1)}
                                    fill={color}
                                />
                            ))}
                    <rect
                        id={`stn_core_${id}`}
                        x={-ICON_WIDTH / 2}
                        y={-ICON_HEIGHT / 2}
                        width={ICON_WIDTH}
                        height={ICON_HEIGHT}
                        ry={ICON_HEIGHT / 2}
                        fill="white"
                        fillOpacity="0"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </g>
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={NAME_SZ_BASIC.zh.size}
                        lineHeight={NAME_SZ_BASIC.zh.size}
                        grow="up"
                        baseOffset={NAME_SZ_BASIC.zh.baseOffset}
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        fontSize={NAME_SZ_BASIC.en.size}
                        lineHeight={NAME_SZ_BASIC.en.size}
                        grow="down"
                        baseOffset={NAME_SZ_BASIC.en.baseOffset}
                        className="rmp-name__zh"
                        fill="gray"
                    />
                </g>
            </g>
        ),
        [
            id,
            x,
            y,
            ...names,
            nameOffsetX,
            nameOffsetY,
            rotate,
            JSON.stringify(transfer),
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * SuzhouRTIntStation specific props.
 */
export interface SuzhouRTIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    /**
     * 0 <= rotate < 360
     */
    rotate: number;
}

const defaultSuzhouRTIntStationAttributes: SuzhouRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    transfer: [
        [
            [CityCode.Suzhou, 'sz2', '#ED3240', MonoColour.white, '', ''],
            [CityCode.Suzhou, 'sh2', '#8CC220', MonoColour.black, '', ''],
        ],
    ],
};

const suzhouRTIntStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.suzhouRTInt.nameZh',
        value: (attrs?: SuzhouRTIntStationAttributes) =>
            (attrs ?? defaultSuzhouRTIntStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: SuzhouRTIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTIntStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.suzhouRTInt.nameEn',
        value: (attrs?: SuzhouRTIntStationAttributes) =>
            (attrs ?? defaultSuzhouRTIntStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: SuzhouRTIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTIntStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.suzhouRTInt.nameOffsetX',
        value: (attrs?: SuzhouRTIntStationAttributes) => (attrs ?? defaultSuzhouRTIntStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: SuzhouRTIntStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: SuzhouRTIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTIntStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.suzhouRTInt.nameOffsetY',
        value: (attrs?: SuzhouRTIntStationAttributes) => (attrs ?? defaultSuzhouRTIntStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: SuzhouRTIntStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: SuzhouRTIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.suzhouRTInt.rotate',
        value: (attrs?: SuzhouRTIntStationAttributes) => attrs?.rotate ?? defaultSuzhouRTIntStationAttributes.rotate,
        hidden: (attrs?: SuzhouRTIntStationAttributes) => (attrs?.transfer?.flat()?.length ?? 0) === 0,
        options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
        onChange: (val: string | number, attrs_: SuzhouRTIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTIntStationAttributes;
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
                stationType={StationType.SuzhouRTInt}
                defaultAttrs={defaultSuzhouRTIntStationAttributes}
                maximumTransfers={[2, 0, 0]}
            />
        ),
    },
];

const suzhouRTIntStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="6" y="9" width="12" height="6" ry="3" stroke="currentColor" fill="none" />
        <circle r="2" cx="9.5" cy="12" fill="currentColor" />
        <circle r="2" cx="14.5" cy="12" fill="currentColor" />
    </svg>
);

const suzhouRTIntStation: Station<SuzhouRTIntStationAttributes> = {
    component: SuzhouRTIntStation,
    icon: suzhouRTIntStationIcon,
    defaultAttrs: defaultSuzhouRTIntStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: suzhouRTIntStationFields,
    metadata: {
        displayName: 'panel.details.station.suzhouRTInt.displayName',
        cities: [CityCode.Suzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default suzhouRTIntStation;
