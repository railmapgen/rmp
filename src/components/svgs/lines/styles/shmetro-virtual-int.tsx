import React from 'react';
import { LinePathAttributes, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const ShmetroVirtualInt = (props: LineStyleComponentProps<ShmetroVirtualIntAttributes>) => {
    const { id, path, newLine, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path
                d={path}
                fill="none"
                stroke="black"
                strokeWidth="7"
                strokeLinecap="round"
                pointerEvents={newLine ? 'none' : undefined}
            />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                pointerEvents={newLine ? 'none' : undefined}
            />
            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth="7"
                strokeLinecap="round"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        </g>
    );
};

/**
 * ShmetroVirtualInt specific props.
 */
export interface ShmetroVirtualIntAttributes extends LinePathAttributes {}

const defaultShmetroVirtualIntAttributes: ShmetroVirtualIntAttributes = {};

const shmetroVirtualInt: LineStyle<ShmetroVirtualIntAttributes> = {
    component: ShmetroVirtualInt,
    defaultAttrs: defaultShmetroVirtualIntAttributes,
    fields: [],
    metadata: { displayName: 'panel.details.line.shmetroVirtualInt.displayName' },
};

export default shmetroVirtualInt;
