import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType } from '../../../constants/constants';
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
import { MultilineText, NAME_DY } from '../common/multiline-text';

const NAME_DY_SH_INT = {
    top: {
        lineHeight: 6.67,
        offset: 3.5 + 1.5, // offset + baseOffset
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 12.67,
        offset: -0.17 + 1, // offset + baseOffset
    },
};

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

    const iconWidth =
        rotate === 0 || rotate === 180 ? width : rotate === 90 || rotate === 270 ? height : width * Math.SQRT1_2;
    const iconHeight =
        rotate === 0 || rotate === 180 ? height : rotate === 90 || rotate === 270 ? width : width * Math.SQRT1_2;
    // x should be ±13.33 in default (width=13), 13.33 - 13 / 2 = 6.83
    const textDX = nameOffsetX === 'left' ? -6.83 : nameOffsetX === 'right' ? 6.83 : 0;
    // if icon grows the same direction of the text, add the extra icon length to text
    const textX = (Math.abs(textDX) + iconWidth / 2) * Math.sign(textDX);
    const textDY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY_SH_INT[nameOffsetY].lineHeight +
            NAME_DY_SH_INT[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textY = (Math.abs(textDY) + iconHeight / 2) * Math.sign(textDY);
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
                        stroke="#393332"
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
                    className="rmp-name-outline"
                    strokeWidth="2.5"
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
                        text={names[1].split('\\')}
                        dx={nameOffsetX === 'right' ? 1.67 : 0}
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
     * 0 <= rotate < 360
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

const shmetroIntAttrsComponent = (props: AttrsProps<ShmetroIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[1] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: attrs.nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.shmetroInt.height'),
            value: attrs.height.toString(),
            validator: val => Number.isInteger(val),
            onChange: val => {
                attrs.height = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.shmetroInt.width'),
            value: attrs.width.toString(),
            validator: val => Number.isInteger(val),
            onChange: val => {
                attrs.width = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.rotate'),
            value: attrs.rotate,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: val => {
                attrs.rotate = Number(val) as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const shmetroIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="4.5" y="7" height="10" width="15" ry="5" stroke="currentColor" fill="none" />
    </svg>
);

const shmetroIntStation: Station<ShmetroIntStationAttributes> = {
    component: ShmetroIntStation,
    icon: shmetroIntStationIcon,
    defaultAttrs: defaultShmetroIntStationAttributes,
    attrsComponent: shmetroIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.shmetroInt.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default shmetroIntStation;
