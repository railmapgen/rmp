import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';
import { ColorAttribute } from '../../../panels/details/color-field';

const GuangdongIntercityRailway = (props: LineStyleComponentProps<GuangdongIntercityRailwayAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultGuangdongIntercityRailwayAttributes.color } =
        styleAttrs ?? defaultGuangdongIntercityRailwayAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH} strokeLinecap="round" />
            <path d={path} fill="none" stroke={color[3]} strokeWidth={LINE_WIDTH / 2} strokeDasharray="7.5" />
        </g>
    );
};

/**
 * GuangdongIntercityRailway specific props.
 */
export interface GuangdongIntercityRailwayAttributes extends LinePathAttributes, ColorAttribute {}

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
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default guangdongIntercityRailway;
