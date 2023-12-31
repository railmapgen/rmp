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

const JREastShinkansen = (props: LineStyleComponentProps<JREastShinkansenAttributes>) => {
    const { id, path, styleAttrs, newLine, handleClick } = props;
    const { color = defaultJREastShinkansenAttributes.color } = styleAttrs ?? defaultJREastShinkansenAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path d={path} fill="none" stroke="black" strokeWidth="5.1" />
            <path d={path} fill="none" stroke={color[2]} strokeWidth="4.9" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth="5.1"
                strokeOpacity="0"
                cursor="pointer"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        </g>
    );
};

/**
 * JREastShinkansen specific props.
 */
export interface JREastShinkansenAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultJREastShinkansenAttributes: JREastShinkansenAttributes = {
    color: [CityCode.Tokyo, 'tokaido_shinkansen', '#28378A', MonoColour.white],
};

const jrEastShinkansenAttrsComponent = (props: AttrsProps<JREastShinkansenAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.JREastShinkansen}
                    defaultTheme={defaultJREastShinkansenAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastShinkansen: LineStyle<JREastShinkansenAttributes> = {
    component: JREastShinkansen,
    defaultAttrs: defaultJREastShinkansenAttributes,
    attrsComponent: jrEastShinkansenAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.jrEastShinkansen.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default jrEastShinkansen;
