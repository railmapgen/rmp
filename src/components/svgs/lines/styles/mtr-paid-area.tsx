import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const MTRPaidArea = (props: LineStyleComponentProps<MTRPaidAreaAttributes>) => {
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
            strokeWidth="1.5"
            strokeLinecap="round"
            cursor="pointer"
            onClick={onClick}
        />
    );
};

/**
 * MTRPaidArea specific props.
 */
export interface MTRPaidAreaAttributes extends LinePathAttributes {}

const defaultMTRPaidAreaAttributes: MTRPaidAreaAttributes = {};

const mtrPaidArea: LineStyle<MTRPaidAreaAttributes> = {
    component: MTRPaidArea,
    defaultAttrs: defaultMTRPaidAreaAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.line.mtrPaidArea.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.Simple],
    },
};

export default mtrPaidArea;
