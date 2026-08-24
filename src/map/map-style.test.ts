import { describe, expect, it } from 'vitest';
import { compileMapStyleCss, DEFAULT_MAP_STYLE, MAP_LABEL_KINDS } from './map-style';

describe('map style', () => {
    it('compiles scoped level-aware SVG rules', () => {
        const style = structuredClone(DEFAULT_MAP_STYLE);
        style.roads.local.enabled = false;
        style.roads.arterial.widthScale = 2;
        style.rails.metro.enabled = false;
        style.rails.national.color = '#112233';
        style.rails.national.widthScale = 2;
        style.labels.categories['place-major'].enabled = false;
        style.labels.categories['place-major'].color = '#123456';
        style.labels.categories['place-major'].strokeColor = '#abcdef';
        style.labels.categories['place-major'].sizeScale = 1.5;
        style.labels.categories['transport-platform'].sizeScale = 2;

        const css = compileMapStyleCss(style);

        expect(css).toContain('.area-water {\n    fill: #aacfe0;');
        expect(css).toContain('.building {\n    fill: #e8e5dc;');
        expect(css).toContain('.boundary-provincial.detail');
        expect(css).toContain('stroke-dasharray: 3 2');
        expect(css).toContain('.labels.label-area-water {\n    display: inline;\n    fill: #477285;');
        expect(css).toContain('[data-map-layer] .rmp-map-tile[data-level="overview"] .road-arterial.detail');
        expect(css).toContain('.road-local { display: none; }');
        expect(css).toContain('.road-area { display: none; }');
        expect(css).toContain('stroke-width: 1.6');
        expect(css).toContain('.rail-metro { display: none; }');
        expect(css).toContain('.rail-national.casing { stroke: #112233; }');
        expect(css).toContain('[data-level="overview"] .rail-national.detail { stroke-width: 0.8; }');
        expect(css).toContain(
            '.labels.label-place-major {\n    display: none;\n    fill: #123456;\n    stroke: #abcdef;'
        );
        expect(css).toContain('.labels.label-place-major { font-size: 19.2px; }');
        expect(css).toContain('[data-level="overview"] .labels.label-place-major { font-size: 15px; }');
        expect(css).toContain('.labels.label-transport-platform { font-size: 8px; }');
        MAP_LABEL_KINDS.forEach(kind => expect(css).toContain(`.labels.label-${kind}`));
    });

    it('uses the master label switch without losing category settings', () => {
        const style = structuredClone(DEFAULT_MAP_STYLE);
        style.labels.enabled = false;
        style.labels.categories['transport-metro'].enabled = true;

        const css = compileMapStyleCss(style);

        expect(css).toContain('.labels { display: none; }');
        expect(css).toContain('.labels.label-transport-metro {\n    display: none;');
    });
});
