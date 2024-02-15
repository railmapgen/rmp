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

const BjsubwaySingleColor = (props: LineStyleComponentProps<BjsubwaySingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handleClick } = props;
    const { color = defaultBjsubwaySingleColorAttributes.color } = styleAttrs ?? defaultBjsubwaySingleColorAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path d={path} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeLinecap="round" />
            <path
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
        </g>
    );
};

/**
 * BjsubwaySingleColor specific props.
 */
export interface BjsubwaySingleColorAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwaySingleColorAttributes: BjsubwaySingleColorAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const bjsubwaySingleColorAttrsComponent = (props: AttrsProps<BjsubwaySingleColorAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
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

    return <RmgFields fields={fields} />;
};

const bjsubwaySingleColor: LineStyle<BjsubwaySingleColorAttributes> = {
    component: BjsubwaySingleColor,
    defaultAttrs: defaultBjsubwaySingleColorAttributes,
    attrsComponent: bjsubwaySingleColorAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwaySingleColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default bjsubwaySingleColor;
