import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const JREastSingleColorPre = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke="black" strokeWidth={LINE_WIDTH + 0.1} />
        </g>
    );
};

const JREastSingleColor = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultJREastSingleColorAttributes.color } = styleAttrs ?? defaultJREastSingleColorAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH - 0.1} />
        </g>
    );
};

/**
 * JREastSingleColor specific props.
 */
export interface JREastSingleColorAttributes extends LinePathAttributes, ColorAttribute {}

const defaultJREastSingleColorAttributes: JREastSingleColorAttributes = {
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
};

const jrEastSingleColorAttrsComponent = (props: AttrsProps<JREastSingleColorAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
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
    preComponent: JREastSingleColorPre,
    component: JREastSingleColor,
    defaultAttrs: defaultJREastSingleColorAttributes,
    attrsComponent: jrEastSingleColorAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColor.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default jrEastSingleColor;
