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

const BjsubwaySingleColor = (props: LineStyleComponentProps<BjsubwaySingleColorAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultBjsubwaySingleColorAttributes.color } = styleAttrs ?? defaultBjsubwaySingleColorAttributes;

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
            <path d={path} fill="none" stroke="white" strokeWidth={LINE_WIDTH * 1.2} strokeLinecap="round" />
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH} strokeLinecap="round" />
        </g>
    );
};

/**
 * BjsubwaySingleColor specific props.
 */
export interface BjsubwaySingleColorAttributes extends LinePathAttributes, ColorAttribute {}

const defaultBjsubwaySingleColorAttributes: BjsubwaySingleColorAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const BJSubwaySingleColorAttrsComponent = (props: AttrsProps<BjsubwaySingleColorAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.BjsubwaySingleColor}
                    defaultTheme={defaultBjsubwaySingleColorAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const bjsubwaySingleColor: LineStyle<BjsubwaySingleColorAttributes> = {
    component: BjsubwaySingleColor,
    defaultAttrs: defaultBjsubwaySingleColorAttributes,
    attrsComponent: BJSubwaySingleColorAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwaySingleColor.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default bjsubwaySingleColor;
