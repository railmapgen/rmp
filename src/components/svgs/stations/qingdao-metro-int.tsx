import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
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
import { MultilineText } from '../common/multiline-text';

const LineHeight = {
    top: 5,
    middle: 0,
    bottom: 10,
};

const QingdaoMetroIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultQingdaoMetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultQingdaoMetroIntStationAttributes.nameOffsetY,
    } = attrs[StationType.QingdaoMetroInt] ?? defaultQingdaoMetroIntStationAttributes;

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
        if (oX === 'left' && oY === 'top') {
            return [-7, -names[1].split('\\').length * LineHeight[oY] - 7];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -names[1].split('\\').length * LineHeight[oY] - 15];
        } else if (oX === 'right' && oY === 'top') {
            return [7, -names[1].split('\\').length * LineHeight[oY] - 7];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-7, names[0].split('\\').length * LineHeight[oY] + 7];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\\').length * LineHeight[oY] + 12];
        } else if (oX === 'right' && oY === 'bottom') {
            return [7, names[0].split('\\').length * LineHeight[oY] + 7];
        } else if (oX === 'left' && oY === 'middle') {
            return [-13, 0];
        } else if (oX === 'right' && oY === 'middle') {
            return [13, 0];
        } else return [0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_core_${id}`}
                r={8}
                stroke="black"
                strokeWidth="0.67"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\\')}
                    fontSize={10}
                    lineHeight={10}
                    grow="up"
                    baseOffset={1}
                    className="rmp-name__zh"
                />
                <MultilineText
                    text={names[1].split('\\')}
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
 * qingdaoMetroIntStation specific props.
 */
export interface QingdaoMetroIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultQingdaoMetroIntStationAttributes: QingdaoMetroIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
};

const qingdaoMetroIntAttrsComponent = (props: AttrsProps<QingdaoMetroIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0].replaceAll('\\', '\n') ?? defaultQingdaoMetroIntStationAttributes.names[0],
            onChange: val => {
                attrs.names[0] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1].replaceAll('\\', '\n') ?? defaultQingdaoMetroIntStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultQingdaoMetroIntStationAttributes.nameOffsetX,
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
            value: attrs.nameOffsetY ?? defaultQingdaoMetroIntStationAttributes.nameOffsetY,
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
    ];
    return <RmgFields fields={fields} />;
};

const qingdaoMetroIntStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" />
    </svg>
);

const qingdaoMetroIntStation: Station<QingdaoMetroIntStationAttributes> = {
    component: QingdaoMetroIntStation,
    icon: qingdaoMetroIntStationIcon,
    defaultAttrs: defaultQingdaoMetroIntStationAttributes,
    attrsComponent: qingdaoMetroIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.qingdaoMetroInt.displayName',
        cities: [CityCode.Qingdao],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default qingdaoMetroIntStation;
