import { Box, HStack, IconButton } from '@chakra-ui/react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdContentCopy, MdDelete } from 'react-icons/md';

import { RmgCard, RmgDebouncedInput, RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { Theme } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import { ColorField } from '../../panels/details/color-field';

const Polygon = (props: NodeComponentProps<PolygonAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        dots = defaultPolygonAttributes.dots,
        stroke = defaultPolygonAttributes.stroke,
        strokeWidth = defaultPolygonAttributes.strokeWidth,
        fill = defaultPolygonAttributes.fill,
    } = attrs ?? defaultPolygonAttributes;

    const points = dots.map(p => p.join(',')).join(' ');

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    return React.useMemo(
        () => (
            <g
                id={id}
                transform={`translate(${x}, ${y})`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                <polygon points={points} fill={fill[2]} stroke={stroke[2]} strokeWidth={strokeWidth} />
            </g>
        ),
        [id, x, y, points, stroke, strokeWidth, fill, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * Polygon specific props.
 */
export interface PolygonAttributes {
    dots: [number, number][];
    stroke: Theme;
    strokeWidth: number;
    fill: Theme;
}

const defaultPolygonAttributes: PolygonAttributes = {
    dots: [
        [-10, -10],
        [10, -10],
        [10, 10],
        [-10, 10],
    ],
    stroke: [CityCode.Shanghai, 'jsr', '#000000', MonoColour.white],
    strokeWidth: 1,
    fill: [CityCode.Shanghai, 'white', '#fff', MonoColour.black],
};

const PolygonAttrs = () => {
    const dispatch = useRootDispatch();
    const { t } = useTranslation();

    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);

    let attrs: PolygonAttributes | undefined;
    if (selected.length === 1 && window.graph.hasNode(selectedFirst)) {
        const type = window.graph.getNodeAttribute(selectedFirst, 'type');
        if (type === MiscNodeType.Polygon) {
            attrs = structuredClone(window.graph.getNodeAttribute(selectedFirst, type));
        }
    }

    const updateAndRefresh = React.useCallback(
        (selectedFirst?: string, attrs?: PolygonAttributes) => {
            if (!selectedFirst || !attrs) return;
            const type = window.graph.getNodeAttribute(selectedFirst, 'type');
            if (type !== MiscNodeType.Polygon) return;
            window.graph.mergeNodeAttributes(selectedFirst, { [type]: attrs });
            dispatch(setRefreshNodes());
            dispatch(saveGraph(window.graph.export()));
        },
        [dispatch, setRefreshNodes, saveGraph]
    );

    const handleStrokeWidthChange = (val: string) => {
        if (!isFinite(val as any)) return;
        attrs!.strokeWidth = Number(val);
        updateAndRefresh(selectedFirst, attrs);
    };

    const onAdd = (dot: [number, number]) => {
        attrs?.dots.push(dot);
        updateAndRefresh(selectedFirst, attrs);
    };
    const onUpdate = (i: number, dot: [number, number]) => {
        attrs!.dots[i] = dot;
        updateAndRefresh(selectedFirst, attrs);
    };
    const onDelete = (i: number) => {
        attrs!.dots = attrs!.dots.filter((_, idx) => i !== idx);
        updateAndRefresh(selectedFirst, attrs);
    };

    const dotsFields: RmgFieldsField[][] | undefined = attrs?.dots.map((dot, i) => [
        {
            type: 'input',
            label: t('panel.details.nodes.polygon.x'),
            value: dot[0].toString(),
            minW: '40px',
            onChange: val => onUpdate(i, [Number(val), dot[1]]),
        },
        {
            type: 'input',
            label: t('panel.details.nodes.polygon.y'),
            value: dot[1].toString(),
            minW: '40px',
            onChange: val => onUpdate(i, [dot[0], Number(val)]),
        },
    ]);

    return (
        <>
            <RmgLabel label={t('panel.details.nodes.polygon.fill')}>
                <ColorField type={MiscNodeType.Polygon} colorKey="fill" defaultTheme={defaultPolygonAttributes.fill} />
            </RmgLabel>
            <RmgLabel label={t('panel.details.nodes.polygon.strokeWidth')}>
                <RmgDebouncedInput
                    value={attrs?.strokeWidth.toString()}
                    onDebouncedChange={val => handleStrokeWidthChange(val)}
                    delay={1000}
                />
            </RmgLabel>
            <RmgLabel label={t('panel.details.nodes.polygon.stroke')}>
                <ColorField
                    type={MiscNodeType.Polygon}
                    colorKey="stroke"
                    defaultTheme={defaultPolygonAttributes.stroke}
                />
            </RmgLabel>

            <RmgLabel label={t('panel.details.nodes.polygon.dots')}>
                <RmgCard direction="column">
                    {dotsFields?.map((fields, i) => (
                        <HStack key={i} spacing={0.5}>
                            <RmgFields fields={fields} noLabel={i !== 0} />

                            {i === dotsFields.length - 1 ? (
                                <IconButton
                                    size="sm"
                                    variant="ghost"
                                    aria-label={t('panel.details.nodes.polygon.duplicate')}
                                    onClick={() => onAdd(attrs?.dots.at(-1) ?? [0, 0])} // duplicate last leg
                                    icon={<MdContentCopy />}
                                />
                            ) : (
                                <Box minW={8} />
                            )}

                            {i >= 3 ? (
                                <IconButton
                                    size="sm"
                                    variant="ghost"
                                    aria-label={t('panel.details.nodes.polygon.remove')}
                                    onClick={() => onDelete(i)}
                                    icon={<MdDelete />}
                                />
                            ) : (
                                <Box minW={8} />
                            )}
                        </HStack>
                    ))}
                </RmgCard>
            </RmgLabel>
        </>
    );
};

const PolygonIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <polygon transform="translate(12,12)rotate(20)" points="0,-5.19 -6,6 6,6" fill="currentColor" />
    </svg>
);

const polygon: Node<PolygonAttributes> = {
    component: Polygon,
    icon: PolygonIcon,
    defaultAttrs: defaultPolygonAttributes,
    fields: [],
    attrsComponent: PolygonAttrs,
    metadata: {
        displayName: 'panel.details.nodes.polygon.displayName',
        tags: [],
    },
};

export default polygon;
