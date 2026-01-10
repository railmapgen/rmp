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

const LondonTubeTerminal = (props: LineStyleComponentProps<LondonTubeTerminalAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultLondonTubeTerminalAttributes.color } = styleAttrs ?? defaultLondonTubeTerminalAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGPathElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke={color[2]}
            strokeWidth={LINE_WIDTH}
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * LondonTubeTerminal specific props.
 */
export interface LondonTubeTerminalAttributes extends LinePathAttributes, ColorAttribute {}

const defaultLondonTubeTerminalAttributes: LondonTubeTerminalAttributes = {
    color: [CityCode.London, 'central', '#DC241F', MonoColour.white],
};

const attrsComponent = (props: AttrsProps<LondonTubeTerminalAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.LondonTubeTerminal}
                    defaultTheme={defaultLondonTubeTerminalAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonTubeTerminal: LineStyle<LondonTubeTerminalAttributes> = {
    component: LondonTubeTerminal,
    defaultAttrs: defaultLondonTubeTerminalAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonTubeTerminal.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonTubeTerminal;
