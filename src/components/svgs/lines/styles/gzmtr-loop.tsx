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

const STATION_ICON_HEIGHT = 9.25 * 2;
const STATION_ICON_STROKE = 1.3;
const STATION_ICON_SCALE = 0.57915;
const STROKE_WIDTH_OUTER = (STATION_ICON_HEIGHT + STATION_ICON_STROKE) * STATION_ICON_SCALE;
const STROKE_WIDTH_INNER = (STATION_ICON_HEIGHT - STATION_ICON_STROKE) * STATION_ICON_SCALE;

const GZMTRLoop = (props: LineStyleComponentProps<GZMTRLoopAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultGZMTRLoopAttributes.color } = styleAttrs ?? defaultGZMTRLoopAttributes;

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
            <path d={path} fill="none" stroke="black" strokeWidth={STROKE_WIDTH_OUTER} />
            <path d={path} fill="none" stroke={color[2]} strokeWidth={STROKE_WIDTH_INNER} strokeLinecap="round" />
        </g>
    );
};

/**
 * GZMTRLoop has no specific props.
 */
export interface GZMTRLoopAttributes extends LinePathAttributes, ColorAttribute {}

const defaultGZMTRLoopAttributes: GZMTRLoopAttributes = {
    color: [CityCode.Guangzhou, 'gz11', '#ffb00a', MonoColour.black],
};

const gzmtrLoopAttrsComponent = (props: AttrsProps<GZMTRLoopAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={LineStyleType.GZMTRLoop} defaultTheme={defaultGZMTRLoopAttributes.color} />,
        },
    ];

    return <RmgFields fields={fields} />;
};

const gzmtrLoop: LineStyle<GZMTRLoopAttributes> = {
    component: GZMTRLoop,
    defaultAttrs: defaultGZMTRLoopAttributes,
    attrsComponent: gzmtrLoopAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.gzmtrLoop.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default gzmtrLoop;
