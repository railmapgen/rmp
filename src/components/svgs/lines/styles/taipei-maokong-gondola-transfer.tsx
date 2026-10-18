import React from 'react';
import { LinePathType, LineStyle, LineStyleAttributes, LineStyleComponentProps } from '../../../../constants/lines';
import { getPrimitiveListLength } from '../../../../util/open-path-length';
import { getOpenPathPrimitives } from '../../../../util/open-path-primitives';
import { isOpenPath } from '../../../../util/path';

const TaipeiMaokongGondolaTransfer = (props: LineStyleComponentProps<TaipeiMaokongGondolaTransferAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;
    const markerId = `taipei-maokong-gondola-transfer-${id}-${React.useId()}`;
    const d = React.useMemo(
        () => (isOpenPath(path) && getPrimitiveListLength(getOpenPathPrimitives(path)) > 1e-6 ? path.d : ''),
        [path.kind, path.d]
    );
    const onPointerDown = React.useCallback(
        (event: React.PointerEvent<SVGElement>) => handlePointerDown(id, event),
        [id, handlePointerDown]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path
                d={d}
                stroke="#767475"
                strokeWidth={1.5}
                strokeDasharray="1.35 0.6"
                fill="none"
                markerStart={`url(#${markerId})`}
                markerEnd={`url(#${markerId})`}
            />
            <defs>
                <marker
                    id={markerId}
                    markerUnits="userSpaceOnUse"
                    viewBox="0 -2.85 3.7 5.7"
                    refX={3.7}
                    refY={0}
                    markerWidth={3.7}
                    markerHeight={5.7}
                    orient="auto-start-reverse"
                >
                    <path d="M 0 -2.85 L 3.7 0 L 0 2.85 Z" fill="#767475" />
                </marker>
            </defs>
        </g>
    );
};

export interface TaipeiMaokongGondolaTransferAttributes extends LineStyleAttributes {}

const taipeiMaokongGondolaTransfer: LineStyle<TaipeiMaokongGondolaTransferAttributes> = {
    component: TaipeiMaokongGondolaTransfer,
    defaultAttrs: {},
    attrsComponent: () => undefined,
    metadata: {
        displayName: 'panel.details.lines.taipeiMaokongGondolaTransfer.displayName',
        supportLinePathType: [
            LinePathType.Freeform,
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
            LinePathType.Bezier,
        ],
        supportsReconcile: true,
    },
};

export default taipeiMaokongGondolaTransfer;
