import { TimelineOverlayModule, TimelineOverlayRegion } from '../../constants/timeline-overlays';
import { TimelineLabelEntry } from '../../constants/timeline';
import { VideoLineAnnotation } from './video-overlay';

const NS = 'http://www.w3.org/2000/svg';
export const TIMELINE_OVERLAY_FRAME = { width: 1280, height: 720, marginX: 30, marginY: 27, gap: 10 };

export interface TimelineOverlayLayoutItem {
    id: string;
    region: TimelineOverlayRegion;
    x: number;
    y: number;
    width: number;
    height: number;
    empty?: boolean;
}

export interface VideoOverlayLineIdentity {
    id: string;
    name: [string, string];
    lineNumber: string;
    color: string;
}

export interface VideoOverlayContext {
    annotation?: VideoLineAnnotation;
    currentLine?: VideoOverlayLineIdentity;
    appearedLines: readonly VideoOverlayLineIdentity[];
    networkLengthKm: number;
    currentLineLengthKm: number;
    mapEnabled: boolean;
    labels: readonly Pick<TimelineLabelEntry, 'id' | 'text'>[];
    minimap: {
        bounds: { x: number; y: number; width: number; height: number };
        viewport: { x: number; y: number; width: number; height: number };
        worldGroupId: string;
        basemapHref?: string;
        /** The output frame background; `none` preserves transparent exports. */
        background?: string;
    };
}

/** Keep the camera outline visible when its view extends beyond the fixed miniature. */
export const getMinimapViewportIntersection = (
    bounds: { x: number; y: number; width: number; height: number },
    viewport: { x: number; y: number; width: number; height: number }
) => {
    const x = Math.max(bounds.x, viewport.x);
    const y = Math.max(bounds.y, viewport.y);
    const right = Math.min(bounds.x + bounds.width, viewport.x + viewport.width);
    const bottom = Math.min(bounds.y + bounds.height, viewport.y + viewport.height);
    return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : undefined;
};

const element = (tag: string, attrs: Record<string, string | number> = {}) => {
    const result = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => result.setAttribute(key, String(value)));
    return result;
};
const textWidth = (text: string, size: number) =>
    Array.from(text).reduce((width, char) => width + size * (char.charCodeAt(0) > 127 ? 1 : 0.62), 0);
const text = (value: string, x: number, y: number, size: number, attrs: Record<string, string | number> = {}) => {
    const result = element('text', { x, y, 'font-size': size, fill: '#172033', ...attrs });
    result.textContent = value;
    return result;
};
const fitText = (value: string, x: number, y: number, size: number, width: number, attrs = {}) => {
    const result = text(value, x, y, size, attrs);
    if (textWidth(value, size) > width) {
        result.setAttribute('textLength', String(width));
        result.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
    return result;
};
const wrapText = (value: string, size: number, width: number) => {
    const result: string[] = [];
    for (const line of value.split(/\r?\n/)) {
        let row = '';
        for (const char of Array.from(line)) {
            if (row && textWidth(row + char, size) > width) {
                result.push(row);
                row = char;
            } else row += char;
        }
        result.push(row);
    }
    return result;
};

interface ModuleContent {
    width: number;
    height: number;
    draw: (group: SVGElement) => void;
}
type ModuleRenderer<K extends TimelineOverlayModule['type']> = (
    module: Extract<TimelineOverlayModule, { type: K }>,
    context: VideoOverlayContext
) => ModuleContent | undefined;

/** Rendering, measurement and module settings share the same discriminated module types. */
const renderers: { [K in TimelineOverlayModule['type']]: ModuleRenderer<K> } = {
    date: (module, context) => {
        const year = context.annotation?.year;
        if (!year) return;
        const monthDay = module.settings.showMonthDay ? context.annotation?.monthDay : '';
        const singleLine = module.settings.layout === 'single' && !!monthDay;
        const yearWidth = textWidth(year, 52);
        const width = Math.max(160, yearWidth + (singleLine ? 12 + textWidth(monthDay, 22) : 0) + 40);
        return {
            width,
            height: monthDay && !singleLine ? 119 : 86,
            draw: group => {
                group.append(
                    text(year, singleLine ? 20 : width / 2, 64, 52, {
                        'text-anchor': singleLine ? 'start' : 'middle',
                        'font-weight': 700,
                        'data-video-date-year': '',
                    })
                );
                if (monthDay)
                    group.append(
                        text(monthDay, singleLine ? 20 + yearWidth + 12 : width / 2, singleLine ? 64 : 95, 22, {
                            'text-anchor': singleLine ? 'start' : 'middle',
                            fill: '#5c687a',
                            'font-weight': 600,
                            'data-video-date-month-day': '',
                        })
                    );
            },
        };
    },
    'line-identity': (module, context) => {
        const annotation = context.annotation;
        const main = annotation?.name[0] || annotation?.name[1] || '';
        const secondary = annotation?.name[0] ? annotation.name[1] : '';
        const history = module.settings.showAppearedLines ? context.appearedLines : [];
        if (!main && !history.length) return;
        const nameX = 39;
        const historyLabel = (line: VideoOverlayLineIdentity) => line.name[0] || line.name[1] || line.lineNumber;
        const historyColumnGap = 8;
        const historyRowHeight = 18;
        const historyLabelOffset = 30;
        // Size columns to their labels instead of spreading short names across the whole card.
        const historyColumnWidths = [0, 1].map(column =>
            Math.min(
                244,
                Math.max(
                    0,
                    ...history
                        .filter((_, index) => index % 2 === column)
                        .map(line => textWidth(historyLabel(line), 14) + historyLabelOffset)
                )
            )
        );
        const historyWidth =
            historyColumnWidths[0] + historyColumnWidths[1] + (historyColumnWidths[1] ? historyColumnGap : 0) + 36;
        const width = Math.min(
            540,
            Math.max(
                220,
                textWidth(main, 28) + nameX + 20,
                textWidth(secondary, 16) + nameX + 20,
                history.length ? historyWidth : 0
            )
        );
        const mainRows = wrapText(main, 28, width - nameX - 20).slice(0, 3);
        const secondaryRows = secondary ? wrapText(secondary, 16, width - nameX - 20).slice(0, 2) : [];
        const metadataHeight = main ? 30 + mainRows.length * 34 + secondaryRows.length * 23 : 0;
        return {
            width,
            height:
                metadataHeight +
                (history.length ? Math.ceil(history.length / 2) * historyRowHeight + (main ? 12 : 24) : 0),
            draw: group => {
                if (main) {
                    group.append(
                        element('rect', {
                            x: 19,
                            y: 15,
                            width: 7,
                            height: metadataHeight - 30,
                            rx: 3.5,
                            fill: annotation!.color,
                            'data-video-current-line-segment': '',
                        })
                    );
                    mainRows.forEach((row, index) =>
                        group.append(text(row, nameX, 43 + index * 34, 28, { 'font-weight': 650 }))
                    );
                    secondaryRows.forEach((row, index) =>
                        group.append(text(row, nameX, 43 + mainRows.length * 34 + index * 23, 16, { fill: '#5c687a' }))
                    );
                }
                history.forEach((line, index) => {
                    const column = index % 2;
                    const x = 18 + (column ? historyColumnWidths[0] + historyColumnGap : 0);
                    const y = metadataHeight + (main ? 0 : 12) + Math.floor(index / 2) * historyRowHeight;
                    group.append(
                        element('rect', {
                            x,
                            y: y + 7,
                            width: 24,
                            height: 4,
                            rx: 2,
                            fill: line.color,
                            'data-video-appeared-line-segment': line.id,
                        }),
                        fitText(
                            historyLabel(line),
                            x + historyLabelOffset,
                            y + 14,
                            14,
                            historyColumnWidths[column] - historyLabelOffset,
                            {
                                'data-video-appeared-line': line.id,
                            }
                        )
                    );
                });
            },
        };
    },
    'line-length': (module, context) => {
        if (!context.mapEnabled) return;
        const km = module.settings.scope === 'network' ? context.networkLengthKm : context.currentLineLengthKm;
        const value = `${(module.settings.unit === 'mi' ? km / 1.609344 : km).toFixed(1)}${module.settings.unit}`;
        return {
            width: Math.max(160, textWidth(value, 24) + 40),
            height: 56,
            draw: group =>
                group.append(
                    text(value, 20, 36, 24, {
                        'font-weight': 600,
                        'data-video-total-length': '',
                        'data-video-length-scope': module.settings.scope,
                    })
                ),
        };
    },
    minimap: (module, context) => {
        const width = { small: 200, medium: 280, large: 360 }[module.settings.size];
        const height = width * (9 / 16);
        return {
            width,
            height,
            draw: group => {
                const { bounds, viewport, worldGroupId, basemapHref, background = '#fff' } = context.minimap;
                const map = element('svg', {
                    x: 6,
                    y: 6,
                    width: width - 12,
                    height: height - 12,
                    viewBox: `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
                    overflow: 'hidden',
                    'data-video-minimap': '',
                });
                map.append(
                    element('rect', {
                        ...bounds,
                        fill: background,
                        'fill-opacity': 1,
                        'data-video-minimap-background': '',
                    })
                );
                if (context.mapEnabled && basemapHref)
                    map.append(element('image', { ...bounds, href: basemapHref, preserveAspectRatio: 'none' }));
                map.append(element('use', { href: `#${worldGroupId}` }));
                const indicator = getMinimapViewportIntersection(bounds, viewport);
                if (indicator) {
                    const unitsPerPixel = Math.max(bounds.width / (width - 12), bounds.height / (height - 12));
                    const radius = Math.min(4 * unitsPerPixel, indicator.width / 2, indicator.height / 2);
                    map.append(
                        element('rect', {
                            ...indicator,
                            rx: radius,
                            ry: radius,
                            fill: '#d6bcfa',
                            'fill-opacity': 0.12,
                            stroke: '#b794f4',
                            'stroke-width': 1,
                            'vector-effect': 'non-scaling-stroke',
                            'data-video-minimap-viewport': '',
                        })
                    );
                }
                group.append(map);
            },
        };
    },
    'timed-text': (module, context) => {
        const size = module.settings.fontSize;
        const allRows = context.labels
            .filter(label => label.text.trim())
            .flatMap(label => wrapText(label.text, size, 420).map(value => ({ id: label.id, value })));
        const rows = allRows.slice(0, 16);
        if (allRows.length > rows.length)
            rows[rows.length - 1].value = rows[rows.length - 1].value.replace(/.{0,3}$/, '…');
        if (!rows.length) return;
        const width = Math.min(460, Math.max(220, ...rows.map(row => textWidth(row.value, size) + 40)));
        const anchor = { left: 'start', center: 'middle', right: 'end' }[module.settings.alignment];
        const x = { left: 20, center: width / 2, right: width - 20 }[module.settings.alignment];
        return {
            width,
            height: rows.length * (size + 8) + 28,
            draw: group =>
                rows.forEach((row, index) =>
                    group.append(
                        text(row.value, x, 20 + size + index * (size + 8), size, {
                            'text-anchor': anchor,
                            'data-video-label': row.id,
                        })
                    )
                ),
        };
    },
};

const contentFor = (module: TimelineOverlayModule, context: VideoOverlayContext, placeholders: boolean) => {
    // The registry preserves the relationship between a discriminator and its settings.
    const renderer = renderers[module.type] as (
        module: TimelineOverlayModule,
        context: VideoOverlayContext
    ) => ModuleContent | undefined;
    return renderer(module, context) ?? (placeholders ? { width: 220, height: 56, draw: () => {} } : undefined);
};

export const layoutTimelineOverlayModules = (
    modules: readonly TimelineOverlayModule[],
    context: VideoOverlayContext,
    options: { editPlaceholders?: boolean } = {}
): TimelineOverlayLayoutItem[] => {
    const result: TimelineOverlayLayoutItem[] = [];
    const { marginX, marginY, gap } = TIMELINE_OVERLAY_FRAME;
    const contents = modules.flatMap(module => {
        const content = contentFor(module, context, !!options.editPlaceholders);
        return content ? [{ module, content }] : [];
    });
    const regionHeight = (region: TimelineOverlayRegion) => {
        const entries = contents.filter(entry => entry.module.region === region);
        return entries.reduce((sum, entry) => sum + entry.content.height, 0) + Math.max(0, entries.length - 1) * gap;
    };
    for (const region of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
        const entries = contents.filter(entry => entry.module.region === region);
        const totalHeight = regionHeight(region);
        const side = region.endsWith('left') ? 'left' : 'right';
        const topHeight = regionHeight(`top-${side}`);
        const bottomHeight = regionHeight(`bottom-${side}`);
        const scale = Math.min(
            1,
            (720 - marginY * 2) / Math.max(1, topHeight + bottomHeight + (topHeight && bottomHeight ? gap : 0))
        );
        let y = region.startsWith('top') ? marginY : 720 - marginY - totalHeight * scale;
        for (const { module, content } of entries) {
            const width = content.width * scale;
            const height = content.height * scale;
            result.push({
                id: module.id,
                region,
                x: region.endsWith('right') ? 1280 - marginX - width : marginX,
                y,
                width,
                height,
                empty: !contentFor(module, context, false),
            });
            y += height + gap * scale;
        }
    }
    return result;
};

export const createVideoOverlayModules = (
    modules: readonly TimelineOverlayModule[],
    context: VideoOverlayContext,
    viewport: { x: number; y: number; width: number },
    editPlaceholders = false
) => {
    const layout = layoutTimelineOverlayModules(modules, context, { editPlaceholders });
    const overlay = element('g', {
        id: 'rmp_video_line_overlay',
        transform: `translate(${viewport.x}, ${viewport.y}) scale(${viewport.width / 1280})`,
        'pointer-events': 'none',
        'font-family': "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        'font-variant-numeric': 'tabular-nums',
    }) as SVGGElement;
    for (const rect of layout) {
        if (rect.empty) continue;
        const module = modules.find(module => module.id === rect.id)!;
        const content = contentFor(module, context, editPlaceholders)!;
        const group = element('g', {
            transform: `translate(${rect.x}, ${rect.y}) scale(${rect.width / content.width})`,
            'data-overlay-module-id': rect.id,
            'data-overlay-region': rect.region,
            'data-overlay-x': rect.x,
            'data-overlay-y': rect.y,
            'data-overlay-width': rect.width,
            'data-overlay-height': rect.height,
        });
        group.append(
            element('rect', {
                width: content.width,
                height: content.height,
                rx: 14,
                fill: module.type === 'minimap' ? (context.minimap.background ?? '#fff') : '#fff',
                'fill-opacity': module.type === 'minimap' ? 1 : 0.93,
                stroke: '#cbd5e1',
                'stroke-opacity': 0.42,
                ...(module.type === 'minimap' ? { 'data-video-minimap-card': '' } : {}),
            })
        );
        content.draw(group);
        overlay.append(group);
    }
    return { overlay, layout };
};

/** Empty timelines still offer selectable, consistently measured authoring placeholders. */
export const getEmptyTimelineOverlayLayout = (modules: readonly TimelineOverlayModule[]) =>
    layoutTimelineOverlayModules(
        modules,
        {
            appearedLines: [],
            networkLengthKm: 0,
            currentLineLengthKm: 0,
            mapEnabled: false,
            labels: [],
            minimap: {
                bounds: { x: 0, y: 0, width: 1280, height: 720 },
                viewport: { x: 0, y: 0, width: 1280, height: 720 },
                worldGroupId: '',
            },
        },
        { editPlaceholders: true }
    );
