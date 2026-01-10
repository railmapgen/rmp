import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const MTRUnpaidArea = (props: LineStyleComponentProps<MTRUnpaidAreaAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke="black"
            strokeWidth="1.33"
            strokeDasharray="2.66 1.33"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * MTRUnpaidArea has no specific props.
 */
export interface MTRUnpaidAreaAttributes extends LinePathAttributes {}

const defaultMTRUnpaidAreaAttributes: MTRUnpaidAreaAttributes = {};

const attrsComponent = () => undefined;

const mtrUnpaidArea: LineStyle<MTRUnpaidAreaAttributes> = {
    component: MTRUnpaidArea,
    defaultAttrs: defaultMTRUnpaidAreaAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mtrUnpaidArea.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default mtrUnpaidArea;
