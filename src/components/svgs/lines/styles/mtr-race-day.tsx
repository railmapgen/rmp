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

const MTRRaceDays = (props: LineStyleComponentProps<MTRRaceDaysAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultMTRRaceDaysAttributes.color } = styleAttrs ?? defaultMTRRaceDaysAttributes;

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
            strokeWidth={LINE_WIDTH}
            strokeLinecap="butt"
            strokeDasharray={`${LINE_WIDTH} ${LINE_WIDTH / 2}`}
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * MTRRaceDays specific props.
 */
export interface MTRRaceDaysAttributes extends LinePathAttributes, ColorAttribute {}

const defaultMTRRaceDaysAttributes: MTRRaceDaysAttributes = {
    color: [CityCode.Hongkong, 'twl', '#E2231A', MonoColour.white],
};

const MTRRaceDaysAttrsComponent = (props: AttrsProps<MTRRaceDaysAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.MTRRaceDays} defaultTheme={defaultMTRRaceDaysAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const mtrRaceDays: LineStyle<MTRRaceDaysAttributes> = {
    component: MTRRaceDays,
    defaultAttrs: defaultMTRRaceDaysAttributes,
    attrsComponent: MTRRaceDaysAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mtrRaceDays.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default mtrRaceDays;
