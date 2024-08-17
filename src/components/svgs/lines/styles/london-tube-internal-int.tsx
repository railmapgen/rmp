import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const LondonTubeInternalInt = (props: LineStyleComponentProps<LondonTubeInternalIntAttributes>) => {
    const { id, path, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke="black" strokeWidth="7.5" strokeLinecap="round" />
        </g>
    );
};

const LondonTubeInternalIntPost = (props: LineStyleComponentProps<LondonTubeInternalIntAttributes>) => {
    const { id, path, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={`${id}.post`} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
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
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default londonTubeInternalInt;
