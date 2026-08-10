export type MapRoadKind = 'path' | 'local' | 'collector' | 'arterial';
export type MapRailKind = 'metro' | 'national';

/** User-adjustable appearance shared by all road features in one generated category. */
export interface MapRoadStyle {
    enabled: boolean;
    casingColor: string;
    color: string;
    widthScale: number;
}

/** Rails have a fixed inner detail color, so only their casing color is configurable. */
export interface MapRailStyle {
    enabled: boolean;
    color: string;
    widthScale: number;
}

/**
 * This shape is persisted in RMP saves. New adjustable categories therefore
 * need a default and a save migration rather than being added only to the UI.
 */
export interface MapStyle {
    roads: Record<MapRoadKind, MapRoadStyle>;
    rails: Record<MapRailKind, MapRailStyle>;
    labels: {
        enabled: boolean;
        sizeScale: number;
    };
}

/** Defaults are cloned when assigned because nested style objects are mutable Redux state. */
export const DEFAULT_MAP_STYLE: MapStyle = {
    roads: {
        path: { enabled: true, casingColor: '#dedbd4', color: '#dedbd4', widthScale: 1 },
        local: { enabled: true, casingColor: '#cfd39c', color: '#fbf8d0', widthScale: 1 },
        collector: { enabled: true, casingColor: '#c8cf86', color: '#f7fabf', widthScale: 1 },
        arterial: { enabled: true, casingColor: '#d8ab62', color: '#f6d19b', widthScale: 1 },
    },
    rails: {
        metro: { enabled: true, color: '#4d8fd1', widthScale: 1 },
        national: { enabled: true, color: '#8f8a83', widthScale: 1 },
    },
    labels: {
        enabled: true,
        sizeScale: 1,
    },
};

/**
 * Limits generated CSS precision so slider arithmetic does not create noisy,
 * unstable style text or unnecessarily different exported SVG snapshots.
 */
const formatNumber = (value: number) => Number(value.toFixed(4)).toString();

/** Keeps every width calculation on the same formatting boundary. */
const scaled = (base: number, scale: number) => formatNumber(base * scale);

/**
 * RMP owns its rendering defaults instead of trusting presentation supplied by
 * a tile host. Manifest v3 tiles contain only semantic classes, so
 * these rules are required for both the live canvas and self-contained exports;
 * the manifest's `defaultStyle` remains a reference for other consumers.
 */
const MAP_BASE_STYLE_CSS = `
[data-map-layer] .rmp-map-tile .area-water {
    fill: #aacfe0;
    fill-opacity: 0.48;
    fill-rule: nonzero;
    stroke: none;
    stroke-width: 0;
}
[data-map-layer] .rmp-map-tile .landuse-residential {
    fill: #e8e5dc;
}
[data-map-layer] .rmp-map-tile .landuse-commercial {
    fill: #f2d6d6;
}
[data-map-layer] .rmp-map-tile .landuse-industrial {
    fill: #ded7e8;
}
[data-map-layer] .rmp-map-tile .landuse-education {
    fill: #f2dfb7;
}
[data-map-layer] .rmp-map-tile .landuse-healthcare {
    fill: #f6d4dc;
}
[data-map-layer] .rmp-map-tile .area-farmland {
    fill: #efe8b7;
    fill-opacity: 0.24;
}
[data-map-layer] .rmp-map-tile .area-forest {
    fill: #b9d7a8;
    fill-opacity: 0.32;
}
[data-map-layer] .rmp-map-tile .area-grass {
    fill: #d9ecc8;
    fill-opacity: 0.32;
}
[data-map-layer] .rmp-map-tile .area-park {
    fill: #cde7bd;
    fill-opacity: 0.36;
}
[data-map-layer] .rmp-map-tile .area-cemetery {
    fill: #cbdcc1;
    fill-opacity: 0.24;
}
[data-map-layer] .rmp-map-tile .landuse-residential,
[data-map-layer] .rmp-map-tile .landuse-commercial,
[data-map-layer] .rmp-map-tile .landuse-industrial,
[data-map-layer] .rmp-map-tile .landuse-education,
[data-map-layer] .rmp-map-tile .landuse-healthcare,
[data-map-layer] .rmp-map-tile .area-farmland,
[data-map-layer] .rmp-map-tile .area-forest,
[data-map-layer] .rmp-map-tile .area-grass,
[data-map-layer] .rmp-map-tile .area-park,
[data-map-layer] .rmp-map-tile .area-cemetery,
[data-map-layer] .rmp-map-tile .road-area {
    fill-rule: nonzero;
    stroke: none;
    stroke-width: 0;
}
[data-map-layer] .rmp-map-tile .building {
    fill: #e8e5dc;
    fill-rule: nonzero;
    stroke: #d5d1c8;
    stroke-linejoin: round;
    stroke-width: 0.25;
}

[data-map-layer] .rmp-map-tile .road.casing,
[data-map-layer] .rmp-map-tile .road.detail,
[data-map-layer] .rmp-map-tile .rail.casing,
[data-map-layer] .rmp-map-tile .rail.detail,
[data-map-layer] .rmp-map-tile .boundary.detail {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
}
[data-map-layer] .rmp-map-tile[data-level="overview"] .boundary-national.detail {
    stroke: #9b9488;
    stroke-width: 1.25;
}
[data-map-layer] .rmp-map-tile[data-level="overview"] .boundary-provincial.detail {
    stroke: #b8b0a4;
    stroke-dasharray: 3 2;
    stroke-width: 0.75;
}
[data-map-layer] .rmp-map-tile .rail.detail {
    stroke: #f8f5ef;
    stroke-dasharray: 2 2;
}

[data-map-layer] .rmp-map-tile .labels {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", sans-serif;
    paint-order: stroke fill;
    stroke: #f8f5ef;
    stroke-linejoin: round;
    stroke-width: 1.4;
    text-anchor: middle;
    dominant-baseline: middle;
}
[data-map-layer] .rmp-map-tile .label-place-major { fill: #3a342d; }
[data-map-layer] .rmp-map-tile .label-transport-airport { fill: #3d6482; }
[data-map-layer] .rmp-map-tile .label-transport-rail { fill: #3f3a34; }
[data-map-layer] .rmp-map-tile .label-place-medium { fill: #4a443d; }
[data-map-layer] .rmp-map-tile .label-transport-metro { fill: #4d6c88; }
[data-map-layer] .rmp-map-tile .label-place-minor,
[data-map-layer] .rmp-map-tile .label-area-residential { fill: #625c54; }
[data-map-layer] .rmp-map-tile .label-road-arterial { fill: #554f48; }
[data-map-layer] .rmp-map-tile .label-road-collector { fill: #68625a; }
[data-map-layer] .rmp-map-tile .label-building { fill: #726c64; }
[data-map-layer] .rmp-map-tile .label-area-commercial { fill: #795a5a; }
[data-map-layer] .rmp-map-tile .label-area-industrial { fill: #675d75; }
[data-map-layer] .rmp-map-tile .label-area-education { fill: #715f3b; }
[data-map-layer] .rmp-map-tile .label-area-healthcare { fill: #7a5661; }
[data-map-layer] .rmp-map-tile .label-area-park { fill: #4f6f45; }
[data-map-layer] .rmp-map-tile .label-area-grass { fill: #5f744e; }
[data-map-layer] .rmp-map-tile .label-area-forest { fill: #4f6a43; }
[data-map-layer] .rmp-map-tile .label-area-farmland { fill: #746d45; }
[data-map-layer] .rmp-map-tile .label-area-cemetery { fill: #5e6f58; }
[data-map-layer] .rmp-map-tile .label-area-water { fill: #477285; }
`.trim();

/**
 * Produces the single stylesheet used by live tiles and exported SVG snapshots.
 * Selectors are scoped to the map layer so editor elements with generic class names
 * such as `labels` cannot be affected.
 */
export const compileMapStyleCss = (style: MapStyle) => {
    const { path, local, collector, arterial } = style.roads;
    const display = (enabled: boolean) => (enabled ? 'inline' : 'none');
    const labelDisplay = style.labels.enabled ? 'inline' : 'none';

    // Filled road polygons are generated as part of the local-road layer and must share its visibility and color.
    return `${MAP_BASE_STYLE_CSS}

[data-map-layer] .rmp-map-tile .road-path { display: ${display(path.enabled)}; }
[data-map-layer] .rmp-map-tile .road-local { display: ${display(local.enabled)}; }
[data-map-layer] .rmp-map-tile .road-collector { display: ${display(collector.enabled)}; }
[data-map-layer] .rmp-map-tile .road-arterial { display: ${display(arterial.enabled)}; }
[data-map-layer] .rmp-map-tile .road-area { display: ${display(local.enabled)}; }
[data-map-layer] .rmp-map-tile .road-path.detail { stroke: ${path.color}; }
[data-map-layer] .rmp-map-tile .road-local.casing { stroke: ${local.casingColor}; }
[data-map-layer] .rmp-map-tile .road-local.detail { stroke: ${local.color}; }
[data-map-layer] .rmp-map-tile .road-collector.casing { stroke: ${collector.casingColor}; }
[data-map-layer] .rmp-map-tile .road-collector.detail { stroke: ${collector.color}; }
[data-map-layer] .rmp-map-tile .road-arterial.casing { stroke: ${arterial.casingColor}; }
[data-map-layer] .rmp-map-tile .road-arterial.detail { stroke: ${arterial.color}; }
[data-map-layer] .rmp-map-tile .road-area { fill: ${local.color}; }

[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-path.detail { stroke-width: ${scaled(0.45, path.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-local.casing { stroke-width: ${scaled(1, local.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-local.detail { stroke-width: ${scaled(0.6, local.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-collector.casing { stroke-width: ${scaled(1.5, collector.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-collector.detail { stroke-width: ${scaled(0.9, collector.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-arterial.casing { stroke-width: ${scaled(2, arterial.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .road-arterial.detail { stroke-width: ${scaled(1.2, arterial.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="overview"] .road-arterial.casing { stroke-width: ${scaled(1.4, arterial.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="overview"] .road-arterial.detail { stroke-width: ${scaled(0.8, arterial.widthScale)}; }

[data-map-layer] .rmp-map-tile .rail-metro { display: ${display(style.rails.metro.enabled)}; }
[data-map-layer] .rmp-map-tile .rail-national { display: ${display(style.rails.national.enabled)}; }
[data-map-layer] .rmp-map-tile .rail-metro.casing { stroke: ${style.rails.metro.color}; }
[data-map-layer] .rmp-map-tile .rail-national.casing { stroke: ${style.rails.national.color}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .rail-metro.casing { stroke-width: ${scaled(1.2, style.rails.metro.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .rail-metro.detail { stroke-width: ${scaled(0.55, style.rails.metro.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .rail-national.casing { stroke-width: ${scaled(1.2, style.rails.national.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .rail-national.detail { stroke-width: ${scaled(0.55, style.rails.national.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="overview"] .rail-national.casing { stroke-width: ${scaled(0.9, style.rails.national.widthScale)}; }
[data-map-layer] .rmp-map-tile[data-level="overview"] .rail-national.detail { stroke-width: ${scaled(0.4, style.rails.national.widthScale)}; }

[data-map-layer] .rmp-map-tile .labels { display: ${labelDisplay}; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .labels { font-size: ${scaled(4, style.labels.sizeScale)}px; }
[data-map-layer] .rmp-map-tile[data-level="zoomed"] .label-place-major { font-size: ${scaled(12.8, style.labels.sizeScale)}px; }
[data-map-layer] .rmp-map-tile[data-level="overview"] .labels { font-size: ${scaled(10, style.labels.sizeScale)}px; }
`.trim();
};
