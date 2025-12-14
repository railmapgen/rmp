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

const Generic = (props: LineStyleComponentProps<GenericAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const {
        color = defaultGenericAttributes.color,
        width = defaultGenericAttributes.width,
        linecap = defaultGenericAttributes.linecap,
        dasharray = defaultGenericAttributes.dasharray,
    } = styleAttrs ?? defaultGenericAttributes;

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
            strokeLinecap={linecap}
            strokeDasharray={dasharray}
            cursor="pointer"
            onPointerDown={onPointerDown}
        />
    );
};

/**
 * Generic specific props.
 */
export interface GenericAttributes extends LinePathAttributes, ColorAttribute {
    width: number;
    linecap: 'butt' | 'round' | 'square';
    dasharray: string;
}

const defaultGenericAttributes: GenericAttributes = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    width: LINE_WIDTH,
    linecap: 'round',
    dasharray: '',
};

const genericAttrsComponent = (props: AttrsProps<GenericAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={LineStyleType.Generic} defaultTheme={defaultGenericAttributes.color} />,
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.width'),
            variant: 'number',
            value: (attrs.width ?? defaultGenericAttributes.width).toString(),
            validator: (val: string) => !Number.isNaN(val) && Number(val) > 0,
            onChange: val => {
                attrs.width = Number(val);
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'select',
            label: t('panel.details.lines.generic.linecap'),
            value: attrs.linecap ?? defaultGenericAttributes.linecap,
            options: {
                butt: t('panel.details.lines.generic.linecapButt'),
                round: t('panel.details.lines.generic.linecapRound'),
                square: t('panel.details.lines.generic.linecapSquare'),
            },
            onChange: val => {
                attrs.linecap = val as 'butt' | 'round' | 'square';
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.dasharray'),
            value: attrs.dasharray ?? defaultGenericAttributes.dasharray,
            onChange: val => {
                attrs.dasharray = val as string;
                handleAttrsUpdate(id, attrs);
            },
        },
    ];

    return <RmgFields fields={fields} />;
};

const generic: LineStyle<GenericAttributes> = {
    component: Generic,
    defaultAttrs: defaultGenericAttributes,
    attrsComponent: genericAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.generic.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default generic;
