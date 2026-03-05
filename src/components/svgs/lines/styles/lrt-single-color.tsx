import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const LRTSingleColor = (props: LineStyleComponentProps<LRTSingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultLRTSingleColorAttributes.color } = styleAttrs ?? defaultLRTSingleColorAttributes;

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
            strokeWidth="2.157"
            strokeLinecap="round"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * LRT Single Color specific props.
 */
export interface LRTSingleColorAttributes extends LinePathAttributes, ColorAttribute {}

const defaultLRTSingleColorAttributes: LRTSingleColorAttributes = {
    color: [CityCode.Singapore, 'lrt', '#708573', MonoColour.white],
};

const lrtSingleColorAttrsComponent = (props: AttrsProps<LRTSingleColorAttributes>) => {
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: 'color',
            component: (
                <ColorField type={LineStyleType.LRTSingleColor} defaultTheme={defaultLRTSingleColorAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const lrtSingleColor: LineStyle<LRTSingleColorAttributes> = {
    component: LRTSingleColor,
    defaultAttrs: defaultLRTSingleColorAttributes,
    attrsComponent: lrtSingleColorAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.lrtSingleColor.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default lrtSingleColor;
