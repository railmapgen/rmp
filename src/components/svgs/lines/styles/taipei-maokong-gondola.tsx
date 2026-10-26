import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CityCode } from '../../../../constants/constants';
import { LinePathType, LineStyle, LineStyleComponentProps, LineStyleType } from '../../../../constants/lines';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const TaipeiMaokongGondola = (props: LineStyleComponentProps<TaipeiMaokongGondolaAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultTaipeiMaokongGondolaAttributes.color } = styleAttrs ?? defaultTaipeiMaokongGondolaAttributes;
    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            d={path.d}
            fill="none"
            stroke={color[2]}
            strokeWidth={3.1}
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

export interface TaipeiMaokongGondolaAttributes extends ColorAttribute {}

const defaultTaipeiMaokongGondolaAttributes: TaipeiMaokongGondolaAttributes = {
    color: [CityCode.Taipei, 'gondola', '#00A7D3', MonoColour.white],
};

const TaipeiMaokongGondolaAttrsComponent = () => {
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.TaipeiMaokongGondola}
                    defaultTheme={defaultTaipeiMaokongGondolaAttributes.color}
                />
            ),
        },
    ];
    return <RmgFields fields={fields} />;
};

const taipeiMaokongGondola: LineStyle<TaipeiMaokongGondolaAttributes> = {
    component: TaipeiMaokongGondola,
    defaultAttrs: defaultTaipeiMaokongGondolaAttributes,
    attrsComponent: TaipeiMaokongGondolaAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.taipeiMaokongGondola.displayName',
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

export default taipeiMaokongGondola;
