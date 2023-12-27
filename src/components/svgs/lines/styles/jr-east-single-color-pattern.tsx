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
import { makeShortPathOutline } from '../../../../util/bezier-parallel';
import { AttributesWithColor, ColorField } from '../../../panels/details/color-field';

const JREastSingleColorPattern = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, newLine, handleClick } = props;
    const { color = defaultJREastSingleColorPatternAttributes.color } =
        styleAttrs ?? defaultJREastSingleColorPatternAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    const [paths, setPaths] = React.useState({ outline: path, pA: path, pB: path });
    React.useEffect(() => {
        const p = makeShortPathOutline(path, type, -2.5, 2.5);
        if (!p) return;
        setPaths(p);
    }, [path]);

    return (
        <g id={id}>
            <defs>
                <pattern id="fill" width="5" height="5" patternUnits="userSpaceOnUse">
                    <rect width="5" height="5" fill={color[2]} />
                    <line x1="0" y1="0" x2="5" y2="5" stroke="white" strokeOpacity="50%" />
                    <line x1="5" y1="0" x2="0" y2="5" stroke="white" strokeOpacity="50%" />
                </pattern>
            </defs>
            <path d={paths.outline} fill="url(#fill)" />
            <path d={paths.pA} fill="none" stroke="black" strokeWidth="0.1" />
            <path d={paths.pB} fill="none" stroke="black" strokeWidth="0.1" />
            <path
                d={paths.outline}
                fill="white"
                fillOpacity="0"
                stroke="white"
                strokeWidth="0.1"
                strokeOpacity="0"
                cursor="pointer"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        </g>
    );
};

/**
 * JREastSingleColorPattern specific props.
 */
export interface JREastSingleColorPatternAttributes extends LinePathAttributes, AttributesWithColor {
    crosshatchPatternFill: boolean;
}

const defaultJREastSingleColorPatternAttributes: JREastSingleColorPatternAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
    crosshatchPatternFill: false,
};

const jrEastSingleColorPatternAttrsComponent = (props: AttrsProps<JREastSingleColorPatternAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.lines.jrEastSingleColorPattern.crosshatchPatternFill'),
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
                    type={LineStyleType.JREastSingleColorPattern}
                    defaultTheme={defaultJREastSingleColorPatternAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastSingleColorPattern: LineStyle<JREastSingleColorPatternAttributes> = {
    component: JREastSingleColorPattern,
    defaultAttrs: defaultJREastSingleColorPatternAttributes,
    attrsComponent: jrEastSingleColorPatternAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColorPattern.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default jrEastSingleColorPattern;
