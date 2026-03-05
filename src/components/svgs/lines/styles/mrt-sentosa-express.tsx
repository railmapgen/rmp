import React from 'react';
import { AttrsProps } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';

const MRTSentosaExpress = (props: LineStyleComponentProps<MRTSentosaExpressAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke="black"
            strokeWidth={LINE_WIDTH}
            strokeDasharray={`0 ${LINE_WIDTH * 2} ${LINE_WIDTH * 2} ${LINE_WIDTH * 2}`}
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * MRTSentosaExpress has no specific attributes.
 */
export interface MRTSentosaExpressAttributes extends LinePathAttributes {}

const defaultMRTSentosaExpressAttributes: MRTSentosaExpressAttributes = {};

const attrsComponent = () => undefined;

const mrtSentosaExpress: LineStyle<MRTSentosaExpressAttributes> = {
    component: MRTSentosaExpress,
    defaultAttrs: defaultMRTSentosaExpressAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mrtSentosaExpress.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default mrtSentosaExpress;
