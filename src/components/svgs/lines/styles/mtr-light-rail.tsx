import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CityCode } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { AttributesWithColor, ColorField } from '../../../panels/details/color-field';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';

const MTRLightRail = (props: LineStyleComponentProps<MTRLightRailAttributes>) => {
    const { id, path, styleAttrs, handleClick } = props;
    const { color = defaultMTRLightRailAttributes.color } = styleAttrs ?? defaultMTRLightRailAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke={color[2]}
            strokeWidth="2.5"
            strokeLinecap="round"
            cursor="pointer"
            onClick={onClick}
        />
    );
};

/**
 * MTRLightRail specific props.
 */
export interface MTRLightRailAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultMTRLightRailAttributes: MTRLightRailAttributes = {
    color: [CityCode.Hongkong, 'lrl', '#CD9700', MonoColour.white],
};

const mtrLightRailFields = [
    {
        type: 'custom',
        label: 'color',
        component: <ColorField type={LineStyleType.MTRLightRail} defaultTheme={defaultMTRLightRailAttributes.color} />,
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={mtrLightRailFields as RmgFieldsFieldDetail<MTRLightRailAttributes>}
        type="style"
    />
);

const mtrLightRail: LineStyle<MTRLightRailAttributes> = {
    component: MTRLightRail,
    defaultAttrs: defaultMTRLightRailAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mtrLightRail.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default mtrLightRail;
