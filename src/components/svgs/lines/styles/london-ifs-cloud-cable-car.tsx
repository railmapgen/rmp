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

const LondonIFSCloudCableCar = (props: LineStyleComponentProps<LondonIFSCloudCableCarAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultLondonIFSCloudCableCarAttributes.color } =
        styleAttrs ?? defaultLondonIFSCloudCableCarAttributes;

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
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH} />
            <path d={path} fill="none" stroke="white" strokeWidth={(LINE_WIDTH / 5) * 3} />
            <path d={path} fill="none" stroke={color[2]} strokeWidth={LINE_WIDTH / 5} />
        </g>
    );
};

/**
 * LondonIFSCloudCableCar specific props.
 */
export interface LondonIFSCloudCableCarAttributes extends LinePathAttributes, ColorAttribute {}

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
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonIFSCloudCableCar;
