import React from 'react';
import { useTranslation } from 'react-i18next';
import useEvent from 'react-use-event-hook';
import { isMapZoomed, MAP_TILE_BASE_URL } from '../map/map-config';
import { compileMapStyleCss } from '../map/map-style';
import { MapTileController } from '../map/map-tile-controller';
import { useRootSelector } from '../redux';
import type { LiveViewport } from '../redux/viewport/viewport-slice';
import { getCanvasSize } from '../util/helpers';
import { useWindowSize } from '../util/hooks';
import { sendErrorNotification } from '../util/notifications';

export interface MapCanvasHandle {
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
    const { type: projectType, mapStyle, svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);
    const mapLayerRef = React.useRef<SVGGElement>(null);
    const mapControllerRef = React.useRef<MapTileController | undefined>(undefined);
    const latestViewportRef = React.useRef<LiveViewport>({
        x: svgViewBoxMin.x,
        y: svgViewBoxMin.y,
        zoom: svgViewBoxZoom,
    });
    const isOverviewRef = React.useRef(false);
    const viewportSizeRef = React.useRef({ height, width });
    const mapStyleCss = React.useMemo(() => compileMapStyleCss(mapStyle), [mapStyle]);
    const emitOverviewChange = useEvent(onOverviewChange);
    const notifyLoadError = useEvent((error: unknown) => {
        console.error('Failed to initialize map tiles', error);
        sendErrorNotification(t('error'), t('map.loadError'));
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
            updateViewport(latestViewportRef.current);
            return;
        }

        const mapLayer = mapLayerRef.current;
        const controller = new MapTileController({
            root: mapLayer,
            baseUrl: MAP_TILE_BASE_URL,
            getViewportSize: () => {
                const svg = mapLayer.ownerSVGElement;
                return {
                    width: svg?.clientWidth || viewportSizeRef.current.width,
                    height: svg?.clientHeight || viewportSizeRef.current.height,
                };
            },
        });
        mapControllerRef.current = controller;
        updateViewport(latestViewportRef.current);

        void controller.initialize().catch(error => {
            // A project-type change may dispose this controller while its manifest is loading.
            if (mapControllerRef.current !== controller) return;
            notifyLoadError(error);
        });

        return () => {
            controller.dispose();
            if (mapControllerRef.current === controller) mapControllerRef.current = undefined;
        };
    }, [notifyLoadError, projectType, updateViewport]);

    viewportSizeRef.current = { height, width };

    React.useEffect(() => {
        // The viewport coordinates stay the same after a resize, but the visible tile range does not.
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
