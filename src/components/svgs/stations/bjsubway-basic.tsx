import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { MultilineText } from '../common/multiline-text';

export const LINE_HEIGHT = {
    zh: 9,
    en: 5.2,
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
        construction = defaultBjsubwayBasicStationAttributes.construction,
        scale = defaultBjsubwayBasicStationAttributes.scale,
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

    const secondLine = !open || construction;

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [-4, -(names[1].split('\n').length + (secondLine ? 1 : 0)) * LINE_HEIGHT[oY] - 2];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -(names[1].split('\n').length + (secondLine ? 1 : 0)) * LINE_HEIGHT[oY] - 3];
        } else if (oX === 'right' && oY === 'top') {
            return [4, -(names[1].split('\n').length + (secondLine ? 1 : 0)) * LINE_HEIGHT[oY] - 2];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-4, names[0].split('\n').length * LINE_HEIGHT[oY] + 2.5];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 3.5];
        } else if (oX === 'right' && oY === 'bottom') {
            return [4, names[0].split('\n').length * LINE_HEIGHT[oY] + 2.5];
        } else if (oX === 'left' && oY === 'middle') {
            return [-5, 1];
        } else if (oX === 'right' && oY === 'middle') {
            return [5, 1];
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
                strokeDasharray={secondLine ? '1.5' : undefined}
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
                    {...getLangStyle(TextLanguage.zh)}
                    baseOffset={1}
                    transform={`scale(${scale} 1)`}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    {...getLangStyle(TextLanguage.en)}
                    baseOffset={1}
                    transform={`scale(${scale} 1)`}
                />
                {secondLine && (
                    <text
                        dy={names[1].split('\n').length * LINE_HEIGHT.en + 2}
                        fontSize={LINE_HEIGHT.en}
                        dominantBaseline="hanging"
                        {...getLangStyle(TextLanguage.zh)}
                    >
                        {!open ? '(暂缓开通)' : '(施工封闭)'}
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
    construction: boolean;
    scale: number;
}

const defaultBjsubwayBasicStationAttributes: BjsubwayBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    open: true,
    construction: false,
    scale: 1,
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
            type: 'slider',
            label: t('panel.details.stations.bjsubwayBasic.scale'),
            value: attrs.scale ?? defaultBjsubwayBasicStationAttributes.scale,
            onChange: val => {
                attrs.scale = val;
                handleAttrsUpdate(id, attrs);
            },
            step: 0.025,
            min: 0.5,
            max: 1,
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.bjsubwayBasic.open'),
            oneLine: true,
            isChecked: attrs.open ?? defaultBjsubwayBasicStationAttributes.open,
            isDisabled: attrs.construction ?? false,
            onChange: val => {
                attrs.open = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.bjsubwayBasic.construction'),
            oneLine: true,
            isChecked: attrs.construction ?? defaultBjsubwayBasicStationAttributes.construction,
            isDisabled: !(attrs.open ?? true),
            onChange: val => {
                attrs.construction = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
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
