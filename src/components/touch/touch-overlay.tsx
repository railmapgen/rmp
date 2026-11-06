import React from 'react';
import { createPortal } from 'react-dom';
import useEvent from 'react-use-event-hook';
import { NodeId } from '../../constants/constants';
import { TOUCH_RADIUS } from '../../constants/touch';
import { MAP_MAX_VIEWBOX_ZOOM } from '../../map/map-config';
import { useRootDispatch, useRootSelector, useRootStore } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import {
    closeRadialTouchMenu,
    hideDetailsPanel,
    refreshNodesThunk,
    setActive,
    setPointerPosition,
    setRadialTouchMenu,
    setSelected,
} from '../../redux/runtime/runtime-slice';
import { MenuCategory, findNearbyElements } from '../../util/graph-nearby-elements';
import { getCanvasSize, pointerPosToSVGCoord } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import { moveNodesAndRedrawLines } from '../../util/imperative-dom';
import type { CanvasLineDrawingHandle } from '../svg-canvas-graph';
import RadialTouchMenu from './radial-touch-menu';

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;
const LENS_RADIUS = 84;
const LENS_OFFSET = 132;
const LENS_MAGNIFICATION = 1.3;

type Point = { x: number; y: number };
type Viewport = Point & { zoom: number };

interface TouchOverlayProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    sceneRef: React.RefObject<SVGGElement | null>;
    getViewport: () => Viewport;
    onMenuTakeover: (point: Point) => void;
    onPinchMove: (viewport: Viewport) => void;
    onPinchEnd: (viewport: Viewport) => void;
    lineDrawingRef?: React.RefObject<CanvasLineDrawingHandle | null>;
    onLinePanStart?: (point: Point) => void;
    onLinePanMove?: (point: Point) => void;
    onLinePanEnd?: (point: Point) => void;
    disabled?: boolean;
    editorDisabled?: boolean;
}

interface PinchGesture {
    distance: number;
    zoom: number;
    anchor: Point;
    latest: Viewport;
}

interface TouchGesture {
    pointerId: number;
    target: Element;
    captureTarget?: Element;
    start: Point;
    latest: Point;
    precision: boolean;
    radialCandidate: boolean;
    dragging: boolean;
    menuOpen: boolean;
    menuMoved: boolean;
    moveCandidate?: NodeId;
    movingNode?: NodeId;
    linePhase?: 'pick-source' | 'pending-draw' | 'drawing' | 'panning';
    linePanActive?: boolean;
}

/** Observes touch gestures before graph editors stop bubbling their pointer events. */
export const TouchOverlay: React.FC<TouchOverlayProps> = ({
    svgRef,
    sceneRef,
    getViewport,
    onMenuTakeover,
    onPinchMove,
    onPinchEnd,
    lineDrawingRef,
    onLinePanStart,
    onLinePanMove,
    onLinePanEnd,
    disabled = false,
    editorDisabled = false,
}) => {
    const dispatch = useRootDispatch();
    const store = useRootStore();
    const { mode, radialTouchMenu } = useRootSelector(state => state.runtime);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param.present);
    const size = useWindowSize();
    const { width, height } = getCanvasSize(size);
    const [lensPoint, setLensPoint] = React.useState<Point | null>(null);
    const [highlightedItem, setHighlightedItem] = React.useState<string>();
    const gesture = React.useRef<TouchGesture | null>(null);
    const lockedSource = React.useRef<{ id: NodeId; mode: typeof mode } | null>(null);
    const pointers = React.useRef(new Map<number, Point>());
    const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pinch = React.useRef<PinchGesture | null>(null);
    const afterPinch = React.useRef(false);
    const internalCancel = React.useRef(false);
    const lastTouch = React.useRef(-Infinity);
    const canvasOrigin = React.useRef({ x: 0, y: 0 });
    const clipId = `touch-lens-${React.useId().replace(/:/g, '')}`;

    const clearTimer = useEvent(() => {
        clearTimeout(timer.current);
        timer.current = undefined;
    });
    const releaseCapture = useEvent((target: Element | undefined, pointerId: number) => {
        if (target?.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    });
    const reset = useEvent(() => {
        clearTimer();
        const previous = gesture.current;
        gesture.current = null;
        if (previous && (previous.menuOpen || previous.linePhase || previous.movingNode)) {
            releaseCapture(svgRef.current ?? undefined, previous.pointerId);
        }
        setLensPoint(null);
        setHighlightedItem(undefined);
        dispatch(closeRadialTouchMenu());
        if (previous?.menuOpen) dispatch(setActive(undefined));
    });
    const canvasPoint = useEvent((point: Point) => {
        const bounds = svgRef.current?.getBoundingClientRect();
        if (bounds) canvasOrigin.current = { x: bounds.left, y: bounds.top };
        return { x: point.x - canvasOrigin.current.x, y: point.y - canvasOrigin.current.y };
    });
    const consume = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const svgPoint = useEvent((point: Point) => {
        const local = canvasPoint(point);
        const viewport = getViewport();
        return pointerPosToSVGCoord(local.x, local.y, viewport.zoom, viewport);
    });
    const getLockedSource = useEvent(() => {
        const source = lockedSource.current;
        if (source && source.mode === mode && window.graph.hasNode(source.id)) return source.id;
        lockedSource.current = null;
    });
    const finishLinePan = useEvent((current: TouchGesture, point = current.latest) => {
        if (!current.linePanActive) return;
        current.linePanActive = false;
        onLinePanEnd?.(canvasPoint(point));
    });

    const beginPinch = useEvent(() => {
        const [first, second] = [...pointers.current.values()];
        const middle = canvasPoint({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
        const viewport = getViewport();
        pinch.current = {
            distance: Math.max(1, distance(first, second)),
            zoom: viewport.zoom,
            anchor: pointerPosToSVGCoord(middle.x, middle.y, viewport.zoom, viewport),
            latest: viewport,
        };
    });
    const finishPinch = useEvent(() => {
        const current = pinch.current;
        pinch.current = null;
        if (current) onPinchEnd(current.latest);
    });
    const updatePinch = useEvent(() => {
        const current = pinch.current;
        if (!current || pointers.current.size !== 2) return;
        const [first, second] = [...pointers.current.values()];
        const maxZoom = store.getState().param.present.mapEnabled ? MAP_MAX_VIEWBOX_ZOOM : 390;
        const zoom = Math.max(
            10,
            Math.min(maxZoom, (current.zoom * current.distance) / Math.max(1, distance(first, second)))
        );
        const middle = canvasPoint({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
        current.latest = {
            x: current.anchor.x - (middle.x * zoom) / 100,
            y: current.anchor.y - (middle.y * zoom) / 100,
            zoom,
        };
        onPinchMove(current.latest);
    });

    const classifyTarget = useEvent((target: Element) => {
        if (target.closest('[data-touch-menu], [data-map-attribution], #prediction')) return;
        if (editorDisabled) return { precision: false, radialCandidate: false };
        if (target === svgRef.current || target.closest('#grid-lines')) {
            return { precision: false, radialCandidate: mode === 'free' };
        }
        if (!sceneRef.current?.contains(target)) return;
        const name = target.closest('[id^="stn_name_"]');
        if (
            name &&
            mode === 'free' &&
            store.getState().runtime.selected.has(name.id.slice('stn_name_'.length) as `stn_${string}`)
        ) {
            return { precision: true, radialCandidate: false };
        }
        let current: Element | null = target;
        while (current && current !== sceneRef.current) {
            const id = current.id.replace(/\.(pre|post)$/, '');
            if (id && (window.graph.hasNode(id) || window.graph.hasEdge(id))) {
                return {
                    precision: true,
                    radialCandidate: mode === 'free',
                    node: window.graph.hasNode(id) ? (id as NodeId) : undefined,
                };
            }
            current = current.parentElement;
        }
        // Editor overlays are inside the scene; map tiles and grid lines do not accept pointer events.
        return { precision: true, radialCandidate: false };
    });

    const moveNodeToPoint = useEvent((current: TouchGesture, point: Point) => {
        const node = current.movingNode;
        if (!node || !window.graph.hasNode(node)) return;
        const position = svgPoint(point);
        const { x, y } = window.graph.getNodeAttributes(node);
        const dx = position.x - x;
        const dy = position.y - y;
        if (dx === 0 && dy === 0) return;
        current.dragging = true;
        window.graph.mergeNodeAttributes(node, position);
        moveNodesAndRedrawLines(window.graph, [node], dx, dy);
    });

    const openLongPress = useEvent(() => {
        timer.current = undefined;
        const current = gesture.current;
        if (!current || pointers.current.size !== 1 || disabled || editorDisabled) return;
        if (current.linePhase === 'pending-draw') {
            const source = getLockedSource();
            if (!source || !lineDrawingRef?.current) return;
            finishLinePan(current);
            if (lineDrawingRef.current.begin(source, svgPoint(current.latest))) {
                current.linePhase = 'drawing';
                setLensPoint(current.latest);
            } else {
                lockedSource.current = null;
                current.linePhase = 'panning';
                current.linePanActive = true;
                onLinePanStart?.(canvasPoint(current.latest));
            }
            return;
        }
        if (current.linePhase === 'panning' || current.linePhase === 'drawing') return;
        if (current.moveCandidate && window.graph.hasNode(current.moveCandidate)) {
            // Claim the gesture before transferring capture away from its original editor.
            current.movingNode = current.moveCandidate;
            current.precision = true;
            onMenuTakeover(canvasPoint(current.latest));
            // Ending a background pan may clear the selection; restore it after the takeover.
            dispatch(setSelected(new Set([current.movingNode])));
            dispatch(setActive(current.movingNode));
            dispatch(setPointerPosition(canvasPoint(current.latest)));
            moveNodeToPoint(current, current.latest);
            setLensPoint(current.latest);
            svgRef.current?.setPointerCapture?.(current.pointerId);
            return;
        }
        if (current.precision && store.getState().runtime.active !== 'background') setLensPoint(current.latest);
        if (!current.radialCandidate && current.linePhase !== 'pick-source') return;
        const point = canvasPoint(current.latest);
        const viewport = getViewport();
        const position = pointerPosToSVGCoord(point.x, point.y, viewport.zoom, viewport);
        const data = findNearbyElements(
            window.graph,
            position,
            dispatch,
            !store.getState().account.activeSubscriptions.RMP_CLOUD
        );
        if (current.linePhase === 'pick-source') {
            data[MenuCategory.STATION] = data[MenuCategory.STATION]
                .filter(item => window.graph.hasNode(item.elementId))
                .map(item => ({
                    ...item,
                    action: () => {
                        if (store.getState().runtime.mode !== mode || !window.graph.hasNode(item.elementId)) return;
                        const id = item.elementId as NodeId;
                        lockedSource.current = { id, mode };
                        dispatch(setSelected(new Set([id])));
                    },
                }));
            data[MenuCategory.LINE] = [];
            data[MenuCategory.MISC_NODE] = [];
            data[MenuCategory.OPERATION] = [];
        }
        if (![...data[MenuCategory.STATION], ...data[MenuCategory.MISC_NODE], ...data[MenuCategory.LINE]].length)
            return;
        current.menuOpen = true;
        const active = store.getState().runtime.active;
        if (current.dragging && active && active !== 'background') {
            dispatch(saveGraph(window.graph.export()));
            dispatch(refreshNodesThunk());
        }
        if (current.linePhase) finishLinePan(current);
        else onMenuTakeover(point);
        current.start = current.latest;
        setLensPoint(null);
        dispatch(setActive(undefined));
        dispatch(setPointerPosition(undefined));
        if (!current.linePhase) dispatch(hideDetailsPanel());
        // Transfer capture only after the session is marked open; its lostcapture event is intentional.
        svgRef.current?.setPointerCapture?.(current.pointerId);
        dispatch(setRadialTouchMenu({ visible: true, position, data }));
    });

    const cancelEditor = useEvent((current: TouchGesture, notify = true) => {
        if (current.movingNode) {
            if (current.dragging && window.graph.hasNode(current.movingNode)) {
                dispatch(saveGraph(window.graph.export()));
                dispatch(refreshNodesThunk());
            }
            dispatch(setActive(undefined));
            dispatch(setPointerPosition(undefined));
            return;
        }
        if (current.linePhase) {
            internalCancel.current = true;
            try {
                if (current.linePhase === 'drawing') lineDrawingRef?.current?.cancel();
                finishLinePan(current);
                releaseCapture(svgRef.current ?? undefined, current.pointerId);
            } finally {
                internalCancel.current = false;
            }
            return;
        }
        // Names and control points keep local drag state. Let their own cancel handlers clear it.
        internalCancel.current = true;
        if (notify)
            current.captureTarget?.dispatchEvent(
                new PointerEvent('pointercancel', {
                    bubbles: true,
                    pointerId: current.pointerId,
                    pointerType: 'touch',
                    clientX: current.latest.x,
                    clientY: current.latest.y,
                })
            );
        const active = store.getState().runtime.active;
        if (current.dragging && active && active !== 'background' && mode === 'free') {
            dispatch(saveGraph(window.graph.export()));
            dispatch(refreshNodesThunk());
        }
        onMenuTakeover(canvasPoint(current.latest));
        dispatch(setActive(undefined));
        dispatch(setPointerPosition(undefined));
        releaseCapture(current.captureTarget, current.pointerId);
        internalCancel.current = false;
    });

    const handleDown = useEvent((event: PointerEvent) => {
        if (event.pointerType !== 'touch' || disabled) return;
        lastTouch.current = Date.now();
        const point = { x: event.clientX, y: event.clientY };
        canvasPoint(point);
        pointers.current.set(event.pointerId, point);
        if (pointers.current.size > 1) {
            afterPinch.current = true;
            const previous = gesture.current;
            if (previous) cancelEditor(previous);
            reset();
            if (pointers.current.size === 2) beginPinch();
            else finishPinch();
            for (const pointerId of pointers.current.keys()) svgRef.current?.setPointerCapture?.(pointerId);
            consume(event);
            return;
        }
        afterPinch.current = false;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const kind = classifyTarget(target);
        if (!kind) return;
        // Snapshot before graph/background pointerdown handlers can change the selection.
        const selected = store.getState().runtime.selected;
        const selectedNode = selected.size === 1 ? ([...selected][0] as NodeId) : undefined;
        const moveCandidate =
            kind.radialCandidate &&
            selectedNode &&
            (!kind.node || kind.node === selectedNode) &&
            window.graph.hasNode(selectedNode) &&
            distance(window.graph.getNodeAttributes(selectedNode), svgPoint(point)) <= TOUCH_RADIUS
                ? selectedNode
                : undefined;
        const linePhase = mode.startsWith('line')
            ? editorDisabled
                ? 'panning'
                : getLockedSource()
                  ? 'pending-draw'
                  : 'pick-source'
            : undefined;
        gesture.current = {
            pointerId: event.pointerId,
            target,
            start: point,
            latest: point,
            ...kind,
            // Graph pointerdown may select its target; only an existing selection blocks this hold.
            radialCandidate: kind.radialCandidate && selected.size === 0,
            moveCandidate,
            dragging: false,
            menuOpen: false,
            menuMoved: false,
            linePhase,
            linePanActive: !!linePhase,
        };
        if (linePhase) {
            gesture.current.precision = false;
            gesture.current.radialCandidate = false;
            svgRef.current?.setPointerCapture?.(event.pointerId);
            onLinePanStart?.(canvasPoint(point));
            consume(event);
        }
        if (!editorDisabled) timer.current = setTimeout(openLongPress, LONG_PRESS_MS);
    });

    const itemAt = useEvent((point: Point) => {
        const elements = document.elementsFromPoint(point.x, point.y);
        for (const element of elements) {
            const item = element.closest('[data-touch-menu-item]');
            if (item && svgRef.current?.contains(item)) return item.getAttribute('data-touch-menu-item') ?? undefined;
        }
    });

    const handleMove = useEvent((event: PointerEvent) => {
        if (event.pointerType !== 'touch' || !pointers.current.has(event.pointerId)) return;
        const point = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, point);
        if (pointers.current.size > 1) {
            consume(event);
            updatePinch();
            return;
        }
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) {
            // After a pinch, wait for all fingers to lift before starting another single-finger gesture.
            if (afterPinch.current) consume(event);
            return;
        }
        current.latest = point;
        if (current.movingNode) {
            consume(event);
            moveNodeToPoint(current, point);
            setLensPoint(point);
            return;
        }
        if (current.menuOpen) {
            consume(event);
            current.menuMoved ||= distance(current.start, point) >= MOVE_THRESHOLD;
            setHighlightedItem(current.menuMoved ? itemAt(point) : undefined);
            return;
        }
        if (current.linePhase) {
            consume(event);
            if (current.linePhase === 'drawing') {
                lineDrawingRef?.current?.update(svgPoint(point), point);
                setLensPoint(point);
            } else {
                if (distance(current.start, point) > MOVE_THRESHOLD) {
                    clearTimer();
                    current.linePhase = 'panning';
                }
                if (current.linePanActive) onLinePanMove?.(canvasPoint(point));
            }
            return;
        }
        const displacement = distance(current.start, point);
        current.dragging ||= displacement > 0;
        // Movement is delivered immediately; the timer only observes whether this is still a hold.
        if (displacement > MOVE_THRESHOLD) clearTimer();
        setLensPoint(
            current.dragging && current.precision && !editorDisabled && store.getState().runtime.active !== 'background'
                ? point
                : null
        );
    });

    const handleUp = useEvent((event: PointerEvent) => {
        if (event.pointerType !== 'touch' || !pointers.current.has(event.pointerId)) return;
        const wasMultitouch = pointers.current.size > 1;
        if (pinch.current && pointers.current.size === 2) {
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            updatePinch();
        }
        pointers.current.delete(event.pointerId);
        if (wasMultitouch) {
            finishPinch();
            if (pointers.current.size === 2) beginPinch();
            consume(event);
            return;
        }
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) {
            if (afterPinch.current) consume(event);
            if (pointers.current.size === 0) afterPinch.current = false;
            return;
        }
        if (current.movingNode) {
            consume(event);
            cancelEditor(current);
            reset();
        } else if (current.linePhase && !current.menuOpen) {
            consume(event);
            const point = { x: event.clientX, y: event.clientY };
            if (current.linePhase === 'drawing') {
                if (lineDrawingRef?.current?.finish(svgPoint(point), point)) lockedSource.current = null;
            } else {
                finishLinePan(current);
            }
            reset();
        } else if (current.menuOpen) {
            consume(event);
            const point = { x: event.clientX, y: event.clientY };
            const key = current.menuMoved ? itemAt(point) : undefined;
            const [category, index] = key?.split(':') ?? [];
            const item = store.getState().runtime.radialTouchMenu.data[category as MenuCategory]?.[Number(index)];
            // Close before executing: an action may replace the project or unmount this controller.
            reset();
            item?.action();
        } else {
            reset();
        }
    });

    const handleCancel = useEvent((event: PointerEvent) => {
        if (internalCancel.current || event.pointerType !== 'touch') return;
        const wasMultitouch = pointers.current.size > 1;
        pointers.current.delete(event.pointerId);
        if (wasMultitouch) {
            finishPinch();
            if (pointers.current.size === 2) beginPinch();
            consume(event);
            return;
        }
        const current = gesture.current;
        if (current?.pointerId === event.pointerId) {
            cancelEditor(current, event.type !== 'pointercancel');
            reset();
        }
        if (pointers.current.size === 0) afterPinch.current = false;
    });
    const handleCapture = useEvent((event: PointerEvent) => {
        if (event.pointerId === gesture.current?.pointerId && event.target instanceof Element) {
            gesture.current.captureTarget = event.target;
        }
    });
    const handleLostCapture = useEvent((event: PointerEvent) => {
        if (internalCancel.current) return;
        if (afterPinch.current && event.target === svgRef.current && pointers.current.has(event.pointerId)) {
            handleCancel(event);
            return;
        }
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId || internalCancel.current) return;
        if ((current.menuOpen || current.movingNode) && event.target !== svgRef.current) return;
        handleCancel(event);
    });
    const handleContextMenu = useEvent((event: Event) => {
        if ((event as PointerEvent).pointerType === 'mouse') return;
        if (Date.now() - lastTouch.current < 1000) consume(event);
    });
    const preventNativeSelection = useEvent((event: Event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('a, input, textarea, [contenteditable="true"]')) return;
        // Safari may start its text-selection/callout gesture before contextmenu is dispatched.
        event.preventDefault();
    });

    React.useEffect(() => {
        const svg = svgRef.current;
        if (!svg || disabled) return;
        svg.addEventListener('pointerdown', handleDown, true);
        svg.addEventListener('pointermove', handleMove, true);
        svg.addEventListener('pointerup', handleUp, true);
        svg.addEventListener('pointercancel', handleCancel, true);
        svg.addEventListener('gotpointercapture', handleCapture, true);
        svg.addEventListener('lostpointercapture', handleLostCapture, true);
        svg.addEventListener('contextmenu', handleContextMenu, true);
        svg.addEventListener('touchstart', preventNativeSelection, { capture: true, passive: false });
        svg.addEventListener('selectstart', preventNativeSelection, true);
        return () => {
            svg.removeEventListener('pointerdown', handleDown, true);
            svg.removeEventListener('pointermove', handleMove, true);
            svg.removeEventListener('pointerup', handleUp, true);
            svg.removeEventListener('pointercancel', handleCancel, true);
            svg.removeEventListener('gotpointercapture', handleCapture, true);
            svg.removeEventListener('lostpointercapture', handleLostCapture, true);
            svg.removeEventListener('contextmenu', handleContextMenu, true);
            svg.removeEventListener('touchstart', preventNativeSelection, true);
            svg.removeEventListener('selectstart', preventNativeSelection, true);
            const current = gesture.current;
            if (current && !current.menuOpen) cancelEditor(current);
            finishPinch();
            pointers.current.clear();
            reset();
        };
    }, [
        svgRef,
        disabled,
        handleDown,
        handleMove,
        handleUp,
        handleCancel,
        handleCapture,
        handleLostCapture,
        handleContextMenu,
        preventNativeSelection,
        cancelEditor,
        reset,
        finishPinch,
    ]);

    React.useEffect(() => {
        const current = gesture.current;
        if (current) cancelEditor(current);
        lockedSource.current = null;
        finishPinch();
        pointers.current.clear();
        reset();
    }, [mode, disabled, reset, cancelEditor, finishPinch]);

    let lens: React.ReactNode = null;
    const svg = svgRef.current;
    const sceneId = sceneRef.current?.id;
    if (lensPoint && svg && sceneId && !disabled && !editorDisabled && !radialTouchMenu.visible) {
        const bounds = svg.getBoundingClientRect();
        const canvasWidth = bounds.width || width;
        const canvasHeight = bounds.height || height;
        const clamp = (value: number, length: number) =>
            Math.max(LENS_RADIUS + 8, Math.min(length - LENS_RADIUS - 8, value));
        const finger = canvasPoint(lensPoint);
        const cx = clamp(finger.x, canvasWidth);
        let cy = clamp(finger.y - LENS_OFFSET, canvasHeight);
        if (finger.y - cy < LENS_RADIUS + 16) cy = clamp(finger.y + LENS_OFFSET, canvasHeight);
        const viewport = getViewport();
        const aim = pointerPosToSVGCoord(finger.x, finger.y, viewport.zoom, viewport);
        lens = createPortal(
            <g className="removeMe" data-touch-magnifier="" pointerEvents="none" aria-hidden="true">
                <defs>
                    <clipPath id={clipId}>
                        <circle cx={cx} cy={cy} r={LENS_RADIUS} />
                    </clipPath>
                </defs>
                <circle cx={cx} cy={cy} r={LENS_RADIUS} fill="white" />
                <g clipPath={`url(#${clipId})`}>
                    <use
                        href={`#${sceneId}`}
                        transform={`translate(${cx}, ${cy}) scale(${(100 * LENS_MAGNIFICATION) / viewport.zoom}) translate(${-aim.x}, ${-aim.y})`}
                    />
                </g>
                <circle cx={cx} cy={cy} r={LENS_RADIUS} fill="none" stroke="white" strokeWidth={5} />
                <circle cx={cx} cy={cy} r={LENS_RADIUS} fill="none" stroke="#333" strokeWidth={2} />
                <path d={`M ${cx - 9} ${cy} h 18 M ${cx} ${cy - 9} v 18`} stroke="white" strokeWidth={3} />
                <path d={`M ${cx - 9} ${cy} h 18 M ${cx} ${cy - 9} v 18`} stroke="#111" strokeWidth={1} />
            </g>,
            svg
        );
    }

    const viewport = getViewport();
    return (
        <>
            {radialTouchMenu.visible && (
                <rect
                    className="removeMe"
                    x={svgViewBoxMin.x}
                    y={svgViewBoxMin.y}
                    width={(width * svgViewBoxZoom) / 100}
                    height={(height * svgViewBoxZoom) / 100}
                    fill="rgba(0,0,0,0.3)"
                    pointerEvents="none"
                />
            )}
            <RadialTouchMenu highlightedItem={highlightedItem} viewport={{ ...viewport, width, height }} />
            {lens}
        </>
    );
};

export default TouchOverlay;
