import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { ColorField, AttributesWithColor } from '../../../panels/details/color-field';
import { LineStyleType } from '../../../../constants/lines';

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
        component: <ColorField type={LineStyleType.SingleColor} defaultAttrs={defaultSingleColorAttributes} />,
    },
];

const singleColor: LineStyle<SingleColorAttributes> = {
    component: SingleColor,
    defaultAttrs: defaultSingleColorAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: singleColorFields,
    metadata: {
        displayName: 'panel.details.line.singleColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.Simple],
    },
};

export default singleColor;
