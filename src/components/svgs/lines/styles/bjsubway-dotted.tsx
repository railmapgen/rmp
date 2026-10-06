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
import { buildClosedBezierChainPathD, buildSymmetricOutlineSideChains } from '../../../../util/bezier-outline-sides';
import { getOpenPathPrimitives } from '../../../../util/open-path-primitives';
import { isOpenPath } from '../../../../util/path';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const BjsubwayDotted = (props: LineStyleComponentProps<BjsubwayDottedAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultBjsubwayDottedAttributes.color } = styleAttrs ?? defaultBjsubwayDottedAttributes;
    const clipId = `bjsubway-dotted-hollow-${React.useId()}`;

    // Reuse Shinkansen's reduced Bezier outlines, so inflected curves also remain safe to offset.
    // Clip the original dashes to a hollow vector outline without rasterizing a mask for every edge.
    // Graph refreshes can recreate an identical Path; cache by geometry so unchanged edges stay cheap.
    const clipPathD = React.useMemo(() => {
        if (!isOpenPath(path)) return '';
        const primitives = getOpenPathPrimitives(path);
        const outer = buildSymmetricOutlineSideChains(primitives, LINE_WIDTH / 2);
        const inner = buildSymmetricOutlineSideChains(primitives, 1.7);
        if (!outer.left.length || !inner.left.length) return '';
        return `${buildClosedBezierChainPathD(outer.left, outer.right)} ${buildClosedBezierChainPathD(inner.left, inner.right)}`;
    }, [path.kind, path.d]);

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path
                d={path.d}
                fill="none"
                stroke={color[2]}
                strokeWidth={LINE_WIDTH}
                strokeDasharray="2 2"
                clipPath={`url(#${clipId})`}
            />
            <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                    <path d={clipPathD} clipRule="evenodd" />
                </clipPath>
            </defs>
        </g>
    );
};

/**
 * BjsubwayDotted specific props.
 */
export interface BjsubwayDottedAttributes extends LinePathAttributes, ColorAttribute {}

const defaultBjsubwayDottedAttributes: BjsubwayDottedAttributes = {
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const BJSubwayDottedAttrsComponent = (props: AttrsProps<BjsubwayDottedAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={LineStyleType.BjsubwayDotted} defaultTheme={defaultBjsubwayDottedAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const bjsubwayDotted: LineStyle<BjsubwayDottedAttributes> = {
    component: BjsubwayDotted,
    defaultAttrs: defaultBjsubwayDottedAttributes,
    attrsComponent: BJSubwayDottedAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.bjsubwayDotted.displayName',
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

export default bjsubwayDotted;
