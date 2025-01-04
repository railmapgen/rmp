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

const LondonIFSCloudCableCar = (props: LineStyleComponentProps<LondonIFSCloudCableCarAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultLondonIFSCloudCableCarAttributes.color } =
        styleAttrs ?? defaultLondonIFSCloudCableCarAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" />
            <path d={path} fill="none" stroke="white" strokeWidth="3" />
            <path d={path} fill="none" stroke={color[2]} strokeWidth="1" />
        </g>
    );
};

/**
 * LondonIFSCloudCableCar specific props.
 */
export interface LondonIFSCloudCableCarAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultLondonIFSCloudCableCarAttributes: LondonIFSCloudCableCarAttributes = {
    color: [CityCode.London, 'dangleway', '#dc241f', MonoColour.white],
};

const LondonIFSCloudCableCarAttrsComponent = (props: AttrsProps<LondonIFSCloudCableCarAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.LondonIFSCloudCableCar}
                    defaultTheme={defaultLondonIFSCloudCableCarAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonIFSCloudCableCar: LineStyle<LondonIFSCloudCableCarAttributes> = {
    component: LondonIFSCloudCableCar,
    defaultAttrs: defaultLondonIFSCloudCableCarAttributes,
    attrsComponent: LondonIFSCloudCableCarAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonIFSCloudCableCar.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default londonIFSCloudCableCar;
