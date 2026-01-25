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
    Rotate,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { NAME_DY, MultilineText } from '../common/multiline-text';

export interface HzmetroIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    rotate: Rotate;
    mirror: boolean;
    scale: number;
}

const defaultHzmetroIntStationAttributes: HzmetroIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    mirror: false,
    scale: 1,
    transfer: [[]],
};

const HzmetroIntComponent: React.FC<StationComponentProps> = props => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultHzmetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultHzmetroIntStationAttributes.nameOffsetY,
        rotate = defaultHzmetroIntStationAttributes.rotate,
        mirror = defaultHzmetroIntStationAttributes.mirror,
        scale = defaultHzmetroIntStationAttributes.scale,
        transfer = defaultHzmetroIntStationAttributes.transfer,
    } = attrs[StationType.HzmetroInt] ?? defaultHzmetroIntStationAttributes;

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

    const t1 = transfer?.[0]?.[0]?.[2] ?? 'grey';
    const t2 = transfer?.[0]?.[1]?.[2] ?? 'grey';
    const t3 = transfer?.[0]?.[2]?.[2] ?? 'grey';

    // text position similar to shmetro-int
    const textX =
        (nameOffsetX === 'left' ? -10 : nameOffsetX === 'right' ? 10 : 0) * (nameOffsetY === 'middle' ? 1.6 : 1);
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * 12.67 +
            (nameOffsetY === 'top' ? 12 : nameOffsetY === 'bottom' ? 12 : 0)) *
            NAME_DY[nameOffsetY].polarity *
            (nameOffsetX === 'middle' ? 1.35 : 1) +
        1;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`rotate(${rotate}) scale(${mirror ? -1 : 1}, 1)`}>
                {transfer[0].length <= 2 ? (
                    <g transform="translate(-16.6265 -16.6265)">
                        <circle fill="white" cx="16.6265" cy="16.6265" r="12.098" />
                        <g transform="rotate(98.355 16.6265 16.6265)">
                            <path
                                fill={t1}
                                d="M1.559,18.856A15.122,15.122,0,1,0,31.478,14.43l-.569.084,0-.026-2.842.421A11.493,11.493,0,0,1,5.326,18.273l-2.842.42,0,.026Z"
                            />
                            <path
                                fill={t2}
                                d="M1.559,18.856h0l.93-.137,0,.025h0l2.842-.42h0a11.493,11.493,0,0,1,22.739-3.365h0l2.843-.421h0l-.006-.025.569-.084A15.122,15.122,0,1,0,1.559,18.856Z"
                            />
                        </g>
                        <g transform="translate(0.2 0)">
                            <g transform="rotate(45 16.6265 16.6265)">
                                <polygon
                                    fill={t1}
                                    points="22.97 20.858 17.18 24.871 12.135 20.858 9.524 23.469 9.524 13.638 15.919 13.638 15.146 14.41 11.161 14.41 11.161 19.826 12.737 18.25 17.294 22.807 22.97 20.858"
                                />
                                <polygon
                                    fill={t2}
                                    points="10.284 12.912 16.074 8.899 21.118 12.912 23.729 10.301 23.729 20.132 17.335 20.132 18.107 19.359 22.093 19.359 22.093 13.943 20.516 15.52 15.959 10.963 10.284 12.912"
                                />
                            </g>
                        </g>
                    </g>
                ) : (
                    <g transform="translate(-17.4805 -16.9095)">
                        <circle fill="white" cx="17.4805" cy="16.9095" r="12.098" />
                        <path
                            fill={t1}
                            d="M5.862,18.648A11.487,11.487,0,0,1,11.636,6.962L9.841,3.855a15.1,15.1,0,0,0,.013,26.169l1.769-3.064A11.46,11.46,0,0,1,5.862,18.648Z"
                        />
                        <path
                            fill={t2}
                            d="M15.551,5.62A11.492,11.492,0,0,1,28.6,15.283c.046.319.07.635.089.949h3.828A15.1,15.1,0,0,0,9.841,3.855l1.8,3.107A11.446,11.446,0,0,1,15.551,5.62Z"
                        />
                        <path
                            fill={t3}
                            d="M32.515,16.232H28.687A11.47,11.47,0,0,1,11.623,26.96L9.854,30.024A15.107,15.107,0,0,0,32.515,16.232Z"
                        />
                        <polygon
                            fill={t1}
                            points="15.207 22.556 10.276 21.216 10.148 16.543 7.48 16.313 12.937 11.722 15.922 15.271 15.132 15.203 13.272 12.991 10.266 15.52 11.877 15.659 11.475 20.316 15.207 22.556"
                        />
                        <polygon
                            fill={t2}
                            points="14.154 12.92 17.515 9.072 21.774 11.001 23.148 8.702 24.889 15.617 20.392 16.75 20.798 16.069 23.601 15.363 22.642 11.554 21.813 12.942 17.8 10.544 14.154 12.92"
                        />
                        <polygon
                            fill={t3}
                            points="22.509 16.267 24.45 20.993 20.822 23.942 22.266 26.198 15.301 24.668 16.296 20.138 16.723 20.806 16.103 23.629 19.94 24.472 19.068 23.11 23.006 20.59 22.509 16.267"
                        />
                    </g>
                )}
                <circle
                    id={`stn_core_${id}`}
                    r="12.098"
                    opacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>

            <g transform={`translate(${textX}, ${textY}) scale(${scale} 1)`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={18}
                    lineHeight={18}
                    grow="up"
                    baseOffset={1}
                    letterSpacing={2}
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    y={2}
                    text={names[1].split('\n')}
                    dx={nameOffsetX === 'right' ? 1.67 : nameOffsetX === 'left' ? -2.67 : 0}
                    fontSize={12}
                    lineHeight={12}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

const HzmetroIntAttrsComponent: React.FC<AttrsProps<HzmetroIntStationAttributes>> = props => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0] ?? defaultHzmetroIntStationAttributes.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1] ?? defaultHzmetroIntStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultHzmetroIntStationAttributes.nameOffsetX,
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
            value: attrs.nameOffsetY ?? defaultHzmetroIntStationAttributes.nameOffsetY,
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
            value: attrs.rotate ?? defaultHzmetroIntStationAttributes.rotate,
            options: {
                0: '0',
                45: '45',
                90: '90',
                135: '135',
                180: '180',
                225: '225',
                270: '270',
                315: '315',
            },
            onChange: val => {
                attrs.rotate = Number(val) as any;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.hzmetroInt.mirror'),
            isChecked: attrs.mirror ?? defaultHzmetroIntStationAttributes.mirror,
            onChange: val => {
                attrs.mirror = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            oneLine: true,
        },
        {
            type: 'slider',
            label: t('panel.details.stations.hzmetroInt.scale'),
            value: attrs.scale ?? defaultHzmetroIntStationAttributes.scale,
            onChange: val => {
                attrs.scale = val;
                handleAttrsUpdate(id, attrs);
            },
            step: 0.025,
            min: 0.5,
            max: 1,
            minW: 'full',
        },
        // Interchange editor (transfer list)
        {
            type: 'custom',
            label: t('panel.details.stations.interchange.title'),
            component: (
                <InterchangeField
                    stationType={StationType.HzmetroInt}
                    defaultAttrs={defaultHzmetroIntStationAttributes}
                    maximumTransfers={[3, 0, 0]}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const hzmetroIntIcon = (
    <svg viewBox="0 0 33.253 33.253" height="40" width="40" focusable={false}>
        <g transform="rotate(98.355 16.6265 16.6265)" fill="currentColor">
            <path d="M1.559,18.856A15.122,15.122,0,1,0,31.478,14.43l-.569.084,0-.026-2.842.421A11.493,11.493,0,0,1,5.326,18.273l-2.842.42,0,.026Z" />
            <path d="M1.559,18.856h0l.93-.137,0,.025h0l2.842-.42h0a11.493,11.493,0,0,1,22.739-3.365h0l2.843-.421h0l-.006-.025.569-.084A15.122,15.122,0,1,0,1.559,18.856Z" />
        </g>
        <g transform="translate(0.2 0)">
            <g transform="rotate(45 16.6265 16.6265)">
                <polygon points="22.97 20.858 17.18 24.871 12.135 20.858 9.524 23.469 9.524 13.638 15.919 13.638 15.146 14.41 11.161 14.41 11.161 19.826 12.737 18.25 17.294 22.807 22.97 20.858" />
                <polygon points="10.284 12.912 16.074 8.899 21.118 12.912 23.729 10.301 23.729 20.132 17.335 20.132 18.107 19.359 22.093 19.359 22.093 13.943 20.516 15.52 15.959 10.963 10.284 12.912" />
            </g>
        </g>
    </svg>
);

const hzmetroIntStation: Station<HzmetroIntStationAttributes> = {
    component: HzmetroIntComponent,
    icon: hzmetroIntIcon,
    defaultAttrs: defaultHzmetroIntStationAttributes,
    attrsComponent: HzmetroIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.hzmetroInt.displayName',
        cities: [CityCode.Hangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default hzmetroIntStation;
