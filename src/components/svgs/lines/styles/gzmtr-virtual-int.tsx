import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const GzmtrVirtualInt = (props: LineStyleComponentProps<GzmtrVirtualIntAttributes>) => {
    const { id, path, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <path
            d={path}
            fill="none"
            stroke="#565656"
            strokeWidth="3"
            strokeDasharray="3"
            cursor="pointer"
            onClick={onClick}
        />
    );
};

/**
 * GzmtrVirtualInt has no specific props.
 */
export interface GzmtrVirtualIntAttributes extends LinePathAttributes {}

const defaultGzmtrVirtualIntAttributes: GzmtrVirtualIntAttributes = {};

const attrsComponent = () => null;

const gzmtrVirtualInt: LineStyle<GzmtrVirtualIntAttributes> = {
    component: GzmtrVirtualInt,
    defaultAttrs: defaultGzmtrVirtualIntAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.gzmtrVirtualInt.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default gzmtrVirtualInt;
