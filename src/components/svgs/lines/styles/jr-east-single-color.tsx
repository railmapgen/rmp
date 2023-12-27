import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { AttributesWithColor, ColorField } from '../../../panels/details/color-field';

const JREastSingleColor = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handleClick } = props;
    const {
        color = defaultJREastSingleColorAttributes.color,
        crosshatchPatternFill = defaultJREastSingleColorAttributes.crosshatchPatternFill,
    } = styleAttrs ?? defaultJREastSingleColorAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <defs>
                <pattern id="fill" width="5" height="5" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="5" y2="5" stroke="white" strokeOpacity="50%" />
                    <line x1="5" y1="0" x2="0" y2="5" stroke="white" strokeOpacity="50%" />
                </pattern>
            </defs>
            <path d={path} fill="none" stroke="black" strokeWidth="5.1" />
            <path d={path} fill={crosshatchPatternFill ? 'white' : 'none'} stroke={color[2]} strokeWidth="4.9" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeOpacity="0"
                cursor="pointer"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        </g>
    );
};

/**
 * JREastSingleColor specific props.
 */
export interface JREastSingleColorAttributes extends LinePathAttributes, AttributesWithColor {
    crosshatchPatternFill: boolean;
}

const defaultJREastSingleColorAttributes: JREastSingleColorAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
    crosshatchPatternFill: false,
};

const jrEastSingleColorAttrsComponent = (props: AttrsProps<JREastSingleColorAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.lines.jrEastSingleColor.crosshatchPatternFill'),
            oneLine: true,
            isChecked: attrs.crosshatchPatternFill,
            onChange: val => {
                attrs.crosshatchPatternFill = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: 'color',
            component: (
                <ColorField
                    type={LineStyleType.JREastSingleColor}
                    defaultTheme={defaultJREastSingleColorAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastSingleColor: LineStyle<JREastSingleColorAttributes> = {
    component: JREastSingleColor,
    defaultAttrs: defaultJREastSingleColorAttributes,
    attrsComponent: jrEastSingleColorAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default jrEastSingleColor;
