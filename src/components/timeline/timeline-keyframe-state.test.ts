import { MultiDirectedGraph } from 'graphology';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { describe, expect, it } from 'vitest';
import {
    CityCode,
    type EdgeAttributes,
    type GraphAttributes,
    type LineId,
    type NodeAttributes,
} from '../../constants/constants';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { StationType } from '../../constants/stations';
import type { TimelineDocument, TimelineEntry } from '../../constants/timeline';
import { createVideoTimelinePlayback } from '../../util/video-export/video-export-timeline';
import stations from '../svgs/stations/stations';
import { getTimelineKeyframeStationAtCursor, getTimelineVisibleEdgesAtCursor } from './timeline-keyframe-state';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    for (const [i, id] of ['stn_a', 'stn_b', 'stn_c'].entries()) {
        graph.addNode(id, {
            x: i * 100,
            y: 0,
            visible: true,
            zIndex: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: structuredClone(stations[StationType.ShmetroBasic].defaultAttrs),
        });
    }
    for (const [i, id] of ['line_ab', 'line_bc'].entries()) {
        graph.addDirectedEdgeWithKey(id, ['stn_a', 'stn_b'][i], ['stn_b', 'stn_c'][i], {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            style: LineStyleType.SingleColor,
            reconcileId: '',
            parallelIndex: -1,
            [LinePathType.Simple]: { offset: 0 },
            [LineStyleType.SingleColor]: { color: [CityCode.Shanghai, `sh${i + 1}`, '#E3002B', MonoColour.white] },
        });
    }
    return graph;
};

const marker: TimelineEntry = { id: 'marker', kind: 'keyframe', refId: 'stn_b', x: 100, y: 0 };
const edge = (id: string, refId: LineId, phase: 'enter' | 'exit', showAnimation = true): TimelineEntry => ({
    id,
    kind: 'edge',
    refId,
    phase,
    showAnimation,
});

describe('keyframe station topology', () => {
    it.each([
        { name: 'a following entrance', suffix: [edge('next', 'line_bc', 'enter')], expected: ['line_ab', 'line_bc'] },
        { name: 'an animated exit at its start', suffix: [edge('next', 'line_ab', 'exit')], expected: ['line_ab'] },
        { name: 'an immediate exit', suffix: [edge('next', 'line_ab', 'exit', false)], expected: [] },
    ])('matches playback at a marker sharing time with $name', ({ suffix, expected }) => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 2,
            track: [edge('first', 'line_ab', 'enter'), marker, ...suffix],
        };
        const playback = createVideoTimelinePlayback(
            graph,
            document,
            new Map<LineId, number>([
                ['line_ab', 101],
                ['line_bc', 100],
            ]),
            new Map(),
            { fps: 30, drawingSpeed: 100, nodeSeconds: 0.2 }
        );
        const timing = { duration: playback.duration, cursorTimes: playback.cursorTimes };
        const visible = getTimelineVisibleEdgesAtCursor(graph, document, 'marker', timing);
        expect([...visible]).toEqual(expected);
        expect(visible).toEqual(playback.frameAt(timing.cursorTimes[1]).visibleEdges);
    });

    it('removes completed exits and preserves fixed edges despite scheduled exit cards', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 2,
            fixedResources: ['line_bc', 'line_missing', 'stn_a'],
            track: [
                edge('enter', 'line_ab', 'enter'),
                edge('exit', 'line_ab', 'exit'),
                edge('fixed-exit', 'line_bc', 'exit', false),
                marker,
            ],
        };
        expect([
            ...getTimelineVisibleEdgesAtCursor(graph, document, 'marker', {
                duration: 3,
                cursorTimes: [0, 1, 2, 2, 3],
            }),
        ]).toEqual(['line_bc']);
    });

    it('supports a quantized preview sample immediately before the marker', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 2,
            track: [edge('first', 'line_ab', 'enter'), marker, edge('next', 'line_bc', 'enter')],
        };
        const timing = { duration: 2, cursorTimes: [0, 1.01, 1.01, 2] };
        expect([...getTimelineVisibleEdgesAtCursor(graph, document, 'marker', timing, 1)]).toEqual(['line_ab']);
    });

    it.each([undefined, { duration: 2, cursorTimes: [0, NaN, 1, 2] }])(
        'uses the preceding track topology until valid timing is available',
        timing => {
            const graph = makeGraph();
            const document: TimelineDocument = {
                version: 2,
                track: [edge('first', 'line_ab', 'enter'), marker, edge('next', 'line_bc', 'enter')],
            };
            expect([...getTimelineVisibleEdgesAtCursor(graph, document, 'marker', timing)]).toEqual(['line_ab']);
        }
    );

    it('uses same-time edge starts for inferred station types and keeps manual snapshots authoritative', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 2,
            track: [edge('first', 'line_ab', 'enter'), marker, edge('second', 'line_bc', 'enter')],
        };
        const timing = { duration: 2, cursorTimes: [0, 1, 1, 2] };
        expect(getTimelineKeyframeStationAtCursor(graph, document, 'marker')!.type).toBe(StationType.ShmetroBasic);
        expect(getTimelineKeyframeStationAtCursor(graph, document, 'marker', timing)!.type).toBe(
            StationType.ShmetroInt
        );
        const manual = {
            type: StationType.GzmtrBasic,
            attrs: { ...structuredClone(stations[StationType.GzmtrBasic].defaultAttrs), names: ['Manual'] as [string] },
        };
        const authored: TimelineDocument = {
            ...document,
            track: document.track.map(entry => (entry.id === 'marker' ? { ...entry, station: manual } : entry)),
        };
        const resolved = getTimelineKeyframeStationAtCursor(graph, authored, 'marker', timing)!;
        expect(resolved).toEqual(manual);
        resolved.attrs.names[0] = 'Changed after reading';
        expect(manual.attrs.names[0]).toBe('Manual');
        expect(graph.getNodeAttribute('stn_b', 'type')).toBe(StationType.ShmetroBasic);
    });
});
