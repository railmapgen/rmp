import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import type { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import {
    makeRenderReadySVGElement,
    positionMapAttributionForExport,
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
    it('keeps attribution inside the exported graph bounds without waiting for tiles', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const attribution = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        attribution.dataset.mapAttribution = '';
        svg.append(attribution);

        positionMapAttributionForExport(svg, { xMin: -100, yMax: 500 });

        expect(attribution.getAttribute('x')).toBe('-92');
        expect(attribution.getAttribute('y')).toBe('492');
        expect(attribution.getAttribute('font-size')).toBe('10');
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
            const { elem } = await makeRenderReadySVGElement(new MultiDirectedGraph(), true, true, [], false, 2);

            expect(elem.querySelector('[data-map-style]')?.textContent).toContain('#123456');
        } finally {
            canvas.remove();
        }
    });
});
