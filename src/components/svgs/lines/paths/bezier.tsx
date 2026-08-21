import { HStack, IconButton, Input, InputGroup, InputLeftAddon } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { MdLink } from 'react-icons/md';
import { NodeId } from '../../../../constants/constants';
import {
    LinePath,
    LinePathAttrsProps,
    LinePathEdgeAttrsNormalizer,
    LinePathType,
    PathGenerator,
} from '../../../../constants/lines';
import { makePoint, PathPoint } from '../../../../constants/path';
import { getSameStyleBezierEndpointOffset } from './bezier-endpoint';
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

/**
 * Keeps each endpoint of a Bezier edge on the shared virtual endpoint of its directly linked same-style group.
 *
 * Hidden peers participate because visibility does not change group identity. A created endpoint with no established
 * peer starts at the path default, while an updated endpoint retains its current offset. Pending edges from the same
 * transaction are ignored so only stable or already-normalized peers can define the shared position.
 *
 * Dependency note: `lines.ts -> bezier.tsx -> bezier-endpoint.ts -> same-style.ts -> lines.ts` is an intentional ESM
 * cycle. `lineStyles` must only be read when this normalizer runs after module initialization, never at module scope.
 */
const normalizeBezierEdgeAttrs: LinePathEdgeAttrsNormalizer = (graph, edgeId, mode, ignoredEdgeIds) => {
    const edgeAttrs = graph.getEdgeAttributes(edgeId);
    const current = edgeAttrs[LinePathType.Bezier] ?? defaultBezierPathAttributes;
    const [source, target] = graph.extremities(edgeId) as [NodeId, NodeId];
    const fallback = mode === 'created' ? defaultBezierPathAttributes : current;
    graph.setEdgeAttribute(edgeId, LinePathType.Bezier, {
        ...current,
        sourceOffset: getSameStyleBezierEndpointOffset(graph, source, edgeAttrs, ignoredEdgeIds) ?? {
            ...(fallback.sourceOffset ?? defaultBezierPathAttributes.sourceOffset),
        },
        targetOffset: getSameStyleBezierEndpointOffset(graph, target, edgeAttrs, ignoredEdgeIds) ?? {
            ...(fallback.targetOffset ?? defaultBezierPathAttributes.targetOffset),
        },
    });
};

const attrsComponent = ({ id, attrs, handleAttrsUpdate }: LinePathAttrsProps<BezierPathAttributes>) => {
    const { t } = useTranslation();
    const update = (patch: Partial<BezierPathAttributes>) => handleAttrsUpdate(id, { ...attrs, ...patch });
    const sourceOffset = attrs.sourceOffset ?? defaultBezierPathAttributes.sourceOffset;
    const targetOffset = attrs.targetOffset ?? defaultBezierPathAttributes.targetOffset;
    const endpointOffsetField = (endpoint: 'source' | 'target', offset: PathPoint, label: string): RmgFieldsField => ({
        type: 'custom',
        label,
        component: (
            <HStack width="100%" spacing={2} data-testid={`bezier-${endpoint}-offset`}>
                {(['x', 'y'] as const).map(axis => (
                    <InputGroup key={axis} size="sm" minW={0} flex={1}>
                        <InputLeftAddon px={2}>{axis.toUpperCase()}</InputLeftAddon>
                        <Input
                            aria-label={t(`panel.details.lines.bezier.${endpoint}Offset${axis.toUpperCase()}`)}
                            type="number"
                            value={offset[axis]}
                            isReadOnly
                        />
                    </InputGroup>
                ))}
                <IconButton
                    aria-label={t('panel.details.lines.bezier.linkedOffset')}
                    icon={<MdLink />}
                    size="sm"
                    variant="ghost"
                    isDisabled
                    flexShrink={0}
                />
            </HStack>
        ),
        minW: 'full',
    });

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
        endpointOffsetField('source', sourceOffset, t('panel.details.lines.bezier.sourceOffset')),
        endpointOffsetField('target', targetOffset, t('panel.details.lines.bezier.targetOffset')),
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
    normalizeEdgeAttrs: normalizeBezierEdgeAttrs,
    metadata: {
        displayName: 'panel.details.lines.bezier.displayName',
        supportsReconcile: false,
    },
};

export default bezierPath;
