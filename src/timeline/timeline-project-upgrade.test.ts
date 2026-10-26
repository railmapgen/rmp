import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { createEmptyTimelineDocument } from '../constants/timeline';
import { TIMELINE_PROJECT_APP } from './timeline-project';
import { upgradeTimelineProject } from './timeline-project-upgrade';

const legacyFile = () => ({
    app: TIMELINE_PROJECT_APP,
    version: 1,
    name: 'Original project',
    assets: [{ kind: 'audio', id: 'audio', data: 'data:text/plain;base64,YXVkaW8=' }],
    revision: {
        rmpVersion: 81,
        graph: new MultiDirectedGraph().export(),
        mapEnabled: true,
        mapStyle: structuredClone(DEFAULT_MAP_STYLE),
        svgViewBoxZoom: 75,
        svgViewBoxMin: { x: 12, y: 34 },
        timeline: {
            version: 1,
            track: [],
            settings: {
                ...createEmptyTimelineDocument().settings!,
                showYear: true,
                showLineName: true,
                showLineLength: true,
                lineLengthUnit: 'mi',
            },
            labelTrack: [
                {
                    id: 'caption',
                    kind: 'label',
                    text: 'Caption',
                    startSlot: 0,
                    endSlot: 0,
                    startTime: 0.1,
                    endTime: 8.5,
                },
            ],
            audioTrack: [
                {
                    id: 'sound',
                    kind: 'audio',
                    blobId: 'audio',
                    name: 'Sound',
                    startSlot: 0,
                    endSlot: 0,
                    startTime: 0.1,
                    endTime: 8.5,
                },
            ],
        },
    },
});

describe('Timeline project save upgrades', () => {
    it('upgrades both versions while preserving unrelated fields and source data', () => {
        const original = legacyFile();
        const before = structuredClone(original);
        const upgraded = upgradeTimelineProject(original);
        expect(upgraded.version).toBe(2);
        expect(upgraded.revision.timeline).toMatchObject({
            version: 2,
            settings: createEmptyTimelineDocument().settings,
            labelTrack: original.revision.timeline.labelTrack,
            audioTrack: original.revision.timeline.audioTrack,
            overlayModules: [
                { type: 'date', settings: { showMonthDay: true, layout: 'double' } },
                { type: 'line-identity', settings: { showAppearedLines: false } },
                { type: 'line-length', settings: { scope: 'network', unit: 'mi' } },
                { type: 'timed-text' },
            ],
        });
        expect(upgraded.revision).toMatchObject({
            rmpVersion: original.revision.rmpVersion,
            graph: original.revision.graph,
            mapStyle: original.revision.mapStyle,
            svgViewBoxZoom: original.revision.svgViewBoxZoom,
            svgViewBoxMin: original.revision.svgViewBoxMin,
        });
        expect(upgraded.assets).toEqual(original.assets);
        expect(original).toEqual(before);
        expect(upgradeTimelineProject(upgraded)).toEqual(upgraded);
    });

    it('refuses newer envelopes or documents instead of silently discarding data', () => {
        expect(() => upgradeTimelineProject({ ...legacyFile(), version: 999 })).toThrow(
            'Unsupported Timeline project version'
        );
        const futureDocument = legacyFile();
        futureDocument.revision.timeline.version = 999;
        expect(() => upgradeTimelineProject(futureDocument)).toThrow('Unsupported Timeline document version');
    });
});
