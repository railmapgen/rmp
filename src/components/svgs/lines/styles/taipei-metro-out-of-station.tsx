import React from 'react';
import { LinePathType, LineStyle, LineStyleAttributes, LineStyleComponentProps } from '../../../../constants/lines';
import { buildClosedBezierChainPathD, buildSymmetricOutlineSideChains } from '../../../../util/bezier-outline-sides';
import { getOpenPathPrimitives } from '../../../../util/open-path-primitives';
import { isOpenPath } from '../../../../util/path';

const WIDTH = 4.75;
const CENTER_GAP = 1.1;

const TaipeiMetroOutOfStation = (props: LineStyleComponentProps<TaipeiMetroOutOfStationAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;
    const clipId = `taipei-metro-out-of-station-${id}-${React.useId()}`;
    // An even-odd vector clip keeps the gap transparent in both SVG and raster exports.
    // Offset the reduced primitive outlines so inflected Beziers use the same geometry as other hollow styles.
    const clipPathD = React.useMemo(() => {
        if (!isOpenPath(path)) return '';
        const primitives = getOpenPathPrimitives(path);
        const outer = buildSymmetricOutlineSideChains(primitives, WIDTH / 2);
        const inner = buildSymmetricOutlineSideChains(primitives, CENTER_GAP / 2);
        if (!outer.left.length || !inner.left.length) return '';
        return `${buildClosedBezierChainPathD(outer.left, outer.right)} ${buildClosedBezierChainPathD(inner.left, inner.right)}`;
    }, [path.kind, path.d]);

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path
                d={path.d}
                fill="none"
                stroke="#767475"
                strokeWidth={WIDTH}
                strokeDasharray="2 0.9"
                clipPath={`url(#${clipId})`}
            />
            <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                    <path d={clipPathD} clipRule="evenodd" />
                </clipPath>
            </defs>
        </g>
    );
};

export interface TaipeiMetroOutOfStationAttributes extends LineStyleAttributes {}

const taipeiMetroOutOfStation: LineStyle<TaipeiMetroOutOfStationAttributes> = {
    component: TaipeiMetroOutOfStation,
    defaultAttrs: {},
    attrsComponent: () => undefined,
    metadata: {
        displayName: 'panel.details.lines.taipeiMetroOutOfStation.displayName',
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

export default taipeiMetroOutOfStation;
