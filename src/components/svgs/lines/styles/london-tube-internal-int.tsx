import React from 'react';
import { NodeType } from '../../../../constants/constants';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { ExternalStationAttributes, StationType } from '../../../../constants/stations';

const X_HEIGHT = 5;

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

// Accessible stations have a large icon that the path should hide.
const getMaskR = (type: NodeType, attr: ExternalStationAttributes) => {
    if (type === StationType.LondonTubeBasic) {
        const { stepFreeAccess } = attr[StationType.LondonTubeBasic] ?? { stepFreeAccess: 'none' };
        if (stepFreeAccess !== 'none') return 1.5 * X_HEIGHT;
    }
    if (type === StationType.LondonTubeInt) {
        const { stepFreeAccess } = attr[StationType.LondonTubeInt] ?? { stepFreeAccess: 'none' };
        if (stepFreeAccess !== 'none') return 1.5 * X_HEIGHT;
    }
    return X_HEIGHT;
};

const LondonTubeInternalIntPost = (props: LineStyleComponentProps<LondonTubeInternalIntAttributes>) => {
    const { id, path, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    // This smells as components in general should not access the global graph variable.
    // All info should be available via the LineStyleComponentProps.
    // Leave it now as it looks like a special case and overhaul is necessary
    // as long as this requirement is widely needed.
    const [source, target] = window.graph.extremities(id);
    const x1 = window.graph.getNodeAttribute(source, 'x');
    const y1 = window.graph.getNodeAttribute(source, 'y');
    const x2 = window.graph.getNodeAttribute(target, 'x');
    const y2 = window.graph.getNodeAttribute(target, 'y');

    const maskX = Math.min(x1, x2) - 2 * X_HEIGHT;
    const maskY = Math.min(y1, y2) - 2 * X_HEIGHT;
    const maskWidth = Math.abs(x1 - x2) + 4 * X_HEIGHT;
    const maskHeight = Math.abs(y1 - y2) + 4 * X_HEIGHT;

    const sourceR = getMaskR(window.graph.getNodeAttribute(source, 'type'), window.graph.getNodeAttributes(source));
    const targetR = getMaskR(window.graph.getNodeAttribute(target, 'type'), window.graph.getNodeAttributes(target));

    return (
        <g id={`${id}.post`} onPointerDown={onPointerDown} cursor="pointer">
            {/* TODO: The masked part is still clickable with a pointer cursor. */}
            <mask
                id={`tube_stn_icon_inner_${id}`}
                x={maskX}
                y={maskY}
                width={maskWidth}
                height={maskHeight}
                maskUnits="userSpaceOnUse"
            >
                {/* Everything under a white pixel will be visible. */}
                <rect x={maskX} y={maskY} width={maskWidth} height={maskHeight} fill="white" />
                {/* Everything under a black pixel will be invisible. */}
                {/* `- 0.05` will hide the black edge between the icon and the path. */}
                <circle cx={x1} cy={y1} r={sourceR - 0.05} fill="black" />
                <circle cx={x2} cy={y2} r={targetR - 0.05} fill="black" />
            </mask>
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                mask={`url(#tube_stn_icon_inner_${id})`}
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
    postComponent: LondonTubeInternalIntPost,
    defaultAttrs: defaultLondonTubeInternalIntAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonTubeInternalInt.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default londonTubeInternalInt;
