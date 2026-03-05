import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const LondonLutonAirportDART = (props: LineStyleComponentProps<LondonLutonAirportDARTAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultLondonLutonAirportDARTAttributes.color } =
        styleAttrs ?? defaultLondonLutonAirportDARTAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH} strokeLinecap="round" />
            <path
                d={path}
                fill="none"
                stroke={color[3]}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="0.001 6"
            />
        </g>
    );
};

/**
 * LondonLutonAirportDART specific props.
 */
export interface LondonLutonAirportDARTAttributes extends LinePathAttributes, ColorAttribute {}

const defaultLondonLutonAirportDARTAttributes: LondonLutonAirportDARTAttributes = {
    color: [CityCode.London, 'rail', '#d6ae00', MonoColour.white],
};

const londonLutonAirportDARTAttrsComponent = (props: AttrsProps<LondonLutonAirportDARTAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.LondonLutonAirportDART}
                    defaultTheme={defaultLondonLutonAirportDARTAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonLutonAirportDART: LineStyle<LondonLutonAirportDARTAttributes> = {
    component: LondonLutonAirportDART,
    defaultAttrs: defaultLondonLutonAirportDARTAttributes,
    attrsComponent: londonLutonAirportDARTAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonLutonAirportDART.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonLutonAirportDART;
