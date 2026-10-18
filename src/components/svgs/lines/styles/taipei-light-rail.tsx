import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import { LinePathType, LineStyle, LineStyleComponentProps, LineStyleType } from '../../../../constants/lines';
import {
    getTaipeiOpacityMode,
    getTaipeiOpacityOptions,
    resolveTaipeiOpacity,
    TaipeiOpacitySetting,
} from '../../../../util/taipei-opacity';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const TaipeiLightRail = (props: LineStyleComponentProps<TaipeiLightRailAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultTaipeiLightRailAttributes.color, opacity = defaultTaipeiLightRailAttributes.opacity } =
        styleAttrs ?? defaultTaipeiLightRailAttributes;
    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            d={path.d}
            fill="none"
            stroke={color[2]}
            strokeOpacity={resolveTaipeiOpacity(opacity, 0.45)}
            strokeWidth={2.8}
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

export interface TaipeiLightRailAttributes extends ColorAttribute {
    opacity?: TaipeiOpacitySetting;
}

const defaultTaipeiLightRailAttributes: TaipeiLightRailAttributes = {
    color: [CityCode.Taipei, 'v', '#E5554F', MonoColour.black],
    opacity: 'preset',
};

const TaipeiLightRailAttrsComponent = ({ id, attrs, handleAttrsUpdate }: AttrsProps<TaipeiLightRailAttributes>) => {
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.TaipeiLightRail}
                    defaultTheme={defaultTaipeiLightRailAttributes.color}
                />
            ),
        },
        {
            type: 'select',
            label: t('panel.details.lines.generic.opacity'),
            value: getTaipeiOpacityMode(attrs.opacity),
            options: getTaipeiOpacityOptions(t),
            onChange: value => {
                handleAttrsUpdate(id, { ...attrs, opacity: value === 'opaque' ? 'opaque' : 'preset' });
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const taipeiLightRail: LineStyle<TaipeiLightRailAttributes> = {
    component: TaipeiLightRail,
    defaultAttrs: defaultTaipeiLightRailAttributes,
    attrsComponent: TaipeiLightRailAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.taipeiLightRail.displayName',
        supportLinePathType: [
            LinePathType.Freeform,
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
            LinePathType.Bezier,
        ],
        supportsReconcile: true,
    },
};

export default taipeiLightRail;
