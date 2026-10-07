import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { createEmptyTimelineDocument, DEFAULT_TIMELINE_SETTINGS, TimelineDocument } from '../constants/timeline';
import { LinePathType, LineStyleType } from '../constants/lines';
import {
    appendTimelineEntry,
    createKeyframeEntry,
    findShortestPathByLine,
    getAdjacentLineColors,
    getEdgeThemeString,
    getTimelineCoverage,
    getTimelinePreviewState,
    insertTimelineEntries,
    insertTimelineEntry,
    insertTimelineExitEntry,
    insertKeyframeEntry,
    moveTimelineEntries,
    moveTimelineEntry,
    normalizeTimelineDocument,
    insertTimelineLabel,
    removeTimelineEntry,
    updateKeyframePosition,
} from './timeline';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_a', {
        visible: true,
        zIndex: 0,
        x: 10,
        y: 20,
        type: 'shmetro-basic',
        'shmetro-basic': { names: ['Alpha'], nameOffsetX: 'right', nameOffsetY: 'top' },
    } as unknown as NodeAttributes);
    graph.addNode('stn_b', {
        visible: true,
        zIndex: 0,
        x: 110,
        y: 220,
        type: 'shmetro-basic',
        'shmetro-basic': { names: ['Beta'], nameOffsetX: 'right', nameOffsetY: 'top' },
    } as unknown as NodeAttributes);
    graph.addDirectedEdgeWithKey('line_ab', 'stn_a', 'stn_b', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Simple,
        style: LineStyleType.SingleColor,
        [LinePathType.Simple]: { offset: 0 },
        [LineStyleType.SingleColor]: { color: ['shanghai', 'sh1', '#E3002B', MonoColour.white] },
        reconcileId: '',
        parallelIndex: -1,
    } as unknown as EdgeAttributes);
    return graph;
};

const emptyDocument = (): TimelineDocument => ({ version: 1, track: [] });

describe('timeline colour identity', () => {
    const makeColoredPath = (first: Theme, second: Theme) => {
        const graph = makeGraph();
        graph.setEdgeAttribute('line_ab', LineStyleType.SingleColor, { color: first });
        graph.addNode('stn_c', { ...graph.getNodeAttributes('stn_b'), x: 210 });
        graph.addDirectedEdgeWithKey('line_bc', 'stn_b', 'stn_c', {
            ...graph.getEdgeAttributes('line_ab'),
            [LineStyleType.SingleColor]: { color: second },
        });
        return graph;
    };
    const palette: Theme = [CityCode.Shanghai, 'sh1', '#E3002B', MonoColour.white];
    const custom: Theme = [CityCode.Other, 'first', '#abcdef', MonoColour.white];

    it.each<{ name: string; first: Theme; second: Theme }>([
        {
            name: 'palette colours with the same city and line despite different display colours',
            first: palette,
            second: [CityCode.Shanghai, 'sh1', '#123456', MonoColour.black],
        },
        {
            name: 'custom colours with identical background and foreground despite different labels',
            first: custom,
            second: [CityCode.Other, 'second', '#abcdef', MonoColour.white],
        },
    ])('joins $name into one selectable path', ({ first, second }) => {
        const graph = makeColoredPath(first, second);
        const theme = getEdgeThemeString(graph, 'line_ab');

        expect(getEdgeThemeString(graph, 'line_bc')).toBe(theme);
        expect(getAdjacentLineColors(graph, 'stn_b')).toHaveLength(1);
        expect(findShortestPathByLine(graph, 'stn_a', 'stn_c', theme)).toEqual([
            'stn_a',
            'line_ab',
            'stn_b',
            'line_bc',
            'stn_c',
        ]);
    });

    it.each<{ name: string; first: Theme; second: Theme }>([
        { name: 'custom background', first: custom, second: [CityCode.Other, 'first', '#abcdee', MonoColour.white] },
        { name: 'custom foreground', first: custom, second: [CityCode.Other, 'first', '#abcdef', MonoColour.black] },
        { name: 'custom hex case', first: custom, second: [CityCode.Other, 'first', '#ABCDEF', MonoColour.white] },
        { name: 'palette city', first: palette, second: [CityCode.Beijing, 'sh1', '#E3002B', MonoColour.white] },
        { name: 'palette line', first: palette, second: [CityCode.Shanghai, 'sh2', '#E3002B', MonoColour.white] },
        {
            name: 'palette and custom colour source',
            first: palette,
            second: [CityCode.Other, 'sh1', '#E3002B', MonoColour.white],
        },
    ])('keeps colours differing in $name as separate paths', ({ first, second }) => {
        const graph = makeColoredPath(first, second);
        const theme = getEdgeThemeString(graph, 'line_ab');

        expect(getEdgeThemeString(graph, 'line_bc')).not.toBe(theme);
        expect(getAdjacentLineColors(graph, 'stn_b')).toHaveLength(2);
        expect(findShortestPathByLine(graph, 'stn_a', 'stn_c', theme)).toBeNull();
    });

    it.each([
        { style: LineStyleType.DualColor, unordered: true },
        { style: LineStyleType.MRTTapeOut, unordered: true },
        { style: LineStyleType.LondonRail, unordered: false },
        { style: LineStyleType.Generic, unordered: false },
    ])('preserves the component order semantics of $style', ({ style, unordered }) => {
        const graph = makeColoredPath(palette, custom);
        const attributes = (first: Theme, second: Theme) =>
            style === LineStyleType.LondonRail
                ? { colorBackground: first, colorForeground: second }
                : style === LineStyleType.Generic
                  ? { layers: [{ color: first }, { color: second }] }
                  : { colorA: first, colorB: second };
        graph.updateEdgeAttributes('line_ab', attrs => ({
            ...attrs,
            style,
            [style]: attributes(palette, custom),
        }));
        graph.updateEdgeAttributes('line_bc', attrs => ({
            ...attrs,
            style,
            [style]: attributes(custom, palette),
        }));

        expect(getEdgeThemeString(graph, 'line_ab') === getEdgeThemeString(graph, 'line_bc')).toBe(unordered);
    });
});

describe('timeline utilities', () => {
    it('insertTimelineEntry should ignore keyframes of the same ref', () => {
        const initial: TimelineDocument = {
            ...emptyDocument(),
            track: [{ id: 'key_1', kind: 'keyframe', refId: 'stn_a', x: 1, y: 2 }],
        };
        const next = insertTimelineEntry(initial, 'stn_a', 1);

        expect(next.track.map(entry => entry.kind)).toEqual(['keyframe', 'node']);
    });

    it('insertTimelineEntries should preserve order and skip duplicate refs', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_c');
        const next = insertTimelineEntries(initial, ['stn_a', 'stn_b', 'stn_a', 'stn_c'], 0);

        expect(next.track.map(entry => entry.refId)).toEqual(['stn_a', 'stn_b', 'stn_c']);
    });

    it('should create and update keyframe entries', () => {
        const graph = makeGraph();
        const keyframe = createKeyframeEntry(graph, 'stn_a');

        expect(keyframe).toMatchObject({ kind: 'keyframe', refId: 'stn_a', x: 10, y: 20 });

        const next = updateKeyframePosition({ ...emptyDocument(), track: [keyframe] }, keyframe.id, 33, 44);
        expect(next.track[0]).toMatchObject({ x: 33, y: 44 });
    });

    it('insertKeyframeEntry should add the enter entry before the keyframe when missing', () => {
        const graph = makeGraph();
        const { document, cursor } = insertKeyframeEntry(emptyDocument(), graph, 'stn_a', 0);

        expect(document.track.map(entry => entry.kind)).toEqual(['node', 'keyframe']);
        expect(cursor).toBe(1);
        expect(document.track[1]).toMatchObject({ kind: 'keyframe', x: 10, y: 20 });
    });

    it('inserts a keyframe after the selected enter card, keeping its station visible', () => {
        const graph = makeGraph();
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const { document, cursor } = insertKeyframeEntry(initial, graph, 'stn_a', 0);

        expect(document.track.map(entry => entry.kind)).toEqual(['node', 'keyframe']);
        expect(getTimelinePreviewState(graph, document, cursor).visibleIds.has('stn_a')).toBe(true);
    });

    it('keeps keyframes before exit and exits after existing keyframes', () => {
        const graph = makeGraph();
        const initial = insertKeyframeEntry(emptyDocument(), graph, 'stn_a', 0).document;
        const withExit = insertTimelineExitEntry(initial, 'stn_a', 0).document;
        const { document, cursor } = insertKeyframeEntry(withExit, graph, 'stn_a', withExit.track.length);

        expect(document.track.map(entry => (entry.kind === 'keyframe' ? 'keyframe' : entry.phase))).toEqual([
            'enter',
            'keyframe',
            'keyframe',
            'exit',
        ]);
        expect(getTimelinePreviewState(graph, document, cursor).visibleIds.has('stn_a')).toBe(true);
    });

    it('rejects moving a keyframe outside its station lifetime or moving its enter past it', () => {
        const initial = insertKeyframeEntry(emptyDocument(), makeGraph(), 'stn_a', 0).document;
        const document = insertTimelineExitEntry(initial, 'stn_a', initial.track.length).document;

        expect(moveTimelineEntry(document, 1, 0)).toBe(document);
        expect(moveTimelineEntry(document, 1, 2)).toBe(document);
        expect(moveTimelineEntry(document, 0, 1)).toBe(document);
        expect(moveTimelineEntry(document, 2, 1)).toBe(document);
    });

    it.each(['stn_a', 'line_ab'] as const)('removes the exit and dependent keyframes with enter %s', refId => {
        let document = appendTimelineEntry(emptyDocument(), refId);
        if (refId === 'stn_a') document = insertKeyframeEntry(document, makeGraph(), refId, 1).document;
        document = insertTimelineExitEntry(document, refId, document.track.length).document;
        document = appendTimelineEntry(appendTimelineEntry(document, 'stn_b'), 'stn_c');

        const removed = removeTimelineEntry(document, document.track[0].id);
        expect(removed.track.map(entry => entry.refId)).toEqual(['stn_b', 'stn_c']);
        expect(moveTimelineEntry(removed, 0, 1).track.map(entry => entry.refId)).toEqual(['stn_c', 'stn_b']);
        expect(appendTimelineEntry(removed, refId).track).toHaveLength(3);
    });

    it('removes only the selected exit or keyframe and preserves the enter card', () => {
        const initial = insertKeyframeEntry(emptyDocument(), makeGraph(), 'stn_a', 0).document;
        const document = insertTimelineExitEntry(initial, 'stn_a', 2).document;
        expect(removeTimelineEntry(document, document.track[2].id)).toEqual(initial);
        expect(removeTimelineEntry(document, document.track[1].id).track.map(entry => entry.kind)).toEqual([
            'node',
            'node',
        ]);
        expect(removeTimelineEntry(document, 'missing')).toBe(document);
    });

    it('should insert one exit entry after its enter entry', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const inserted = insertTimelineExitEntry(initial, 'stn_a', 0);

        expect(
            inserted.document.track
                .filter(entry => entry.kind === 'node' || entry.kind === 'edge')
                .map(entry => entry.phase)
        ).toEqual(['enter', 'exit']);
        expect(inserted.cursor).toBe(2);
        expect(insertTimelineExitEntry(inserted.document, 'stn_a', 0).document).toBe(inserted.document);
    });

    it('should reject moving an exit entry before its enter entry', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const withExit = insertTimelineExitEntry(initial, 'stn_a', 1).document;

        expect(moveTimelineEntry(withExit, 1, 0)).toBe(withExit);
    });

    it('moves a block of selected entries together while preserving their order', () => {
        const document = ['a', 'b', 'c', 'd'].reduce(
            (doc, refId) => appendTimelineEntry(doc, refId as `stn_${string}`),
            emptyDocument()
        );
        const ids = document.track.map(entry => entry.id);
        const order = (doc: TimelineDocument) => doc.track.map(entry => entry.id);

        expect(order(moveTimelineEntries(document, [ids[0], ids[2]], 0))).toEqual([ids[0], ids[2], ids[1], ids[3]]);
        expect(order(moveTimelineEntries(document, [ids[0], ids[2]], 1))).toEqual([ids[1], ids[0], ids[2], ids[3]]);
        expect(order(moveTimelineEntries(document, [ids[0], ids[2]], 2))).toEqual([ids[1], ids[3], ids[0], ids[2]]);
        expect(order(moveTimelineEntries(document, [ids[1], ids[2]], 0))).toEqual([ids[1], ids[2], ids[0], ids[3]]);
        expect(order(moveTimelineEntries(document, [ids[3]], 1))).toEqual([ids[0], ids[3], ids[1], ids[2]]);
        expect(moveTimelineEntries(document, [], 0)).toBe(document);
        expect(moveTimelineEntries(document, ['missing'], 0)).toBe(document);
    });

    it('rejects a block move that would split a station lifetime', () => {
        const withExit = insertTimelineExitEntry(appendTimelineEntry(emptyDocument(), 'stn_a'), 'stn_a', 1).document;
        const appended = appendTimelineEntry(withExit, 'stn_b');
        const exitId = withExit.track[1].id;

        expect(moveTimelineEntries(appended, [exitId], 0)).toBe(appended);
    });

    it('inserts an independent label at the cursor and normalizes portable label data', () => {
        const initial = appendTimelineEntry(appendTimelineEntry(emptyDocument(), 'stn_a'), 'line_ab');
        const doc = insertTimelineLabel(initial, '中文\nEnglish <&>', 1);
        expect(doc.track).toBe(initial.track);
        expect(doc.labelTrack![0]).toMatchObject({
            kind: 'label',
            text: '中文\nEnglish <&>',
            startSlot: 1,
            endSlot: 2,
        });
        const label = { ...doc.labelTrack![0], startTime: 0.123456, endTime: 4.75 };
        const normalized = normalizeTimelineDocument({
            ...doc,
            labelTrack: [label, { ...label, text: null }, { ...label, startSlot: -1 }],
        } as never);
        expect(normalized.labelTrack).toEqual([label]);
        expect(
            normalizeTimelineDocument({ ...doc, labelTrack: [{ ...label, startTime: -1, endTime: Infinity }] })
                .labelTrack![0]
        ).not.toHaveProperty('startTime');
        expect(
            normalizeTimelineDocument({ ...doc, labelTrack: [{ ...label, startTime: 4, endTime: 1 }] }).labelTrack![0]
                .endTime
        ).toBe(4);
    });

    it('normalizeTimelineDocument should fallback to an empty document', () => {
        expect(normalizeTimelineDocument(undefined)).toEqual(createEmptyTimelineDocument());
        expect(normalizeTimelineDocument({ version: 1, track: [{} as never] })).toEqual({
            version: 1,
            track: [],
        });
    });

    it('preserves project settings and normalizes invalid playback values', () => {
        const settings = {
            cameraZoom: 8 as const,
            speedMultiplier: 1.7,
            autoChangeStationType: false,
            showYear: true,
            showLineName: true,
            showLineLength: false,
            lineLengthUnit: 'km' as const,
        };
        expect(normalizeTimelineDocument({ version: 1, track: [], settings }).settings).toEqual(settings);
        expect(
            normalizeTimelineDocument({
                version: 1,
                track: [],
                settings: { ...settings, showLineLength: true, lineLengthUnit: 'mi' },
            }).settings
        ).toMatchObject({ showLineLength: true, lineLengthUnit: 'mi' });
        expect(
            normalizeTimelineDocument({
                version: 1,
                track: [],
                settings: { ...settings, lineLengthUnit: 'invalid' } as never,
            }).settings?.lineLengthUnit
        ).toBe('km');
        const legacySettings = { ...settings } as Partial<typeof settings>;
        delete legacySettings.showLineLength;
        delete legacySettings.lineLengthUnit;
        expect(
            normalizeTimelineDocument({ version: 1, track: [], settings: legacySettings as never }).settings
        ).toEqual(settings);
        expect(
            normalizeTimelineDocument({
                version: 1,
                track: [],
                settings: { speedMultiplier: Number.NaN, autoChangeStationType: undefined } as never,
            }).settings
        ).toEqual(DEFAULT_TIMELINE_SETTINGS);
        expect(
            normalizeTimelineDocument({ version: 1, track: [], settings: { ...settings, speedMultiplier: 10 } })
                .settings?.speedMultiplier
        ).toBe(2);
        for (const cameraZoom of [1, 2, 4, 8, 16]) {
            expect(
                normalizeTimelineDocument({ version: 1, track: [], settings: { ...settings, cameraZoom } } as never)
                    .settings?.cameraZoom
            ).toBe(cameraZoom);
        }
        for (const cameraZoom of [0, 3, 100, '4', Number.NaN]) {
            expect(
                normalizeTimelineDocument({ version: 1, track: [], settings: { ...settings, cameraZoom } } as never)
                    .settings?.cameraZoom
            ).toBe(DEFAULT_TIMELINE_SETTINGS.cameraZoom);
        }
    });

    it('keeps precise audio times and falls back to slots when times are invalid', () => {
        const clip = {
            id: 'audio',
            kind: 'audio' as const,
            blobId: 'blob',
            name: 'Music',
            startSlot: 1,
            endSlot: 3,
            startTime: 0.125,
            endTime: 4.75,
        };
        expect(normalizeTimelineDocument({ version: 1, track: [], audioTrack: [clip] }).audioTrack).toEqual([clip]);
        const invalid = normalizeTimelineDocument({
            version: 1,
            track: [],
            audioTrack: [{ ...clip, startTime: -1, endTime: Number.POSITIVE_INFINITY }],
        }).audioTrack![0];
        expect(invalid).not.toHaveProperty('startTime');
        expect(invalid).not.toHaveProperty('endTime');
        expect(invalid).toMatchObject({ startSlot: 1, endSlot: 3 });
        expect(
            normalizeTimelineDocument({
                version: 1,
                track: [],
                audioTrack: [{ ...clip, startTime: 5, endTime: 2 }],
            }).audioTrack![0].endTime
        ).toBe(5);
    });

    it('normalizeTimelineDocument should fill advanced entry defaults and discard legacy mode', () => {
        const normalized = normalizeTimelineDocument({
            version: 1,
            mode: 'pro',
            track: [
                { id: 'clip_1', kind: 'node', refId: 'stn_a' },
                { id: 'key_1', kind: 'keyframe', refId: 'stn_a', x: 1, y: 2 },
            ],
        } as never);

        expect(normalized).not.toHaveProperty('mode');
        expect(normalized.track[0]).toMatchObject({ phase: 'enter', showAnimation: true });
        expect(normalized.track[1]).toMatchObject({ kind: 'keyframe', x: 1, y: 2 });
    });

    it('normalizeTimelineDocument should preserve pause entries without a ref', () => {
        const normalized = normalizeTimelineDocument({
            version: 1,
            track: [{ id: 'pause_1', kind: 'pause', position: 'after', duration: 2 }],
        });

        expect(normalized.track).toEqual([{ id: 'pause_1', kind: 'pause', position: 'after', duration: 2 }]);
    });

    it('should report all graph entries as missing for an empty timeline', () => {
        const graph = makeGraph();
        const coverage = getTimelineCoverage(graph, emptyDocument());

        expect(coverage.missingNodeIds).toEqual(['stn_a', 'stn_b']);
        expect(coverage.missingEdgeIds).toEqual(['line_ab']);
        expect(coverage.missingIds).toEqual(['stn_a', 'stn_b', 'line_ab']);
        expect(coverage.missingNodeCount).toBe(2);
        expect(coverage.missingEdgeCount).toBe(1);
        expect(coverage.isComplete).toBe(false);
    });

    it('should report only graph entries that are not already on the timeline', () => {
        const graph = makeGraph();
        const coverage = getTimelineCoverage(graph, {
            version: 1,
            track: [
                { id: 'clip_1', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'clip_deleted', kind: 'edge', refId: 'line_deleted', phase: 'enter', showAnimation: true },
                { id: 'key_1', kind: 'keyframe', refId: 'stn_b', x: 0, y: 0 },
            ],
        });

        expect(coverage.missingNodeIds).toEqual(['stn_b']);
        expect(coverage.missingEdgeIds).toEqual(['line_ab']);
        expect(coverage.missingIds).toEqual(['stn_b', 'line_ab']);
        expect(coverage.isComplete).toBe(false);
    });

    it('should mark coverage complete when every current graph entry is on the timeline', () => {
        const graph = makeGraph();
        const coverage = getTimelineCoverage(graph, {
            version: 1,
            track: [
                { id: 'clip_1', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'clip_2', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                { id: 'clip_3', kind: 'edge', refId: 'line_ab', phase: 'enter', showAnimation: true },
                { id: 'clip_deleted', kind: 'node', refId: 'stn_deleted', phase: 'enter', showAnimation: true },
            ],
        });

        expect(coverage.missingNodeIds).toEqual([]);
        expect(coverage.missingEdgeIds).toEqual([]);
        expect(coverage.missingIds).toEqual([]);
        expect(coverage.isComplete).toBe(true);
    });

    it('should compute visibility and keyframe positions at the cursor', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 1,
            track: [
                { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'key_a1', kind: 'keyframe', refId: 'stn_a', x: 30, y: 40 },
                { id: 'clip_b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                { id: 'key_a2', kind: 'keyframe', refId: 'stn_a', x: 50, y: 60 },
                { id: 'clip_b_exit', kind: 'node', refId: 'stn_b', phase: 'exit', showAnimation: true },
            ],
        };

        const atStart = getTimelinePreviewState(graph, document, 0);
        expect(atStart.visibleIds.has('stn_a')).toBe(false);
        expect(atStart.visibleIds.has('stn_b')).toBe(false);
        expect(atStart.positions.get('stn_a')).toEqual({ x: 10, y: 20 });

        const afterFirstKeyframe = getTimelinePreviewState(graph, document, 2);
        expect(afterFirstKeyframe.visibleIds.has('stn_a')).toBe(true);
        expect(afterFirstKeyframe.visibleIds.has('stn_b')).toBe(false);
        expect(afterFirstKeyframe.positions.get('stn_a')).toEqual({ x: 30, y: 40 });

        const atMiddle = getTimelinePreviewState(graph, document, 3);
        expect(atMiddle.visibleIds.has('stn_a')).toBe(true);
        expect(atMiddle.visibleIds.has('stn_b')).toBe(true);
        expect(atMiddle.positions.get('stn_a')).toEqual({ x: 40, y: 50 });

        const atExit = getTimelinePreviewState(graph, document, 4);
        expect(atExit.visibleIds.has('stn_b')).toBe(true);

        const atEnd = getTimelinePreviewState(graph, document, 5);
        expect(atEnd.visibleIds.has('stn_b')).toBe(false);
        expect(atEnd.positions.get('stn_a')).toEqual({ x: 50, y: 60 });
    });

    it.each(['stn_a', 'line_ab'] as const)('keeps %s visible on its exit card and hides it after the card', refId => {
        const graph = makeGraph();
        const entered = appendTimelineEntry(emptyDocument(), refId);
        const document = insertTimelineExitEntry(entered, refId, 1).document;

        expect(getTimelinePreviewState(graph, document, 0).visibleIds.has(refId)).toBe(false);
        expect(getTimelinePreviewState(graph, document, 1).visibleIds.has(refId)).toBe(true);
        expect(getTimelinePreviewState(graph, document, 2).visibleIds.has(refId)).toBe(false);
    });

    it('should keep a visible line when its stations are not visible', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 1,
            track: [{ id: 'line_ab', kind: 'edge', refId: 'line_ab', phase: 'enter', showAnimation: true }],
        };

        const preview = getTimelinePreviewState(graph, document, 1);

        expect(preview.visibleIds.has('line_ab')).toBe(true);
        expect(preview.visibleIds.has('stn_a')).toBe(false);
        expect(preview.visibleIds.has('stn_b')).toBe(false);
    });
});
