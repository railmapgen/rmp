import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const ShmetroVirtualInt = (props: LineStyleComponentProps<ShmetroVirtualIntAttributes>) => {
    const { id, path, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path d={path} fill="none" stroke="black" strokeWidth="7" strokeLinecap="round" />
            <path d={path} fill="none" stroke="white" strokeWidth="4.33" strokeLinecap="round" />
            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth="7"
                strokeLinecap="round"
                cursor="pointer"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * ShmetroVirtualInt specific props.
 */
export interface ShmetroVirtualIntAttributes extends LinePathAttributes {}

const defaultShmetroVirtualIntAttributes: ShmetroVirtualIntAttributes = {};

const shmetroVirtualInt: LineStyle<ShmetroVirtualIntAttributes> = {
    component: ShmetroVirtualInt,
    defaultAttrs: defaultShmetroVirtualIntAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.line.shmetroVirtualInt.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default shmetroVirtualInt;
