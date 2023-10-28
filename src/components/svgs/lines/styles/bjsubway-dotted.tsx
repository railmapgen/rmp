import { useColorModeValue } from '@chakra-ui/react';
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

const BjsubwayDotted = (props: LineStyleComponentProps<BjsubwayDottedAttributes>) => {
    const { id, path, styleAttrs, handleClick } = props;
    const { color = defaultBjsubwayDottedAttributes.color } = styleAttrs ?? defaultBjsubwayDottedAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');

    return (
        <g id={id}>
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeDasharray="2 2" />
            <path d={path} fill="none" stroke={bgColor} strokeWidth="3.4" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth={5}
                strokeDasharray="2 2"
                cursor="pointer"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * BjsubwayTram specific props.
 */
export interface BjsubwayDottedAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwayDottedAttributes: BjsubwayDottedAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const bjsubwayDottedFields = [
    {
        type: 'custom',
        label: 'color',
        component: (
            <ColorField type={LineStyleType.BjsubwayDotted} defaultTheme={defaultBjsubwayDottedAttributes.color} />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={bjsubwayDottedFields as RmgFieldsFieldDetail<BjsubwayDottedAttributes>}
        type="style"
    />
);

const bjsubwayDotted: LineStyle<BjsubwayDottedAttributes> = {
    component: BjsubwayDotted,
    defaultAttrs: defaultBjsubwayDottedAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwayDotted.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default bjsubwayDotted;
