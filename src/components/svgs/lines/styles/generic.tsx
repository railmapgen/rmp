import { Button, Divider, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdArrowDownward, MdArrowUpward, MdContentCopy, MdDelete } from 'react-icons/md';
import { AttrsProps, CityCode, Theme } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';
import { useRootSelector } from '../../../../redux';
import { usePaletteTheme } from '../../../../util/hooks';
import ThemeButton from '../../../panels/theme-button';

type GenericLineCap = 'butt' | 'round' | 'square';

export interface GenericLayer {
    color: Theme;
    width: number;
    opacity: number;
    linecap: GenericLineCap;
    dasharray: string;
}

/**
 * Generic specific props.
 */
export interface GenericAttributes extends LinePathAttributes {
    layers: GenericLayer[];
}

const defaultGenericLayer: GenericLayer = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    width: LINE_WIDTH,
    opacity: 1,
    linecap: 'round',
    dasharray: '',
};

const cloneTheme = (theme: Theme): Theme => [...theme] as Theme;

const cloneGenericLayer = (layer: GenericLayer): GenericLayer => ({
    ...layer,
    color: cloneTheme(layer.color),
});

const makeDefaultGenericLayer = (theme: Theme = defaultGenericLayer.color): GenericLayer => ({
    ...defaultGenericLayer,
    color: cloneTheme(theme),
});

const normalizeGenericAttributes = (attrs?: Partial<GenericAttributes>): GenericAttributes => ({
    layers: attrs?.layers?.length ? attrs.layers.map(cloneGenericLayer) : [makeDefaultGenericLayer()],
});

const defaultGenericAttributes: GenericAttributes = {
    layers: [makeDefaultGenericLayer()],
};

const Generic = (props: LineStyleComponentProps<GenericAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { layers } = normalizeGenericAttributes(styleAttrs);

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
            {layers.map((layer, index) => (
                <path
                    key={`${layer.color.toString()}-${layer.width}-${layer.opacity}-${layer.linecap}-${layer.dasharray}-${index}`}
                    d={path}
                    fill="none"
                    stroke={layer.color[2]}
                    strokeWidth={layer.width}
                    strokeOpacity={layer.opacity}
                    strokeLinecap={layer.linecap}
                    strokeDasharray={layer.dasharray || undefined}
                />
            ))}
        </g>
    );
};

interface GenericLayerItemProps {
    index: number;
    total: number;
    layer: GenericLayer;
    onUpdate: (index: number, layer: GenericLayer) => void;
    onCopy: (index: number) => void;
    onDelete: (index: number) => void;
    onUp: (index: number) => void;
    onDown: (index: number) => void;
}

const GenericLayerItem = (props: GenericLayerItemProps) => {
    const { index, total, layer, onUpdate, onCopy, onDelete, onUp, onDown } = props;
    const { t } = useTranslation();

    const { theme, requestThemeChange } = usePaletteTheme({
        theme: layer.color,
        onThemeApplied: color => onUpdate(index, { ...layer, color }),
    });

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: <ThemeButton theme={theme} onClick={requestThemeChange} />,
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.width'),
            variant: 'number',
            value: layer.width.toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) > 0,
            onChange: val => onUpdate(index, { ...layer, width: Number(val) }),
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.opacity'),
            variant: 'number',
            value: layer.opacity.toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
            onChange: val => onUpdate(index, { ...layer, opacity: Number(val) }),
        },
        {
            type: 'select',
            label: t('panel.details.lines.generic.linecap'),
            value: layer.linecap,
            options: {
                butt: t('panel.details.lines.generic.linecapButt'),
                round: t('panel.details.lines.generic.linecapRound'),
                square: t('panel.details.lines.generic.linecapSquare'),
            },
            onChange: val => onUpdate(index, { ...layer, linecap: val as GenericLineCap }),
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.dasharray'),
            value: layer.dasharray,
            onChange: val => onUpdate(index, { ...layer, dasharray: val }),
        },
    ];

    return (
        <VStack spacing={0.5} align="stretch" data-testid={`generic-layer-${index}`} my={2}>
            <Text fontSize="sm" fontWeight="medium">
                {t('panel.details.lines.generic.layer', { index: index + 1 })}
            </Text>

            <RmgFields fields={fields} />

            <HStack width="100%">
                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.lines.generic.copyLayer')}
                    onClick={() => onCopy(index)}
                    icon={<MdContentCopy />}
                />

                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.lines.generic.moveLayerUp')}
                    onClick={() => onUp(index)}
                    icon={<MdArrowUpward />}
                    isDisabled={index === 0}
                />

                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.lines.generic.moveLayerDown')}
                    onClick={() => onDown(index)}
                    icon={<MdArrowDownward />}
                    isDisabled={index === total - 1}
                />

                <IconButton
                    flex="1"
                    size="sm"
                    variant="ghost"
                    aria-label={t('panel.details.lines.generic.removeLayer')}
                    onClick={() => onDelete(index)}
                    icon={<MdDelete />}
                    isDisabled={total <= 1}
                />
            </HStack>

            {index < total - 1 && <Divider />}
        </VStack>
    );
};

const genericAttrsComponent = (props: AttrsProps<GenericAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const { theme: runtimeTheme } = useRootSelector(state => state.runtime);
    const safeAttrs = normalizeGenericAttributes(attrs);

    const updateLayers = (layers: GenericLayer[]) => {
        handleAttrsUpdate(id, { layers });
    };

    const handleAdd = () => {
        updateLayers([...safeAttrs.layers, makeDefaultGenericLayer(runtimeTheme)]);
    };

    const handleUpdate = (index: number, layer: GenericLayer) => {
        updateLayers(
            safeAttrs.layers.map((item, itemIndex) => (itemIndex === index ? cloneGenericLayer(layer) : item))
        );
    };

    const handleCopy = (index: number) => {
        const layer = safeAttrs.layers[index];
        updateLayers([
            ...safeAttrs.layers.slice(0, index + 1),
            cloneGenericLayer(layer),
            ...safeAttrs.layers.slice(index + 1),
        ]);
    };

    const handleDelete = (index: number) => {
        if (safeAttrs.layers.length <= 1) {
            return;
        }

        updateLayers(safeAttrs.layers.filter((_, itemIndex) => itemIndex !== index));
    };

    const handleMove = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= safeAttrs.layers.length) {
            return;
        }

        const layers = safeAttrs.layers.map(cloneGenericLayer);
        const [movedLayer] = layers.splice(fromIndex, 1);
        layers.splice(toIndex, 0, movedLayer);
        updateLayers(layers);
    };

    return (
        <VStack align="stretch" ml="1">
            <Text fontSize="xs" fontWeight="medium">
                {t('panel.details.lines.generic.layers')}
            </Text>

            <RmgCard direction="column">
                {safeAttrs.layers.map((layer, index) => (
                    <GenericLayerItem
                        key={`${layer.color.toString()}-${layer.width}-${layer.opacity}-${layer.linecap}-${layer.dasharray}-${index}`}
                        index={index}
                        total={safeAttrs.layers.length}
                        layer={layer}
                        onUpdate={handleUpdate}
                        onCopy={handleCopy}
                        onDelete={handleDelete}
                        onUp={itemIndex => handleMove(itemIndex, itemIndex - 1)}
                        onDown={itemIndex => handleMove(itemIndex, itemIndex + 1)}
                    />
                ))}
            </RmgCard>

            <Button size="xs" variant="ghost" alignSelf="flex-end" leftIcon={<MdAdd />} onClick={handleAdd}>
                {t('panel.details.lines.generic.addLayer')}
            </Button>
        </VStack>
    );
};

const generic: LineStyle<GenericAttributes> = {
    component: Generic,
    defaultAttrs: defaultGenericAttributes,
    attrsComponent: genericAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.generic.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Simple,
        ],
    },
};

export default generic;
