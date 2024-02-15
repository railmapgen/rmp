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
        label: 'color',
        component: <ColorField type={LineStyleType.MTRRaceDays} defaultTheme={defaultMTRRaceDaysAttributes.color} />,
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={mtrRaceDaysFields as RmgFieldsFieldDetail<MTRRaceDaysAttributes>}
        type="style"
    />
);

const mtrRaceDays: LineStyle<MTRRaceDaysAttributes> = {
    component: MTRRaceDays,
    defaultAttrs: defaultMTRRaceDaysAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mtrRaceDays.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default mtrRaceDays;
