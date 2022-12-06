import React from 'react';
import { Edge, EdgeComponentProps } from '../../../constants/edges';

const ShmetroVirtualInt = (props: EdgeComponentProps<ShmetroVirtualIntAttributes>) => {
    const { id, x1, y1, x2, y2, newLine, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <g id={id}>
                <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="black"
                    strokeWidth="7"
                    strokeLinecap="round"
                    pointerEvents={newLine ? 'none' : undefined}
                />
                <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    pointerEvents={newLine ? 'none' : undefined}
                />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="white"
                    strokeOpacity="0"
                    strokeWidth="7"
                    strokeLinecap="round"
                    onClick={newLine ? undefined : onClick}
                    pointerEvents={newLine ? 'none' : undefined}
                />
            </g>
        ),
        [x1, y1, x2, y2, newLine, onClick]
    );
};

/**
 * <ShmetroVirtualInt /> specific props.
 */
export interface ShmetroVirtualIntAttributes {}

const defaultShmetroVirtualIntAttributes: ShmetroVirtualIntAttributes = {};

const shmetroVirtualIntIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <line x1="6" y1="12" x2="18" y2="12" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

const shmetroVirtualInt: Edge<ShmetroVirtualIntAttributes> = {
    component: ShmetroVirtualInt,
    icon: shmetroVirtualIntIcon,
    defaultAttrs: defaultShmetroVirtualIntAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.edge.shmetroVirtualInt.displayName',
        tags: [],
    },
};

export default shmetroVirtualInt;
