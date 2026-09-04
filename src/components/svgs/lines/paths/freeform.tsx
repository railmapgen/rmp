import { Alert, AlertDescription, AlertIcon, Input, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { LinePath, LinePathAttrsProps, LinePathDrawingBehavior } from '../../../../constants/lines';
import { EmptyOpenPath, OpenPath, makeEmptyOpenPath, makePoint } from '../../../../constants/path';
import { createFreeformPathAttributes, makeFreeformOpenPath } from './freeform-geometry';
import {
    defaultFreeformPathAttributes,
    normalizeFreeformPathAttributes,
    resolveFreeformPathAttributes,
} from './freeform-model';
import type { FreeformPathAttributes } from './freeform-model';
import { FreeformLineOverlay } from './freeform-overlay';

/**
 * Generate the open-path representation for a freeform edge.
 *
 * The generator resolves persisted chord-relative points against the current graph endpoints before delegating to
 * SVG-unit geometry.
 */
const generateFreeformPath = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: FreeformPathAttributes = defaultFreeformPathAttributes
): OpenPath | EmptyOpenPath => {
    const targetRelative = makePoint(x2 - x1, y2 - y1);
    const safeAttrs = resolveFreeformPathAttributes(attrs, targetRelative);
    return safeAttrs ? makeFreeformOpenPath(safeAttrs, makePoint(x1, y1)) : makeEmptyOpenPath();
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
            /** Produce transient OpenPath geometry while the user is still choosing the target. */
            getPreviewPath: pointer => {
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
                return attrs ? generateFreeformPath(source.x, pointer.x, source.y, pointer.y, attrs) : undefined;
            },
        };
    },
};

/** Render Freeform controls while keeping the dormant outline settings read-only. */
const FreeformAttrsComponent = (props: LinePathAttrsProps<FreeformPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const safeAttrs = normalizeFreeformPathAttributes(attrs) ?? defaultFreeformPathAttributes;

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: '',
            component: (
                <Alert status="info" fontSize="xs" borderRadius="md" py={1.5} px={2}>
                    <AlertIcon boxSize={4} />
                    <AlertDescription whiteSpace="normal" lineHeight="short">
                        {t('panel.details.lines.freeform.controlPointHint')}
                    </AlertDescription>
                </Alert>
            ),
            minW: 'full',
        },
        {
            type: 'custom',
            label: '',
            component: (
                <Alert status="warning" fontSize="xs" borderRadius="md" py={1.5} px={2}>
                    <AlertIcon boxSize={4} />
                    <AlertDescription whiteSpace="normal" lineHeight="short">
                        {t('panel.details.lines.freeform.outlineSettingsUnavailable')}
                    </AlertDescription>
                </Alert>
            ),
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.lines.freeform.smoothing'),
            value: safeAttrs.smoothing,
            min: 0,
            max: 1,
            step: 0.05,
            onChange: val => handleAttrsUpdate(id, { ...safeAttrs, smoothing: Number(val) }),
            minW: 'full',
        },
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
                                        value={(stop.t * 100).toFixed(1)}
                                        isDisabled
                                    />
                                </Td>
                                <Td px="1">
                                    <Input
                                        size="sm"
                                        type="number"
                                        w="100%"
                                        minW={0}
                                        px="1"
                                        value={stop.width.toString()}
                                        isDisabled
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
            type: 'select',
            label: t('panel.details.lines.freeform.startCap'),
            value: safeAttrs.startCap,
            options: {
                round: t('panel.details.lines.freeform.round'),
                flat: t('panel.details.lines.freeform.flat'),
            },
            isDisabled: true,
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
            isDisabled: true,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.freeform.arrowLength'),
            value: (safeAttrs.arrow?.length ?? defaultFreeformPathAttributes.arrow!.length).toString(),
            variant: 'number',
            isDisabled: true,
            hidden: safeAttrs.endCap !== 'arrow',
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.freeform.arrowWidth'),
            value: (safeAttrs.arrow?.width ?? defaultFreeformPathAttributes.arrow!.width).toString(),
            variant: 'number',
            isDisabled: true,
            hidden: safeAttrs.endCap !== 'arrow',
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
 * Register Freeform with a custom drawing gesture and a control-point editing overlay.
 *
 * The dormant outline attributes remain persisted, but the registered generator always returns an OpenPath.
 */
const freeformPath: LinePath<FreeformPathAttributes> = {
    generatePath: generateFreeformPath,
    overlayComponent: FreeformLineOverlay,
    drawingBehavior: freeformDrawingBehavior,
    icon: freeformIcon,
    defaultAttrs: defaultFreeformPathAttributes,
    attrsComponent: FreeformAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.freeform.displayName',
        supportsReconcile: false,
    },
};

export default freeformPath;
