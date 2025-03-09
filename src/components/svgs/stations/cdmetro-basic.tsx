import React from 'react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { MultilineText } from '../common/multiline-text';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

export const LINE_HEIGHT = {
    zh: 7,
    en: 3.5,
    top: 3.5 + 1,
    middle: 0,
    bottom: 7 + 1,
};

const CDMetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultCDMetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultCDMetroBasicStationAttributes.nameOffsetY,
        color = defaultCDMetroBasicStationAttributes.color,
        direction = defaultCDMetroBasicStationAttributes.direction,
        type = defaultCDMetroBasicStationAttributes.type,
    } = attrs[StationType.CDMetroBasic] ?? defaultCDMetroBasicStationAttributes;

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

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (direction === 'horizontal') {
            if (oX === 'left' && oY === 'top') {
                return [-5 - (type == 'tram' ? 4 : 0), -names[1].split('\n').length * LINE_HEIGHT[oY] - 3];
            } else if (oX === 'middle' && oY === 'top') {
                return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 5 - (type == 'tram' ? 4 : 0)];
            } else if (oX === 'right' && oY === 'top') {
                return [5 + (type == 'tram' ? 4 : 0), -names[1].split('\n').length * LINE_HEIGHT[oY] - 3];
            } else if (oX === 'left' && oY === 'bottom') {
                return [-5 - (type == 'tram' ? 4 : 0), names[0].split('\n').length * LINE_HEIGHT[oY] + 3];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 5 + (type == 'tram' ? 4 : 0)];
            } else if (oX === 'right' && oY === 'bottom') {
                return [5 + (type == 'tram' ? 4 : 0), names[0].split('\n').length * LINE_HEIGHT[oY] + 3];
            } else if (oX === 'left' && oY === 'middle') {
                return [-5 - (type == 'tram' ? 4 : 0), 2];
            } else if (oX === 'right' && oY === 'middle') {
                return [5 + (type == 'tram' ? 4 : 0), 2];
            } else return [0, 0];
        } else {
            if (oX === 'middle' && oY === 'top') {
                return [-LINE_HEIGHT.zh / 2, -5 - (type == 'tram' ? 4 : 0)];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [-LINE_HEIGHT.zh / 2, 5 + (type == 'tram' ? 4 : 0)];
            } else return [0, 0];
        }
    };

    const getTramPos = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [0, -8, 0, -8];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, 0, 0, -8];
        } else if (oX === 'right' && oY === 'top') {
            return [0, 8, 0, -8];
        } else if (oX === 'left' && oY === 'bottom') {
            return [0, -8, 0, 8];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, 0, 0, 8];
        } else if (oX === 'right' && oY === 'bottom') {
            return [0, 8, 0, 8];
        } else if (oX === 'left' && oY === 'middle') {
            return [0, -8, 0, 0];
        } else if (oX === 'right' && oY === 'middle') {
            return [0, 8, 0, 0];
        } else return [0, 0, 0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const [tramX1, tramX2, tramY1, tramY2] = getTramPos(nameOffsetX, nameOffsetY);
    const textAnchor =
        direction == 'vertical'
            ? nameOffsetY === 'top'
                ? 'end'
                : nameOffsetY === 'bottom'
                  ? 'start'
                  : 'middle'
            : nameOffsetX === 'left'
              ? 'end'
              : nameOffsetX === 'right'
                ? 'start'
                : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {type == 'normal' || type == 'branchTerminal' ? (
                <circle
                    id={`stn_core_${id}`}
                    r={type == 'normal' ? 1.75 : 5}
                    stroke={color[2]}
                    strokeWidth={type == 'normal' ? 1 : 0.5}
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            ) : type == 'joint' ? (
                <g
                    transform={direction == 'vertical' ? 'rotate(90)' : ''}
                    id={`stn_core_${id}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                >
                    <circle r={2.25} fill="black" transform="translate(-1.5,0)" />
                    <circle r={2.25} fill="black" transform="translate(1.5,0)" />
                    <circle r={1.75} fill="white" transform="translate(-1.5,0)" />
                    <circle r={1.75} fill="white" transform="translate(1.5,0)" />
                </g>
            ) : (
                <g>
                    {/* It's a overlay */}
                    <rect
                        id={`stn_core_${id}`}
                        fill="white"
                        fillOpacity="0"
                        stroke="#231815"
                        strokeMiterlimit="22.9"
                        strokeWidth="0.232"
                        strokeOpacity="0"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                        x={-4}
                        y={-4}
                        width={8}
                        height={8}
                    />
                    <line x1={tramX1} y1={tramY1} x2={tramX2} y2={tramY2} stroke={color[2]} strokeWidth={1} />
                </g>
            )}
            {direction == 'horizontal' ? (
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                    <MultilineText
                        text={names[0].split('\n')}
                        fontSize={LINE_HEIGHT.zh}
                        lineHeight={LINE_HEIGHT.zh}
                        grow="up"
                        className="rmp-name__zh"
                        baseOffset={1}
                    />
                    <MultilineText
                        text={names[1].split('\n')}
                        fontSize={LINE_HEIGHT.en}
                        lineHeight={LINE_HEIGHT.en}
                        grow="down"
                        className="rmp-name__en"
                        baseOffset={1}
                    />
                </g>
            ) : (
                <>
                    <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                        <MultilineTextVertical
                            text={names[0].split('\n')}
                            fontSize={LINE_HEIGHT.zh}
                            lineWidth={LINE_HEIGHT.zh}
                            grow="bidirectional"
                            dominantBaseline="central"
                            className="rmp-name__zh"
                        />
                    </g>
                    <g
                        transform={`translate(${textX + (LINE_HEIGHT.zh * names[0].split('\n').length) / 2 + 3}, ${textY})rotate(90)`}
                        textAnchor={textAnchor}
                    >
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={LINE_HEIGHT.en}
                            lineHeight={LINE_HEIGHT.en}
                            grow="up"
                            className="rmp-name__en"
                            dominantBaseline="central"
                        />
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={LINE_HEIGHT.en}
                            lineHeight={LINE_HEIGHT.en}
                            grow="up"
                            className="rmp-name__en"
                            dominantBaseline="central"
                        />
                    </g>
                </>
            )}
        </g>
    );
};

/**
 * CDMetroBasicStation specific props.
 */
export interface CDMetroBasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    direction: 'vertical' | 'horizontal';
    type: 'normal' | 'joint' | 'branchTerminal' | 'tram';
}

const defaultCDMetroBasicStationAttributes: CDMetroBasicStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Chengdu, 'cd1', '#222a8c', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    direction: 'horizontal',
    type: 'normal',
};

const CDMetroBasicAttrsComponent = (props: AttrsProps<CDMetroBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: (attrs ?? defaultCDMetroBasicStationAttributes).names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultCDMetroBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: (attrs ?? defaultCDMetroBasicStationAttributes).nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                if (attrs.nameOffsetX != 'middle') {
                    attrs.direction = 'horizontal';
                }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: (attrs ?? defaultCDMetroBasicStationAttributes).nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                if (attrs.nameOffsetY == 'middle') {
                    attrs.direction = 'horizontal';
                }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={StationType.CDMetroBasic} defaultTheme={defaultCDMetroBasicStationAttributes.color} />
            ),
        },
        {
            type: 'switch',
            label: t('panel.details.stations.cdMetroBasic.isVertical'),
            isChecked: (attrs ?? defaultCDMetroBasicStationAttributes).direction == 'vertical',
            onChange: val => {
                attrs.direction = val ? 'vertical' : 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            isDisabled:
                (attrs ?? defaultCDMetroBasicStationAttributes).nameOffsetX != 'middle' ||
                (attrs ?? defaultCDMetroBasicStationAttributes).nameOffsetY == 'middle',
        },
        {
            type: 'select',
            label: t('panel.details.stations.cdMetroBasic.type.displayName'),
            value: (attrs ?? defaultCDMetroBasicStationAttributes).type,
            options: {
                normal: t('panel.details.stations.cdMetroBasic.type.normal'),
                joint: t('panel.details.stations.cdMetroBasic.type.joint'),
                branchTerminal: t('panel.details.stations.cdMetroBasic.type.branchTerminal'),
                tram: t('panel.details.stations.cdMetroBasic.type.tram'),
            },
            onChange: val => {
                attrs.type = val as 'normal' | 'joint' | 'branchTerminal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const cdMetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="1.75" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
);

const cdMetroBasicStation: Station<CDMetroBasicStationAttributes> = {
    component: CDMetroBasicStation,
    icon: cdMetroBasicStationIcon,
    defaultAttrs: defaultCDMetroBasicStationAttributes,
    attrsComponent: CDMetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.cdMetroBasic.displayName',
        cities: [CityCode.Chengdu],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default cdMetroBasicStation;
