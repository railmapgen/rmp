import { CityCode } from '@railmapgen/rmg-palette-resources';
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
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';
import { MultilineText, NAME_DY } from '../common/multiline-text';

export const LINE_HEIGHT = {
    zh: 10,
    en: 6.2,
    top: 6.2 + 1,
    middle: 0,
    bottom: 10 + 1,
};

const BjsubwayBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultBjsubwayBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultBjsubwayBasicStationAttributes.nameOffsetY,
        open = defaultBjsubwayBasicStationAttributes.open,
    } = attrs[StationType.BjsubwayBasic] ?? defaultBjsubwayBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -8 : nameOffsetX === 'right' ? 8 : 0;
    const textY =
        ((names[NAME_DY[nameOffsetY].namesPos].split('\\').length + (nameOffsetY === 'top' && !open ? 1 : 0)) *
            LINE_HEIGHT[nameOffsetY] +
            8) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <circle
                    id={`stn_core_${id}`}
                    r="4"
                    stroke="black"
                    strokeWidth="0.5"
                    strokeDasharray={open ? undefined : '1.5'}
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={LINE_HEIGHT.zh}
                        lineHeight={LINE_HEIGHT.zh}
                        grow="up"
                        className="rmp-name__zh"
                        baseOffset={1}
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        fontSize={LINE_HEIGHT.en}
                        lineHeight={LINE_HEIGHT.en}
                        grow="down"
                        className="rmp-name__en"
                        baseOffset={1}
                    />
                    {!open && (
                        <text
                            dy={names[1].split('\\').length * LINE_HEIGHT.en + 2}
                            fontSize={LINE_HEIGHT.en}
                            dominantBaseline="hanging"
                            className="rmp-name__zh"
                        >
                            (暂缓开通)
                        </text>
                    )}
                </g>
            </g>
        ),
        [id, x, y, ...names, nameOffsetX, nameOffsetY, open, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * BjsubwayBasicStation specific props.
 */
export interface BjsubwayBasicStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    /**
     * Whether to show a (暂缓开通) hint.
     */
    open: boolean;
}

const defaultBjsubwayBasicStationAttributes: BjsubwayBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    open: true,
};

const bjsubwayBasicStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.stations.common.nameZh',
        value: (attrs?: BjsubwayBasicStationAttributes) =>
            (attrs ?? defaultBjsubwayBasicStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: BjsubwayBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayBasicStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.stations.common.nameEn',
        value: (attrs?: BjsubwayBasicStationAttributes) =>
            (attrs ?? defaultBjsubwayBasicStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: BjsubwayBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayBasicStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.stations.common.nameOffsetX',
        value: (attrs?: BjsubwayBasicStationAttributes) => (attrs ?? defaultBjsubwayBasicStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: BjsubwayBasicStationAttributes) =>
            attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
        onChange: (val: string | number, attrs_: BjsubwayBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayBasicStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.stations.common.nameOffsetY',
        value: (attrs?: BjsubwayBasicStationAttributes) => (attrs ?? defaultBjsubwayBasicStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: BjsubwayBasicStationAttributes) =>
            attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
        onChange: (val: string | number, attrs_: BjsubwayBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayBasicStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'switch',
        label: 'panel.details.stations.bjsubwayBasic.open',
        oneLine: true,
        isChecked: (attrs?: BjsubwayBasicStationAttributes) => (attrs ?? defaultBjsubwayBasicStationAttributes).open,
        onChange: (val: boolean, attrs_: BjsubwayBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayBasicStationAttributes;
            // set value
            attrs.open = val;
            // return modified attrs
            return attrs;
        },
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={bjsubwayBasicStationFields as RmgFieldsFieldDetail<BjsubwayBasicStationAttributes>}
    />
);

const bjsubwayBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="0.5" fill="none" />
    </svg>
);

const bjsubwayBasicStation: Station<BjsubwayBasicStationAttributes> = {
    component: BjsubwayBasicStation,
    icon: bjsubwayBasicStationIcon,
    defaultAttrs: defaultBjsubwayBasicStationAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.stations.bjsubwayBasic.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default bjsubwayBasicStation;
