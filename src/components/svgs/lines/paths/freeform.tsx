import { Input, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { LinePath, LinePathAttrsProps, LinePathAttributes, PathGenerator } from '../../../../constants/lines';
import { makePoint } from '../../../../constants/path';
import {
    FreeformPathAttributes as BaseFreeformPathAttributes,
    defaultFreeformPathAttributes,
    makeFreeformCenterlinePath,
    normalizeFreeformPathAttributes,
} from '../../../../util/freeform-line';

export interface FreeformPathAttributes extends LinePathAttributes, BaseFreeformPathAttributes {}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const generateFreeformPath: PathGenerator<FreeformPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: FreeformPathAttributes = defaultFreeformPathAttributes
) => {
    const targetRelative = makePoint(x2 - x1, y2 - y1);
    const safeAttrs = normalizeFreeformPathAttributes(attrs, targetRelative) ?? defaultFreeformPathAttributes;
    return makeFreeformCenterlinePath(safeAttrs, targetRelative, makePoint(x1, y1));
};

const attrsComponent = (props: LinePathAttrsProps<FreeformPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const safeAttrs = normalizeFreeformPathAttributes(attrs) ?? defaultFreeformPathAttributes;

    const updateAttrs = (patch: Partial<FreeformPathAttributes>) => {
        handleAttrsUpdate(id, { ...safeAttrs, ...patch });
    };

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
                                            updateWidthStop(stop.id, { t: clamp(value / 100, 0, 1) });
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

const freeformPath: LinePath<FreeformPathAttributes> = {
    generatePath: generateFreeformPath,
    icon: freeformIcon,
    defaultAttrs: defaultFreeformPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.freeform.displayName' },
};

export default freeformPath;
