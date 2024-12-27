import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { AttrsProps, CityCode, Theme } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { ColorField } from '../../../panels/details/color-field';

const LondonRail = (props: LineStyleComponentProps<LondonRailAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const {
        colorBackground = defaultLondonRailAttributes.colorBackground,
        colorForeground = defaultLondonRailAttributes.colorForeground,
    } = styleAttrs ?? defaultLondonRailAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={colorBackground[2]} strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke={colorForeground[2]} strokeWidth="2" strokeDasharray="7 3" />
        </g>
    );
};

/**
 * LondonRail specific props.
 */
export interface LondonRailAttributes extends LinePathAttributes {
    colorBackground: Theme;
    colorForeground: Theme;
}

const defaultLondonRailAttributes: LondonRailAttributes = {
    colorBackground: [CityCode.London, 'rail', '#d28db0', MonoColour.white],
    colorForeground: [CityCode.London, 'white', '#ffffff', MonoColour.white],
};

const londonRailAttrsComponent = (props: AttrsProps<LondonRailAttributes>) => {
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: 'color',
            component: (
                <ColorField
                    type={LineStyleType.LondonRail}
                    colorKey="colorBackground"
                    defaultTheme={defaultLondonRailAttributes.colorBackground}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonRail: LineStyle<LondonRailAttributes> = {
    component: LondonRail,
    defaultAttrs: defaultLondonRailAttributes,
    attrsComponent: londonRailAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonRail.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default londonRail;
