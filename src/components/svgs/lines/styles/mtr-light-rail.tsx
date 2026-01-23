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

const MTRLightRail = (props: LineStyleComponentProps<MTRLightRailAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultMTRLightRailAttributes.color } = styleAttrs ?? defaultMTRLightRailAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke={color[2]}
            strokeWidth={LINE_WIDTH / 2}
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * MTRLightRail specific props.
 */
export interface MTRLightRailAttributes extends LinePathAttributes, ColorAttribute {}

const defaultMTRLightRailAttributes: MTRLightRailAttributes = {
    color: [CityCode.Hongkong, 'lrl', '#CD9700', MonoColour.white],
};

const MTRLightRailAttrsComponent = (props: AttrsProps<MTRLightRailAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.MTRLightRail} defaultTheme={defaultMTRLightRailAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const mtrLightRail: LineStyle<MTRLightRailAttributes> = {
    component: MTRLightRail,
    defaultAttrs: defaultMTRLightRailAttributes,
    attrsComponent: MTRLightRailAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mtrLightRail.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default mtrLightRail;
