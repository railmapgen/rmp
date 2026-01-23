import React from 'react';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';

const LondonTube10MinWalk = (props: LineStyleComponentProps<LondonTube10MinWalkAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            d={path}
            fill="none"
            stroke="black"
            strokeWidth={LINE_WIDTH}
            strokeDasharray={`${LINE_WIDTH} ${LINE_WIDTH / 2}`}
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * LondonTube10MinWalk has no specific props.
 */
export interface LondonTube10MinWalkAttributes extends LinePathAttributes {}

const defaultLondonTube10MinWalkAttributes: LondonTube10MinWalkAttributes = {};

const attrsComponent = () => undefined;

const londonTube10MinWalk: LineStyle<LondonTube10MinWalkAttributes> = {
    component: LondonTube10MinWalk,
    defaultAttrs: defaultLondonTube10MinWalkAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonTube10MinWalk.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonTube10MinWalk;
