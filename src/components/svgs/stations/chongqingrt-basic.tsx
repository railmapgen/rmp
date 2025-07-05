import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
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
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

export const LINE_HEIGHT = {
    zh: 9,
    en: 4,
    top: 4 + 1,
    middle: 0,
    bottom: 9 + 1,
};

const ChongqingRTBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChongqingRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultChongqingRTBasicStationAttributes.nameOffsetY,
        color = defaultChongqingRTBasicStationAttributes.color,
        isLoop = defaultChongqingRTBasicStationAttributes.isLoop,
    } = attrs[StationType.ChongqingRTBasic] ?? defaultChongqingRTBasicStationAttributes;

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
            return [-5, -names[1].split('\n').length * LINE_HEIGHT[oY] - 3];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 5];
        } else if (oX === 'right' && oY === 'top') {
            return [5, -names[1].split('\n').length * LINE_HEIGHT[oY] - 3];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-5, names[0].split('\n').length * LINE_HEIGHT[oY] + 3];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 5];
        } else if (oX === 'right' && oY === 'bottom') {
            return [5, names[0].split('\n').length * LINE_HEIGHT[oY] + 3];
        } else if (oX === 'left' && oY === 'middle') {
            return [-5, 2];
        } else if (oX === 'right' && oY === 'middle') {
            return [5, 2];
        } else return [0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    const zhRef = React.useRef<SVGGElement>(null);
    const elRef = React.useRef<SVGGElement>(null);
    const [elOffset, setElOffset] = React.useState(0);

    React.useEffect(() => {
        if (elRef.current && zhRef.current) {
            if (nameOffsetX !== 'middle') {
                const elWidth = elRef.current.getBBox().width;
                const zhWidth = zhRef.current.getBBox().width;
                if (zhWidth > elWidth) {
                    setElOffset((zhWidth - elWidth) / 2);
                } else {
                    setElOffset(0);
                }
            } else {
                setElOffset(0);
            }
        }
    }, [names[0], names[1], nameOffsetX]);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_core_${id}`}
                r={isLoop ? 4 : 2.5}
                stroke={color[2]}
                strokeWidth=".8"
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
                    ref={zhRef}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    {...getLangStyle(TextLanguage.en)}
                    baseOffset={1}
                    ref={elRef}
                    transform={`translate(${nameOffsetX == 'right' ? elOffset : -elOffset}, 0)`}
                />
            </g>
        </g>
    );
};

/**
 * ChongqingRTBasicStation specific props.
 */
export interface ChongqingRTBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    isLoop: boolean;
}

const defaultChongqingRTBasicStationAttributes: ChongqingRTBasicStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    isLoop: false,
};

const ChongqingRTBasicAttrsComponent = (props: AttrsProps<ChongqingRTBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultChongqingRTBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: (attrs ?? defaultChongqingRTBasicStationAttributes).nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: (attrs ?? defaultChongqingRTBasicStationAttributes).nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
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
                    type={StationType.ChongqingRTBasic}
                    defaultTheme={defaultChongqingRTBasicStationAttributes.color}
                />
            ),
        },
        {
            type: 'switch',
            label: t('panel.details.stations.chongqingRTBasic.isLoop'),
            isChecked: (attrs ?? defaultChongqingRTBasicStationAttributes).isLoop,
            onChange: val => {
                attrs.isLoop = val as boolean;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            oneLine: true,
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRTBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth=".8" fill="none" />
    </svg>
);

const chongqingRTBasicStation: Station<ChongqingRTBasicStationAttributes> = {
    component: ChongqingRTBasicStation,
    icon: chongqingRTBasicStationIcon,
    defaultAttrs: defaultChongqingRTBasicStationAttributes,
    attrsComponent: ChongqingRTBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chongqingRTBasic.displayName',
        cities: [CityCode.Chongqing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chongqingRTBasicStation;
