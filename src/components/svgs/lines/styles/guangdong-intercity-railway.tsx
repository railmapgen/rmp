import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CityCode } from '../../../../constants/constants';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { AttributesWithColor } from '../../../panels/details/color-field';

const GuangdongIntercityRailway = (props: LineStyleComponentProps<GuangdongIntercityRailwayAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultGuangdongIntercityRailwayAttributes.color } =
        styleAttrs ?? defaultGuangdongIntercityRailwayAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke={color[3]} strokeWidth="2.5" strokeDasharray="7.5" />
        </g>
    );
};

/**
 * GuangdongIntercityRailway specific props.
 */
export interface GuangdongIntercityRailwayAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultGuangdongIntercityRailwayAttributes: GuangdongIntercityRailwayAttributes = {
    color: [CityCode.Guangzhou, 'ir', '#2559a8', MonoColour.white],
};

const attrsComponent = () => undefined;

const guangdongIntercityRailway: LineStyle<GuangdongIntercityRailwayAttributes> = {
    component: GuangdongIntercityRailway,
    defaultAttrs: defaultGuangdongIntercityRailwayAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.guangdongIntercityRailway.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default guangdongIntercityRailway;
