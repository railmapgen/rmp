import { useColorModeValue } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { AttributesWithColor, ColorField } from '../../../panels/details/color-field';

const BjsubwayDotted = (props: LineStyleComponentProps<BjsubwayDottedAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultBjsubwayDottedAttributes.color } = styleAttrs ?? defaultBjsubwayDottedAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeDasharray="2 2" />
            <path d={path} fill="none" stroke={bgColor} strokeWidth="3.4" />
        </g>
    );
};

/**
 * BjsubwayDotted specific props.
 */
export interface BjsubwayDottedAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwayDottedAttributes: BjsubwayDottedAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const attrsComponent = (props: AttrsProps<BjsubwayDottedAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: 'color',
            component: (
                <ColorField type={LineStyleType.BjsubwayDotted} defaultTheme={defaultBjsubwayDottedAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

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
