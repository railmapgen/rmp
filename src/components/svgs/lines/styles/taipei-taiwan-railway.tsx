import { RmgFields } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LinePathType,
    LineStyle,
    LineStyleAttributes,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { buildClosedBezierChainPathD, buildSymmetricOutlineSideChains } from '../../../../util/bezier-outline-sides';
import { getOpenPathPrimitives } from '../../../../util/open-path-primitives';
import { isOpenPath } from '../../../../util/path';
import {
    getTaipeiOpacityMode,
    getTaipeiOpacityOptions,
    resolveTaipeiOpacity,
    TaipeiOpacitySetting,
} from '../../../../util/taipei-opacity';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const WIDTH = 3.3;
const SLOT_WIDTH = 1.7;

const TaipeiTaiwanRailway = (props: LineStyleComponentProps<TaipeiTaiwanRailwayAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const color = styleAttrs?.color ?? defaultAttrs.color;
    const opacity = resolveTaipeiOpacity(styleAttrs?.opacity, 0.25);
    const clipId = `taipei-taiwan-railway-${id}-${React.useId()}`;
    const railOutline = React.useMemo(() => {
        if (!isOpenPath(path)) return '';
        const primitives = getOpenPathPrimitives(path);
        const outer = buildSymmetricOutlineSideChains(primitives, WIDTH / 2);
        const inner = buildSymmetricOutlineSideChains(primitives, SLOT_WIDTH / 2);
        if (!outer.left.length || !inner.left.length) return '';
        return `${buildClosedBezierChainPathD(outer.left, outer.right)} ${buildClosedBezierChainPathD(inner.left, inner.right)}`;
    }, [path.kind, path.d]);
    const onPointerDown = React.useCallback(
        (event: React.PointerEvent<SVGElement>) => handlePointerDown(id, event),
        [id, handlePointerDown]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
            opacity={opacity}
        >
            <path
                d={path.d}
                fill="none"
                stroke={color[2]}
                strokeWidth={WIDTH}
                strokeLinecap="butt"
                clipPath={`url(#${clipId})`}
            />
            {/* Paint the center crossbars separately, leaving each six-unit slot transparent. */}
            <path
                d={railOutline ? path.d : ''}
                fill="none"
                stroke={color[2]}
                strokeWidth={SLOT_WIDTH}
                strokeLinecap="butt"
                strokeDasharray="6 6"
                strokeDashoffset={6}
            />
            <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                    <path d={railOutline} clipRule="evenodd" fill="black" />
                </clipPath>
            </defs>
        </g>
    );
};

export interface TaipeiTaiwanRailwayAttributes extends LineStyleAttributes, ColorAttribute {
    opacity?: TaipeiOpacitySetting;
}

const defaultAttrs: TaipeiTaiwanRailwayAttributes = {
    color: [CityCode.Taipei, 'railway', '#767475', MonoColour.white],
    opacity: 'preset',
};

const AttrsComponent = ({ id, attrs, handleAttrsUpdate }: AttrsProps<TaipeiTaiwanRailwayAttributes>) => {
    const { t } = useTranslation();
    return (
        <RmgFields
            fields={[
                {
                    type: 'custom',
                    label: t('color'),
                    minW: 'full',
                    component: (
                        <ColorField type={LineStyleType.TaipeiTaiwanRailway} defaultTheme={defaultAttrs.color} />
                    ),
                },
                {
                    type: 'select',
                    label: t('panel.details.lines.generic.opacity'),
                    minW: 'full',
                    value: getTaipeiOpacityMode(attrs.opacity),
                    options: getTaipeiOpacityOptions(t),
                    onChange: value =>
                        handleAttrsUpdate(id, { ...attrs, opacity: value === 'opaque' ? 'opaque' : 'preset' }),
                },
            ]}
        />
    );
};

const taipeiTaiwanRailway: LineStyle<TaipeiTaiwanRailwayAttributes> = {
    component: TaipeiTaiwanRailway,
    defaultAttrs,
    attrsComponent: AttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.taipeiTaiwanRailway.displayName',
        supportLinePathType: [
            LinePathType.Freeform,
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
            LinePathType.Bezier,
        ],
        supportsReconcile: true,
    },
};

export default taipeiTaiwanRailway;
