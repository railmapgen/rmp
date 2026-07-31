import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { LineId } from '../../../../constants/constants';
import {
    LinePath,
    LinePathAttrsProps,
    LinePathNewEdgeAttrsInitializer,
    LinePathType,
    PathGenerator,
} from '../../../../constants/lines';
import { makePoint, PathPoint } from '../../../../constants/path';
import { areSameLineStyles } from '../../../../util/same-style';
import { makeBezierPath } from './bezier-geometry';
import { BezierPathAttributes, defaultBezierPathAttributes } from './bezier-model';
import { BezierLineOverlay } from './bezier-overlay';

/** Generate the cubic path used by every line style. */
export const generateBezierPath: PathGenerator<BezierPathAttributes> = (
    x1,
    x2,
    y1,
    y2,
    attrs = defaultBezierPathAttributes
) => {
    const source = makePoint(x1, y1);
    const target = makePoint(x2, y2);
    return makeBezierPath(source, target, attrs);
};

export const initializeNewBezierEdgeAttrs: LinePathNewEdgeAttrsInitializer<BezierPathAttributes> = (
    graph,
    source,
    target,
    edgeAttrs
) => {
    const getExistingOffset = (node: typeof source): PathPoint | undefined => {
        for (const edgeId of graph.edges(node) as LineId[]) {
            const existingEdgeAttrs = graph.getEdgeAttributes(edgeId);
            if (existingEdgeAttrs.type !== LinePathType.Bezier || !areSameLineStyles(edgeAttrs, existingEdgeAttrs)) {
                continue;
            }

            const existingPathAttrs = existingEdgeAttrs[LinePathType.Bezier] ?? defaultBezierPathAttributes;
            const offset =
                graph.source(edgeId) === node
                    ? (existingPathAttrs.sourceOffset ?? defaultBezierPathAttributes.sourceOffset)
                    : (existingPathAttrs.targetOffset ?? defaultBezierPathAttributes.targetOffset);
            return { ...offset };
        }
        return undefined;
    };

    const attrs = edgeAttrs[LinePathType.Bezier] ?? defaultBezierPathAttributes;
    return {
        ...attrs,
        sourceOffset: getExistingOffset(source) ?? { ...defaultBezierPathAttributes.sourceOffset },
        targetOffset: getExistingOffset(target) ?? { ...defaultBezierPathAttributes.targetOffset },
    };
};

const attrsComponent = ({
    id,
    attrs,
    handleAttrsUpdate,
    syncSameStyleEndpointOffset,
}: LinePathAttrsProps<BezierPathAttributes>) => {
    const { t } = useTranslation();
    const update = (patch: Partial<BezierPathAttributes>) => handleAttrsUpdate(id, { ...attrs, ...patch });
    const updateEndpointOffset = (endpoint: 'source' | 'target', offset: PathPoint) => {
        syncSameStyleEndpointOffset?.(id, endpoint, offset);
        if (endpoint === 'source') update({ sourceOffset: offset });
        else update({ targetOffset: offset });
    };
    const sourceOffset = attrs.sourceOffset ?? defaultBezierPathAttributes.sourceOffset;
    const targetOffset = attrs.targetOffset ?? defaultBezierPathAttributes.targetOffset;

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.lines.bezier.along'),
            value: attrs.along.toString(),
            variant: 'number',
            onChange: val => update({ along: Number(val) || 0 }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.bezier.normal'),
            value: attrs.normal.toString(),
            variant: 'number',
            onChange: val => update({ normal: Number(val) || 0 }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.bezier.sourceOffsetX'),
            value: sourceOffset.x.toString(),
            variant: 'number',
            onChange: val => updateEndpointOffset('source', { ...sourceOffset, x: Number(val) || 0 }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.bezier.sourceOffsetY'),
            value: sourceOffset.y.toString(),
            variant: 'number',
            onChange: val => updateEndpointOffset('source', { ...sourceOffset, y: Number(val) || 0 }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.bezier.targetOffsetX'),
            value: targetOffset.x.toString(),
            variant: 'number',
            onChange: val => updateEndpointOffset('target', { ...targetOffset, x: Number(val) || 0 }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.bezier.targetOffsetY'),
            value: targetOffset.y.toString(),
            variant: 'number',
            onChange: val => updateEndpointOffset('target', { ...targetOffset, y: Number(val) || 0 }),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const bezierIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M4,17 C9,3 15,3 20,17" stroke="currentColor" fill="none" />
        <circle cx="12" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
);

const bezierPath: LinePath<BezierPathAttributes> = {
    generatePath: generateBezierPath,
    // Bezier uses the normal node-to-node creation flow. The overlay is only
    // needed after selection, where the shared tangent-intersection handle can
    // edit both cubic tangents without introducing a custom drawing behavior.
    overlayComponent: BezierLineOverlay,
    icon: bezierIcon,
    defaultAttrs: defaultBezierPathAttributes,
    attrsComponent,
    initializeNewEdgeAttrs: initializeNewBezierEdgeAttrs,
    metadata: {
        displayName: 'panel.details.lines.bezier.displayName',
        supportsReconcile: false,
    },
};

export default bezierPath;
