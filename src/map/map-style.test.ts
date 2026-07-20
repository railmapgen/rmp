import { describe, expect, it } from 'vitest';
import { compileMapStyleCss, DEFAULT_MAP_STYLE } from './map-style';

describe('map style', () => {
    it('compiles scoped level-aware SVG rules', () => {
        const style = structuredClone(DEFAULT_MAP_STYLE);
        style.roads.arterial.widthScale = 2;
        style.rails.national.color = '#112233';
        style.rails.national.widthScale = 2;
        style.labels.enabled = false;
        style.labels.sizeScale = 1.5;

        const css = compileMapStyleCss(style);

        expect(css).toContain('[data-map-layer] .rmp-map-tile[data-level="overview"] .road-arterial.detail');
        expect(css).toContain('stroke-width: 1.6');
        expect(css).toContain('.rail-national.casing { stroke: #112233; }');
        expect(css).toContain('[data-level="overview"] .rail-national.detail { stroke-width: 0.8; }');
        expect(css).toContain('.labels { display: none; }');
        expect(css).toContain('.label-place-major { font-size: 19.2px; }');
    });
});
