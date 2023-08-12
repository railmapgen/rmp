import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { ColorField, AttributesWithColor } from '../../../panels/details/color-field';
import { LineStyleType } from '../../../../constants/lines';

const MTRRaceDays = (props: LineStyleComponentProps<MTRRaceDaysAttributes>) => {
    const { id, path, styleAttrs, handleClick } = props;
    const { color = defaultMTRRaceDaysAttributes.color } = styleAttrs ?? defaultMTRRaceDaysAttributes;

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
            strokeWidth="5"
            strokeLinecap="butt"
            strokeDasharray="5 2.5"
            cursor="pointer"
            onClick={onClick}
        />
    );
};

/**
 * MTRRaceDays specific props.
 */
export interface MTRRaceDaysAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultMTRRaceDaysAttributes: MTRRaceDaysAttributes = {
    color: [CityCode.Hongkong, 'twl', '#E2231A', MonoColour.white],
};

const mtrRaceDaysFields = [
    {
        type: 'custom',
        component: <ColorField type={LineStyleType.MTRRaceDays} defaultAttrs={defaultMTRRaceDaysAttributes} />,
    },
];

const mtrRaceDays: LineStyle<MTRRaceDaysAttributes> = {
    component: MTRRaceDays,
    defaultAttrs: defaultMTRRaceDaysAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: mtrRaceDaysFields,
    metadata: {
        displayName: 'panel.details.line.mtrRaceDays.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default mtrRaceDays;
