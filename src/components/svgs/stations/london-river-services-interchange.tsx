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

const X_HEIGHT = 5;
const FONT_SIZE = 2 * X_HEIGHT;
const LINE_HEIGHT = 0.85 * FONT_SIZE;

const D1 =
    'M-18.2,12.6c2.4-0.6,5.8-1.6,11.5-0.4c2.9,0.6,5.6,1.3,8.3,1.3c3.5,0,5.4-0.6,8.1-1.2c2.4-0.6,5.2-1.2,7.4-1.1c3.8,0.1,6.6,0.7,8.2,1.4l-1.2-3.1C21,8.3,15.8,7.7,9.7,9.5c-2.6,0.7-5.2,1.3-7.9,1.2c-2.5,0-4.8-0.4-7.2-1C-13,8-15.9,9.3-19.8,10.3L-18.2,12.6z';
const D2 =
    'M23.8-2h-4.1l-1.8-4.8c0,0-0.1-0.6-1-1.3c-0.6-0.5-1.6-0.5-1.6-0.5H4v-2h-6.9l-1.1-1.5l0.8-1.9h-1.9l-1.5,3.5h-2.6v2h-5.8c0,0-0.8,0.1-1.2,0.3c-0.4,0.3-0.6,0.5-0.6,0.5l-4.4,5.8h-7.3l7.3,10c1.6-0.7,6.6-2,9.7-1.9c4.1,0.1,9.5,1.9,13.1,1.9c6.6,0,8.8-2,14.6-2.3c7.1-0.4,11.6,2.3,11.6,2.3L23.8-2z M-11.1-2h-7.1l1.9-2.5c0,0,0.8-1.1,1.2-1.3c0.7-0.4,1.2-0.5,1.2-0.5h2.8V-2z M-9.2-2v-4.3h7.4v4.4L-9.2-2z M7.4-2H0v-4.3h7.4V-2z M9.3-2v-4.3h5.1c0,0,0.4,0,0.8,0.4c0.3,0.2,0.5,0.7,0.5,0.7l1.2,3.3L9.3-2z';

const LondonRiverServicesIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultLondonRiverServicesIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultLondonRiverServicesIntStationAttributes.nameOffsetY,
    } = attrs[StationType.LondonRiverServicesInt] ?? defaultLondonRiverServicesIntStationAttributes;

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

    const textDx =
        nameOffsetX === 'left'
            ? -(X_HEIGHT / 2 + X_HEIGHT * 1.33)
            : nameOffsetX === 'right'
              ? X_HEIGHT / 2 + X_HEIGHT * 1.33
              : 0;
    const textDy =
        nameOffsetY === 'top'
            ? -(X_HEIGHT / 2 + X_HEIGHT * 1.33)
            : nameOffsetY === 'bottom'
              ? X_HEIGHT / 2 + X_HEIGHT * 1.33
              : 0; // fixed dy for each rotation

    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const dominantBaseline = nameOffsetY === 'top' ? 'auto' : nameOffsetY === 'bottom' ? 'hanging' : 'middle';

    return (
        <g id={id}>
            <g
                transform={`translate(${x}, ${y})`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                <circle r={1.45 * X_HEIGHT} stroke="#003888" strokeWidth={0.1 * X_HEIGHT} fill="white" />
                <g fill="#003888" transform="scale(0.222)">
                    <path d={D1} />
                    <path d={D2} />
                </g>

                {/* Below is an overlay element that has the id info but can not be seen. */}
                <circle id={`stn_core_${id}`} r={1.5 * X_HEIGHT} fill="white" fillOpacity="0" className="removeMe" />
            </g>
            <g transform={`translate(${x + textDx}, ${y + textDy})`} textAnchor={textAnchor} fill="#003888">
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={FONT_SIZE}
                    lineHeight={LINE_HEIGHT}
                    dominantBaseline={dominantBaseline}
                    grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'bottom' ? 'down' : 'bidirectional'}
                    baseOffset={1}
                    {...getLangStyle(TextLanguage.tube)}
                />
            </g>
        </g>
    );
};

/**
 * LondonRiverServicesIntStation specific props.
 */
export interface LondonRiverServicesIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultLondonRiverServicesIntStationAttributes: LondonRiverServicesIntStationAttributes = {
    names: ['Station'],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
};

const londonRiverServicesIntAttrsComponent = (props: AttrsProps<LondonRiverServicesIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
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
    ];

    return <RmgFields fields={fields} />;
};

const londonRiverServicesIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" fill="white" />
        <g transform="translate(12, 12)scale(0.18)">
            <path stroke="currentColor" d={D1} />
            <path stroke="currentColor" d={D2} />
        </g>
    </svg>
);

const londonRiverServicesIntStation: Station<LondonRiverServicesIntStationAttributes> = {
    component: LondonRiverServicesIntStation,
    icon: londonRiverServicesIntStationIcon,
    defaultAttrs: defaultLondonRiverServicesIntStationAttributes,
    attrsComponent: londonRiverServicesIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.londonRiverServicesInt.displayName',
        cities: [CityCode.London],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default londonRiverServicesIntStation;
