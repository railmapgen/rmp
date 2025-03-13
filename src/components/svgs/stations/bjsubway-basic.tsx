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

export const LINE_HEIGHT = {
    zh: 9,
    en: 6.2,
    top: 6.2 + 1,
    middle: 0,
    bottom: 9 + 1,
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

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [-4, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 1];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 4];
        } else if (oX === 'right' && oY === 'top') {
            return [4, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 1];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-4, names[0].split('\n').length * LINE_HEIGHT[oY] + 1];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 4];
        } else if (oX === 'right' && oY === 'bottom') {
            return [4, names[0].split('\n').length * LINE_HEIGHT[oY] + 1];
        } else if (oX === 'left' && oY === 'middle') {
            return [-5, 0];
        } else if (oX === 'right' && oY === 'middle') {
            return [5, 0];
        } else return [0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
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
                {!open && (
                    <text
                        dy={names[1].split('\n').length * LINE_HEIGHT.en + 2}
                        fontSize={LINE_HEIGHT.en}
                        dominantBaseline="hanging"
                        className="rmp-name__zh"
                    >
                        (暂缓开通)
                    </text>
                )}
            </g>
        </g>
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

const BJSubwayBasicAttrsComponent = (props: AttrsProps<BjsubwayBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultBjsubwayBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX,
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
            value: attrs.nameOffsetY,
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
            type: 'switch',
            label: t('panel.details.stations.bjsubwayBasic.open'),
            oneLine: true,
            isChecked: attrs.open ?? defaultBjsubwayBasicStationAttributes.open,
            onChange: val => {
                attrs.open = val;
                handleAttrsUpdate(id, attrs);
            },
        },
    ];

    return <RmgFields fields={fields} />;
};

const bjsubwayBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="0.5" fill="none" />
    </svg>
);

const bjsubwayBasicStation: Station<BjsubwayBasicStationAttributes> = {
    component: BjsubwayBasicStation,
    icon: bjsubwayBasicStationIcon,
    defaultAttrs: defaultBjsubwayBasicStationAttributes,
    attrsComponent: BJSubwayBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.bjsubwayBasic.displayName',
        cities: [CityCode.Beijing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default bjsubwayBasicStation;
