import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
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
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const LineHeight = {
    top: 5.5,
    middle: 0,
    bottom: 10,
};

const QingdaoMetroStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        color = defaultQingdaoMetroStationAttributes.color,
        nameOffsetX = defaultQingdaoMetroStationAttributes.nameOffsetX,
        nameOffsetY = defaultQingdaoMetroStationAttributes.nameOffsetY,
        isInt = defaultQingdaoMetroStationAttributes.isInt,
    } = attrs[StationType.QingdaoMetroStation] ?? defaultQingdaoMetroStationAttributes;

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

    const getBasicTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        const textX = oX === 'left' ? -7.5 : oX === 'right' ? 7.5 : 0;
        if (oY === 'top') {
            return [textX, -names[1].split('\n').length * LineHeight[oY] - 8];
        } else if (oY === 'bottom') {
            return [textX, names[0].split('\n').length * LineHeight[oY] + 6];
        } else {
            return [textX, 2.5];
        }
    };

    const getIntTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [-7, -names[1].split('\n').length * LineHeight[oY] - 7];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -names[1].split('\n').length * LineHeight[oY] - 15];
        } else if (oX === 'right' && oY === 'top') {
            return [7, -names[1].split('\n').length * LineHeight[oY] - 7];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-7, names[0].split('\n').length * LineHeight[oY] + 7];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LineHeight[oY] + 12];
        } else if (oX === 'right' && oY === 'bottom') {
            return [7, names[0].split('\n').length * LineHeight[oY] + 7];
        } else if (oX === 'left' && oY === 'middle') {
            return [-13, 0];
        } else if (oX === 'right' && oY === 'middle') {
            return [13, 0];
        } else return [0, 0];
    };

    const [[textX, textY], r] = isInt
        ? [getIntTextOffset(nameOffsetX, nameOffsetY), 8]
        : [getBasicTextOffset(nameOffsetX, nameOffsetY), 3];
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_core_${id}`}
                r={r}
                stroke={isInt ? 'black' : color[2]}
                strokeWidth="0.67"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={10}
                    lineHeight={10}
                    grow="up"
                    baseOffset={1}
                    className="rmp-name__zh"
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={5.5}
                    lineHeight={5.5}
                    grow="down"
                    baseOffset={1.5}
                    className="rmp-name__en"
                />
            </g>
        </g>
    );
};

/**
 * Qingdao Metro station specific props.
 */
export interface QingdaoMetroStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    isInt: boolean;
}

const defaultQingdaoMetroStationAttributes: QingdaoMetroStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Qingdao, 'qd1', '#f7b000', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    isInt: false,
};

const qingdaoMetroStationAttrsComponent = (props: AttrsProps<QingdaoMetroStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0] ?? defaultQingdaoMetroStationAttributes.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1] ?? defaultQingdaoMetroStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultQingdaoMetroStationAttributes.nameOffsetX,
            options: {
                left: t('panel.details.stations.common.left'),
                middle: t('panel.details.stations.common.middle'),
                right: t('panel.details.stations.common.right'),
            },
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
            value: attrs.nameOffsetY ?? defaultQingdaoMetroStationAttributes.nameOffsetY,
            options: {
                top: t('panel.details.stations.common.top'),
                middle: t('panel.details.stations.common.middle'),
                bottom: t('panel.details.stations.common.bottom'),
            },
            disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.QingdaoMetroStation}
                    defaultTheme={defaultQingdaoMetroStationAttributes.color}
                />
            ),
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.qingdaoMetro.isInt'),
            isChecked: attrs.isInt,
            oneLine: true,
            onChange: val => {
                attrs.isInt = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const qingdaoMetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="0.6" fill="none" />
    </svg>
);

const qingdaoMetroStation: Station<QingdaoMetroStationAttributes> = {
    component: QingdaoMetroStation,
    icon: qingdaoMetroBasicStationIcon,
    defaultAttrs: defaultQingdaoMetroStationAttributes,
    attrsComponent: qingdaoMetroStationAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.qingdaoMetro.displayName',
        cities: [CityCode.Qingdao],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default qingdaoMetroStation;
