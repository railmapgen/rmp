import React from 'react';
import { useRootDispatch, useRootStore } from '../redux';
import { commitLiveViewport, LiveViewport, setLiveViewport } from '../redux/viewport/viewport-slice';
import { getMousePosition } from './helpers';

/**
 * A simple point in screen-space pixels, usually derived from the pointer position
 * relative to the root SVG element.
 */
interface Point {
    x: number;
    y: number;
}

/**
 * The hook receives the persisted viewport from the Redux param slice.
 *
 * This value is the low-frequency, authoritative viewport that should be restored
 * on mount, after loading a project, after search/zoom controls update it, etc.
 * The hook mirrors it to the DOM transform in a layout effect so the imperative
 * transform path stays in sync with the persisted application state.
 */
interface UseViewportControllerOptions {
    viewport: LiveViewport;
}

/**
 * Mutable drag session state.
 *
 * This state intentionally lives in a ref instead of React state or Redux because
 * pointer move events can fire at a much higher frequency than React renders. We
 * need synchronous reads/writes during the drag session without triggering rerenders.
 *
 * The fields represent:
 * - isDragging: whether the hook should react to drag move events
 * - start: the pointer position at drag start, used as the fixed baseline
 * - latestPointer: the latest pointer position observed so far
 * - initialMin: the viewport min when the drag started
 * - zoom: the zoom level frozen for the current drag session
 * - publishLiveViewport: whether drag frames should also publish transient
 *   viewport updates for other consumers such as grid lines
 */
interface DragState {
    isDragging: boolean;
    start: Point;
    latestPointer: Point;
    initialMin: Point;
    zoom: number;
    publishLiveViewport: boolean;
}

/**
 * Mutable wheel scheduling state.
 *
 * Wheel and touchpad zoom events tend to arrive in bursts. Instead of committing
 * every intermediate value to Redux, we:
 * - use RAF to limit DOM transform work to at most once per frame
 * - use a timeout to commit the final viewport only after the burst settles
 *
 * Keeping both handles in a ref allows us to cancel stale work synchronously.
 */
interface WheelState {
    rafId: number | null;
    timeoutId: number | null;
}

/**
 * Centralizes the imperative pan/zoom hot path for the main SVG viewport.
 *
 * Why this hook exists:
 * - Background pan and wheel zoom are performance-sensitive interactions.
 * - Updating Redux on every pointer move / wheel event would cause unnecessary
 *   rerenders across the app.
 * - Directly updating the `<g>` transform keeps the interaction smooth, while
 *   Redux still receives the final settled viewport through `commitLiveViewport`.
 *
 * What this hook owns:
 * - DOM refs required by the imperative transform path
 * - mutable drag and wheel session state
 * - RAF / timeout scheduling for high-frequency input
 * - publishing transient viewport updates when live consumers need them
 *
 * What this hook does not own:
 * - higher-level application decisions such as when a drag should start
 * - tool mode changes, selection logic, or business-specific branching
 */
export const useViewportController = ({ viewport }: UseViewportControllerOptions) => {
    const dispatch = useRootDispatch();
    const store = useRootStore();

    /**
     * Ref to the inner `<g>` that visually represents the SVG world.
     *
     * Updating this element's transform is the key optimization: the viewport can
     * move or zoom without forcing React to rerender the entire canvas subtree on
     * every high-frequency interaction event.
     */
    const viewportRef = React.useRef<SVGGElement>(null);

    /**
     * Ref to the root `<svg>` element.
     *
     * This is currently used to attach a native `wheel` listener that prevents the
     * browser's own zoom gesture from competing with the application's canvas zoom.
     */
    const svgRef = React.useRef<SVGSVGElement>(null);

    /**
     * Drag session cache used by `beginDrag`, `dragTo`, and `finishDrag`.
     *
     * It stores the drag baseline and the latest pointer position so each RAF tick
     * can derive the viewport from a stable origin. This avoids repeated Redux
     * reads/writes during the drag and keeps the math deterministic for the whole
     * gesture.
     */
    const dragRef = React.useRef<DragState>({
        isDragging: false,
        start: { x: 0, y: 0 },
        latestPointer: { x: 0, y: 0 },
        initialMin: { x: 0, y: 0 },
        zoom: viewport.zoom,
        publishLiveViewport: false,
    });

    /**
     * RAF handle for panning.
     *
     * Pointer move events may outpace the display refresh rate. By funneling pan
     * updates through a single RAF handle, we coalesce many move events into one
     * DOM transform per frame.
     */
    const panRafRef = React.useRef<number | null>(null);

    /**
     * Wheel scheduling handles.
     *
     * The RAF part throttles DOM work to frame rate. The timeout part delays the
     * Redux commit so only the final settled viewport is persisted after a wheel
     * burst instead of every intermediate step.
     */
    const wheelRef = React.useRef<WheelState>({
        rafId: null,
        timeoutId: null,
    });

    /**
     * Returns the freshest viewport available at this exact moment.
     *
     * When a live viewport exists, it is more up to date than the persisted param
     * viewport because it may contain interaction state that has not been committed
     * yet. Falling back to `param` keeps low-frequency callers working even when no
     * transient interaction is active.
     *
     * This function exists mainly for correctness. Event handlers and timeouts can
     * run before React commits a rerender, so reading from the store directly avoids
     * stale render-time snapshots.
     */
    const getLatestViewport = React.useCallback((): LiveViewport => {
        const state = store.getState();
        return (
            state.viewport.liveViewport ?? {
                x: state.param.svgViewBoxMin.x,
                y: state.param.svgViewBoxMin.y,
                zoom: state.param.svgViewBoxZoom,
            }
        );
    }, [store]);

    /**
     * Applies a viewport directly to the DOM transform.
     *
     * This is the core imperative rendering path used during pan/zoom interactions.
     * It solves the main performance problem: we can move the visible viewport at
     * interactive frame rates without pushing every transient step through Redux
     * and React reconciliation.
     */
    const updateViewportTransform = React.useCallback((nextViewport: LiveViewport) => {
        if (!viewportRef.current) return;

        const scale = 100 / nextViewport.zoom;
        const x = -nextViewport.x * scale;
        const y = -nextViewport.y * scale;

        viewportRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);
    }, []);

    /**
     * Keeps the imperative DOM transform synchronized with the persisted viewport.
     *
     * This effect runs for low-frequency viewport changes that originate outside the
     * drag/wheel hot path, such as file load, search jump, slider zoom, or any other
     * state update that directly changes the persisted viewport in Redux.
     *
     * We use `useLayoutEffect` so the DOM transform is updated before the browser
     * paints, minimizing visible mismatch between React output and the transform.
     */
    React.useLayoutEffect(() => {
        updateViewportTransform(viewport);
    }, [updateViewportTransform, viewport.x, viewport.y, viewport.zoom]);

    /**
     * Clears the deferred wheel commit if one is pending.
     *
     * This is needed whenever a new interaction supersedes the previous wheel burst.
     * Without canceling the old timeout, an outdated viewport could be committed
     * after the user has already started a different interaction.
     */
    const clearWheelTimeout = React.useCallback(() => {
        if (wheelRef.current.timeoutId) {
            clearTimeout(wheelRef.current.timeoutId);
            wheelRef.current.timeoutId = null;
        }
    }, []);

    /**
     * Cancels a scheduled pan RAF update.
     *
     * This is mostly used on cleanup or when a drag finishes before the queued RAF
     * has executed. Canceling it prevents stale transform writes after the session
     * has already ended.
     */
    const clearPanRaf = React.useCallback(() => {
        if (panRafRef.current) {
            cancelAnimationFrame(panRafRef.current);
            panRafRef.current = null;
        }
    }, []);

    /**
     * Cancels a scheduled wheel RAF update.
     *
     * Similar to `clearPanRaf`, but for zoom rendering. This keeps unmount and
     * interaction handoff logic safe by ensuring no delayed DOM write survives
     * beyond the intended lifecycle.
     */
    const clearWheelRaf = React.useCallback(() => {
        if (wheelRef.current.rafId) {
            cancelAnimationFrame(wheelRef.current.rafId);
            wheelRef.current.rafId = null;
        }
    }, []);

    /**
     * Cancels all pending asynchronous work owned by this hook.
     *
     * This is the single cleanup path for:
     * - a queued pan frame
     * - a queued wheel frame
     * - a queued wheel commit timeout
     *
     * Grouping them in one helper keeps teardown and session handoff code small
     * and ensures we do not forget one branch when the interaction model evolves.
     */
    const clearPendingWork = React.useCallback(() => {
        clearPanRaf();
        clearWheelRaf();
        clearWheelTimeout();
    }, [clearPanRaf, clearWheelRaf, clearWheelTimeout]);

    /**
     * On unmount, cancel any delayed work that could still attempt to touch the DOM
     * or dispatch a commit after the component is gone.
     */
    React.useEffect(() => clearPendingWork, [clearPendingWork]);

    /**
     * Installs a native wheel listener to suppress browser zoom gestures.
     *
     * This is needed because Ctrl/Cmd + wheel can trigger the browser's default
     * page zoom, which would conflict with the application's own canvas zoom model.
     * A native listener with `passive: false` is required so `preventDefault()`
     * actually takes effect.
     */
    React.useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const preventBrowserZoom = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        };

        svg.addEventListener('wheel', preventBrowserZoom, { passive: false });
        return () => {
            svg.removeEventListener('wheel', preventBrowserZoom);
        };
    }, []);

    /**
     * Converts the current drag session into a viewport.
     *
     * This helper is used both during the drag (for frame updates) and at drag end
     * (for the final commit). Keeping the math in one place avoids subtle divergence
     * between "preview" and "final" viewport calculation.
     */
    const calculateDraggedViewport = React.useCallback((): LiveViewport => {
        const { start, latestPointer, initialMin, zoom } = dragRef.current;
        const dx = latestPointer.x - start.x;
        const dy = latestPointer.y - start.y;

        return {
            x: initialMin.x - (dx * zoom) / 100,
            y: initialMin.y - (dy * zoom) / 100,
            zoom,
        };
    }, []);

    /**
     * Starts a new pan session.
     *
     * Call this on pointer down when the background drag mode becomes active.
     *
     * What it does:
     * - snapshots the freshest available viewport so the drag always starts from
     *   the correct position, even if a wheel interaction has not been committed yet
     * - freezes the zoom level for the duration of this drag session
     * - decides whether intermediate drag frames should publish `liveViewport`
     *
     * The last point matters for performance: not every drag needs Redux updates.
     * If no live consumer exists, we can keep the whole drag purely imperative.
     */
    const beginDrag = React.useCallback(
        (pointer: Point, options?: { publishLiveViewport?: boolean }) => {
            const currentViewport = getLatestViewport();

            dragRef.current = {
                isDragging: true,
                start: pointer,
                latestPointer: pointer,
                initialMin: { x: currentViewport.x, y: currentViewport.y },
                zoom: currentViewport.zoom,
                publishLiveViewport: !!options?.publishLiveViewport || !!store.getState().viewport.liveViewport,
            };

            clearWheelTimeout();
        },
        [clearWheelTimeout, getLatestViewport, store]
    );

    /**
     * Advances an active drag session.
     *
     * Call this on pointer move while dragging the background.
     *
     * Instead of recalculating and writing the DOM transform synchronously on every
     * move event, this function:
     * - stores only the latest pointer position
     * - schedules one RAF callback if none is pending
     * - updates the DOM once per frame with the derived viewport
     *
     * This coalescing is what keeps panning smooth under very high pointer event
     * rates. Optional live viewport publication is also performed inside the RAF so
     * Redux traffic stays frame-bounded rather than event-bounded.
     */
    const dragTo = React.useCallback(
        (pointer: Point) => {
            if (!dragRef.current.isDragging) return;

            dragRef.current.latestPointer = pointer;
            if (panRafRef.current) return;

            panRafRef.current = requestAnimationFrame(() => {
                const nextViewport = calculateDraggedViewport();
                updateViewportTransform(nextViewport);

                if (dragRef.current.publishLiveViewport) {
                    dispatch(setLiveViewport(nextViewport));
                }

                panRafRef.current = null;
            });
        },
        [calculateDraggedViewport, dispatch, updateViewportTransform]
    );

    /**
     * Ends the current drag session and commits the final viewport.
     *
     * Call this on pointer up after a background drag. We first cancel any pending
     * pan RAF, then compute the final viewport from the last pointer position, and
     * finally ask Redux to persist the settled result through `commitLiveViewport`.
     *
     * This gives us the best of both worlds:
     * - smooth intermediate frames via imperative DOM updates
     * - a single persisted viewport update at interaction end
     */
    const finishDrag = React.useCallback(
        (pointer: Point) => {
            if (!dragRef.current.isDragging) return;

            clearPanRaf();
            dragRef.current.latestPointer = pointer;
            dragRef.current.isDragging = false;

            dispatch(commitLiveViewport(calculateDraggedViewport()));
        },
        [calculateDraggedViewport, clearPanRaf, dispatch]
    );

    /**
     * Handles wheel / touchpad zoom interaction.
     *
     * Call this from the SVG `onWheel` handler.
     *
     * The sequence is:
     * 1. Read the freshest viewport, including any uncommitted live viewport
     * 2. Compute the next zoom and min so the pointer stays anchored visually
     * 3. Publish the transient viewport immediately to Redux for live consumers
     * 4. Schedule one RAF to apply the DOM transform
     * 5. Reset the debounce timer that will commit the final viewport later
     *
     * This solves two problems at once:
     * - performance: the DOM updates at frame rate, not per wheel event
     * - correctness: repeated wheel events build on the latest live viewport rather
     *   than on a possibly stale persisted viewport
     */
    const handleWheel = React.useCallback(
        (e: React.WheelEvent<SVGSVGElement>) => {
            const currentViewport = getLatestViewport();
            const zoomIntensity = e.ctrlKey || e.metaKey ? 0.0009 : 0.0015;
            const scaleMultiplier = Math.exp(e.deltaY * zoomIntensity);

            let newZoom = currentViewport.zoom * scaleMultiplier;
            newZoom = Math.max(1, Math.min(newZoom, 400));
            if (newZoom === currentViewport.zoom) return;

            const { x, y } = getMousePosition(e);
            const nextViewport = {
                x: currentViewport.x + (x * currentViewport.zoom) / 100 - (x * newZoom) / 100,
                y: currentViewport.y + (y * currentViewport.zoom) / 100 - (y * newZoom) / 100,
                zoom: newZoom,
            };

            dispatch(setLiveViewport(nextViewport));

            if (!wheelRef.current.rafId) {
                wheelRef.current.rafId = requestAnimationFrame(() => {
                    updateViewportTransform(getLatestViewport());
                    wheelRef.current.rafId = null;
                });
            }

            clearWheelTimeout();
            wheelRef.current.timeoutId = window.setTimeout(() => {
                wheelRef.current.timeoutId = null;
                dispatch(commitLiveViewport());
            }, 150);
        },
        [clearWheelTimeout, dispatch, getLatestViewport, updateViewportTransform]
    );

    /**
     * Public API returned to the caller.
     *
     * - viewportRef: attach to the world-space `<g>` that should be transformed
     * - svgRef: attach to the root `<svg>` so native wheel prevention can be wired
     * - getLatestViewport: use when business logic needs the freshest viewport value
     * - beginDrag / dragTo / finishDrag: wire these to background drag interaction
     * - handleWheel: wire this to the SVG wheel event
     */
    return {
        viewportRef,
        svgRef,
        getLatestViewport,
        beginDrag,
        dragTo,
        finishDrag,
        handleWheel,
    };
};
