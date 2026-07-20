export type MapRoadKind = 'path' | 'local' | 'collector' | 'arterial';
export type MapRailKind = 'metro' | 'national';

export interface MapRoadStyle {
    casingColor: string;
    color: string;
    widthScale: number;
}

export interface MapStyle {
    roads: Record<MapRoadKind, MapRoadStyle>;
    rails: Record<MapRailKind, { color: string; widthScale: number }>;
    labels: {
        enabled: boolean;
        sizeScale: number;
    };
}

export const DEFAULT_MAP_STYLE: MapStyle = {
    roads: {
        path: { casingColor: '#dedbd4', color: '#dedbd4', widthScale: 1 },
        local: { casingColor: '#cfd39c', color: '#fbf8d0', widthScale: 1 },
        collector: { casingColor: '#c8cf86', color: '#f7fabf', widthScale: 1 },
        arterial: { casingColor: '#d8ab62', color: '#f6d19b', widthScale: 1 },
    },
    rails: {
        metro: { color: '#4d8fd1', widthScale: 1 },
        national: { color: '#8f8a83', widthScale: 1 },
    },
    labels: {
        enabled: true,
        sizeScale: 1,
    },
};

const formatNumber = (value: number) => Number(value.toFixed(4)).toString();

const scaled = (base: number, scale: number) => formatNumber(base * scale);

/**
 * Produces the single stylesheet used by live tiles and exported SVG snapshots.
 * Selectors are scoped to the map layer so editor elements with generic class names
 * such as `labels` cannot be affected.
 */
export const compileMapStyleCss = (style: MapStyle) => {
    const { path, local, collector, arterial } = style.roads;
    const labelDisplay = style.labels.enabled ? 'inline' : 'none';

    return `
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
