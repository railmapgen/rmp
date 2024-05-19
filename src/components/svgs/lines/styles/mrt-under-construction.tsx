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

const MRTUnderConstruction = (props: LineStyleComponentProps<MRTUnderConstructionAttributes>) => {
    const { id, path, styleAttrs, handleClick } = props;
    const { color = defaultMRTUnderConstructionAttributes.color } = styleAttrs ?? defaultMRTUnderConstructionAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g>
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeDasharray="0 10" strokeLinecap="round" />
            <path
                id={id}
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth={5}
                cursor="pointer"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * MRTUnderConstruction specific props.
 */
export interface MRTUnderConstructionAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultMRTUnderConstructionAttributes: MRTUnderConstructionAttributes = {
    color: [CityCode.Singapore, 'ewl', '#009739', MonoColour.white],
};

const attrsComponent = (props: AttrsProps<MRTUnderConstructionAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: 'color',
            component: (
                <ColorField
                    type={LineStyleType.MRTUnderConstruction}
                    defaultTheme={defaultMRTUnderConstructionAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtUnderConstruction: LineStyle<MRTUnderConstructionAttributes> = {
    component: MRTUnderConstruction,
    defaultAttrs: defaultMRTUnderConstructionAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mrtUnderConstruction.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default mrtUnderConstruction;
