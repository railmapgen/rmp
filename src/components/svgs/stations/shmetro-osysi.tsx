import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { MultilineText, NAME_DY } from '../common/multiline-text';
import { NAME_DY_SH_BASIC } from './shmetro-basic';

const ShmetroOsysiStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultShmetroOsysiStationAttributes.nameOffsetX,
        nameOffsetY = defaultShmetroOsysiStationAttributes.nameOffsetY,
    } = attrs[StationType.ShmetroOutOfSystemInt] ?? defaultShmetroOsysiStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -13.33 : nameOffsetX === 'right' ? 13.33 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY_SH_BASIC[nameOffsetY].lineHeight +
            NAME_DY_SH_BASIC[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <circle r={5} stroke="#393332" strokeWidth="1.33" fill="white" />
                <circle r={2.3} stroke="#393332" strokeWidth="1.33" fill="white" />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <circle
                    id={`stn_core_${id}`}
                    r={5 + 1.33 / 2}
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
                <g
                    transform={`translate(${textX}, ${textY})`}
                    textAnchor={textAnchor}
                    className="rmp-name-outline"
                    strokeWidth="2.5"
                >
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={12.67}
                        lineHeight={12.67}
                        grow="up"
                        baseOffset={1}
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        dx={nameOffsetX === 'right' ? 1.67 : 0}
                        fontSize={6.67}
                        lineHeight={6.67}
                        grow="down"
                        baseOffset={1.5}
                        className="rmp-name__en"
                    />
                </g>
            </g>
        ),
        [id, x, y, ...names, nameOffsetX, nameOffsetY, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * ShmetroOsysiStation specific props.
 */
export interface ShmetroOsysiStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultShmetroOsysiStationAttributes: ShmetroOsysiStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
};

const shmetroOsysiAttrsComponent = (props: AttrsProps<ShmetroOsysiStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.toString().replaceAll('\n', '\\');
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
    ];

    return <RmgFields fields={fields} />;
};

const shmetroOsysiStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.67" fill="white" />
        <circle cx="12" cy="12" r="4.6" stroke="currentColor" strokeWidth="2.67" fill="white" />
    </svg>
);

const shmetroOsysiStation: Station<ShmetroOsysiStationAttributes> = {
    component: ShmetroOsysiStation,
    icon: shmetroOsysiStationIcon,
    defaultAttrs: defaultShmetroOsysiStationAttributes,
    attrsComponent: shmetroOsysiAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.shmetroOsysi.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default shmetroOsysiStation;
