import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Events, getLinePathAndStyle, LineId, NodeId, RuntimeMode, StnId } from '../constants/constants';
import { LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { PathPoint } from '../constants/path';
import { StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector, useRootStore } from '../redux';
import { saveGraph, type ParamGraph } from '../redux/param/param-slice';
import {
    refreshEdgesThunk,
    refreshNodesThunk,
    setActive,
    setMode,
    setPointerPosition,
    setSelected,
} from '../redux/runtime/runtime-slice';
import { checkAndChangeStationIntType } from '../util/change-types';
import { canUseLine } from '../util/line-path-availability';
import { makeParallelIndex, supportsParallelLinePath } from '../util/parallel';
import { type LineDrawingGesture } from './line-creation-preview';
import { linePaths, lineStyles, normalizeEdgeAttributes } from './svgs/lines/lines';

const connectableNodesType = [
    ...Object.values(StationType),
    MiscNodeType.Virtual,
    MiscNodeType.Master,
    MiscNodeType.Fill,
    MiscNodeType.LondonArrow,
    MiscNodeType.TaiwanRailwayArrow,
    MiscNodeType.ChongqingRTNumLineBadge2021,
    MiscNodeType.ChongqingRTTextLineBadge2021,
    MiscNodeType.ChengduRTLineBadge,
    MiscNodeType.GzmtrLineBadge,
];
const connectableTargetPrefixes = ['stn_core_', 'virtual_circle_', 'misc_node_connectable_'] as const;

export interface CanvasLineDrawingHandle {
    begin: (source: NodeId, pointer: PathPoint) => boolean;
    update: (pointer: PathPoint, client: { x: number; y: number }) => void;
    finish: (pointer: PathPoint, client: { x: number; y: number }) => boolean;
    cancel: () => void;
}

interface CanvasLineGesture extends LineDrawingGesture {
    style: LineStyleType;
    mode: RuntimeMode;
    snapshot: ParamGraph;
    highlightTarget: boolean;
}

export const findConnectableTarget = (elements: Element[]) => {
    for (const element of elements) {
        let current: Element | null = element;

        while (current) {
            const id = current.getAttribute('id');
            const matchedPrefix = connectableTargetPrefixes.find(prefix => id?.startsWith(prefix));

            if (id && matchedPrefix) {
                return { id, matchedPrefix };
            }

            if (id === 'canvas') break;
            current = current.parentElement;
        }
    }
};

/**
 * Owns one canvas line gesture from preview through commit or cancellation.
 * Callers supply SVG coordinates and client coordinates, so pointer event handling stays in the canvas.
 */
export const useCanvasLineDrawing = (graph: typeof window.graph, onCancel?: () => void) => {
    const dispatch = useRootDispatch();
    const store = useRootStore();
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { autoParallel, autoChangeStationType },
    } = useRootSelector(state => state.app);
    const { mapEnabled, graph: projectGraph } = useRootSelector(state => state.param.present);
    const isSubscriber = useRootSelector(state => state.account.activeSubscriptions.RMP_CLOUD);
    const {
        mode,
        theme,
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);
    const [pointerOffset, setPointerOffset] = React.useState({ dx: 0, dy: 0 });
    // Keep high-frequency path-owned drawing sessions outside the graph and undo history.
    const drawingGesture = React.useRef<CanvasLineGesture | undefined>(undefined);

    React.useEffect(() => {
        const { path, style } = getLinePathAndStyle(mode);
        if (path && style && !canUseLine(path, style, mapEnabled, isSubscriber)) {
            dispatch(setMode('free'));
        }
    }, [dispatch, isSubscriber, mapEnabled, mode]);

    const getNodePoint = (node: NodeId): PathPoint => ({
        x: graph.getNodeAttribute(node, 'x'),
        y: graph.getNodeAttribute(node, 'y'),
    });
    const isConnectableNode = (node: string | undefined): node is NodeId =>
        !!node && graph.hasNode(node) && connectableNodesType.includes(graph.getNodeAttribute(node, 'type'));
    const getConnectableNodeFromClient = (client: { x: number; y: number }): NodeId | undefined => {
        const target = findConnectableTarget(document.elementsFromPoint(client.x, client.y));
        const node = target?.id.slice(target.matchedPrefix.length);
        return isConnectableNode(node) ? node : undefined;
    };

    const selectLineNodes = (source: NodeId, target?: NodeId) => {
        const currentSelection = store.getState().runtime.selected;
        if (
            currentSelection.size !== (target ? 2 : 1) ||
            !currentSelection.has(source) ||
            (target && !currentSelection.has(target))
        ) {
            dispatch(setSelected(new Set<NodeId>(target ? [source, target] : [source])));
        }
    };
    const cancelLine = useEvent(() => {
        const gesture = drawingGesture.current;
        drawingGesture.current = undefined;
        setPointerOffset({ dx: 0, dy: 0 });
        onCancel?.();
        dispatch(setPointerPosition(undefined));
        dispatch(setActive(undefined));
        const state = store.getState();
        if (
            gesture?.highlightTarget &&
            gesture.mode === state.runtime.mode &&
            gesture.snapshot === state.param.present.graph &&
            isConnectableNode(gesture.source)
        ) {
            selectLineNodes(gesture.source);
        }
    });
    const isCurrentLineGesture = (gesture: CanvasLineGesture) => {
        const state = store.getState();
        return (
            gesture.mode === state.runtime.mode &&
            gesture.snapshot === state.param.present.graph &&
            isConnectableNode(gesture.source) &&
            canUseLine(
                gesture.type,
                gesture.style,
                state.param.present.mapEnabled,
                state.account.activeSubscriptions.RMP_CLOUD
            )
        );
    };
    const beginLine = useEvent((source: NodeId, pointer: PathPoint, highlightTarget = true) => {
        cancelLine();
        const state = store.getState();
        const { path, style } = getLinePathAndStyle(state.runtime.mode);
        if (
            !path ||
            !style ||
            !isConnectableNode(source) ||
            !canUseLine(path, style, state.param.present.mapEnabled, state.account.activeSubscriptions.RMP_CLOUD)
        ) {
            return false;
        }
        const sourcePoint = getNodePoint(source);
        drawingGesture.current = {
            type: path,
            style,
            mode: state.runtime.mode,
            snapshot: state.param.present.graph,
            highlightTarget,
            source,
            sourcePoint,
            pointer,
            session: linePaths[path].drawingBehavior?.createSession(sourcePoint, pointer),
        };
        setPointerOffset({ dx: sourcePoint.x - pointer.x, dy: sourcePoint.y - pointer.y });
        if (highlightTarget) selectLineNodes(source);
        dispatch(setActive(source));
        return true;
    });
    const updateLine = useEvent((pointer: PathPoint, client: { x: number; y: number }) => {
        const gesture = drawingGesture.current;
        if (!gesture) return;
        if (!isCurrentLineGesture(gesture)) {
            cancelLine();
            return;
        }
        gesture.pointer = pointer;
        const target = getConnectableNodeFromClient(client);
        const nextTarget = target === gesture.source ? undefined : target;
        if (gesture.highlightTarget && gesture.target !== nextTarget) selectLineNodes(gesture.source, nextTarget);
        gesture.target = nextTarget;
        gesture.session?.pointerMove(pointer);
        setPointerOffset({ dx: gesture.sourcePoint.x - pointer.x, dy: gesture.sourcePoint.y - pointer.y });
    });
    const finishLine = useEvent((pointer: PathPoint, client: { x: number; y: number }) => {
        const gesture = drawingGesture.current;
        const isCurrent = !!gesture && isCurrentLineGesture(gesture);
        const target = isCurrent ? getConnectableNodeFromClient(client) : undefined;
        // Consume the session before dispatching, so repeated releases cannot create another edge.
        cancelLine();
        if (!gesture || !isCurrent || !target || gesture.source === target) return false;

        const { type, style, source } = gesture;
        const targetPoint = getNodePoint(target);
        gesture.session?.pointerMove(pointer);
        const pathAttrs = gesture.session
            ? gesture.session.createAttrs(targetPoint, pointer)
            : structuredClone(linePaths[type].defaultAttrs);
        if (!pathAttrs) return false;

        const newLineId: LineId = `line_${nanoid(10)}`;
        const styleAttr = structuredClone(lineStyles[style].defaultAttrs);
        // TODO: there should be some way for a style to disable auto theme injection
        if ('color' in styleAttr && style !== LineStyleType.River) styleAttr.color = theme;
        const parallelIndex =
            autoParallel && supportsParallelLinePath(type)
                ? makeParallelIndex(graph, type, source, target, 'from')
                : -1;
        graph.addDirectedEdgeWithKey(newLineId, source, target, {
            visible: true,
            zIndex: 0,
            type,
            [type]: pathAttrs,
            style,
            [style]: styleAttr,
            reconcileId: '',
            parallelIndex,
        });

        let nodesChanged = false;
        if (autoChangeStationType && source.startsWith('stn')) {
            nodesChanged = checkAndChangeStationIntType(graph, source as StnId) || nodesChanged;
        }
        if (autoChangeStationType && target.startsWith('stn')) {
            nodesChanged = checkAndChangeStationIntType(graph, target as StnId) || nodesChanged;
        }

        dispatch(setSelected(new Set([newLineId])));
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type });
        normalizeEdgeAttributes(graph, [newLineId], 'created');
        dispatch(saveGraph(graph.export()));
        dispatch(refreshEdgesThunk());
        if (nodesChanged) dispatch(refreshNodesThunk());
        if (!store.getState().runtime.keepLastPath) dispatch(setMode('free'));
        return true;
    });

    React.useEffect(() => {
        const gesture = drawingGesture.current;
        if (gesture && !isCurrentLineGesture(gesture)) cancelLine();
    }, [mode, projectGraph, mapEnabled, isSubscriber, refreshNodes, cancelLine]);
    React.useEffect(
        () => () => {
            if (!drawingGesture.current) return;
            drawingGesture.current = undefined;
            dispatch(setPointerPosition(undefined));
            dispatch(setActive(undefined));
        },
        [dispatch]
    );

    return {
        drawingGesture,
        pointerOffset,
        begin: beginLine,
        update: updateLine,
        finish: finishLine,
        cancel: cancelLine,
    };
};
