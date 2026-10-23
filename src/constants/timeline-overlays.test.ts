import { describe, expect, it } from 'vitest';
import { normalizeTimelineDocument } from '../util/timeline';
import { createEmptyTimelineDocument, TIMELINE_DOCUMENT_VERSION } from './timeline';
import {
    createTimelineOverlayModule,
    getTimelineOverlayModules,
    hasSubscriberOnlyTimelineOverlays,
    normalizeTimelineOverlayModules,
    TIMELINE_OVERLAY_REGISTRY,
} from './timeline-overlays';

describe('registered Timeline overlays', () => {
    it('creates independent instances from registry defaults', () => {
        const first = createTimelineOverlayModule('line-length', 'bottom-left');
        const second = createTimelineOverlayModule('line-length', 'bottom-right');
        first.settings.unit = 'mi';
        expect(first.id).not.toBe(second.id);
        expect(second.settings).toEqual({ scope: 'network', unit: 'km' });
        expect(TIMELINE_OVERLAY_REGISTRY['line-length'].defaultSettings.unit).toBe('km');
        expect(normalizeTimelineOverlayModules([first, second])).toEqual([first, second]);
    });

    it('migrates enabled legacy annotations in order with stable IDs and original units', () => {
        const legacy = {
            version: 1,
            track: [],
            settings: { showYear: true, showLineName: true, showLineLength: true, lineLengthUnit: 'mi' },
        };
        const migrated = normalizeTimelineDocument(legacy);
        const modules = migrated.overlayModules!;
        expect(modules.map(module => module.type)).toEqual(['date', 'line-identity', 'line-length', 'timed-text']);
        expect(modules.every(module => module.region === 'top-left')).toBe(true);
        expect(modules[0].settings).toEqual({ showMonthDay: true, layout: 'double' });
        expect(modules[2].settings).toEqual({ scope: 'network', unit: 'mi' });
        expect(normalizeTimelineDocument(legacy)).toEqual(migrated);
        expect(getTimelineOverlayModules(migrated)).toEqual(modules);
    });

    it('preserves existing date appearance and persists single-line layout on an individual instance', () => {
        const single = createTimelineOverlayModule('date', 'top-left', 'single-date');
        single.settings.layout = 'single';
        const normalized = normalizeTimelineOverlayModules([
            { id: 'existing-date', type: 'date', region: 'top-left', settings: { showMonthDay: false } },
            single,
            { id: 'invalid-layout', type: 'date', region: 'bottom-left', settings: { layout: 'unknown' } },
        ]);
        expect(normalized).toEqual([
            {
                id: 'existing-date',
                type: 'date',
                region: 'top-left',
                settings: { showMonthDay: false, layout: 'double' },
            },
            single,
            {
                id: 'invalid-layout',
                type: 'date',
                region: 'bottom-left',
                settings: { showMonthDay: true, layout: 'double' },
            },
        ]);
        expect(normalizeTimelineDocument({ version: 2, track: [], overlayModules: normalized }).overlayModules).toEqual(
            normalized
        );
    });

    it('defaults new documents to a timed-text host while keeping an intentionally empty layout', () => {
        expect(createEmptyTimelineDocument().version).toBe(TIMELINE_DOCUMENT_VERSION);
        expect(createEmptyTimelineDocument().overlayModules?.map(module => module.type)).toEqual(['timed-text']);
        const staleCurrentDocument = { version: 2, track: [], overlayModules: undefined, settings: { showYear: true } };
        expect(getTimelineOverlayModules(staleCurrentDocument).map(module => module.type)).toEqual(['timed-text']);
        expect(
            normalizeTimelineDocument({
                version: 1,
                track: [],
                overlayModules: [],
                settings: {
                    ...createEmptyTimelineDocument().settings!,
                    showYear: true,
                },
            }).overlayModules
        ).toEqual([]);
    });

    it('validates module settings and identities without removing saved subscriber regions', () => {
        const modules = normalizeTimelineOverlayModules([
            { id: 'distance', type: 'line-length', region: 'top-right', settings: { scope: 'bad', unit: 'bad' } },
            { id: 'distance', type: 'date', region: 'top-left', settings: {} },
            {
                id: 'caption',
                type: 'timed-text',
                region: 'bottom-right',
                settings: { fontSize: Infinity, alignment: 'right' },
            },
            {
                id: 'oversize',
                type: 'timed-text',
                region: 'bottom-left',
                settings: { fontSize: 200, alignment: 'bad' },
            },
            { id: 'unknown', type: 'not-registered', region: 'top-left', settings: {} },
            { id: 'bad-region', type: 'date', region: 'center', settings: {} },
        ]);
        expect(modules).toEqual([
            { id: 'distance', type: 'line-length', region: 'top-right', settings: { scope: 'network', unit: 'km' } },
            {
                id: 'caption',
                type: 'timed-text',
                region: 'bottom-right',
                settings: { fontSize: 20, alignment: 'right' },
            },
            {
                id: 'oversize',
                type: 'timed-text',
                region: 'bottom-left',
                settings: { fontSize: 48, alignment: 'left' },
            },
        ]);
        expect(hasSubscriberOnlyTimelineOverlays({ overlayModules: modules })).toBe(true);
        expect(hasSubscriberOnlyTimelineOverlays({ overlayModules: [] })).toBe(false);
    });

    it('upgrades document content once while preserving tracks, timing and module edits', () => {
        const legacy = {
            version: 1,
            track: [{ id: 'pause', kind: 'pause' as const, position: 'after' as const, duration: 1 }],
            settings: { ...createEmptyTimelineDocument().settings!, showYear: true },
            labelTrack: [
                {
                    id: 'caption',
                    kind: 'label' as const,
                    text: 'Caption',
                    startSlot: 0,
                    endSlot: 1,
                    startTime: 0.1,
                    endTime: 0.9,
                },
            ],
        };
        const migrated = normalizeTimelineDocument(legacy);
        expect(migrated.version).toBe(2);
        expect(migrated.track).toEqual(legacy.track);
        expect(migrated.labelTrack).toEqual(legacy.labelTrack);
        expect(migrated.overlayModules?.map(module => module.type)).toEqual(['date', 'timed-text']);
        migrated.overlayModules![0].region = 'top-right';
        expect(normalizeTimelineDocument(migrated)).toEqual(migrated);
        expect(() => normalizeTimelineDocument({ version: 999, track: [] })).toThrow(
            'Unsupported Timeline document version'
        );
    });
});
