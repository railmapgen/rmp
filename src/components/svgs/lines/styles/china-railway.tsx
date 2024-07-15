import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { RmgFieldsFieldSpecificAttributes } from '../../../panels/details/rmg-field-specific-attrs';

const ChinaRailway = (props: LineStyleComponentProps<ChinaRailwayAttributes>) => {
    const { id, path, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke="black" strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke="white" strokeWidth="4.67" strokeDasharray="17.5" />
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
