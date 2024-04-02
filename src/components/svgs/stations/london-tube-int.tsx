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
import { AccessibleIcon } from './london-tube-basic';

const X_HEIGHT = 5;

const LondonTubeIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultLondonTubeIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultLondonTubeIntStationAttributes.nameOffsetY,
        stepFreeAccess = defaultLondonTubeIntStationAttributes.stepFreeAccess,
    } = attrs[StationType.LondonTubeInt] ?? defaultLondonTubeIntStationAttributes;

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

    // rotate starts from top-middle while Math.sin/cos starts from middle-right
    const height = 0.66 * X_HEIGHT + X_HEIGHT / 2;
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
                {stepFreeAccess === 'none' ? (
                    <circle
                        id={`stn_core_${id}`}
                        r={1.25 * X_HEIGHT}
                        width={X_HEIGHT * 0.66}
                        height={height}
                        stroke="black"
                        strokeWidth={0.5 * X_HEIGHT}
                        fill="white"
                    />
                ) : (
                    <AccessibleIcon stepFreeAccess={stepFreeAccess} transform={`scale(0.2)`} />
                )}
            </g>
            <g transform={`translate(${x + textDx}, ${y + textDy})`} textAnchor={textAnchor} fill="#003888">
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={1.22 * X_HEIGHT}
                    lineHeight={X_HEIGHT}
                    dominantBaseline={dominantBaseline}
                    grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'bottom' ? 'down' : 'bidirectional'}
                    baseOffset={1}
                    className="rmp-name__tube"
                />
            </g>
        </g>
    );
};

/**
 * LondonTubeIntStation specific props.
 */
export interface LondonTubeIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    stepFreeAccess: 'none' | 'train' | 'platform';
}

const defaultLondonTubeIntStationAttributes: LondonTubeIntStationAttributes = {
    names: ['Station'],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    stepFreeAccess: 'none',
};

const londonTubeIntAttrsComponent = (props: AttrsProps<LondonTubeIntStationAttributes>) => {
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
        {
            type: 'select',
            label: t('panel.details.stations.londonTube.stepFreeAccess'),
            value: attrs.stepFreeAccess,
            options: {
                none: t('panel.details.stations.londonTubeInt.stepFreeAccessNone'),
                train: t('panel.details.stations.londonTubeInt.stepFreeAccessTrain'),
                platform: t('panel.details.stations.londonTubeInt.stepFreeAccessPlatform'),
            },
            onChange: val => {
                attrs.stepFreeAccess = val as 'none' | 'train' | 'platform';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonTubeIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" fill="white" />
    </svg>
);

const londonTubeIntStation: Station<LondonTubeIntStationAttributes> = {
    component: LondonTubeIntStation,
    icon: londonTubeIntStationIcon,
    defaultAttrs: defaultLondonTubeIntStationAttributes,
    attrsComponent: londonTubeIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.londonTubeInt.displayName',
        cities: [CityCode.London],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default londonTubeIntStation;
