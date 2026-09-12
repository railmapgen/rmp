import { MAP_TILE_BASE_URL } from '../map/map-config';
import { compileMapStyleCss, MapStyle } from '../map/map-style';
import { MapTileController } from '../map/map-tile-controller';
import { LiveViewport } from '../redux/viewport/viewport-slice';

/** Own an export source when a route, such as the timeline, has no editor canvas. */
export const createVideoExportCanvas = (
    mapEnabled: boolean,
    mapStyle: MapStyle,
    viewport: LiveViewport,
    size: { width: number; height: number }
) => {
    const editorCanvas = document.querySelector<SVGSVGElement>('svg#canvas');
    if (editorCanvas) return { canvas: editorCanvas, renderGeometry: false, dispose: () => {} };

    const namespace = 'http://www.w3.org/2000/svg';
    const canvas = document.createElementNS(namespace, 'svg');
    canvas.setAttribute('width', String(size.width));
    canvas.setAttribute('height', String(size.height));
    // Match the editor's viewport wrapper so export cleanup never resets a node's translation.
    const wrapper = document.createElementNS(namespace, 'g');
    canvas.append(wrapper);
    let controller: MapTileController | undefined;
    if (mapEnabled) {
        const css = compileMapStyleCss(mapStyle);
        const defs = document.createElementNS(namespace, 'defs');
        const style = document.createElementNS(namespace, 'style');
        style.setAttribute('data-map-style', '');
        style.textContent = css;
        defs.append(style);
        canvas.prepend(defs);
        const mapLayer = document.createElementNS(namespace, 'g');
        mapLayer.setAttribute('data-map-layer', '');
        wrapper.append(mapLayer);
        controller = new MapTileController({
            root: mapLayer,
            baseUrl: MAP_TILE_BASE_URL,
            styleCss: css,
            getViewportSize: () => size,
            rasterEnabled: false,
        });
        // renderForExport initializes the controller lazily and reuses its caches for every frame.
        controller.updateViewport(viewport);
    }
    const editorLayer = document.createElementNS(namespace, 'g');
    editorLayer.setAttribute('data-editor-layer', '');
    wrapper.append(editorLayer);

    return { canvas, renderGeometry: true, dispose: () => controller?.dispose() };
};
