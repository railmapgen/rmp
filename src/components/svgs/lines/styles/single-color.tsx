import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
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

const SingleColor = (props: LineStyleComponentProps<SingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handleClick } = props;
    const { color = defaultSingleColorAttributes.color } = styleAttrs ?? defaultSingleColorAttributes;

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
            strokeLinecap="round"
            cursor="pointer"
            onClick={newLine ? undefined : onClick}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * SingleColor specific props.
 */
export interface SingleColorAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultSingleColorAttributes: SingleColorAttributes = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const singleColorFields = [
    {
        type: 'custom',
        label: 'color',
        component: <ColorField type={LineStyleType.SingleColor} defaultTheme={defaultSingleColorAttributes.color} />,
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={singleColorFields as RmgFieldsFieldDetail<SingleColorAttributes>}
        type="style"
    />
);

const singleColor: LineStyle<SingleColorAttributes> = {
    component: SingleColor,
    defaultAttrs: defaultSingleColorAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.singleColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default singleColor;
