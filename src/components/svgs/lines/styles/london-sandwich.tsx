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

const LondonSandwichPre = (props: LineStyleComponentProps<LondonSandwichAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultLondonSandwichAttributes.color } = styleAttrs ?? defaultLondonSandwichAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={`${id}.pre`} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" />
        </g>
    );
};

const LondonSandwich = (props: LineStyleComponentProps<LondonSandwichAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultLondonSandwichAttributes.color } = styleAttrs ?? defaultLondonSandwichAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[3]} strokeWidth="1.67" strokeLinecap="round" />
        </g>
    );
};

/**
 * LondonSandwich specific props.
 */
export interface LondonSandwichAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultLondonSandwichAttributes: LondonSandwichAttributes = {
    color: [CityCode.London, 'elizabeth', '#9364cc', MonoColour.white],
};

const LondonSandwichAttrsComponent = (props: AttrsProps<LondonSandwichAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.LondonSandwich} defaultTheme={defaultLondonSandwichAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonSandwich: LineStyle<LondonSandwichAttributes> = {
    component: LondonSandwich,
    preComponent: LondonSandwichPre,
    defaultAttrs: defaultLondonSandwichAttributes,
    attrsComponent: LondonSandwichAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonSandwich.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default londonSandwich;
