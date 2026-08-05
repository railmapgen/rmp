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
 * Mutable frame scheduling state.
 *
 * Both drag and preview interactions eventually want to update the same DOM
 * transform. Instead of letting each interaction maintain its own RAF handle,
 * this bucket keeps the freshest viewport together with the single frame and
 * timeout handles that operate on it.
 *
 * The fields represent:
 * - viewport: the latest viewport requested or applied so far
 * - publishLiveViewport: whether the next frame should also publish the
 *   transient viewport to Redux
 * - rafId: the queued DOM update for the next frame
 * - timeoutId: the queued delayed commit of the latest viewport
 */
interface ViewportFrameState {
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
 * - mutable frame scheduling state
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
     * Stores the latest viewport together with the pending frame/commit work.
     *
     * Multiple drag and preview requests may arrive before the queued RAF callback
     * runs, so the callback must always apply the freshest viewport instead of the
     * first one that happened to schedule the frame. Keeping the RAF and timeout
     * handles in the same ref also makes cleanup and interaction handoff logic
     * easier to reason about.
     */
    const viewportFrameRef = React.useRef<ViewportFrameState>({
        viewport,
        publishLiveViewport: false,
        rafId: null,
        timeoutId: null,
    });

    /**
     * Drag session cache used by `panStart`, `panMove`, and `panEnd`.
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
     * Returns the freshest viewport available at this exact moment.
     *
     * The imperative viewport ref is now the freshest source of truth because it
     * is updated immediately when a drag/preview frame is queued, before Redux has
     * a chance to rerender. This lets later events in the same frame derive their
     * math from the latest intended viewport rather than a stale persisted one.
     */
    const viewportGetLatest = React.useCallback((): LiveViewport => {
        return viewportFrameRef.current.viewport;
    }, []);

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

        viewportFrameRef.current.viewport = nextViewport;
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
        if (viewportFrameRef.current.timeoutId) {
            clearTimeout(viewportFrameRef.current.timeoutId);
            viewportFrameRef.current.timeoutId = null;
        }
    }, []);

    /**
     * Cancels the queued viewport RAF update.
     *
     * Drag and preview now share a single frame scheduler. Canceling that one
     * handle prevents stale transform writes after an interaction has already ended
     * or been superseded by an immediate commit.
     */
    const clearViewportRaf = React.useCallback(() => {
        if (viewportFrameRef.current.rafId) {
            cancelAnimationFrame(viewportFrameRef.current.rafId);
            viewportFrameRef.current.rafId = null;
        }
    }, []);

    /**
     * Queues a viewport write for the next animation frame.
     *
     * Both drag and preview interactions feed this single path so the DOM transform
     * is updated at most once per frame. The queued callback always applies the
     * freshest viewport seen so far, not the first event that happened to request
     * a frame.
     */
    const scheduleViewportFrame = React.useCallback(
        (nextViewport: LiveViewport, options?: { publishLiveViewport?: boolean }) => {
            viewportFrameRef.current.viewport = nextViewport;
            viewportFrameRef.current.publishLiveViewport ||= !!options?.publishLiveViewport;

            if (viewportFrameRef.current.rafId) return;

            viewportFrameRef.current.rafId = requestAnimationFrame(() => {
                const { viewport: latestViewport, publishLiveViewport } = viewportFrameRef.current;

                updateViewportTransform(latestViewport);
                if (publishLiveViewport) {
                    dispatch(setLiveViewport(latestViewport));
                }

                viewportFrameRef.current.publishLiveViewport = false;
                viewportFrameRef.current.rafId = null;
            });
        },
        [dispatch, updateViewportTransform]
    );

    /**
     * Cancels all pending asynchronous work owned by this hook.
     *
     * This is the single cleanup path for:
     * - a queued viewport frame
     * - a queued viewport commit timeout
     *
     * Grouping them in one helper keeps teardown and session handoff code small
     * and ensures we do not forget one branch when the interaction model evolves.
     */
    const clearPendingWork = React.useCallback(() => {
        clearViewportRaf();
        clearPreviewTimeout();
    }, [clearPreviewTimeout, clearViewportRaf]);

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
     * Re-bases the active drag session around an externally previewed viewport.
     *
     * This keeps drag and wheel zoom composable: if a zoom preview lands during an
     * active drag, the next pointer move should continue from the zoomed viewport
     * instead of snapping back to the drag session's original min/zoom baseline.
     */
    const rebaseDragSession = React.useCallback((nextViewport: LiveViewport) => {
        if (!dragRef.current.isDragging) return;

        dragRef.current.start = dragRef.current.latestPointer;
        dragRef.current.initialMin = { x: nextViewport.x, y: nextViewport.y };
        dragRef.current.zoom = nextViewport.zoom;
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
    const panStart = React.useCallback(
        (pointer: Point, options?: { publishLiveViewport?: boolean }) => {
            const currentViewport = viewportGetLatest();

            dragRef.current = {
                isDragging: true,
                start: pointer,
                latestPointer: pointer,
                initialMin: { x: currentViewport.x, y: currentViewport.y },
                zoom: currentViewport.zoom,
                publishLiveViewport: !!options?.publishLiveViewport || !!store.getState().viewport.liveViewport,
            };

            clearViewportRaf();
            clearPreviewTimeout();
        },
        [clearPreviewTimeout, clearViewportRaf, store, viewportGetLatest]
    );

    /**
     * Advances an active drag session.
     *
     * Call this on pointer move while dragging the background.
     *
     * Pointer move events may outpace the display refresh rate, so we still render
     * at most once per frame. The viewport math itself is cheap enough to perform
     * eagerly here; the unified RAF callback will only consume the most recent
     * derived viewport written into the frame state.
     */
    const panMove = React.useCallback(
        (pointer: Point) => {
            if (!dragRef.current.isDragging) return;

            dragRef.current.latestPointer = pointer;
            scheduleViewportFrame(calculateDraggedViewport(), {
                publishLiveViewport: dragRef.current.publishLiveViewport,
            });
        },
        [calculateDraggedViewport, scheduleViewportFrame]
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
    const viewportPreview = React.useCallback(
        (nextViewport: LiveViewport, options?: { publishLiveViewport?: boolean }) => {
            rebaseDragSession(nextViewport);
            scheduleViewportFrame(nextViewport, options);
        },
        [rebaseDragSession, scheduleViewportFrame]
    );

    /**
     * Persists a viewport immediately.
     *
     * This is used when an interaction is already complete, or when the caller
     * wants the latest viewport to become authoritative right away. Before
     * committing, we cancel pending frame work so a stale delayed commit cannot
     * race with the immediate one.
     */
    const viewportCommitNow = React.useCallback(
        (nextViewport?: LiveViewport) => {
            clearViewportRaf();
            clearPreviewTimeout();
            viewportFrameRef.current.publishLiveViewport = false;
            dispatch(commitLiveViewport(nextViewport));
        },
        [clearPreviewTimeout, clearViewportRaf, dispatch]
    );

    /**
     * Schedules a deferred commit of the current live viewport.
     *
     * This API is intentionally only for preview flows that also publish
     * `liveViewport`. Repeated calls keep pushing the commit into the future, so
     * only the final settled live viewport is persisted after the burst of previews
     * has stopped.
     */
    const viewportScheduleLiveCommit = React.useCallback(
        (delayMs = 150) => {
            if (!viewportFrameRef.current.publishLiveViewport) return;

            clearPreviewTimeout();
            viewportFrameRef.current.timeoutId = window.setTimeout(() => {
                viewportFrameRef.current.timeoutId = null;
                viewportFrameRef.current.publishLiveViewport = false;
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
    const viewportSchedulePreviewCommit = React.useCallback(
        (delayMs = 150) => {
            clearPreviewTimeout();
            viewportFrameRef.current.timeoutId = window.setTimeout(() => {
                viewportFrameRef.current.timeoutId = null;
                dispatch(commitLiveViewport(viewportFrameRef.current.viewport));
            }, delayMs);
        },
        [clearPreviewTimeout, dispatch]
    );

    /**
     * Ends the current drag session and commits the final viewport.
     *
     * Call this on pointer up after a background drag. We first cancel any pending
     * viewport RAF, then compute the final viewport from the last pointer position, and
     * finally ask Redux to persist the settled result through `commitLiveViewport`.
     *
     * This gives us the best of both worlds:
     * - smooth intermediate frames via imperative DOM updates
     * - a single persisted viewport update at interaction end
     */
    const panEnd = React.useCallback(
        (pointer: Point) => {
            if (!dragRef.current.isDragging) return;

            dragRef.current.latestPointer = pointer;
            clearViewportRaf();

            const nextViewport = calculateDraggedViewport();
            dragRef.current.isDragging = false;
            viewportCommitNow(nextViewport);
        },
        [calculateDraggedViewport, clearViewportRaf, viewportCommitNow]
    );

    /**
     * Public API returned to the caller.
     *
     * - viewportRef: attach to the world-space `<g>` that should be transformed
     * - svgRef: attach to the root `<svg>` so browser zoom suppression can be wired
     * - viewportGetLatest: use when business logic needs the freshest viewport value
     * - viewportPreview: preview a viewport efficiently without persisting it yet
     * - viewportScheduleLiveCommit: debounce a future commit for live-published previews
     * - viewportSchedulePreviewCommit: debounce a future commit for preview-only flows
     * - viewportCommitNow: persist a viewport immediately
     * - panStart / panMove / panEnd: wire these to background drag interaction
     */
    return {
        viewportRef,
        svgRef,
        viewportGetLatest,
        viewportPreview,
        viewportScheduleLiveCommit,
        viewportSchedulePreviewCommit,
        viewportCommitNow,
        panStart,
        panMove,
        panEnd,
    };
};
