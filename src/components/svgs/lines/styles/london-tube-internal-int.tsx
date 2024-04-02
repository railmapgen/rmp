import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const LondonTubeInternalInt = (props: LineStyleComponentProps<LondonTubeInternalIntAttributes>) => {
    const { id, path, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <clipPath id="londonTubeStnIconInner">
                <circle r="5" />
            </clipPath>
            <path d={path} fill="none" stroke="black" strokeWidth="7.5" strokeLinecap="round" />
            <path d={path} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth="7"
                strokeLinecap="round"
                cursor="pointer"
                onClick={onClick}
            />
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
    defaultAttrs: defaultLondonTubeInternalIntAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonTubeInternalInt.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default londonTubeInternalInt;
