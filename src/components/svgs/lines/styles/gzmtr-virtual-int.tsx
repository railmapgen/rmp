import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const GzmtrVirtualInt = (props: LineStyleComponentProps<GzmtrVirtualIntAttributes>) => {
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
            stroke="#565656"
            strokeWidth="3"
            strokeDasharray="3"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * GzmtrVirtualInt has no specific props.
 */
export interface GzmtrVirtualIntAttributes extends LinePathAttributes {}

const defaultGzmtrVirtualIntAttributes: GzmtrVirtualIntAttributes = {};

const attrsComponent = () => undefined;

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
