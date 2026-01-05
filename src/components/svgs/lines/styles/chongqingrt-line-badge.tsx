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
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const ChongqingRTLineBadge = (props: LineStyleComponentProps<ChongqingRTLineBadgeAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultChongqingRTLineBadgeAttributes.color } = styleAttrs ?? defaultChongqingRTLineBadgeAttributes;

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
            strokeWidth="3"
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * ChongqingRTLineBadge specific props.
 */
export interface ChongqingRTLineBadgeAttributes extends LinePathAttributes, ColorAttribute {}

const defaultChongqingRTLineBadgeAttributes: ChongqingRTLineBadgeAttributes = {
    color: [CityCode.Chongqing, 'cq1', '#E4002B', MonoColour.white],
};

const chongqingRTLineBadgeAttrsComponent = (props: AttrsProps<ChongqingRTLineBadgeAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.ChongqingRTLineBadge}
                    defaultTheme={defaultChongqingRTLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const chongqingRTLineBadge: LineStyle<ChongqingRTLineBadgeAttributes> = {
    component: ChongqingRTLineBadge,
    defaultAttrs: defaultChongqingRTLineBadgeAttributes,
    attrsComponent: chongqingRTLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.chongqingRTLineBadge.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default chongqingRTLineBadge;
