import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import type { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createMapAttribution } from '../map/map-attribution';
import {
    makeRenderReadySVGElement,
    positionMapAttributionForExport,
    restoreMapSvgTilesForExport,
    rmpInfoSpecificNodeExists,
    shouldForceRmpInfo,
} from './download';

describe('download RMP info rules', () => {
    it('detects image and fill nodes as requiring RMP info handling', () => {
        expect(rmpInfoSpecificNodeExists(new Set<NodeType>([MiscNodeType.Image]))).toBe(true);
        expect(rmpInfoSpecificNodeExists(new Set<NodeType>([MiscNodeType.Fill]))).toBe(true);
        expect(rmpInfoSpecificNodeExists(new Set<NodeType>([StationType.ShmetroBasic]))).toBe(false);
    });

    it('only forces embedded RMP info for non-subscribers with image or fill nodes', () => {
        expect(shouldForceRmpInfo(new Set<NodeType>([MiscNodeType.Image]), false)).toBe(true);
        expect(shouldForceRmpInfo(new Set<NodeType>([MiscNodeType.Fill]), false)).toBe(true);
        expect(shouldForceRmpInfo(new Set<NodeType>([MiscNodeType.Image]), true)).toBe(false);
        expect(shouldForceRmpInfo(new Set<NodeType>([StationType.ShmetroBasic]), false)).toBe(false);
    });
});

describe('map export attribution', () => {
    it('exports original SVG tiles instead of live raster overlays', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tile.classList.add('rmp-map-tile');
        tile.style.display = 'none';
        const raster = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        raster.dataset.mapRaster = '';
        svg.append(tile, raster);

        restoreMapSvgTilesForExport(svg);

        expect(svg.querySelector('[data-map-raster]')).toBeNull();
        expect(tile.style.display).toBe('');
        expect(tile.hasAttribute('style')).toBe(false);
    });

    it('keeps attribution inside the exported graph bounds without waiting for tiles', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const attribution = createMapAttribution();
        svg.append(attribution);

        positionMapAttributionForExport(svg, { xMin: -100, yMax: 500 });

        expect(attribution.getAttribute('transform')).toBe('translate(-92 492) scale(1)');
        expect(attribution.querySelector('[data-map-attribution-text]')?.textContent).toBe(
            '© OpenStreetMap contributors · openstreetmap.org/copyright'
        );
        expect(attribution.querySelector('[data-map-attribution-background]')?.getAttribute('fill-opacity')).toBe(
            '0.85'
        );
    });

    it('preserves the map style sheet in exported SVG', async () => {
        const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.id = 'canvas';
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.dataset.mapStyle = '';
        style.textContent = '[data-map-layer] .road-local.detail { stroke: #123456; }';
        defs.append(style);
        canvas.append(defs);
        document.body.append(canvas);

        try {
            const { elem } = await makeRenderReadySVGElement(new MultiDirectedGraph(), false, true, true, [], false, 2);

            expect(elem.querySelector('[data-map-style]')?.textContent).toContain('#123456');
        } finally {
            canvas.remove();
        }
    });

    it('rejects a map export when its required map layer is missing', async () => {
        const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.id = 'canvas';
        document.body.append(canvas);

        try {
            await expect(
                makeRenderReadySVGElement(new MultiDirectedGraph(), true, true, true, [], false, 2)
            ).rejects.toThrow('Map layer is missing during export');
        } finally {
            canvas.remove();
        }
    });
});
