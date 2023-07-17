import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

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

const SuzhouRTBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        color = defaultSuzhouRTBasicStationAttributes.color,
        nameOffsetX = defaultSuzhouRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultSuzhouRTBasicStationAttributes.nameOffsetY,
    } = attrs[StationType.SuzhouRTBasic] ?? defaultSuzhouRTBasicStationAttributes;

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
                <circle
                    id={`stn_core_${id}`}
                    r={3}
                    stroke={color[2]}
                    strokeWidth="1"
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
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
        [id, x, y, ...names, nameOffsetX, nameOffsetY, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * SuzhouRTBasicStation specific props.
 */
export interface SuzhouRTBasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultSuzhouRTBasicStationAttributes: SuzhouRTBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    color: [CityCode.Suzhou, 'sz1', '#78BA25', MonoColour.white],
};

const suzhouRTBasicStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.suzhouRTBasic.nameZh',
        value: (attrs?: SuzhouRTBasicStationAttributes) =>
            (attrs ?? defaultSuzhouRTBasicStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: SuzhouRTBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTBasicStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.suzhouRTBasic.nameEn',
        value: (attrs?: SuzhouRTBasicStationAttributes) =>
            (attrs ?? defaultSuzhouRTBasicStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: SuzhouRTBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTBasicStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.suzhouRTBasic.nameOffsetX',
        value: (attrs?: SuzhouRTBasicStationAttributes) => (attrs ?? defaultSuzhouRTBasicStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: SuzhouRTBasicStationAttributes) =>
            attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
        onChange: (val: string | number, attrs_: SuzhouRTBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTBasicStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.suzhouRTBasic.nameOffsetY',
        value: (attrs?: SuzhouRTBasicStationAttributes) => (attrs ?? defaultSuzhouRTBasicStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: SuzhouRTBasicStationAttributes) =>
            attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
        onChange: (val: string | number, attrs_: SuzhouRTBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSuzhouRTBasicStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: <ColorField type={StationType.SuzhouRTBasic} defaultAttrs={defaultSuzhouRTBasicStationAttributes} />,
    },
];

const suzhouRTBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" />
    </svg>
);

const suzhouRTBasicStation: Station<SuzhouRTBasicStationAttributes> = {
    component: SuzhouRTBasicStation,
    icon: suzhouRTBasicStationIcon,
    defaultAttrs: defaultSuzhouRTBasicStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: suzhouRTBasicStationFields,
    metadata: {
        displayName: 'panel.details.station.suzhouRTBasic.displayName',
        cities: [CityCode.Suzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default suzhouRTBasicStation;
