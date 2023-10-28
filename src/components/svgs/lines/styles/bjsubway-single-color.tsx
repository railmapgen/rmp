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

const BjsubwaySingleColor = (props: LineStyleComponentProps<BjsubwaySingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handleClick } = props;
    const { color = defaultBjsubwaySingleColorAttributes.color } = styleAttrs ?? defaultBjsubwaySingleColorAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <>
                <path d={path} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
                <path id={id} d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeLinecap="round" />
                <path
                    id={id}
                    d={path}
                    fill="none"
                    stroke="white"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeOpacity="0"
                    cursor="pointer"
                    onClick={newLine ? undefined : onClick}
                    pointerEvents={newLine ? 'none' : undefined}
                />
            </>
        ),
        [id, path, styleAttrs.color[2], newLine]
    );
};

/**
 * BjsubwaySingleColor specific props.
 */
export interface BjsubwaySingleColorAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwaySingleColorAttributes: BjsubwaySingleColorAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const bjsubwaySingleColorFields = [
    {
        type: 'custom',
        label: 'color',
        component: (
            <ColorField
                type={LineStyleType.BjsubwaySingleColor}
                defaultTheme={defaultBjsubwaySingleColorAttributes.color}
            />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={bjsubwaySingleColorFields as RmgFieldsFieldDetail<BjsubwaySingleColorAttributes>}
        type="style"
    />
);

const bjsubwaySingleColor: LineStyle<BjsubwaySingleColorAttributes> = {
    component: BjsubwaySingleColor,
    defaultAttrs: defaultBjsubwaySingleColorAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwaySingleColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default bjsubwaySingleColor;
