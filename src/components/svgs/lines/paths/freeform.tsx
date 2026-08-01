import { Input, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { LinePath, LinePathAttrsProps, LinePathDrawingBehavior, PathGenerator } from '../../../../constants/lines';
import { makeEmptyOpenPath, makePoint } from '../../../../constants/path';
import { clamp } from '../../../../util/number';
import { createFreeformPathAttributes, makeFreeformAreaPath } from './freeform-geometry';
import {
    defaultFreeformPathAttributes,
    normalizeFreeformPathAttributes,
    resolveFreeformPathAttributes,
} from './freeform-model';
import type { FreeformPathAttributes } from './freeform-model';
import { FreeformLineOverlay } from './freeform-overlay';

export type { FreeformPathAttributes } from './freeform-model';

/**
 * Generate the filled-area representation for a freeform edge.
 *
 * The generator is the rendering boundary that resolves persisted chord-relative points against the current graph
 * endpoints before delegating to SVG-unit geometry.
 */
export const generateFreeformPath: PathGenerator<FreeformPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: FreeformPathAttributes = defaultFreeformPathAttributes
) => {
    const targetRelative = makePoint(x2 - x1, y2 - y1);
    const safeAttrs = resolveFreeformPathAttributes(attrs, targetRelative);
    return safeAttrs ? makeFreeformAreaPath(safeAttrs, makePoint(x1, y1)) : makeEmptyOpenPath();
};

const freeformDrawingBehavior: LinePathDrawingBehavior<FreeformPathAttributes> = {
    /** Start a pointer-driven drawing session between the chosen source and target nodes. */
    createSession: (source, initialPointer) => {
        // Keep raw samples in the gesture session rather than React state: dropping pointer events between renders
        // changes the shape the user actually drew.
        const points = [source, initialPointer];

        return {
            /** Collect pointer samples for the eventual committed path. */
            pointerMove: pointer => {
                const previous = points[points.length - 1];
                // Ignore sub-pixel jitter so accidental hand tremor does not become persisted geometry.
                if (previous && Math.hypot(previous.x - pointer.x, previous.y - pointer.y) < 1) return;
                points.push(pointer);
            },
            /** Build the final persisted attrs once the target node is known. */
            createAttrs: (target, pointer) =>
                createFreeformPathAttributes([...points, pointer], source, target, () => nanoid(10)),
            /** Render a transient filled preview while the user is still choosing the target. */
            getPreview: pointer => {
                let id = 0;
                const attrs = createFreeformPathAttributes(
                    [...points, pointer],
                    source,
                    pointer,
                    () => `preview_${id++}`,
                    {
                        // The preview follows the pointer more closely; the committed path is simplified further
                        // to keep persisted data and later editing work bounded.
                        minPointDistance: 1,
                        simplifyTolerance: 0.5,
                    }
                );
                if (!attrs) return null;

                const path = generateFreeformPath(source.x, pointer.x, source.y, pointer.y, attrs);
                return <path d={path.d} fill="currentColor" fillOpacity="0.65" stroke="none" pointerEvents="none" />;
            },
        };
    },
};

/** Render the freeform-specific details panel controls. */
const attrsComponent = (props: LinePathAttrsProps<FreeformPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const safeAttrs = normalizeFreeformPathAttributes(attrs) ?? defaultFreeformPathAttributes;

    /** Patch canonical attrs so partial UI edits do not drop normalized defaults. */
    const updateAttrs = (patch: Partial<FreeformPathAttributes>) => {
        handleAttrsUpdate(id, { ...safeAttrs, ...patch });
    };

    /** Update one width stop while preserving the other sorted stops and their stable ids. */
    const updateWidthStop = (stopId: string, patch: { t?: number; width?: number }) => {
        updateAttrs({
            widthStops: safeAttrs.widthStops.map(stop => ({
                ...stop,
                ...(stop.id === stopId ? patch : {}),
            })),
        });
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.lines.freeform.widthStops'),
            component: (
                <Table
                    size="sm"
                    variant="simple"
                    sx={{
                        tableLayout: 'fixed',
                        '& th': {
                            whiteSpace: 'normal',
                            lineHeight: 1.1,
                            overflowWrap: 'anywhere',
                        },
                        '& td': {
                            overflow: 'hidden',
                        },
                    }}
                >
                    <Thead>
                        <Tr>
                            <Th w="28px" px="1">
                                {t('panel.details.lines.freeform.widthStopIndex')}
                            </Th>
                            <Th px="1" fontSize="xs">
                                {t('panel.details.lines.freeform.widthStopPosition')}
                            </Th>
                            <Th px="1" fontSize="xs">
                                {t('panel.details.lines.freeform.widthStopWidth')}
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {safeAttrs.widthStops.map((stop, index) => (
                            <Tr key={stop.id}>
                                <Td px="1">{index + 1}</Td>
                                <Td px="1">
                                    <Input
                                        size="sm"
                                        type="number"
                                        w="100%"
                                        minW={0}
                                        px="1"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={(stop.t * 100).toFixed(1)}
                                        onChange={event => {
                                            const value = Number(event.target.value);
                                            if (!Number.isFinite(value)) return;
                                            // The UI shows percentages, while the model stores normalized distance.
                                            updateWidthStop(stop.id, {
                                                t: clamp(value / 100, 0, 1),
                                            });
                                        }}
                                    />
                                </Td>
                                <Td px="1">
                                    <Input
                                        size="sm"
                                        type="number"
                                        w="100%"
                                        minW={0}
                                        px="1"
                                        min={0.5}
                                        step={0.5}
                                        value={stop.width.toString()}
                                        onChange={event => {
                                            const value = Number(event.target.value);
                                            if (!Number.isFinite(value) || value <= 0) return;
                                            // Keep user-entered widths above the renderer's minimum outline width.
                                            updateWidthStop(stop.id, { width: Math.max(0.5, value) });
                                        }}
                                    />
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            ),
            helper: t('panel.details.lines.freeform.baseWidthHint'),
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.lines.freeform.smoothing'),
            value: safeAttrs.smoothing,
            min: 0,
            max: 1,
            step: 0.05,
            onChange: val => updateAttrs({ smoothing: Number(val) }),
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.lines.freeform.startCap'),
            value: safeAttrs.startCap,
            options: {
                round: t('panel.details.lines.freeform.round'),
                flat: t('panel.details.lines.freeform.flat'),
            },
            onChange: val => updateAttrs({ startCap: val as FreeformPathAttributes['startCap'] }),
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.lines.freeform.endCap'),
            value: safeAttrs.endCap,
            options: {
                round: t('panel.details.lines.freeform.round'),
                flat: t('panel.details.lines.freeform.flat'),
                arrow: t('panel.details.lines.freeform.arrow'),
            },
            onChange: val => updateAttrs({ endCap: val as FreeformPathAttributes['endCap'] }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.freeform.arrowLength'),
            value: (safeAttrs.arrow?.length ?? defaultFreeformPathAttributes.arrow!.length).toString(),
            variant: 'number',
            onChange: val =>
                updateAttrs({
                    arrow: { ...safeAttrs.arrow!, length: Math.max(0.5, Number(val) || 0.5) },
                }),
            isDisabled: safeAttrs.endCap !== 'arrow',
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.freeform.arrowWidth'),
            value: (safeAttrs.arrow?.width ?? defaultFreeformPathAttributes.arrow!.width).toString(),
            variant: 'number',
            onChange: val =>
                updateAttrs({
                    arrow: { ...safeAttrs.arrow!, width: Math.max(0.5, Number(val) || 0.5) },
                }),
            isDisabled: safeAttrs.endCap !== 'arrow',
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const freeformIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M5,17 C9,6 13,19 19,7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
);

/**
 * Register freeform as a line path type.
 *
 * `overlayComponent` opts into an editable SVG overlay for selected lines, and `drawingBehavior` opts into a custom
 * gesture that records a sampled stroke instead of deriving the path solely from two endpoints.
 */
const freeformPath: LinePath<FreeformPathAttributes> = {
    generatePath: generateFreeformPath,
    overlayComponent: FreeformLineOverlay,
    drawingBehavior: freeformDrawingBehavior,
    icon: freeformIcon,
    defaultAttrs: defaultFreeformPathAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.freeform.displayName',
        supportsReconcile: false,
    },
};

export default freeformPath;
