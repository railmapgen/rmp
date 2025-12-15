import { Button, Checkbox, Text, VStack } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AttrsProps,
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    NodeId,
} from '../../../constants/constants';
import { LinePathType, LineStyleType, Path } from '../../../constants/lines';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import { getDynamicContrastColor } from '../../../util/color';
import { findShortestClosedPath } from '../../../util/graph-find-shortest-closed-path';
import { NonSimpleLinePathAttributes } from '../../../util/parallel';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { linePaths } from '../lines/lines';

/**
 * Generate the combined SVG path string for the closed loop with detailed logging.
 */
const generateClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[],
    edges: LineId[]
): Path | undefined => {
    if (nodes.length !== edges.length + 1 || nodes.length < 3) return undefined;

    let pathString = '';

    for (let i = 0; i < edges.length; i++) {
        const sourceNodeId = nodes[i];
        const targetNodeId = nodes[i + 1];
        const edgeId = edges[i];

        const sourceAttrs = graph.getNodeAttributes(sourceNodeId);
        const targetAttrs = graph.getNodeAttributes(targetNodeId);
        const edgeAttrs = graph.getEdgeAttributes(edgeId);
        const pathType = edgeAttrs.type;
        const initialPathAttr = edgeAttrs[pathType];

        const x1 = sourceAttrs.x,
            y1 = sourceAttrs.y,
            x2 = targetAttrs.x,
            y2 = targetAttrs.y;
        const finalPathAttr = structuredClone(initialPathAttr);

        const isReversed = graph.source(edgeId) !== sourceNodeId;

        if (isReversed) {
            if ((finalPathAttr as any)?.startFrom) {
                (finalPathAttr as NonSimpleLinePathAttributes).startFrom =
                    (finalPathAttr as NonSimpleLinePathAttributes).startFrom === 'from' ? 'to' : 'from';
            }
        }

        let segment: string =
            linePaths[pathType]?.generatePath(x1, x2, y1, y2, finalPathAttr as any) || `M ${x1} ${y1} L ${x2} ${y2}`;

        if (i > 0) {
            const parts = segment.split(' ');
            // we slice from the 4th element (index 3) to remove the initial move command and its coordinates.
            segment = parts.slice(3).join(' ');
        }

        pathString += (i > 0 ? ' ' : '') + segment;
    }

    const finalFullPath = pathString + ' Z';
    return finalFullPath as Path;
};

const Fill = (props: NodeComponentProps<FillAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        color = defaultFillAttributes.color,
        opacity = defaultFillAttributes.opacity,
        selectedPatterns = defaultFillAttributes.selectedPatterns,
    } = attrs ?? defaultFillAttributes;

    const { refresh } = useRootSelector(state => state.runtime);
    const graph = window.graph!;

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

    const closedPath = React.useMemo(() => findShortestClosedPath(graph, id), [graph, id, refresh]);
    const fillPath = React.useMemo(() => {
        if (!closedPath) return undefined;
        return generateClosedPath(graph, closedPath.nodes, closedPath.edges);
    }, [closedPath]);

    const pattern = { width: 60, height: 60 };
    const patternColor = getDynamicContrastColor(color[2], opacity);
    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {fillPath && (
                <g transform={`translate(${-x}, ${-y})`}>
                    <defs>
                        <pattern
                            id={`trees_${id}`}
                            patternUnits="userSpaceOnUse"
                            width={pattern.width}
                            height={pattern.height}
                            stroke={patternColor}
                            strokeWidth="0.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path
                                transform="translate(0,0)"
                                d="M10 20 L10 14 L4 16 L10 8 L4 10 L10 2 L16 10 L10 8 L16 16 L10 14"
                                fill="none"
                            />
                        </pattern>
                        <pattern
                            id={`water_${id}`}
                            patternUnits="userSpaceOnUse"
                            width={pattern.width}
                            height={pattern.height}
                            stroke={patternColor}
                            strokeWidth="0.8"
                            strokeLinecap="round"
                        >
                            <path transform="translate(20,0)" d="M2 4 Q7 -2 12 4 T18 4" fill="none" />
                            <path transform="translate(20,0)" d="M2 10 Q7 4 12 10 T18 10" fill="none" />
                            <path transform="translate(20,0)" d="M2 16 Q7 10 12 16 T18 16" fill="none" />
                        </pattern>
                    </defs>
                    <path d={fillPath} fill={color[2]} fillOpacity={opacity} stroke="none" pointerEvents="none" />
                    {selectedPatterns.map(patternId => (
                        <path
                            key={patternId}
                            d={fillPath}
                            fill={`url(#${patternId}_${id})`}
                            fillOpacity={opacity}
                            stroke="none"
                            pointerEvents="none"
                        />
                    ))}
                </g>
            )}
            <g transform="rotate(45)" className="removeMe">
                <circle r="5" fill={color[2]} stroke="#000" />
                <line x1="-5" y1="0" x2="5" y2="0" stroke="black" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="black" />
                <circle
                    id={`misc_node_connectable_${id}`}
                    r="5"
                    fill="rgb(255, 255, 255, 0)"
                    stroke="rgb(0, 0, 0, 0)"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        </g>
    );
};

export interface FillAttributes extends ColorAttribute {
    opacity: number;
    selectedPatterns: string[];
}

export const defaultFillAttributes: FillAttributes = {
    color: [CityCode.Shanghai, 'fill', '#FF0000', MonoColour.white],
    opacity: 0.5,
    selectedPatterns: ['logo'],
};

const fillAttrsComponent = (props: AttrsProps<FillAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const dispatch = useRootDispatch();
    const {
        preference: { autoParallel },
    } = useRootSelector(state => state.app);
    const { refresh, theme } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();

    const graph = window.graph!;
    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch]);

    const hasClosedPath = React.useMemo(() => !!findShortestClosedPath(graph, id as MiscNodeId), [graph, id, refresh]);

    const handleCreateShape = (shape: 'square' | 'triangle' | 'circle') => {
        const currentNodeAttrs = graph.getNodeAttributes(id);
        const { x, y } = currentNodeAttrs;
        const size = 200; // The size of the shape to create

        const nodesToAdd: { id: MiscNodeId; attrs: NodeAttributes }[] = [];
        const nodeIds = [id as MiscNodeId];
        const defaultVirtualAttributes = {
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
            visible: true,
            zIndex: 0,
        };

        if (shape === 'square') {
            const newNodesCoords = [
                { x: x + size, y: y },
                { x: x + size, y: y + size },
                { x: x, y: y + size },
            ];
            newNodesCoords.forEach(coords => {
                const newNodeId = `misc_node_${nanoid(10)}` as MiscNodeId;
                nodeIds.push(newNodeId);
                nodesToAdd.push({
                    id: newNodeId,
                    attrs: { ...coords, ...defaultVirtualAttributes },
                });
            });
        } else if (shape === 'triangle') {
            const newNodesCoords = [
                { x: x + size, y: y },
                { x: x + size / 2, y: y + size / 2 },
            ];
            newNodesCoords.forEach(coords => {
                const newNodeId = `misc_node_${nanoid(10)}` as MiscNodeId;
                nodeIds.push(newNodeId);
                nodesToAdd.push({
                    id: newNodeId,
                    attrs: { ...coords, ...defaultVirtualAttributes },
                });
            });
        } else if (shape === 'circle') {
            const newNodesCoords = [
                { x: x + size / 2, y: y - size / 2 },
                { x: x + size, y: y },
                { x: x + size / 2, y: y + size / 2 },
            ];
            newNodesCoords.forEach(coords => {
                const newNodeId = `misc_node_${nanoid(10)}` as MiscNodeId;
                nodeIds.push(newNodeId);
                nodesToAdd.push({
                    id: newNodeId,
                    attrs: { ...coords, ...defaultVirtualAttributes },
                });
            });
        }

        // Dispatch actions to add nodes
        nodesToAdd.forEach(({ id, attrs }) => {
            graph.addNode(id, attrs);
        });

        // Dispatch actions to add edges to connect the nodes in a loop
        for (let i = 0; i < nodeIds.length; i++) {
            const source = nodeIds[i];
            const target = nodeIds[(i + 1) % nodeIds.length]; // Wrap around to close the loop
            const newLineId: LineId = `line_${nanoid(10)}`;
            const type = shape === 'triangle' ? LinePathType.Diagonal : LinePathType.Perpendicular;
            const attrs = structuredClone(linePaths[type].defaultAttrs); // deep copy to prevent mutual reference
            if (shape === 'circle') {
                if (i % 2 === 0) attrs.startFrom = 'to';
                attrs.roundCornerFactor = size;
            }
            graph.addDirectedEdgeWithKey(newLineId, source, target, {
                visible: true,
                zIndex: 0,
                type,
                [type]: attrs,
                style: LineStyleType.SingleColor,
                [LineStyleType.SingleColor]: { color: theme },
                reconcileId: '',
                parallelIndex: autoParallel ? 0 : -1,
            });
        }

        refreshAndSave();
    };

    if (!hasClosedPath) {
        return (
            <VStack spacing={1} align="stretch">
                <Text fontSize="sm" color="gray.500">
                    {t('panel.details.nodes.fill.noClosedPath')}
                </Text>
                <Button width="50%" onClick={() => handleCreateShape('square')}>
                    {t('panel.details.nodes.fill.createSquare')}
                </Button>
                <Button width="50%" onClick={() => handleCreateShape('triangle')}>
                    {t('panel.details.nodes.fill.createTriangle')}
                </Button>
                <Button width="50%" onClick={() => handleCreateShape('circle')}>
                    {t('panel.details.nodes.fill.createCircle')}
                </Button>
            </VStack>
        );
    }

    const handlePatternChange = (patternId: string, isChecked: boolean) => {
        const currentPatterns = attrs.selectedPatterns ?? [];
        const newPatterns = isChecked ? [...currentPatterns, patternId] : currentPatterns.filter(p => p !== patternId);
        handleAttrsUpdate(id, { ...attrs, selectedPatterns: newPatterns });
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.fill.opacity'),
            value: (attrs.opacity ?? defaultFillAttributes.opacity).toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
            onChange: val => {
                handleAttrsUpdate(id, { ...attrs, opacity: Number(val) });
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.Fill} defaultTheme={defaultFillAttributes.color} />,
        },
        {
            type: 'custom',
            label: t('panel.details.nodes.fill.patterns'),
            component: (
                <VStack alignItems="flex-start">
                    <Checkbox
                        isChecked={(attrs.selectedPatterns ?? []).includes('trees')}
                        onChange={e => handlePatternChange('trees', e.target.checked)}
                    >
                        {t('panel.details.nodes.fill.trees')}
                    </Checkbox>
                    <Checkbox
                        isChecked={(attrs.selectedPatterns ?? []).includes('water')}
                        onChange={e => handlePatternChange('water', e.target.checked)}
                    >
                        {t('panel.details.nodes.fill.water')}
                    </Checkbox>
                </VStack>
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const fillIcon = (
    <svg viewBox="-2 -4 28 26" height="40" width="40" focusable={false}>
        <path
            d="M16.56 8.94 7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 0 0 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10 10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
        />
    </svg>
);

const fill: Node<FillAttributes> = {
    component: Fill,
    icon: fillIcon,
    defaultAttrs: defaultFillAttributes,
    attrsComponent: fillAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.fill.displayName',
        tags: [],
    },
};

export default fill;
