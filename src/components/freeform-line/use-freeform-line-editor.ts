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
import {
    createFreeformPathAttributes,
    generateFreeformAreaPathD,
    getFreeformControlPoints,
} from '../../util/freeform-line';
import { pointerPosToSVGCoord } from '../../util/helpers';
import { lineStyles } from '../svgs/lines/lines';
import {
    FreeformDrag,
    FreeformEditable,
    FreeformHandleSelection,
    FreeformLineEditorController,
} from './freeform-line-editor-controller';

export interface FreeformOverlayHandlers {
    onOverlayPointerMove: (event: React.PointerEvent<SVGElement>) => void;
    onOverlayPointerUp: (event: React.PointerEvent<SVGElement>) => void;
    onPathPointerDown: (event: React.PointerEvent<SVGElement>) => void;
    onPathDoubleClick: (event: React.MouseEvent<SVGElement>) => void;
    onPointPointerDown: (pointId: string, event: React.PointerEvent<SVGElement>) => void;
    onPointContextMenu: (pointId: string, event: React.MouseEvent<SVGElement>) => void;
    onPointDoubleClick: (pointId: string, event: React.MouseEvent<SVGElement>) => void;
    onWidthPositionPointerDown: (stopId: string, event: React.PointerEvent<SVGElement>) => void;
    onWidthSizePointerDown: (stopId: string, event: React.PointerEvent<SVGElement>) => void;
    onWidthContextMenu: (stopId: string, event: React.MouseEvent<SVGElement>) => void;
}

interface UseFreeformLineEditorOptions {
    selected: Set<Id>;
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
    const {
        selected,
        mode,
        svgViewBoxZoom,
        svgViewBoxMin,
        keepLastPath,
        theme,
        autoChangeStationType,
        isAllowProjectTelemetry,
    } = options;
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const [drawing, setDrawing] = React.useState<FreeformDrawing | undefined>();
    const drawingRef = React.useRef<FreeformDrawing | undefined>(undefined);
    const [freeformDrag, setFreeformDrag] = React.useState<FreeformDrag>();
    const [freeformHandleSelection, setFreeformHandleSelection] = React.useState<FreeformHandleSelection>();

    const controller = React.useMemo(
        () =>
            new FreeformLineEditorController({
                graph: graph.current,
                selected,
                svgViewBoxZoom,
            }),
        [selected, svgViewBoxZoom]
    );
    const selectedFreeform = controller.getSelectedFreeform();
    const handleSize = controller.getHandleSize();

    const setDrawingState = React.useCallback((nextDrawing: FreeformDrawing | undefined) => {
        drawingRef.current = nextDrawing;
        setDrawing(nextDrawing);
    }, []);

    React.useEffect(() => {
        if (freeformHandleSelection && !selected.has(freeformHandleSelection.edgeId)) {
            setFreeformHandleSelection(undefined);
        }
    }, [selected, freeformHandleSelection]);

    const refreshEdges = useEvent((save = false) => {
        if (save) dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    });

    const getSvgPointerPosition = useEvent((event: React.MouseEvent<SVGElement | SVGSVGElement>) => {
        const canvas = document.getElementById('canvas');
        const bbox = canvas?.getBoundingClientRect();
        if (!bbox) return makePoint(0, 0);
        return pointerPosToSVGCoord(event.clientX - bbox.left, event.clientY - bbox.top, svgViewBoxZoom, svgViewBoxMin);
    });

    const getLocalPointerPosition = useEvent((event: React.MouseEvent<SVGElement>, editable: FreeformEditable) => {
        const point = getSvgPointerPosition(event);
        return makePoint(point.x - editable.source.x, point.y - editable.source.y);
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

    const applyDragUpdate = useEvent((updater: () => boolean) => {
        if (updater()) refreshEdges(false);
    });

    const handlePointPointerDown = useEvent((pointId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0 || controller.isEndpointPoint(selectedFreeform, pointId)) {
            event.stopPropagation();
            return;
        }

        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setFreeformHandleSelection({ edgeId: selectedFreeform.edgeId, kind: 'point', id: pointId });
        setFreeformDrag({ edgeId: selectedFreeform.edgeId, kind: 'point', id: pointId });
    });

    const handleWidthPositionPointerDown = useEvent((stopId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0) {
            event.stopPropagation();
            return;
        }

        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setFreeformHandleSelection({ edgeId: selectedFreeform.edgeId, kind: 'width', id: stopId });
        setFreeformDrag({ edgeId: selectedFreeform.edgeId, kind: 'width-position', id: stopId });
    });

    const handleWidthSizePointerDown = useEvent((stopId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0) {
            event.stopPropagation();
            return;
        }

        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setFreeformHandleSelection({ edgeId: selectedFreeform.edgeId, kind: 'width', id: stopId });
        setFreeformDrag({ edgeId: selectedFreeform.edgeId, kind: 'width-size', id: stopId });
    });

    const handlePointContextMenu = useEvent((pointId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (!selectedFreeform) return;

        if (controller.removeControlPoint(selectedFreeform.edgeId, pointId)) {
            refreshEdges(true);
        }
        setFreeformHandleSelection(undefined);
        setFreeformDrag(undefined);
    });

    const handlePointDoubleClick = useEvent((pointId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (!selectedFreeform) return;

        const stopId = nanoid(10);
        if (controller.addWidthStopAtPoint(selectedFreeform.edgeId, pointId, stopId)) {
            refreshEdges(true);
            setFreeformHandleSelection({ edgeId: selectedFreeform.edgeId, kind: 'width', id: stopId });
        }
        setFreeformDrag(undefined);
    });

    const handleWidthContextMenu = useEvent((stopId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (!selectedFreeform) return;

        if (controller.removeWidthStop(selectedFreeform.edgeId, stopId)) {
            refreshEdges(true);
        }
        setFreeformHandleSelection(undefined);
        setFreeformDrag(undefined);
    });

    const handleOverlayPointerMove = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!freeformDrag) return;
        const editable = controller.getFreeformEditableById(freeformDrag.edgeId);
        if (!editable) return;

        event.stopPropagation();
        const localPoint = getLocalPointerPosition(event, editable);
        if (freeformDrag.kind === 'point') {
            applyDragUpdate(() => controller.moveControlPoint(freeformDrag.edgeId, freeformDrag.id, localPoint));
        } else if (freeformDrag.kind === 'width-position') {
            applyDragUpdate(() => controller.moveWidthStop(freeformDrag.edgeId, freeformDrag.id, localPoint));
        } else {
            applyDragUpdate(() => controller.resizeWidthStop(freeformDrag.edgeId, freeformDrag.id, localPoint));
        }
    });

    const handleOverlayPointerUp = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!freeformDrag) return;
        event.stopPropagation();
        try {
            (event.target as Element).releasePointerCapture?.(event.pointerId);
        } catch {
            // no-op: the capturing handle can be replaced during drag re-rendering.
        }
        setFreeformDrag(undefined);
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    });

    const handlePathDoubleClick = useEvent((event: React.MouseEvent<SVGElement>) => {
        if (!selectedFreeform) return;

        event.stopPropagation();
        event.preventDefault();
        const localPoint = getLocalPointerPosition(event, selectedFreeform);
        const pointId = nanoid(10);
        if (controller.insertControlPoint(selectedFreeform.edgeId, localPoint, pointId)) {
            refreshEdges(true);
            setFreeformHandleSelection({ edgeId: selectedFreeform.edgeId, kind: 'point', id: pointId });
        }
    });

    const handleKeyDelete = useEvent((): boolean => {
        if (!freeformHandleSelection) return false;
        const editable = controller.getFreeformEditableById(freeformHandleSelection.edgeId);
        if (!editable) return false;

        const removed =
            freeformHandleSelection.kind === 'point'
                ? controller.removeControlPoint(freeformHandleSelection.edgeId, freeformHandleSelection.id)
                : controller.removeWidthStop(freeformHandleSelection.edgeId, freeformHandleSelection.id);
        if (!removed) return false;

        refreshEdges(true);
        setFreeformHandleSelection(undefined);
        setFreeformDrag(undefined);
        return true;
    });

    React.useEffect(() => {
        const handleNativeKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Delete' && event.key !== 'Backspace') return;
            const target = event.target as HTMLElement | null;
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (!handleKeyDelete()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };

        document.addEventListener('keydown', handleNativeKeyDown, true);
        return () => document.removeEventListener('keydown', handleNativeKeyDown, true);
    }, [handleKeyDelete]);

    return {
        drawingPreviewAreaPathD,
        selectedFreeform,
        handleSize,
        handleSelection: freeformHandleSelection,
        handleNodePointerDown,
        handleNodePointerMove,
        handleNodePointerUp,
        handleKeyDelete,
        overlayHandlers: {
            onOverlayPointerMove: handleOverlayPointerMove,
            onOverlayPointerUp: handleOverlayPointerUp,
            onPathPointerDown: event => event.stopPropagation(),
            onPathDoubleClick: handlePathDoubleClick,
            onPointPointerDown: handlePointPointerDown,
            onPointContextMenu: handlePointContextMenu,
            onPointDoubleClick: handlePointDoubleClick,
            onWidthPositionPointerDown: handleWidthPositionPointerDown,
            onWidthSizePointerDown: handleWidthSizePointerDown,
            onWidthContextMenu: handleWidthContextMenu,
        } satisfies FreeformOverlayHandlers,
    };
};
