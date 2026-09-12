import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MAP_STYLE, compileMapStyleCss } from '../map/map-style';
import { MapTileController } from '../map/map-tile-controller';
import { createVideoExportCanvas } from './video-export-canvas';

const { updateViewport, dispose } = vi.hoisted(() => ({ updateViewport: vi.fn(), dispose: vi.fn() }));
vi.mock('../map/map-tile-controller', () => ({
    MapTileController: vi.fn(() => ({ updateViewport, dispose })),
}));

afterEach(() => {
    document.getElementById('canvas')?.remove();
    vi.clearAllMocks();
});

const viewport = { x: 10, y: 20, zoom: 100 };
const size = { width: 1280, height: 720 };

describe('video export canvas lifecycle', () => {
    it('reuses the editor canvas without taking ownership of its map controller', () => {
        const editor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        editor.id = 'canvas';
        document.body.append(editor);
        const source = createVideoExportCanvas(true, DEFAULT_MAP_STYLE, viewport, size);
        expect(source.canvas).toBe(editor);
        expect(source.renderGeometry).toBe(false);
        source.dispose();
        expect(MapTileController).not.toHaveBeenCalled();
        expect(editor.isConnected).toBe(true);
    });

    it('creates a detached graph source on routes without the editor', () => {
        const source = createVideoExportCanvas(false, DEFAULT_MAP_STYLE, viewport, size);
        expect(source.canvas.isConnected).toBe(false);
        expect(source.renderGeometry).toBe(true);
        expect(source.canvas.querySelector('g > [data-editor-layer]')).not.toBeNull();
        expect(source.canvas.querySelector('[data-map-layer]')).toBeNull();
        expect(MapTileController).not.toHaveBeenCalled();
        source.dispose();
    });

    it('preserves map styling and owns a reusable map controller for detached exports', () => {
        const source = createVideoExportCanvas(true, DEFAULT_MAP_STYLE, viewport, size);
        expect(source.canvas.querySelector('[data-map-style]')?.textContent).toBe(
            compileMapStyleCss(DEFAULT_MAP_STYLE)
        );
        const options = vi.mocked(MapTileController).mock.calls[0][0];
        expect(options.root).toBe(source.canvas.querySelector('[data-map-layer]'));
        expect(options.rasterEnabled).toBe(false);
        expect(updateViewport).toHaveBeenCalledWith(viewport);
        source.dispose();
        expect(dispose).toHaveBeenCalledOnce();
    });
});
