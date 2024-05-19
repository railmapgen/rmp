import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { RmgFieldsFieldSpecificAttributes } from '../../../panels/details/rmg-field-specific-attrs';

const ChinaRailway = (props: LineStyleComponentProps<ChinaRailwayAttributes>) => {
    const { id, path, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g>
            <path d={path} fill="none" stroke="black" strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke="white" strokeWidth="4.67" strokeDasharray="17.5" />
            <path
                id={id}
                d={path}
                fill="none"
                stroke="black"
                strokeOpacity="0"
                strokeWidth="5"
                strokeLinecap="round"
                cursor="pointer"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * ChinaRailway specific props.
 */
export interface ChinaRailwayAttributes extends LinePathAttributes {}

const defaultChinaRailwayAttributes: ChinaRailwayAttributes = {};

const attrsComponent = () => <RmgFieldsFieldSpecificAttributes fields={[]} type="style" />;

const chinaRailway: LineStyle<ChinaRailwayAttributes> = {
    component: ChinaRailway,
    defaultAttrs: defaultChinaRailwayAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.chinaRailway.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default chinaRailway;
