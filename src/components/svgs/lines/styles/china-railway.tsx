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

const ChinaRailway = (props: LineStyleComponentProps<ChinaRailwayAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultChinaRailwayAttributes.color } = styleAttrs ?? defaultChinaRailwayAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke={color[3]} strokeWidth="4.67" strokeDasharray="17.5" />
        </g>
    );
};

/**
 * ChinaRailway specific props.
 */
export interface ChinaRailwayAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultChinaRailwayAttributes: ChinaRailwayAttributes = {
    color: [CityCode.Shanghai, 'jsr', '#000000', MonoColour.white],
};

const attrsComponent = (props: AttrsProps<ChinaRailwayAttributes>) => {
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.ChinaRailway} defaultTheme={defaultChinaRailwayAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};
const chinaRailway: LineStyle<ChinaRailwayAttributes> = {
    component: ChinaRailway,
    defaultAttrs: defaultChinaRailwayAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.chinaRailway.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default chinaRailway;
