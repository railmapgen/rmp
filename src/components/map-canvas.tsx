import React from 'react';
import { useTranslation } from 'react-i18next';
import useEvent from 'react-use-event-hook';
import { GlobalAlertId } from '../constants/global-alerts';
import { isMapZoomed, MAP_TILE_BASE_URL } from '../map/map-config';
import { compileMapStyleCss } from '../map/map-style';
import { MapTileController, type MapLoadingProgress } from '../map/map-tile-controller';
import { useRootDispatch, useRootSelector, useRootStore } from '../redux';
import { closeGlobalAlert, setGlobalAlert, setMapOverview } from '../redux/runtime/runtime-slice';
import type { LiveViewport } from '../redux/viewport/viewport-slice';
import { getCanvasSize } from '../util/helpers';
import { useWindowSize } from '../util/hooks';
import { sendErrorNotification } from '../util/notifications';

const VIEWPORT_INTERACTION_IDLE_MS = 200;

export interface MapCanvasHandle {
    /**
     * The pan/zoom hot path does not publish every intermediate viewport to
     * Redux. This handle lets the SVG viewport controller forward those frames
     * without coupling generic viewport code to map rendering.
     */
    updateViewport: (viewport: LiveViewport) => void;

    /**
     * Rasterization is intentionally deferred while wheel input is arriving.
     * The component owns the idle timer so SvgWrapper only reports the gesture
     * and does not regain responsibility for map lifecycle.
     */
    markViewportInteraction: () => void;
}

/**
 * Owns the optional real-map layer mounted behind the regular editor canvas.
 *
 * Map tiles need the transient viewport used by the imperative pan/zoom path,
 * which is deliberately not published to Redux on every frame. The narrow
 * imperative handle keeps that high-frequency bridge explicit without making
 * this component aware of the editor canvas or its children.
 */
const MapCanvas = React.forwardRef<MapCanvasHandle>((_, ref) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const store = useRootStore();
    const { mapEnabled, mapStyle, svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param.present);
    const disableMapPerformanceOptimization = useRootSelector(
        state => state.app.preference.disableMapPerformanceOptimization
    );
    const editorInteractionActive = useRootSelector(state => state.runtime.active !== undefined);
    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);
    const mapLayerRef = React.useRef<SVGGElement>(null);
    const mapControllerRef = React.useRef<MapTileController | undefined>(undefined);
    const viewportInteractionTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isLoadingSessionRef = React.useRef(false);

    // A viewport may arrive before manifests finish loading; retaining it lets the controller start at the latest frame.
    const latestViewportRef = React.useRef<LiveViewport>({
        x: svgViewBoxMin.x,
        y: svgViewBoxMin.y,
        zoom: svgViewBoxZoom,
    });

    /**
     * The controller asks for size lazily while calculating visible tiles. A ref
     * gives that long-lived controller fresh dimensions without recreating it
     * and discarding its manifests, requests, and caches on every resize.
     */
    const viewportSizeRef = React.useRef({ height, width });
    const mapStyleCss = React.useMemo(() => compileMapStyleCss(mapStyle), [mapStyle]);
    const mapStyleCssRef = React.useRef(mapStyleCss);
    const rasterEnabledRef = React.useRef(!disableMapPerformanceOptimization);
    const editorInteractionActiveRef = React.useRef(editorInteractionActive);
    const notifyLoadError = useEvent((error: unknown) => {
        console.error('Failed to initialize map tiles', error);
        sendErrorNotification(t('error'), t('map.loadError'));
    });
    const updateOverviewState = useEvent((isOverview: boolean) => {
        // Redux is the sole overview state; consulting it here also avoids re-publishing identical viewport frames.
        if (store.getState().runtime.isMapOverview === isOverview) return;
        dispatch(setMapOverview(isOverview));

        if (isOverview) {
            dispatch(
                setGlobalAlert({
                    id: GlobalAlertId.MapOverviewEdit,
                    status: 'info',
                    message: t('map.zoomInToEdit'),
                })
            );
        } else {
            // The same transition handles zooming in, hiding the map, and teardown.
            dispatch(closeGlobalAlert(GlobalAlertId.MapOverviewEdit));
        }
    });
    const updateLoadingAlert = useEvent((loading: boolean, progress?: MapLoadingProgress) => {
        if (!loading) {
            // Closing an absent ID is intentionally safe across errors, project changes, and unmounts.
            isLoadingSessionRef.current = false;
            dispatch(closeGlobalAlert(GlobalAlertId.MapLoading));
            return;
        }

        // A manual dismissal suppresses later progress updates until the controller starts a new loading session.
        if (
            isLoadingSessionRef.current &&
            store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading] === undefined
        ) {
            return;
        }
        isLoadingSessionRef.current = true;
        const progressText = progress ? ` (${progress.completed} / ${progress.total})` : '';
        dispatch(
            setGlobalAlert({
                id: GlobalAlertId.MapLoading,
                status: 'loading',
                message: `${t('map.loading')}${progressText}`,
            })
        );
    });
    const updateViewport = React.useCallback(
        (viewport: LiveViewport) => {
            latestViewportRef.current = viewport;

            const isOverview = mapEnabled && !isMapZoomed(viewport.zoom);
            updateOverviewState(isOverview);

            mapControllerRef.current?.updateViewport(viewport);
        },
        [mapEnabled, updateOverviewState]
    );

    const markViewportInteraction = React.useCallback(() => {
        if (!mapEnabled) return;
        if (viewportInteractionTimerRef.current !== undefined) {
            clearTimeout(viewportInteractionTimerRef.current);
        }
        mapControllerRef.current?.setInteractionActive(true);
        viewportInteractionTimerRef.current = setTimeout(() => {
            viewportInteractionTimerRef.current = undefined;
            mapControllerRef.current?.setInteractionActive(editorInteractionActiveRef.current);
        }, VIEWPORT_INTERACTION_IDLE_MS);
    }, [mapEnabled]);

    React.useImperativeHandle(ref, () => ({ updateViewport, markViewportInteraction }), [
        markViewportInteraction,
        updateViewport,
    ]);

    /**
     * Persisted viewport changes can arrive before the controller effect runs.
     * Publishing in a layout effect hides editing UI before the browser paints,
     * while transient pan/zoom frames continue through `updateViewport`.
     */
    React.useLayoutEffect(() => {
        updateOverviewState(mapEnabled && !isMapZoomed(svgViewBoxZoom));
    }, [mapEnabled, svgViewBoxZoom, updateOverviewState]);

    React.useEffect(
        () => () => {
            // Runtime UI must not retain a map-only state if the canvas is removed.
            dispatch(setMapOverview(false));
            dispatch(closeGlobalAlert(GlobalAlertId.MapOverviewEdit));
        },
        [dispatch]
    );

    React.useEffect(() => {
        if (!mapEnabled || !mapLayerRef.current) {
            // Also clear a previously reported overview state when hiding the map.
            updateViewport(latestViewportRef.current);
            updateLoadingAlert(false);
            return;
        }

        const mapLayer = mapLayerRef.current;
        const controller = new MapTileController({
            root: mapLayer,
            baseUrl: MAP_TILE_BASE_URL,
            styleCss: mapStyleCssRef.current,
            rasterEnabled: rasterEnabledRef.current,
            getViewportSize: () => {
                const svg = mapLayer.ownerSVGElement;
                return {
                    // Prefer the actual rendered SVG; hook-derived dimensions are only a fallback during layout.
                    width: svg?.clientWidth || viewportSizeRef.current.width,
                    height: svg?.clientHeight || viewportSizeRef.current.height,
                };
            },
            onLoadingChange: updateLoadingAlert,
        });
        mapControllerRef.current = controller;
        controller.setInteractionActive(
            editorInteractionActiveRef.current || viewportInteractionTimerRef.current !== undefined
        );
        updateViewport(latestViewportRef.current);

        void controller.initialize().catch(error => {
            // Hiding the map may dispose this controller while its manifest is loading.
            if (mapControllerRef.current !== controller) return;
            updateLoadingAlert(false);
            notifyLoadError(error);
        });

        return () => {
            if (viewportInteractionTimerRef.current !== undefined) {
                clearTimeout(viewportInteractionTimerRef.current);
                viewportInteractionTimerRef.current = undefined;
            }
            updateLoadingAlert(false);
            controller.dispose();
            if (mapControllerRef.current === controller) mapControllerRef.current = undefined;
        };
    }, [mapEnabled, notifyLoadError, updateLoadingAlert, updateViewport]);

    viewportSizeRef.current = { height, width };
    mapStyleCssRef.current = mapStyleCss;
    rasterEnabledRef.current = !disableMapPerformanceOptimization;
    editorInteractionActiveRef.current = editorInteractionActive;

    React.useEffect(() => {
        /**
         * The viewport coordinates stay the same after a resize, but its visible
         * tile range does not. Reusing the controller preserves warmed caches and
         * avoids aborting and refetching both map levels merely because the window
         * changed size.
         */
        mapControllerRef.current?.updateViewport(latestViewportRef.current);
    }, [height, width]);

    React.useLayoutEffect(() => {
        mapControllerRef.current?.updateStyle(mapStyleCss);
    }, [mapStyleCss]);

    React.useLayoutEffect(() => {
        mapControllerRef.current?.setRasterEnabled(!disableMapPerformanceOptimization);
    }, [disableMapPerformanceOptimization]);

    React.useLayoutEffect(() => {
        mapControllerRef.current?.setInteractionActive(
            editorInteractionActive || viewportInteractionTimerRef.current !== undefined
        );
    }, [editorInteractionActive]);

    if (!mapEnabled) return null;

    return (
        <>
            <defs>
                <style data-map-style="">{mapStyleCss}</style>
            </defs>
            <g ref={mapLayerRef} data-map-layer="" />
        </>
    );
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
