import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const ShmetroVirtualInt = (props: LineStyleComponentProps<ShmetroVirtualIntAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke="black" strokeWidth="7" strokeLinecap="round" />
            <path d={path} fill="none" stroke="white" strokeWidth="4.33" strokeLinecap="round" />
        </g>
    );
};

/**
 * ShmetroVirtualInt has no specific props.
 */
export interface ShmetroVirtualIntAttributes extends LinePathAttributes {}

const defaultShmetroVirtualIntAttributes: ShmetroVirtualIntAttributes = {};

const attrsComponent = () => undefined;

const shmetroVirtualInt: LineStyle<ShmetroVirtualIntAttributes> = {
    component: ShmetroVirtualInt,
    defaultAttrs: defaultShmetroVirtualIntAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.shmetroVirtualInt.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default shmetroVirtualInt;
