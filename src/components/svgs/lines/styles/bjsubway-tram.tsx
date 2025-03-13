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

const BjsubwayTram = (props: LineStyleComponentProps<BjsubwayTramAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { color = defaultBjsubwayTramAttributes.color } = styleAttrs ?? defaultBjsubwayTramAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" />
            <path d={path} fill="none" stroke="white" strokeWidth="1.67" />
        </g>
    );
};

/**
 * BjsubwayTram specific props.
 */
export interface BjsubwayTramAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwayTramAttributes: BjsubwayTramAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const BJSubwayTramAttrsComponent = (props: AttrsProps<BjsubwayTramAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.BjsubwayTram} defaultTheme={defaultBjsubwayTramAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const bjsubwayTram: LineStyle<BjsubwayTramAttributes> = {
    component: BjsubwayTram,
    defaultAttrs: defaultBjsubwayTramAttributes,
    attrsComponent: BJSubwayTramAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwayTram.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default bjsubwayTram;
