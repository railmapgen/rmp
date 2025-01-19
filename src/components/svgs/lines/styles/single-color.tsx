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

const SingleColor = (props: LineStyleComponentProps<SingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultSingleColorAttributes.color } = styleAttrs ?? defaultSingleColorAttributes;

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
            strokeWidth="5"
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * SingleColor specific props.
 */
export interface SingleColorAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultSingleColorAttributes: SingleColorAttributes = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const singleColorAttrsComponent = (props: AttrsProps<SingleColorAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.SingleColor} defaultTheme={defaultSingleColorAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const singleColor: LineStyle<SingleColorAttributes> = {
    component: SingleColor,
    defaultAttrs: defaultSingleColorAttributes,
    attrsComponent: singleColorAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.singleColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default singleColor;
