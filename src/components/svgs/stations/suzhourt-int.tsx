import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
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
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const ICON_SIZE = 6;

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
        offset: 0 + NAME_SZ_BASIC.en.baseOffset + 3, // offset + baseOffset + iconRadius
        polarity: -1,
    },
    middle: {
        lineHeight: 0,
        offset: NAME_SZ_BASIC.zh.size / 2,
        polarity: 1,
    },
    bottom: {
        lineHeight: 10,
        offset: 0 + NAME_SZ_BASIC.zh.baseOffset + 3, // offset + baseOffset + iconRadius
        polarity: 1,
    },
};

const SuzhouRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultSuzhouRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultSuzhouRTIntStationAttributes.nameOffsetY,
        rotate = defaultSuzhouRTIntStationAttributes.rotate,
        transfer = defaultSuzhouRTIntStationAttributes.transfer,
    } = attrs[StationType.SuzhouRTInt] ?? defaultSuzhouRTIntStationAttributes;

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

    const width = (ICON_SIZE - 1) * transfer.at(0)!.length + 1;
    const iconWidth = Math.abs(Math.cos((rotate * Math.PI) / 180) * width);
    const iconHeight = Math.abs(Math.sin((rotate * Math.PI) / 180) * width);

    const textPolarity = nameOffsetX === 'left' ? -1 : nameOffsetX === 'right' ? 1 : 0;
    const textX = (iconWidth / 2 + 5) * textPolarity;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY_SZ_BASIC[nameOffsetY].lineHeight +
            NAME_DY_SZ_BASIC[nameOffsetY].offset +
            (nameOffsetY === 'middle' ? 0 : iconHeight / 2)) *
        NAME_DY_SZ_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <g
                    transform={`rotate(${rotate})`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                >
                    <rect
                        x={-width / 2}
                        y={-ICON_SIZE / 2}
                        width={width}
                        height={ICON_SIZE}
                        ry={ICON_SIZE / 2}
                        stroke="#616161"
                        strokeWidth="1"
                        fill="white"
                    />
                    {(transfer.at(0) ?? []).length > 0 &&
                        transfer
                            .at(0)!
                            .map(info => info[2])
                            .map((color, i) => (
                                <circle key={`${i}_${color}`} r={2} cx={-width / 2 + 3 + i * 5} fill={color} />
                            ))}
                    <rect
                        id={`stn_core_${id}`}
                        x={-width / 2 - 0.5}
                        y={-ICON_SIZE / 2 - 0.5}
                        width={width + 1}
                        height={ICON_SIZE + 1}
                        ry={ICON_SIZE / 2}
                        fill="white"
                        opacity="0"
                    />
                </g>
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
        [
            id,
            x,
            y,
            ...names,
            nameOffsetX,
            nameOffsetY,
            rotate,
            JSON.stringify(transfer),
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * SuzhouRTIntStation specific props.
 */
export interface SuzhouRTIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    /**
     * 0 <= rotate < 360
     */
    rotate: number;
}

const defaultSuzhouRTIntStationAttributes: SuzhouRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    transfer: [
        [
            [CityCode.Suzhou, 'sz1', '#78BA25', MonoColour.white, '', ''],
            [CityCode.Suzhou, 'sz2', '#ED3240', MonoColour.white, '', ''],
        ],
    ],
};

const SuzhouRTIntAttrsComponent = (props: AttrsProps<SuzhouRTIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.replaceAll('\n', '\\');
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
            type: 'select',
            label: t('panel.details.stations.common.rotate'),
            value: attrs.rotate,
            hidden: (attrs?.transfer?.flat()?.length ?? 0) === 0,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: val => {
                attrs.rotate = Number(val) as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.stations.interchange.title'),
            component: (
                <InterchangeField
                    stationType={StationType.SuzhouRTInt}
                    defaultAttrs={defaultSuzhouRTIntStationAttributes}
                    maximumTransfers={[99, 0, 0]}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const suzhouRTIntStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="6" y="9" width="12" height="6" ry="3" stroke="currentColor" fill="none" />
        <circle r="2" cx="9.5" cy="12" fill="currentColor" />
        <circle r="2" cx="14.5" cy="12" fill="currentColor" />
    </svg>
);

const suzhouRTIntStation: Station<SuzhouRTIntStationAttributes> = {
    component: SuzhouRTIntStation,
    icon: suzhouRTIntStationIcon,
    defaultAttrs: defaultSuzhouRTIntStationAttributes,
    attrsComponent: SuzhouRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.suzhouRTInt.displayName',
        cities: [CityCode.Suzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default suzhouRTIntStation;
