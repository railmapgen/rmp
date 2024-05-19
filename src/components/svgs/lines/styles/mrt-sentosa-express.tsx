import React from 'react';
import { AttrsProps } from '../../../../constants/constants';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const MRTSentosaExpress = (props: LineStyleComponentProps<MRTSentosaExpressAttributes>) => {
    const { id, path, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g>
            <path
                id={id}
                d={path}
                fill="none"
                stroke="black"
                strokeWidth="5"
                strokeDasharray="0 10 10 10"
                strokeLinecap="round"
                cursor="pointer"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * MRTSentosaExpress has no specific attributes.
 */
export interface MRTSentosaExpressAttributes extends LinePathAttributes {}

const defaultMRTSentosaExpressAttributes: MRTSentosaExpressAttributes = {};

const attrsComponent = (_: AttrsProps<MRTSentosaExpressAttributes>) => {
    return null;
};

const mrtSentosaExpress: LineStyle<MRTSentosaExpressAttributes> = {
    component: MRTSentosaExpress,
    defaultAttrs: defaultMRTSentosaExpressAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mrtSentosaExpress.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default mrtSentosaExpress;
