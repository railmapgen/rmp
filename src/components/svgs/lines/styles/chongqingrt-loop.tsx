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

const ChongqingRTLoop = (props: LineStyleComponentProps<ChongqingRTLoopAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultChongqingRTLoopAttributes.color } = styleAttrs ?? defaultChongqingRTLoopAttributes;

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
            strokeWidth="8"
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * ChongqingRTLoop specific props.
 */
export interface ChongqingRTLoopAttributes extends LinePathAttributes, ColorAttribute {}

const defaultChongqingRTLoopAttributes: ChongqingRTLoopAttributes = {
    color: [CityCode.Chongqing, 'cq1', '#E4002B', MonoColour.white],
};

const chongqingRTLoopAttrsComponent = (props: AttrsProps<ChongqingRTLoopAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.ChongqingRTLoop}
                    defaultTheme={defaultChongqingRTLoopAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const chongqingRTLoop: LineStyle<ChongqingRTLoopAttributes> = {
    component: ChongqingRTLoop,
    defaultAttrs: defaultChongqingRTLoopAttributes,
    attrsComponent: chongqingRTLoopAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.chongqingRTLoop.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default chongqingRTLoop;
