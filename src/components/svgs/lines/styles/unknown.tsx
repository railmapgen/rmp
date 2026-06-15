import React from 'react';
import { LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

export interface UnknownLineAttributes {}

export const UnknownLineStyle = (props: LineStyleComponentProps<UnknownLineAttributes>) => {
    const { id, path, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            d={path.d}
            fill="none"
            stroke="grey"
            strokeWidth="5"
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={onPointerDown}
        />
    );
};

const unknownLineStyle: LineStyle<UnknownLineAttributes> = {
    component: UnknownLineStyle,
    defaultAttrs: {},
    attrsComponent: () => null,
    metadata: {
        displayName: 'panel.details.lines.unknown.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
        supportsReconcile: false,
    },
};

export default unknownLineStyle;
