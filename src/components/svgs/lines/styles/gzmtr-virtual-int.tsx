import React from 'react';
import { LinePathAttributes, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const GzmtrVirtualInt = (props: LineStyleComponentProps<GzmtrVirtualIntAttributes>) => {
    const { id, path, newLine, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <path
            d={path}
            fill="none"
            stroke="black"
            strokeWidth="3"
            strokeDasharray="3"
            onClick={newLine ? undefined : onClick}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * GzmtrVirtualInt specific props.
 */
export interface GzmtrVirtualIntAttributes extends LinePathAttributes {}

const defaultGzmtrVirtualIntAttributes: GzmtrVirtualIntAttributes = {};

const gzmtrVirtualInt: LineStyle<GzmtrVirtualIntAttributes> = {
    component: GzmtrVirtualInt,
    defaultAttrs: defaultGzmtrVirtualIntAttributes,
    fields: [],
    metadata: { displayName: 'panel.details.line.gzmtrVirtualInt.displayName' },
};

export default gzmtrVirtualInt;
