import { nanoid } from 'nanoid';
import type { TimelineLengthUnit } from './timeline';

export const TIMELINE_OVERLAY_REGIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type TimelineOverlayRegion = (typeof TIMELINE_OVERLAY_REGIONS)[number];

export interface TimelineOverlaySettings {
    date: { showMonthDay: boolean; layout: 'single' | 'double' };
    'line-identity': { showAppearedLines: boolean };
    'line-length': { scope: 'network' | 'currentLine'; unit: TimelineLengthUnit };
    minimap: { size: 'small' | 'medium' | 'large' };
    'timed-text': { fontSize: number; alignment: 'left' | 'center' | 'right' };
}

export type TimelineOverlayModuleType = keyof TimelineOverlaySettings;
export type TimelineOverlayModule<T extends TimelineOverlayModuleType = TimelineOverlayModuleType> = {
    [K in T]: { id: string; type: K; region: TimelineOverlayRegion; settings: TimelineOverlaySettings[K] };
}[T];

export interface TimelineOverlayField {
    key: string;
    labelKey: string;
    type: 'boolean' | 'select' | 'number';
    options?: Record<string, string>;
    min?: number;
    max?: number;
    step?: number;
}

export interface TimelineOverlayDefinition<T extends TimelineOverlayModuleType> {
    labelKey: string;
    defaultSettings: TimelineOverlaySettings[T];
    normalizeSettings: (settings: unknown) => TimelineOverlaySettings[T];
    fields: TimelineOverlayField[];
}

const key = (suffix: string) => `header.timelinePage.overlayModules.${suffix}`;
const objectSettings = (settings: unknown): Record<string, unknown> =>
    settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {};

/** One registration supplies creation, portable validation and the settings editor. */
export const TIMELINE_OVERLAY_REGISTRY: {
    [K in TimelineOverlayModuleType]: TimelineOverlayDefinition<K>;
} = {
    date: {
        labelKey: key('names.date'),
        defaultSettings: { showMonthDay: true, layout: 'double' },
        normalizeSettings: settings => {
            const value = objectSettings(settings);
            return {
                showMonthDay: value.showMonthDay !== false,
                layout: value.layout === 'single' ? 'single' : 'double',
            };
        },
        fields: [
            {
                key: 'showMonthDay',
                labelKey: key('fields.showMonthDay'),
                type: 'select',
                options: { false: key('options.yearOnly'), true: key('options.yearMonthDay') },
            },
            {
                key: 'layout',
                labelKey: key('fields.dateLayout'),
                type: 'select',
                options: { single: key('options.singleLine'), double: key('options.doubleLine') },
            },
        ],
    },
    'line-identity': {
        labelKey: key('names.lineIdentity'),
        defaultSettings: { showAppearedLines: false },
        normalizeSettings: settings => ({ showAppearedLines: objectSettings(settings).showAppearedLines === true }),
        fields: [{ key: 'showAppearedLines', labelKey: key('fields.showAppearedLines'), type: 'boolean' }],
    },
    'line-length': {
        labelKey: key('names.lineLength'),
        defaultSettings: { scope: 'network', unit: 'km' },
        normalizeSettings: settings => {
            const value = objectSettings(settings);
            return {
                scope: value.scope === 'currentLine' ? 'currentLine' : 'network',
                unit: value.unit === 'mi' ? 'mi' : 'km',
            };
        },
        fields: [
            {
                key: 'scope',
                labelKey: key('fields.lengthScope'),
                type: 'select',
                options: { network: key('options.network'), currentLine: key('options.currentLine') },
            },
            {
                key: 'unit',
                labelKey: key('fields.unit'),
                type: 'select',
                options: { km: key('options.km'), mi: key('options.mi') },
            },
        ],
    },
    minimap: {
        labelKey: key('names.minimap'),
        defaultSettings: { size: 'medium' },
        normalizeSettings: settings => {
            const size = objectSettings(settings).size;
            return { size: size === 'small' || size === 'large' ? size : 'medium' };
        },
        fields: [
            {
                key: 'size',
                labelKey: key('fields.size'),
                type: 'select',
                options: { small: key('options.small'), medium: key('options.medium'), large: key('options.large') },
            },
        ],
    },
    'timed-text': {
        labelKey: key('names.timedText'),
        defaultSettings: { fontSize: 20, alignment: 'left' },
        normalizeSettings: settings => {
            const value = objectSettings(settings);
            return {
                fontSize:
                    typeof value.fontSize === 'number' && Number.isFinite(value.fontSize)
                        ? Math.max(12, Math.min(48, value.fontSize))
                        : 20,
                alignment: value.alignment === 'center' || value.alignment === 'right' ? value.alignment : 'left',
            };
        },
        fields: [
            { key: 'fontSize', labelKey: key('fields.fontSize'), type: 'number', min: 12, max: 48, step: 1 },
            {
                key: 'alignment',
                labelKey: key('fields.alignment'),
                type: 'select',
                options: { left: key('options.left'), center: key('options.center'), right: key('options.right') },
            },
        ],
    },
};

export const createTimelineOverlayModule = <T extends TimelineOverlayModuleType>(
    type: T,
    region: TimelineOverlayRegion,
    id = `timeline_overlay_${nanoid(10)}`
): TimelineOverlayModule<T> =>
    ({
        id,
        type,
        region,
        settings: { ...TIMELINE_OVERLAY_REGISTRY[type].defaultSettings },
    }) as TimelineOverlayModule<T>;

export const normalizeTimelineOverlayModules = (value: unknown): TimelineOverlayModule[] => {
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    return value.flatMap(candidate => {
        if (!candidate || typeof candidate !== 'object') return [];
        const { id, type, region, settings } = candidate as Record<string, unknown>;
        if (
            typeof id !== 'string' ||
            !id ||
            ids.has(id) ||
            typeof type !== 'string' ||
            !Object.prototype.hasOwnProperty.call(TIMELINE_OVERLAY_REGISTRY, type) ||
            !TIMELINE_OVERLAY_REGIONS.includes(region as TimelineOverlayRegion)
        )
            return [];
        ids.add(id);
        return [
            {
                id,
                type,
                region,
                settings: TIMELINE_OVERLAY_REGISTRY[type as TimelineOverlayModuleType].normalizeSettings(settings),
            } as TimelineOverlayModule,
        ];
    });
};

export interface TimelineOverlayDocumentLike {
    overlayModules?: unknown;
}

/** Explicit empty layouts stay empty; new documents start with a stable caption host. */
export const getTimelineOverlayModules = (document: TimelineOverlayDocumentLike): TimelineOverlayModule[] => {
    if (Array.isArray(document.overlayModules)) return normalizeTimelineOverlayModules(document.overlayModules);
    return [createTimelineOverlayModule('timed-text', 'top-left', 'timeline_overlay_timed_text')];
};

export const hasSubscriberOnlyTimelineOverlays = (document: TimelineOverlayDocumentLike): boolean =>
    getTimelineOverlayModules(document).some(module => module.region === 'top-right');
