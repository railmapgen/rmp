import { Button, Divider, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { RmgCard, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { nanoid } from 'nanoid';
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

const Generic = (props: LineStyleComponentProps<GenericAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { layers } = styleAttrs;

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
            {layers.map(({ id, color, width, opacity, linecap, dash, gap }) => (
                <path
                    key={id}
                    d={path}
                    fill="none"
                    stroke={color[2]}
                    strokeWidth={width}
                    strokeOpacity={opacity}
                    strokeLinecap={linecap}
                    strokeDasharray={dash > 0 || gap > 0 ? `${dash} ${gap}` : undefined}
                />
            ))}
        </g>
    );
};

type GenericLineCap = 'butt' | 'round' | 'square';

export interface GenericLayer {
    id: string;
    color: Theme;
    width: number;
    opacity: number;
    linecap: GenericLineCap;
    dash: number;
    gap: number;
}

/**
 * Generic specific props.
 */
export interface GenericAttributes extends LinePathAttributes {
    layers: GenericLayer[];
}

const defaultGenericLayer: Omit<GenericLayer, 'id'> = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    width: LINE_WIDTH,
    opacity: 1,
    linecap: 'butt',
    dash: 0,
    gap: 0,
};

const makeGenericLayerId = () => nanoid(10);

const makeDefaultGenericLayer = (theme: Theme = defaultGenericLayer.color): GenericLayer => ({
    id: makeGenericLayerId(),
    ...structuredClone(defaultGenericLayer),
    color: structuredClone(theme),
});

const defaultGenericAttributes: GenericAttributes = {
    layers: [makeDefaultGenericLayer()],
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

    const handleDashChange = (value: number) => {
        onUpdate(index, {
            ...layer,
            dash: value,
            gap: layer.gap === 0 ? value : layer.gap,
        });
    };

    const handleGapChange = (value: number) => {
        onUpdate(index, {
            ...layer,
            dash: layer.dash === 0 ? value : layer.dash,
            gap: value,
        });
    };

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
            type: 'slider',
            label: t('panel.details.lines.generic.opacity'),
            value: layer.opacity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: val => onUpdate(index, { ...layer, opacity: Number(val) }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.dash'),
            variant: 'number',
            value: layer.dash.toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) >= 0,
            onChange: val => handleDashChange(Number(val)),
        },
        {
            type: 'input',
            label: t('panel.details.lines.generic.gap'),
            variant: 'number',
            value: layer.gap.toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) >= 0,
            onChange: val => handleGapChange(Number(val)),
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
    const { layers } = attrs;

    const handleAdd = () => {
        handleAttrsUpdate(id, { layers: [...layers, makeDefaultGenericLayer(runtimeTheme)] });
    };

    const handleUpdate = (index: number, layer: GenericLayer) => {
        const nextLayers = structuredClone(layers);
        nextLayers[index] = structuredClone(layer);
        handleAttrsUpdate(id, { layers: nextLayers });
    };

    const handleCopy = (index: number) => {
        const nextLayers = structuredClone(layers);
        nextLayers.splice(index + 1, 0, { ...structuredClone(nextLayers[index]), id: makeGenericLayerId() });
        handleAttrsUpdate(id, { layers: nextLayers });
    };

    const handleDelete = (index: number) => {
        handleAttrsUpdate(id, { layers: layers.filter((_, itemIndex) => itemIndex !== index) });
    };

    const handleMove = (fromIndex: number, toIndex: number) => {
        const nextLayers = structuredClone(layers);
        const [movedLayer] = nextLayers.splice(fromIndex, 1);
        nextLayers.splice(toIndex, 0, movedLayer);
        handleAttrsUpdate(id, { layers: nextLayers });
    };

    return (
        <VStack align="stretch" ml="1">
            <Text fontSize="xs" fontWeight="medium">
                {t('panel.details.lines.generic.layers')}
            </Text>

            <RmgCard direction="column">
                {layers.map((layer, index) => (
                    <GenericLayerItem
                        key={layer.id}
                        index={index}
                        total={layers.length}
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
            LinePathType.RayGuided,
            LinePathType.Simple,
        ],
    },
    // isPro: true,
};

export default generic;
