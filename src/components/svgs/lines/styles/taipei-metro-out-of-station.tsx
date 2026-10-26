import React from 'react';
import {
    LinePathType,
    LineStyle,
    LineStyleAttributes,
    LineStyleComponentProps,
    LineStyleType,
    StylePathGenerator,
} from '../../../../constants/lines';
import { Path, makeEmptyOpenPath } from '../../../../constants/path';
import { makeSymmetricOutlineHollowPath } from '../../../../util/bezier-outline-sides';
import { getOpenPathPrimitives } from '../../../../util/open-path-primitives';
import { isOpenPath } from '../../../../util/path';

const WIDTH = 4.75;
const CENTER_GAP = 1.1;

const defaultTaipeiMetroOutOfStationAttributes: TaipeiMetroOutOfStationAttributes = {};

export const taipeiMetroOutOfStationPathGenerator: StylePathGenerator<TaipeiMetroOutOfStationAttributes> = (
    path: Path,
    _type?: LinePathType,
    _attrs?: TaipeiMetroOutOfStationAttributes
) => {
    if (!isOpenPath(path)) {
        return { main: makeEmptyOpenPath(), clip: makeEmptyOpenPath() };
    }
    const primitives = getOpenPathPrimitives(path);
    const clip = makeSymmetricOutlineHollowPath(primitives, WIDTH / 2, CENTER_GAP / 2);
    return {
        main: path,
        clip,
    };
};

const TaipeiMetroOutOfStation = (props: LineStyleComponentProps<TaipeiMetroOutOfStationAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;
    const clipId = `taipei-metro-out-of-station-${id}-${React.useId()}`;
    // An even-odd vector clip keeps the gap transparent in both SVG and raster exports.
    // Offset the reduced primitive outlines so inflected Beziers use the same geometry as other hollow styles.
    const paths = React.useMemo(
        () =>
            taipeiMetroOutOfStationPathGenerator(
                path,
                props.type,
                props.styleAttrs ?? defaultTaipeiMetroOutOfStationAttributes
            ),
        [path.kind, path.d]
    );

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
                id={`${LineStyleType.TaipeiMetroOutOfStation}_main_${id}`}
                d={paths.main.d}
                fill="none"
                stroke="#767475"
                strokeWidth={WIDTH}
                strokeDasharray="2 0.9"
                clipPath={`url(#${clipId})`}
            />
            <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                    <path
                        id={`${LineStyleType.TaipeiMetroOutOfStation}_clip_${id}`}
                        d={paths.clip.d}
                        clipRule="evenodd"
                    />
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
    pathGenerator: taipeiMetroOutOfStationPathGenerator,
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
