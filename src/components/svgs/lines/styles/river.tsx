import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { ColorAttribute } from '../../../panels/details/color-field';

const River = (props: LineStyleComponentProps<RiverAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultRiverAttributes.color, width = defaultRiverAttributes.width } =
        styleAttrs ?? defaultRiverAttributes;

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
            strokeWidth={width}
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * River specific props.
 */
export interface RiverAttributes extends LinePathAttributes, ColorAttribute {
    width: number;
}

const defaultRiverAttributes: RiverAttributes = {
    color: [CityCode.Shanghai, 'river', '#B9E3F9', MonoColour.white],
    width: 20,
};

const RiverAttrsComponent = (props: AttrsProps<RiverAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.lines.river.width'),
            variant: 'number',
            value: (attrs.width ?? defaultRiverAttributes.width).toString(),
            validator: (val: string) => !Number.isNaN(val),
            onChange: val => {
                attrs.width = Number(val);
                handleAttrsUpdate(id, attrs);
            },
        },
    ];

    return <RmgFields fields={fields} />;
};

const river: LineStyle<RiverAttributes> = {
    component: River,
    defaultAttrs: defaultRiverAttributes,
    attrsComponent: RiverAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.river.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default river;
