import React from 'react';
import { useRootDispatch, useRootStore } from '../redux';
import { commitLiveViewport, LiveViewport, setLiveViewport } from '../redux/viewport/viewport-slice';
import { usePreventBrowserZoom } from './hooks';

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
 * Mutable preview scheduling state.
 *
 * Many interactions produce a stream of transient viewport previews before a final
 * settled viewport should be persisted. Instead of scattering that information
 * across multiple refs, this bucket keeps the freshest preview together with the
 * async handles that operate on it.
 *
 * The fields represent:
 * - viewport: the latest preview requested so far
 * - rafId: the queued DOM update for preview rendering
 * - timeoutId: the queued delayed commit of the previewed viewport
 */
interface ViewportPreviewState {
    viewport: LiveViewport;
    publishLiveViewport: boolean;
    rafId: number | null;
    timeoutId: number | null;
}

/**
 * Centralizes the imperative pan/zoom hot path for the main SVG viewport.
 *
 * Why this hook exists:
 * - Background pan and viewport preview rendering are performance-sensitive interactions.
 * - Updating Redux on every pointer move or transient viewport preview would cause
 *   unnecessary rerenders across the app.
 * - Directly updating the `<g>` transform keeps the interaction smooth, while
 *   Redux still receives the final settled viewport through `commitLiveViewport`.
 *
 * What this hook owns:
 * - DOM refs required by the imperative transform path
 * - mutable drag state
 * - mutable preview scheduling state
 * - RAF / timeout scheduling for high-frequency input
 * - publishing transient viewport updates when live consumers need them
 *
 * What this hook does not own:
 * - higher-level application decisions such as how wheel zoom should be calculated
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
     * The controller itself does not need the DOM node for viewport math, but a
     * separate hook uses it to suppress the browser's own page zoom gesture.
     */
    const svgRef = React.useRef<SVGSVGElement>(null);

    /**
     * Stores the latest viewport preview together with its pending async work.
     *
     * Multiple preview requests may arrive before the queued RAF callback runs, so
     * the callback must always apply the freshest preview instead of the first one
     * that happened to schedule the frame. Keeping the RAF and timeout handles in
     * the same ref also makes cleanup and interaction handoff logic easier to reason about.
     */
    const viewportPreviewRef = React.useRef<ViewportPreviewState>({
        viewport,
        publishLiveViewport: false,
        rafId: null,
        timeoutId: null,
    });

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

        viewportPreviewRef.current.viewport = nextViewport;
        const scale = 100 / nextViewport.zoom;
        const x = -nextViewport.x * scale;
        const y = -nextViewport.y * scale;

        viewportRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);
    }, []);

    /**
     * Keeps the imperative DOM transform synchronized with the persisted viewport.
     *
     * This effect runs for low-frequency viewport changes that originate outside the
     * drag/preview hot path, such as file load, search jump, slider zoom, or any
     * other state update that directly changes the persisted viewport in Redux.
     *
     * We use `useLayoutEffect` so the DOM transform is updated before the browser
     * paints, minimizing visible mismatch between React output and the transform.
     */
    React.useLayoutEffect(() => {
        updateViewportTransform(viewport);
    }, [updateViewportTransform, viewport.x, viewport.y, viewport.zoom]);

    /**
     * Clears the deferred preview commit if one is pending.
     *
     * This is needed whenever a new interaction supersedes the previous preview burst.
     * Without canceling the old timeout, an outdated viewport could be committed
     * after the user has already started a different interaction.
     */
    const clearPreviewTimeout = React.useCallback(() => {
        if (viewportPreviewRef.current.timeoutId) {
            clearTimeout(viewportPreviewRef.current.timeoutId);
            viewportPreviewRef.current.timeoutId = null;
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
     * Cancels a scheduled preview RAF update.
     *
     * Similar to `clearPanRaf`, but for transient viewport previews. This keeps
     * unmount and interaction handoff logic safe by ensuring no delayed DOM write
     * survives beyond the intended lifecycle.
     */
    const clearPreviewRaf = React.useCallback(() => {
        if (viewportPreviewRef.current.rafId) {
            cancelAnimationFrame(viewportPreviewRef.current.rafId);
            viewportPreviewRef.current.rafId = null;
        }
    }, []);

    /**
     * Cancels all pending asynchronous work owned by this hook.
     *
     * This is the single cleanup path for:
     * - a queued pan frame
     * - a queued preview frame
     * - a queued preview commit timeout
     *
     * Grouping them in one helper keeps teardown and session handoff code small
     * and ensures we do not forget one branch when the interaction model evolves.
     */
    const clearPendingWork = React.useCallback(() => {
        clearPanRaf();
        clearPreviewRaf();
        clearPreviewTimeout();
    }, [clearPanRaf, clearPreviewRaf, clearPreviewTimeout]);

    /**
     * On unmount, cancel any delayed work that could still attempt to touch the DOM
     * or dispatch a commit after the component is gone.
     */
    React.useEffect(() => clearPendingWork, [clearPendingWork]);

    usePreventBrowserZoom(svgRef);

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
     *   the correct position, even if a previous preview has not been committed yet
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

            clearPreviewRaf();
            clearPreviewTimeout();
        },
        [clearPreviewRaf, clearPreviewTimeout, getLatestViewport, store]
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
     * Imperatively previews a viewport without making it persisted state yet.
     *
     * Use this when the caller has already computed the next viewport according to
     * product rules and only needs the hook to execute it efficiently.
     *
     * The function solves three problems:
     * - DOM transform updates are throttled to animation frames
     * - multiple rapid previews collapse into one visual update
     * - transient viewport publication remains optional for external live consumers
     */
    const previewViewport = React.useCallback(
        (nextViewport: LiveViewport, options?: { publishLiveViewport?: boolean }) => {
            viewportPreviewRef.current.viewport = nextViewport;
            viewportPreviewRef.current.publishLiveViewport = !!options?.publishLiveViewport;

            if (!viewportPreviewRef.current.rafId) {
                viewportPreviewRef.current.rafId = requestAnimationFrame(() => {
                    const { viewport: latestViewport, publishLiveViewport } = viewportPreviewRef.current;
                    updateViewportTransform(latestViewport);
                    if (publishLiveViewport) {
                        dispatch(setLiveViewport(latestViewport));
                    }
                    viewportPreviewRef.current.rafId = null;
                });
            }
        },
        [dispatch, updateViewportTransform]
    );

    /**
     * Persists a viewport immediately.
     *
     * This is used when an interaction is already complete, or when the caller
     * wants the latest viewport to become authoritative right away. Before
     * committing, we cancel pending preview work so a stale delayed commit cannot
     * race with the immediate one.
     */
    const commitViewportNow = React.useCallback(
        (nextViewport?: LiveViewport) => {
            clearPreviewRaf();
            clearPreviewTimeout();
            viewportPreviewRef.current.publishLiveViewport = false;
            dispatch(commitLiveViewport(nextViewport));
        },
        [clearPreviewRaf, clearPreviewTimeout, dispatch]
    );

    /**
     * Schedules a deferred commit of the current live viewport.
     *
     * This API is intentionally only for preview flows that also publish
     * `liveViewport`. Repeated calls keep pushing the commit into the future, so
     * only the final settled live viewport is persisted after the burst of previews
     * has stopped.
     */
    const scheduleLiveViewportCommit = React.useCallback(
        (delayMs = 150) => {
            if (!viewportPreviewRef.current.publishLiveViewport) return;

            clearPreviewTimeout();
            viewportPreviewRef.current.timeoutId = window.setTimeout(() => {
                viewportPreviewRef.current.timeoutId = null;
                viewportPreviewRef.current.publishLiveViewport = false;
                dispatch(commitLiveViewport());
            }, delayMs);
        },
        [clearPreviewTimeout, dispatch]
    );

    /**
     * Schedules a deferred commit of the latest previewed viewport.
     *
     * Use this for preview flows that intentionally avoid publishing
     * `liveViewport`, but still need the final settled viewport to be persisted
     * after the interaction burst ends.
     */
    const schedulePreviewCommit = React.useCallback(
        (delayMs = 150) => {
            clearPreviewTimeout();
            viewportPreviewRef.current.timeoutId = window.setTimeout(() => {
                viewportPreviewRef.current.timeoutId = null;
                dispatch(commitLiveViewport(viewportPreviewRef.current.viewport));
            }, delayMs);
        },
        [clearPreviewTimeout, dispatch]
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

            commitViewportNow(calculateDraggedViewport());
        },
        [calculateDraggedViewport, clearPanRaf, commitViewportNow]
    );

    /**
     * Public API returned to the caller.
     *
     * - viewportRef: attach to the world-space `<g>` that should be transformed
     * - svgRef: attach to the root `<svg>` so browser zoom suppression can be wired
     * - getLatestViewport: use when business logic needs the freshest viewport value
     * - previewViewport: preview a viewport efficiently without persisting it yet
     * - scheduleLiveViewportCommit: debounce a future commit for live-published previews
     * - schedulePreviewCommit: debounce a future commit for preview-only flows
     * - commitViewportNow: persist a viewport immediately
     * - beginDrag / dragTo / finishDrag: wire these to background drag interaction
     */
    return {
        viewportRef,
        svgRef,
        getLatestViewport,
        previewViewport,
        scheduleLiveViewportCommit,
        schedulePreviewCommit,
        commitViewportNow,
        beginDrag,
        dragTo,
        finishDrag,
    };
};
