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

const ChongqingRTBasicStation2021 = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChongqingRTBasicStation2021Attributes.nameOffsetX,
        nameOffsetY = defaultChongqingRTBasicStation2021Attributes.nameOffsetY,
        color = defaultChongqingRTBasicStation2021Attributes.color,
        lineCode = defaultChongqingRTBasicStation2021Attributes.lineCode,
        stationCode = defaultChongqingRTBasicStation2021Attributes.stationCode,
        open = defaultChongqingRTBasicStation2021Attributes.open,
    } = attrs[StationType.ChongqingRTBasic2021] ?? defaultChongqingRTBasicStation2021Attributes;

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
            return [-6.5, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 7.5];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 9.5];
        } else if (oX === 'right' && oY === 'top') {
            return [7.5, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 7.5];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-6.5, names[0].split('\n').length * LINE_HEIGHT[oY] + 7.5];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 9.5];
        } else if (oX === 'right' && oY === 'bottom') {
            return [7.5, names[0].split('\n').length * LINE_HEIGHT[oY] + 7.5];
        } else if (oX === 'left' && oY === 'middle') {
            return [-10.5, 2];
        } else if (oX === 'right' && oY === 'middle') {
            return [10.5, 2];
        } else return [0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const isTextLine = new RegExp('[\\u4E00-\\u9FFF]+', 'g').test(lineCode);

    const zhRef = React.useRef<SVGGElement>(null);
    const elRef = React.useRef<SVGGElement>(null);
    const opRef = React.useRef<SVGGElement>(null);
    const [elOffset, setElOffset] = React.useState(0);
    const [opOffset, setOpOffset] = React.useState(0);

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
        if (!open && opRef.current && zhRef.current) {
            const opWidth = opRef.current.getBBox().width;
            const zhWidth = zhRef.current.getBBox().width;
            if (zhWidth > opWidth) {
                setOpOffset((zhWidth - opWidth) / 2);
            } else {
                setOpOffset(0);
            }
        }
    }, [names[0], names[1], nameOffsetX]);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <rect
                x={-7.5}
                y={-7.5}
                width={15}
                height={15}
                stroke={color[2]}
                strokeWidth={1.2}
                rx={2}
                ry={2}
                fill="white"
            />
            <text fontSize={isTextLine ? 5 : 7} textAnchor="middle" x={0} y={isTextLine ? -1.5 : -1}>
                {lineCode}
            </text>
            <text fontSize={7} textAnchor="middle" x={0} y={6}>
                {/^\d+$/.test(stationCode) && Number.isInteger(Number(stationCode)) && Number(stationCode) < 10
                    ? `0${Number(stationCode)}`
                    : stationCode}
            </text>
            {(lineCode || stationCode) && <line x1={-5.5} y1={0} x2={5.5} y2={0} stroke={'black'} strokeWidth={0.6} />}
            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <rect
                id={`stn_core_${id}`}
                x={-8.5}
                y={-8.5}
                width={17}
                height={17}
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
                {!open && (
                    <g ref={opRef} transform={`translate(${nameOffsetX == 'right' ? opOffset : -opOffset},0)`}>
                        <text
                            dy={names[1].split('\n').length * LINE_HEIGHT.en + 2}
                            fontSize={LINE_HEIGHT.en}
                            dominantBaseline="hanging"
                            {...getLangStyle(TextLanguage.zh)}
                        >
                            (暂缓开通)
                        </text>
                    </g>
                )}
            </g>
        </g>
    );
};

/**
 * ChongqingRTBasicStation2021 specific props.
 */
export interface ChongqingRTBasicStation2021Attributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    lineCode: string;
    stationCode: string;
    open: boolean;
}

const defaultChongqingRTBasicStation2021Attributes: ChongqingRTBasicStation2021Attributes = {
    ...defaultStationAttributes,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    lineCode: '1',
    stationCode: '1',
    open: true,
};

const ChongqingRTBasic2021AttrsComponent = (props: AttrsProps<ChongqingRTBasicStation2021Attributes>) => {
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
            value: attrs.names.at(1) ?? defaultChongqingRTBasicStation2021Attributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: (attrs ?? defaultChongqingRTBasicStation2021Attributes).nameOffsetX,
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
            value: (attrs ?? defaultChongqingRTBasicStation2021Attributes).nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: (attrs ?? defaultChongqingRTBasicStation2021Attributes).lineCode,
            onChange: val => {
                attrs.lineCode = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: (attrs ?? defaultChongqingRTBasicStation2021Attributes).stationCode,
            onChange: val => {
                attrs.stationCode = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.ChongqingRTBasic2021}
                    defaultTheme={defaultChongqingRTBasicStation2021Attributes.color}
                />
            ),
        },
        {
            type: 'switch',
            label: t('panel.details.stations.chongqingRTBasic2021.open'),
            oneLine: true,
            isChecked: (attrs ?? defaultChongqingRTBasicStation2021Attributes).open,
            onChange: (val: boolean) => {
                attrs.open = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRTBasicStation2021Icon = (
    <svg viewBox="-1 -1 14 14" width={40} height={40} focusable={false} style={{ padding: 5 }}>
        <rect
            x={0}
            y={0}
            width={12}
            height={12}
            stroke="black"
            strokeWidth={1.2}
            rx={2}
            ry={2}
            fill="white"
            style={{ cursor: 'move' }}
        />
        <text fontSize={5.5} textAnchor="middle" x={6} y={5}>
            1
        </text>
        <text fontSize={5.5} textAnchor="middle" x={6} y={11}>
            01
        </text>
        <line x1={1.5} y1={6} x2={10.5} y2={6} stroke={'black'} strokeWidth={0.6} />
    </svg>
);

const chongqingRTBasicStation2021: Station<ChongqingRTBasicStation2021Attributes> = {
    component: ChongqingRTBasicStation2021,
    icon: chongqingRTBasicStation2021Icon,
    defaultAttrs: defaultChongqingRTBasicStation2021Attributes,
    attrsComponent: ChongqingRTBasic2021AttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chongqingRTBasic2021.displayName',
        cities: [CityCode.Chongqing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chongqingRTBasicStation2021;
