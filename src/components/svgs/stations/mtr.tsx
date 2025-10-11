import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import {
    InterchangeField,
    InterchangeInfo,
    StationAttributesWithInterchange,
} from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

export const LINE_WIDTH = 5;
export const R = 5;
const NAME_LINE_HEIGHT = {
    top: 7.5 + 1,
    middle: 0,
    bottom: 10 + 1,
};

export const makeStationPath = (
    r: number,
    lineWidth: number = LINE_WIDTH,
    transfer: InterchangeInfo[] = []
): `M${string}` => {
    const y = Math.sqrt(r * r - (lineWidth * lineWidth) / 4);
    const circleCount = transfer.length < 2 ? transfer.length + 1 : transfer.length;
    let d = `M ${-r},0 A ${r},${r},0,0,1,${-lineWidth / 2},-${y} `;
    for (let i = 0; i < circleCount; i = i + 1) {
        d += `A ${r},${r},0,0,1,${i * lineWidth + lineWidth / 2},-${y} `;
    }
    d += `A ${r},${r},0,0,1,${transfer.length * lineWidth - lineWidth / 2},${y} `;
    for (let i = circleCount - 1; i >= 0; i = i - 1) {
        d += `A ${r},${r},0,0,1,${i * lineWidth - lineWidth / 2},${y} `;
    }
    d += `A ${r},${r},0,0,1,${-r},0 Z`;
    return d as `M${string}`;
};

const MTRStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultMTRStationAttributes.nameOffsetX,
        nameOffsetY = defaultMTRStationAttributes.nameOffsetY,
        transfer = defaultMTRStationAttributes.transfer,
        rotate = defaultMTRStationAttributes.rotate,
    } = attrs[StationType.MTR] ?? defaultMTRStationAttributes;

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

    const transferLv1 = transfer.at(0)!;
    const path = makeStationPath(R, LINE_WIDTH, transferLv1);

    const circleCount = transferLv1.length === 0 ? 0 : transferLv1.length <= 2 ? 1 : transferLv1.length - 1;
    const iconX = Math.cos((rotate * Math.PI) / 180) * circleCount * R;
    const iconY = Math.sin((rotate * Math.PI) / 180) * circleCount * R;
    const textDX = nameOffsetX === 'left' ? -8 : nameOffsetX === 'right' ? 8 : 0;
    // if icon grows the same direction of the text, add the extra icon length to text
    const textX = Math.sign(iconX) === Math.sign(textDX) ? iconX + textDX : textDX;
    const textDY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_LINE_HEIGHT[nameOffsetY] + 6) *
        NAME_DY[nameOffsetY].polarity;
    const textY = Math.sign(iconY) === Math.sign(textDY) ? iconY + textDY : textDY;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <path
                transform={`rotate(${rotate})`}
                d={path}
                stroke="#001f50"
                strokeWidth="1.5"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            {transfer.at(0)!.length > 1 &&
                transfer
                    .at(0)!
                    .map(info => info[2])
                    .map((color, i) => (
                        <line
                            key={`${i}_${color}`}
                            transform={`rotate(${rotate})`}
                            x1={-LINE_WIDTH / 2 + i * LINE_WIDTH}
                            x2={LINE_WIDTH / 2 + i * LINE_WIDTH}
                            stroke={color}
                            strokeWidth="2"
                        />
                    ))}

            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <path
                id={`stn_core_${id}`}
                transform={`rotate(${rotate})`}
                d={path}
                fill="white"
                fillOpacity="0"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
                className="removeMe"
            />
            <g
                transform={`translate(${textX}, ${textY})`}
                textAnchor={textAnchor}
                className="rmp-name-outline"
                strokeWidth="1.25"
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={10}
                    lineHeight={10}
                    grow="up"
                    baseOffset={1}
                    fill="#001f50"
                    {...getLangStyle(TextLanguage.mtr_zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={7.5}
                    lineHeight={7.5}
                    grow="down"
                    baseOffset={1}
                    fill="#001f50"
                    {...getLangStyle(TextLanguage.mtr_en)}
                />
            </g>
        </g>
    );
};

/**
 * MTRStation specific props.
 */
export interface MTRStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    rotate: Rotate;
}

const defaultMTRStationAttributes: MTRStationAttributes = {
    names: ['車站', 'Stn'],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    transfer: [[]],
};

const MTRStationAttrsComponent = (props: AttrsProps<MTRStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultMTRStationAttributes.names[1],
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

    return (
        <>
            <RmgFields fields={fields} />
            <InterchangeField
                stationType={StationType.MTR}
                defaultAttrs={defaultMTRStationAttributes}
                maximumTransfers={[1000, 0, 0]}
            />
        </>
    );
};

const mtrStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
);

const mtrStation: Station<MTRStationAttributes> = {
    component: MTRStation,
    icon: mtrStationIcon,
    defaultAttrs: defaultMTRStationAttributes,
    attrsComponent: MTRStationAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.mtr.displayName',
        cities: [CityCode.Hongkong],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default mtrStation;
