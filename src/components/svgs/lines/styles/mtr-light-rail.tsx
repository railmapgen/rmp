import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { ColorField, AttributesWithColor } from '../../../panels/details/color-field';
import { LineStyleType } from '../../../../constants/lines';

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
        component: <ColorField type={LineStyleType.MTRLightRail} defaultAttrs={defaultMTRLightRailAttributes} />,
    },
];

const mtrLightRail: LineStyle<MTRLightRailAttributes> = {
    component: MTRLightRail,
    defaultAttrs: defaultMTRLightRailAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: mtrLightRailFields,
    metadata: {
        displayName: 'panel.details.line.mtrLightRail.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular],
    },
};

export default mtrLightRail;
