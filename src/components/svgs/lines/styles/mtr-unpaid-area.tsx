import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const MTRUnpaidArea = (props: LineStyleComponentProps<MTRUnpaidAreaAttributes>) => {
    const { id, path, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <path
            d={path}
            fill="none"
            stroke="black"
            strokeWidth="1.33"
            strokeDasharray="2.66 1.33"
            cursor="pointer"
            onClick={onClick}
        />
    );
};

/**
 * MTRUnpaidArea specific props.
 */
export interface MTRUnpaidAreaAttributes extends LinePathAttributes {}

const defaultMTRUnpaidAreaAttributes: MTRUnpaidAreaAttributes = {};

const mtrUnpaidArea: LineStyle<MTRUnpaidAreaAttributes> = {
    component: MTRUnpaidArea,
    defaultAttrs: defaultMTRUnpaidAreaAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.line.mtrUnpaidArea.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default mtrUnpaidArea;
