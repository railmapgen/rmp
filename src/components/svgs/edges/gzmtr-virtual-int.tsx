import React from 'react';
import { Edge, EdgeComponentProps } from '../../../constants/edges';

const GzmtrVirtualInt = (props: EdgeComponentProps<GzmtrVirtualIntAttributes>) => {
    const { id, x1, y1, x2, y2, newLine, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <line
                id={id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="black"
                strokeWidth="3"
                strokeDasharray="3"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        ),
        [x1, y1, x2, y2, newLine, onClick]
    );
};

/**
 * <GzmtrVirtualInt /> specific props.
 */
export interface GzmtrVirtualIntAttributes {}

const defaultGzmtrVirtualIntAttributes: GzmtrVirtualIntAttributes = {};

const gzmtrVirtualIntIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="3" strokeDasharray="3" />
    </svg>
);

const gzmtrVirtualInt: Edge<GzmtrVirtualIntAttributes> = {
    component: GzmtrVirtualInt,
    icon: gzmtrVirtualIntIcon,
    defaultAttrs: defaultGzmtrVirtualIntAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.edge.gzmtrVirtualInt.displayName',
        tags: [],
    },
};

export default gzmtrVirtualInt;
