import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { AttributesWithColor, ColorField } from '../../../panels/details/color-field';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';

const BjsubwayTram = (props: LineStyleComponentProps<BjsubwayTramAttributes>) => {
    const { id, path, styleAttrs, handleClick } = props;
    const { color = defaultBjsubwayTramAttributes.color } = styleAttrs ?? defaultBjsubwayTramAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" />
            <path d={path} fill="none" stroke="white" strokeWidth="1.67" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth={5}
                cursor="pointer"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * BjsubwayTram specific props.
 */
export interface BjsubwayTramAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwayTramAttributes: BjsubwayTramAttributes = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const bjsubwayTramFields = [
    {
        type: 'custom',
        label: 'color',
        component: <ColorField type={LineStyleType.BjsubwayTram} defaultTheme={defaultBjsubwayTramAttributes.color} />,
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={bjsubwayTramFields as RmgFieldsFieldDetail<BjsubwayTramAttributes>}
        type="style"
    />
);

const bjsubwayTram: LineStyle<BjsubwayTramAttributes> = {
    component: BjsubwayTram,
    defaultAttrs: defaultBjsubwayTramAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwayTram.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default bjsubwayTram;
