import React from 'react';
import { Node, NodeComponentProps } from '../../../constants/nodes';

const Virtual = (props: NodeComponentProps<VirtualAttributes>) => {
    const { id, x, y, handlePointerDown, handlePointerMove, handlePointerUp } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})rotate(45)`}>
                <line x1="-5" y1="0" x2="5" y2="0" stroke="black" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="black" />
                <circle
                    id={`virtual_circle_${id}`}
                    r={5}
                    stroke="black"
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * Virtual specific props.
 */
export interface VirtualAttributes {}

const defaultVirtualAttributes: VirtualAttributes = {};

const virtualIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} transform="rotate(45)" focusable={false}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" />
        <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" />
        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" />
    </svg>
);

const virtual: Node<VirtualAttributes> = {
    component: Virtual,
    icon: virtualIcon,
    defaultAttrs: defaultVirtualAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.nodes.virtual.displayName',
        tags: [],
    },
};

export default virtual;
