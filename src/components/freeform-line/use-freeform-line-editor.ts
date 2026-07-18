import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, Id, LineId, NodeId, RuntimeMode, StnId, Theme, getLinePathAndStyle } from '../../constants/constants';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { MiscNodeType } from '../../constants/nodes';
import { PathPoint, makePoint } from '../../constants/path';
import { StationType } from '../../constants/stations';
import { useRootDispatch } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import {
    refreshEdgesThunk,
    refreshNodesThunk,
    setActive,
    setMode,
    setSelected,
} from '../../redux/runtime/runtime-slice';
import { checkAndChangeStationIntType } from '../../util/change-types';
import { createFreeformPathAttributes, generateFreeformAreaPathD } from '../../util/freeform-line';
import { pointerPosToSVGCoord } from '../../util/helpers';
import { lineStyles } from '../svgs/lines/lines';

interface UseFreeformLineEditorOptions {
    mode: RuntimeMode;
    svgViewBoxZoom: number;
    svgViewBoxMin: { x: number; y: number };
    keepLastPath: boolean;
    theme: Theme;
    autoChangeStationType: boolean;
    isAllowProjectTelemetry: boolean;
}

interface FreeformDrawing {
    source: NodeId;
    points: PathPoint[];
}

const connectableNodesType = [
    ...Object.values(StationType),
    MiscNodeType.Virtual,
    MiscNodeType.Master,
    MiscNodeType.Fill,
    MiscNodeType.LondonArrow,
    MiscNodeType.ChongqingRTNumLineBadge2021,
    MiscNodeType.ChongqingRTTextLineBadge2021,
    MiscNodeType.ChengduRTLineBadge,
    MiscNodeType.GzmtrLineBadge,
];

const connectablePrefixes = ['stn_core_', 'virtual_circle_', 'misc_node_connectable_'];

export const useFreeformLineEditor = (options: UseFreeformLineEditorOptions) => {
    const { mode, svgViewBoxZoom, svgViewBoxMin, keepLastPath, theme, autoChangeStationType, isAllowProjectTelemetry } =
        options;
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const [drawing, setDrawing] = React.useState<FreeformDrawing | undefined>();
    const drawingRef = React.useRef<FreeformDrawing | undefined>(undefined);
    const setDrawingState = React.useCallback((nextDrawing: FreeformDrawing | undefined) => {
        drawingRef.current = nextDrawing;
        setDrawing(nextDrawing);
    }, []);

    const getSvgPointerPosition = useEvent((event: React.MouseEvent<SVGElement | SVGSVGElement>) => {
        const canvas = document.getElementById('canvas');
        const bbox = canvas?.getBoundingClientRect();
        if (!bbox) return makePoint(0, 0);
        return pointerPosToSVGCoord(event.clientX - bbox.left, event.clientY - bbox.top, svgViewBoxZoom, svgViewBoxMin);
    });

    const getNodePoint = (node: NodeId) => {
        const attrs = graph.current.getNodeAttributes(node);
        return makePoint(attrs.x, attrs.y);
    };

    const isConnectableNode = (node: NodeId | undefined) => {
        if (!node || !graph.current.hasNode(node)) return false;
        return connectableNodesType.includes(graph.current.getNodeAttribute(node, 'type'));
    };

    const getNodeFromPointer = (event: React.PointerEvent<SVGElement>): NodeId | undefined => {
        const elems = document.elementsFromPoint(event.clientX, event.clientY);
        for (const elem of elems) {
            const id = elem.attributes?.getNamedItem('id')?.value;
            const matchedPrefix = connectablePrefixes.find(prefix => id?.startsWith(prefix));
            if (matchedPrefix) return id!.slice(matchedPrefix.length) as NodeId;
        }
        return undefined;
    };

    const isFreeformLineMode = () => getLinePathAndStyle(mode).path === LinePathType.Freeform;

    const handleNodePointerDown = useEvent((node: NodeId, event: React.PointerEvent<SVGElement>): boolean => {
        if (!isFreeformLineMode() || event.button !== 0 || !isConnectableNode(node)) return false;

        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = getSvgPointerPosition(event);
        const sourcePoint = getNodePoint(node);
        setDrawingState({ source: node, points: [sourcePoint, point] });
        dispatch(setActive(node));
        dispatch(setSelected(new Set<Id>([node])));
        return true;
    });

    const handleNodePointerMove = useEvent((_node: NodeId, event: React.PointerEvent<SVGElement>): boolean => {
        const currentDrawing = drawingRef.current;
        if (!currentDrawing || !isFreeformLineMode()) return false;

        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = getSvgPointerPosition(event);
        const previous = currentDrawing.points[currentDrawing.points.length - 1];
        if (!previous || Math.hypot(previous.x - point.x, previous.y - point.y) >= 1) {
            setDrawingState({ ...currentDrawing, points: [...currentDrawing.points, point] });
        }
        return true;
    });

    const handleNodePointerUp = useEvent((_node: NodeId, event: React.PointerEvent<SVGElement>): boolean => {
        const currentDrawing = drawingRef.current;
        if (!currentDrawing || !isFreeformLineMode()) return false;

        event.stopPropagation();
        event.preventDefault();
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // no-op: capture may have been released by the browser when the pointer was cancelled.
        }

        const source = currentDrawing.source;
        const target = getNodeFromPointer(event);
        const pointer = getSvgPointerPosition(event);
        setDrawingState(undefined);
        dispatch(setActive(undefined));
        if (!keepLastPath) dispatch(setMode('free'));

        if (!target || source === target || !isConnectableNode(target)) return true;

        const sourcePoint = getNodePoint(source);
        const targetPoint = getNodePoint(target);
        const attrs = createFreeformPathAttributes([...currentDrawing.points, pointer], sourcePoint, targetPoint, () =>
            nanoid(10)
        );
        if (!attrs) return true;

        const newLineId: LineId = `line_${nanoid(10)}`;
        const styleAttrs = structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs);
        if ('color' in styleAttrs) styleAttrs.color = theme;

        graph.current.addDirectedEdgeWithKey(newLineId, source, target, {
            visible: true,
            zIndex: 0,
            type: LinePathType.Freeform,
            [LinePathType.Freeform]: attrs,
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: styleAttrs,
            reconcileId: '',
            parallelIndex: -1,
        });

        let nodesChanged = false;
        if (autoChangeStationType && source.startsWith('stn')) {
            checkAndChangeStationIntType(graph.current, source as StnId);
            nodesChanged = true;
        }
        if (autoChangeStationType && target.startsWith('stn')) {
            checkAndChangeStationIntType(graph.current, target as StnId);
            nodesChanged = true;
        }

        dispatch(setSelected(new Set([newLineId])));
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type: LinePathType.Freeform });
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
        if (nodesChanged) dispatch(refreshNodesThunk());
        return true;
    });

    const drawingPreviewAreaPathD = React.useMemo(() => {
        if (!drawing || drawing.points.length < 2) return '';
        const sourcePoint = getNodePoint(drawing.source);
        const targetPoint = drawing.points[drawing.points.length - 1];
        let id = 0;
        const attrs = createFreeformPathAttributes(drawing.points, sourcePoint, targetPoint, () => `preview_${id++}`, {
            minPointDistance: 1,
            simplifyTolerance: 0.5,
        });
        return attrs
            ? generateFreeformAreaPathD(
                  attrs,
                  makePoint(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y),
                  sourcePoint
              )
            : '';
    }, [drawing]);

    return {
        drawingPreviewAreaPathD,
        handleNodePointerDown,
        handleNodePointerMove,
        handleNodePointerUp,
    };
};
