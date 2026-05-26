import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode, Theme } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';
import { ColorAttribute } from '../../../panels/details/color-field';

type GuangdongIntercityRailwayColor = 'blue' | 'gray';

const GUANGDONG_INTERCITY_RAILWAY_COLORS: Record<GuangdongIntercityRailwayColor, Theme> = {
    blue: [CityCode.Guangzhou, 'ir', '#2559a8', MonoColour.white],
    gray: [CityCode.Guangzhou, 'ir-gray', '#515151', MonoColour.white],
};

const GuangdongIntercityRailway = (props: LineStyleComponentProps<GuangdongIntercityRailwayAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultGuangdongIntercityRailwayAttributes.color } =
        styleAttrs ?? defaultGuangdongIntercityRailwayAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path.d} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH} strokeLinecap="round" />
            <path d={path.d} fill="none" stroke={color[3]} strokeWidth={LINE_WIDTH / 2} strokeDasharray="7.5" />
        </g>
    );
};

/**
 * GuangdongIntercityRailway specific props.
 */
export interface GuangdongIntercityRailwayAttributes extends LinePathAttributes, ColorAttribute {}

const defaultGuangdongIntercityRailwayAttributes: GuangdongIntercityRailwayAttributes = {
    color: GUANGDONG_INTERCITY_RAILWAY_COLORS.blue,
};

const getColorValue = (color: Theme): GuangdongIntercityRailwayColor =>
    color[2].toLowerCase() === GUANGDONG_INTERCITY_RAILWAY_COLORS.gray[2].toLowerCase() ? 'gray' : 'blue';

const attrsComponent = (props: AttrsProps<GuangdongIntercityRailwayAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('panel.details.lines.guangdongIntercityRailway.color'),
            value: getColorValue(attrs.color ?? defaultGuangdongIntercityRailwayAttributes.color),
            options: {
                blue: t('panel.details.lines.guangdongIntercityRailway.blue'),
                gray: t('panel.details.lines.guangdongIntercityRailway.gray'),
            },
            onChange: val => {
                attrs.color = GUANGDONG_INTERCITY_RAILWAY_COLORS[val as GuangdongIntercityRailwayColor];
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const guangdongIntercityRailway: LineStyle<GuangdongIntercityRailwayAttributes> = {
    component: GuangdongIntercityRailway,
    defaultAttrs: defaultGuangdongIntercityRailwayAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.guangdongIntercityRailway.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
    },
};

export default guangdongIntercityRailway;
