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

const LondonSandwichPre = (props: LineStyleComponentProps<LondonSandwichAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultLondonSandwichAttributes.color } = styleAttrs ?? defaultLondonSandwichAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={`${id}.pre`}
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
            cursor="pointer"
        >
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH} />
        </g>
    );
};

const LondonSandwich = (props: LineStyleComponentProps<LondonSandwichAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultLondonSandwichAttributes.color } = styleAttrs ?? defaultLondonSandwichAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke={color[3]} strokeWidth="1.67" strokeLinecap="round" />
        </g>
    );
};

/**
 * LondonSandwich specific props.
 */
export interface LondonSandwichAttributes extends LinePathAttributes, ColorAttribute {}

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
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonSandwich;
