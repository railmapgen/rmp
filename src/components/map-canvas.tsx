import React from 'react';
import { useTranslation } from 'react-i18next';
import useEvent from 'react-use-event-hook';
import { GlobalAlertId } from '../constants/global-alerts';
import { isMapZoomed, MAP_TILE_BASE_URL } from '../map/map-config';
import { compileMapStyleCss } from '../map/map-style';
import { MapTileController, type MapLoadingProgress } from '../map/map-tile-controller';
import { useRootDispatch, useRootSelector, useRootStore } from '../redux';
import { closeGlobalAlert, setGlobalAlert } from '../redux/runtime/runtime-slice';
import type { LiveViewport } from '../redux/viewport/viewport-slice';
import { getCanvasSize } from '../util/helpers';
import { useWindowSize } from '../util/hooks';
import { sendErrorNotification } from '../util/notifications';

export interface MapCanvasHandle {
    /**
     * The pan/zoom hot path does not publish every intermediate viewport to
     * Redux. This handle lets the SVG viewport controller forward those frames
     * without coupling generic viewport code to map rendering.
     */
    updateViewport: (viewport: LiveViewport) => void;
}

interface MapCanvasProps {
    onOverviewChange: (isOverview: boolean) => void;
}

/**
 * Owns the optional real-map layer mounted behind the regular editor canvas.
 *
 * Map tiles need the transient viewport used by the imperative pan/zoom path,
 * which is deliberately not published to Redux on every frame. The narrow
 * imperative handle keeps that high-frequency bridge explicit without making
 * this component aware of the editor canvas or its children.
 */
const MapCanvas = React.forwardRef<MapCanvasHandle, MapCanvasProps>(({ onOverviewChange }, ref) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const store = useRootStore();
    const { type: projectType, mapStyle, svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);
    const mapLayerRef = React.useRef<SVGGElement>(null);
    const mapControllerRef = React.useRef<MapTileController | undefined>(undefined);
    const isLoadingSessionRef = React.useRef(false);

    // A viewport may arrive before manifests finish loading; retaining it lets the controller start at the latest frame.
    const latestViewportRef = React.useRef<LiveViewport>({
        x: svgViewBoxMin.x,
        y: svgViewBoxMin.y,
        zoom: svgViewBoxZoom,
    });

    // Overview changes affect React content, but identical viewport frames should not repeatedly rerender SvgCanvas.
    const isOverviewRef = React.useRef(false);

    /**
     * The controller asks for size lazily while calculating visible tiles. A ref
     * gives that long-lived controller fresh dimensions without recreating it
     * and discarding its manifests, requests, and caches on every resize.
     */
    const viewportSizeRef = React.useRef({ height, width });
    const mapStyleCss = React.useMemo(() => compileMapStyleCss(mapStyle), [mapStyle]);
    const emitOverviewChange = useEvent(onOverviewChange);
    const notifyLoadError = useEvent((error: unknown) => {
        console.error('Failed to initialize map tiles', error);
        sendErrorNotification(t('error'), t('map.loadError'));
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

            const isOverview = projectType === 'map' && !isMapZoomed(viewport.zoom);
            if (isOverviewRef.current !== isOverview) {
                isOverviewRef.current = isOverview;
                emitOverviewChange(isOverview);
            }

            mapControllerRef.current?.updateViewport(viewport);
        },
        [emitOverviewChange, projectType]
    );

    React.useImperativeHandle(ref, () => ({ updateViewport }), [updateViewport]);

    React.useEffect(() => {
        if (projectType !== 'map' || !mapLayerRef.current) {
            // Also clear a previously reported overview state when switching back to a diagram.
            updateViewport(latestViewportRef.current);
            updateLoadingAlert(false);
            return;
        }

        const mapLayer = mapLayerRef.current;
        const controller = new MapTileController({
            root: mapLayer,
            baseUrl: MAP_TILE_BASE_URL,
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
        updateViewport(latestViewportRef.current);

        void controller.initialize().catch(error => {
            // A project-type change may dispose this controller while its manifest is loading.
            if (mapControllerRef.current !== controller) return;
            updateLoadingAlert(false);
            notifyLoadError(error);
        });

        return () => {
            updateLoadingAlert(false);
            controller.dispose();
            if (mapControllerRef.current === controller) mapControllerRef.current = undefined;
        };
    }, [notifyLoadError, projectType, updateLoadingAlert, updateViewport]);

    viewportSizeRef.current = { height, width };

    React.useEffect(() => {
        /**
         * The viewport coordinates stay the same after a resize, but its visible
         * tile range does not. Reusing the controller preserves warmed caches and
         * avoids aborting and refetching both map levels merely because the window
         * changed size.
         */
        mapControllerRef.current?.updateViewport(latestViewportRef.current);
    }, [height, width]);

    if (projectType !== 'map') return null;

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
