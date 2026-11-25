import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { FacilitiesType } from '../components/svgs/nodes/facilities';
import type { EdgeAttributes, GraphAttributes, NodeAttributes, NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createMapAttribution } from '../map/map-attribution';
import * as fonts from './fonts';
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
    it('prepares self-contained fonts, facility symbols and images that can be reused by detached video frames', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        for (const [index, name] of ['airport-one', 'airport-two'].entries()) {
            graph.addNode(`misc_node_${name}`, {
                x: index * 100,
                y: 0,
                zIndex: 0,
                visible: true,
                type: MiscNodeType.Facilities,
                [MiscNodeType.Facilities]: { type: FacilitiesType.Airport },
            });
        }
        graph.addNode('misc_node_picture', {
            x: 200,
            y: 0,
            zIndex: 0,
            visible: true,
            type: MiscNodeType.Image,
            [MiscNodeType.Image]: { type: 'local', href: 'img-l_fixture', scale: 1, rotate: 0, opacity: 1 },
        });
        const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.innerHTML =
            '<defs><style data-map-style="">.road { stroke: #123456 }</style></defs>' +
            '<g data-editor-layer="">' +
            '<g id="misc_node_airport-one"><image href="images/facilities/airport.svg" /></g>' +
            '<g id="misc_node_airport-two"><image href="images/facilities/airport.svg" /></g>' +
            '<g id="misc_node_picture"><image href="data:image/png;base64,aW1hZ2U=" /></g>' +
            '</g>';
        const fontStyle = document.createElement('style');
        fontStyle.dataset.videoFonts = '';
        fontStyle.textContent = '@font-face {font-family: Test; src: url(data:font/woff2;base64,Zm9udA==)}';
        const loadFonts = vi.spyOn(fonts, 'makeBase64EncodedFontsStyle').mockResolvedValue(fontStyle);
        const originalFetch = globalThis.fetch;
        const loadFacility = vi.fn(
            async () =>
                ({
                    text: async () =>
                        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><path d="M0 0L32 24" /></svg>',
                }) as Response
        );
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementation((input, options) =>
                String(input).includes('images/facilities/') ? loadFacility() : originalFetch(input, options)
            );
        try {
            const { elem } = await makeRenderReadySVGElement(
                graph,
                false,
                true,
                false,
                [fonts.TextLanguage.tube],
                false,
                2,
                undefined,
                canvas
            );
            const firstFrame = elem.cloneNode(true) as SVGSVGElement;
            const laterFrame = elem.cloneNode(true) as SVGSVGElement;
            firstFrame.getElementById('misc_node_airport-one')!.remove();
            firstFrame.querySelector('[data-video-fonts]')!.remove();

            expect(loadFacility).toHaveBeenCalledOnce();
            expect(loadFonts).toHaveBeenCalledOnce();
            expect(loadFonts).toHaveBeenCalledWith([fonts.TextLanguage.tube]);
            expect(laterFrame.getElementById('airport')?.querySelector('path')).not.toBeNull();
            expect(laterFrame.querySelectorAll('use[href="#airport"]')).toHaveLength(2);
            for (const use of laterFrame.querySelectorAll('use')) {
                expect(use.getAttribute('width')).toBe('32');
                expect(use.getAttribute('height')).toBe('24');
            }
            expect(laterFrame.querySelector('[data-video-fonts]')?.textContent).toContain(
                'data:font/woff2;base64,Zm9udA=='
            );
            expect(laterFrame.getElementById('misc_node_picture')?.querySelector('image')?.getAttribute('href')).toBe(
                'data:image/png;base64,aW1hZ2U='
            );
            expect(laterFrame.querySelector('[data-map-style]')?.textContent).toContain('#123456');
            expect(elem.getElementById('misc_node_airport-one')).not.toBeNull();
            expect(elem.querySelector('[data-video-fonts]')).not.toBeNull();
            expect(canvas.querySelectorAll('use')).toHaveLength(0);
            expect(canvas.getElementById('airport')).toBeNull();
        } finally {
            fetch.mockRestore();
            loadFonts.mockRestore();
        }
    });

    it('prepares frame geometry in the detached clone before removing editor-only content', async () => {
        const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.id = 'canvas';
        canvas.innerHTML = '<g data-editor-layer><g id="live-node" /></g>';
        document.body.append(canvas);
        try {
            const { elem } = await makeRenderReadySVGElement(
                new MultiDirectedGraph(),
                false,
                true,
                true,
                [],
                false,
                2,
                clone => {
                    clone.querySelector('[data-editor-layer]')!.innerHTML =
                        '<g id="frame-node" /><g class="removeMe" />';
                }
            );
            expect(elem.getElementById('frame-node')).not.toBeNull();
            expect(elem.querySelector('.removeMe')).toBeNull();
            expect(elem.getElementById('live-node')).toBeNull();
            expect(canvas.getElementById('live-node')).not.toBeNull();
            expect(canvas.getElementById('frame-node')).toBeNull();
        } finally {
            canvas.remove();
        }
    });

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
