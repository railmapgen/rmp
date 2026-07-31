import { HStack, IconButton, Input, InputGroup, InputLeftAddon } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { MdLink } from 'react-icons/md';
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
    initializeNewEdgeAttrs: initializeNewBezierEdgeAttrs,
    metadata: {
        displayName: 'panel.details.lines.bezier.displayName',
        supportsReconcile: false,
    },
};

export default bezierPath;
