import React from 'react';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';

const LondonTubeInternalInt = (props: LineStyleComponentProps<LondonTubeInternalIntAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
            cursor="pointer"
        >
            <path d={path} fill="none" stroke="black" strokeWidth="7.5" strokeLinecap="round" />
        </g>
    );
};

const LondonTubeInternalIntPost = (props: LineStyleComponentProps<LondonTubeInternalIntAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={`${id}.post`}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke="white" strokeWidth={LINE_WIDTH / 2} strokeLinecap="round" />
        </g>
    );
};

/**
 * LondonTubeInternalInt has no specific props.
 */
export interface LondonTubeInternalIntAttributes extends LinePathAttributes {}

const defaultLondonTubeInternalIntAttributes: LondonTubeInternalIntAttributes = {};

const attrsComponent = () => undefined;

const londonTubeInternalInt: LineStyle<LondonTubeInternalIntAttributes> = {
    component: LondonTubeInternalInt,
    postComponent: LondonTubeInternalIntPost,
    defaultAttrs: defaultLondonTubeInternalIntAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonTubeInternalInt.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonTubeInternalInt;
