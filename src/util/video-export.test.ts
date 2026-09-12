import { describe, expect, it } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import stations from '../components/svgs/stations/stations';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { StationType } from '../constants/stations';
import {
    createEmptyTimelineDocument,
    TimelineDocument,
    TimelineElementEntry,
    TimelineEntry,
} from '../constants/timeline';
import {
    applyNodeRevealAnimation,
    applyZoomScale,
    createFrameStationGraph,
    embedVideoExportStyles,
    generateAnimationSequence,
    getCameraViewBox,
    getNodeRevealProgressForFrame,
    getOverviewZoomProgress,
    getPlaybackSegmentDurations,
    getRenderedEdgeLength,
    getStationActivationProgress,
    getVideoExportDimensions,
    interpolateCameraZoom,
    renderBasicStationMarkup,
    renderStationMarkup,
} from './video-export';

const makeGraph = () => new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

const addNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    x: number,
    y: number
) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y,
        type: StationType.LondonTubeBasic,
    });
};

const addEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string,
    startFrom: 'from' | 'to' = 'from',
    color: Theme = [CityCode.Other, '', '#000000', MonoColour.white]
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: 'diagonal' as any,
        style: 'single-color' as any,
        reconcileId: '',
        parallelIndex: -1,
        diagonal: {
            startFrom,
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 7.5,
        },
        'single-color': {
            color,
        },
    });
};

const toTimeline = (...entries: TimelineEntry[]): TimelineDocument => ({
    ...createEmptyTimelineDocument(),
    track: entries,
});

const nodeEntry = (refId: `stn_${string}`, index: number): TimelineElementEntry => ({
    id: `timeline_node_${index}`,
    kind: 'node',
    refId,
    phase: 'enter',
    showAnimation: true,
});

const edgeEntry = (refId: `line_${string}`, index: number): TimelineElementEntry => ({
    id: `timeline_edge_${index}`,
    kind: 'edge',
    refId,
    phase: 'enter',
    showAnimation: true,
});

describe('video export resolution', () => {
    it('uses standard 16:9 dimensions for every resolution option', () => {
        expect(getVideoExportDimensions('720p')).toEqual({ width: 1280, height: 720 });
        expect(getVideoExportDimensions('1080p')).toEqual({ width: 1920, height: 1080 });
        expect(getVideoExportDimensions('2k')).toEqual({ width: 2560, height: 1440 });
        expect(getVideoExportDimensions('4k')).toEqual({ width: 3840, height: 2160 });
    });
});

describe('generateAnimationSequence', () => {
    it('renders strictly in timeline order when timeline exists', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');

        const timeline = toTimeline(
            nodeEntry('stn_b', 1),
            edgeEntry('line_bc', 2),
            nodeEntry('stn_c', 3),
            nodeEntry('stn_a', 4),
            edgeEntry('line_ab', 5)
        );
        const sequence = generateAnimationSequence(graph, timeline);

        expect(sequence.steps).toEqual([
            { id: 'stn_b', kind: 'node', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
        ]);
        expect(sequence.nodes).toEqual(['stn_b', 'stn_c', 'stn_a']);
        expect(sequence.edges).toEqual(['line_bc', 'line_ab']);
    });

    it.each(['from', 'to'] as const)('uses timeline traversal independently of path startFrom=%s', startFrom => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b', startFrom);

        const forwardTimeline = toTimeline(nodeEntry('stn_a', 1), edgeEntry('line_ab', 2), nodeEntry('stn_b', 3));
        const reverseTimeline = toTimeline(nodeEntry('stn_b', 1), edgeEntry('line_ab', 2), nodeEntry('stn_a', 3));

        const forwardSequence = generateAnimationSequence(graph, forwardTimeline);
        const reverseSequence = generateAnimationSequence(graph, reverseTimeline);

        expect(forwardSequence.steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'stn_b', kind: 'node', reverse: false },
        ]);
        expect(reverseSequence.steps).toEqual([
            { id: 'stn_b', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: true },
            { id: 'stn_a', kind: 'node', reverse: false },
        ]);
    });

    it('propagates a known start forward through consecutive line entries', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b', 'to');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c', 'to');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(nodeEntry('stn_a', 1), edgeEntry('line_ab', 2), edgeEntry('line_bc', 3))
        );

        expect(sequence.steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
        ]);
    });

    it('propagates a known destination backward through consecutive line entries', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b', 'to');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c', 'to');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(edgeEntry('line_ab', 1), edgeEntry('line_bc', 2), nodeEntry('stn_c', 3))
        );

        expect(sequence.steps).toEqual([
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
            { id: 'stn_c', kind: 'node', reverse: false },
        ]);
    });

    it('propagates reverse travel through consecutive line entries', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(nodeEntry('stn_c', 1), edgeEntry('line_bc', 2), edgeEntry('line_ab', 3))
        );

        expect(sequence.steps).toEqual([
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: true },
            { id: 'line_ab', kind: 'edge', reverse: true },
        ]);
    });

    it('does not propagate line direction across an unrelated valid station', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addNode(graph, 'stn_x', 300, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_cb', 'stn_c', 'stn_b');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(edgeEntry('line_ab', 1), nodeEntry('stn_x', 2), edgeEntry('line_cb', 3))
        );

        expect(sequence.steps).toEqual([
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'stn_x', kind: 'node', reverse: false },
            { id: 'line_cb', kind: 'edge', reverse: false },
        ]);
    });

    it('falls back to source-to-target for disconnected consecutive lines', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addNode(graph, 'stn_d', 300, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_dc', 'stn_d', 'stn_c', 'to');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(nodeEntry('stn_a', 1), edgeEntry('line_ab', 2), edgeEntry('line_dc', 3))
        );

        expect(sequence.steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_dc', kind: 'edge', reverse: false },
        ]);
    });

    it('prefers the previous station when adjacent stations conflict', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(nodeEntry('stn_a', 1), edgeEntry('line_ab', 2), nodeEntry('stn_a', 3))
        );

        expect(sequence.steps[1]).toEqual({ id: 'line_ab', kind: 'edge', reverse: false });
    });

    it('filters invalid references before inferring adjacent station direction', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b', 'to');

        const sequence = generateAnimationSequence(
            graph,
            toTimeline(
                nodeEntry('stn_a', 1),
                nodeEntry('stn_missing', 2),
                edgeEntry('line_ab', 3),
                edgeEntry('line_missing', 4),
                nodeEntry('stn_b', 5)
            )
        );

        expect(sequence.steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'stn_b', kind: 'node', reverse: false },
        ]);
    });

    it('preserves entrance order and direction when a pro timeline includes keyframes and exits', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');

        const entrances = [
            nodeEntry('stn_c', 1),
            nodeEntry('stn_a', 2),
            edgeEntry('line_ab', 3),
            edgeEntry('line_bc', 4),
            nodeEntry('stn_b', 5),
        ];
        const timeline: TimelineDocument = {
            ...toTimeline(
                ...entrances.slice(0, 3),
                { id: 'timeline_keyframe', kind: 'keyframe', refId: 'stn_c', x: 300, y: 100 },
                { ...nodeEntry('stn_c', 6), phase: 'exit' },
                { ...edgeEntry('line_ab', 7), phase: 'exit' },
                ...entrances.slice(3)
            ),
            mode: 'pro',
        };

        const sequence = generateAnimationSequence(graph, timeline);

        expect(sequence).toEqual(generateAnimationSequence(graph, toTimeline(...entrances)));
        expect(sequence.steps).toEqual([
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: true },
            { id: 'stn_b', kind: 'node', reverse: false },
        ]);
    });

    it('falls back to spatial order when timeline is absent', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 100, 100);
        addNode(graph, 'stn_b', 200, 100);
        addNode(graph, 'stn_c', 150, 200);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c', 'to');

        const sequence = generateAnimationSequence(graph, createEmptyTimelineDocument());

        expect(sequence.nodes).toEqual(['stn_a', 'stn_b', 'stn_c']);
        expect(sequence.edges).toEqual(['line_ab', 'line_bc']);
        expect(sequence.steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'stn_b', kind: 'node', reverse: false },
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
        ]);
    });
});

describe('getPlaybackSegmentDurations', () => {
    it('uses a fixed drawing speed and reserves one second for a camera reposition pause', () => {
        const durations = getPlaybackSegmentDurations(30, [100, 200], 1);

        expect(durations).toEqual({
            edgeDurations: [1, 2],
            pauseDuration: 1,
        });
    });

    it('does not change existing edge durations when the timeline grows or adds pauses', () => {
        const shortTimeline = getPlaybackSegmentDurations(30, [100, 200], 0);
        const longTimeline = getPlaybackSegmentDurations(30, [100, 200, 3000], 2);

        expect(longTimeline.edgeDurations.slice(0, 2)).toEqual(shortTimeline.edgeDurations);
        expect(longTimeline.edgeDurations[2]).toBe(30);
        expect(shortTimeline.pauseDuration).toBe(0);
        expect(longTimeline.pauseDuration).toBe(1);
    });

    it.each([0.5, 1, 1.5, 2])('scales drawing speed by %s without changing camera pauses', multiplier => {
        const durations = getPlaybackSegmentDurations(30, [100, 200], 1, multiplier);

        expect(durations.edgeDurations).toEqual([1 / multiplier, 2 / multiplier]);
        expect(durations.pauseDuration).toBe(1);
    });

    it('keeps drawing speed consistent at different frame rates', () => {
        expect(getPlaybackSegmentDurations(60, [100, 200], 1, 1.5)).toEqual(
            getPlaybackSegmentDurations(30, [100, 200], 1, 1.5)
        );
    });

    it('gives very short lines at least one frame without accelerating other lines', () => {
        const durations = getPlaybackSegmentDurations(30, [1, 1000], 0);
        expect(durations.edgeDurations[0]).toBeCloseTo(1 / 30);
        expect(durations.edgeDurations[1]).toBe(10);
    });

    it('uses one frame for invalid line lengths', () => {
        const durations = getPlaybackSegmentDurations(30, [0, Number.NaN, -1, Number.POSITIVE_INFINITY], 0);

        expect(durations.edgeDurations).toEqual(Array(4).fill(1 / 30));
        expect(durations.pauseDuration).toBe(0);
    });

    it.each([
        [0, 2],
        [10, 0.5],
        [Number.NaN, 1],
        [Number.POSITIVE_INFINITY, 1],
    ])('handles an out-of-range speed multiplier of %s', (multiplier, expectedDuration) => {
        expect(getPlaybackSegmentDurations(30, [100], 0, multiplier).edgeDurations).toEqual([expectedDuration]);
    });

    it('handles a timeline with no edges', () => {
        expect(getPlaybackSegmentDurations(30, [], 0)).toEqual({ edgeDurations: [], pauseDuration: 0 });
    });
});

describe('getRenderedEdgeLength', () => {
    it('measures the first main SVG path without accumulating style layers', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b', 'to');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const primaryPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const decorativePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        group.id = 'line_ab';
        primaryPath.getTotalLength = () => 240;
        decorativePath.getTotalLength = () => 480;
        group.append(primaryPath, decorativePath);
        svg.appendChild(group);

        expect(getRenderedEdgeLength(graph, svg, 'line_ab')).toBe(240);
    });

    it('falls back to endpoint distance when the SVG path cannot be measured', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 30, 40);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        expect(getRenderedEdgeLength(graph, svg, 'line_ab')).toBe(50);
    });
});

describe('renderBasicStationMarkup', () => {
    it('provides Redux context to v2 station components during video frame rendering', () => {
        const graph = makeGraph();
        const stationType = StationType.SuzhouRTInt;
        graph.addNode('stn_suzhou', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: stationType,
            [stationType]: structuredClone(stations[stationType].defaultAttrs),
        });

        const markup = renderBasicStationMarkup(graph, 'stn_suzhou');
        expect(markup).toContain('stn_core_stn_suzhou');
    });

    it('renders a Suzhou interchange from the visible line colors for the current frame', () => {
        const graph = makeGraph();
        const stationType = StationType.SuzhouRTInt;
        const line1: Theme = [CityCode.Suzhou, 'sz1', '#78BA25', MonoColour.white];
        const line2: Theme = [CityCode.Suzhou, 'sz2', '#ED3240', MonoColour.white];
        const line3: Theme = [CityCode.Suzhou, 'sz3', '#F39800', MonoColour.white];
        const attrs = structuredClone(stations[stationType].defaultAttrs);
        attrs.transfer = [
            [
                [...line1, '', ''],
                [...line2, '', ''],
                [...line3, '', ''],
            ],
        ];

        graph.addNode('stn_suzhou', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: stationType,
            [stationType]: attrs,
        });
        addNode(graph, 'misc_node_1', 100, 0);
        addNode(graph, 'misc_node_2', 0, 100);
        addNode(graph, 'misc_node_3', -100, 0);
        addEdge(graph, 'line_1', 'stn_suzhou', 'misc_node_1', 'from', line1);
        addEdge(graph, 'line_2', 'stn_suzhou', 'misc_node_2', 'from', line2);
        addEdge(graph, 'line_3', 'stn_suzhou', 'misc_node_3', 'from', line3);

        const frameGraph = createFrameStationGraph(graph, new Set(['line_1', 'line_2']));
        const frameAttrs = frameGraph.getNodeAttribute('stn_suzhou', StationType.SuzhouRTInt);
        const markup = renderStationMarkup(frameGraph, 'stn_suzhou');

        expect(frameGraph.getNodeAttribute('stn_suzhou', 'type')).toBe(StationType.SuzhouRTInt);
        expect(frameAttrs?.transfer[0].map(transfer => transfer[2])).toEqual(['#78BA25', '#ED3240']);
        expect(markup).toContain('fill="#78BA25"');
        expect(markup).toContain('fill="#ED3240"');
        expect(markup).not.toContain('fill="#F39800"');
    });

    it('keeps the Suzhou interchange hit area transparent after the reveal animation', () => {
        const graph = makeGraph();
        const stationType = StationType.SuzhouRTInt;
        graph.addNode('stn_suzhou', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: stationType,
            [stationType]: structuredClone(stations[stationType].defaultAttrs),
        });

        const markup = renderStationMarkup(graph, 'stn_suzhou')!;
        const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        container.innerHTML = markup;
        applyNodeRevealAnimation(container, 1, 1, undefined, true);

        expect(container.getAttribute('opacity')).toBe('1');
        expect(container.querySelector('#stn_core_stn_suzhou')?.getAttribute('opacity')).toBe('0');
        expect(
            Array.from(container.querySelectorAll('circle')).map(circle => circle.getAttribute('opacity'))
        ).not.toContain('0');
    });

    it('keeps long station names intact during the whole-station fade', () => {
        const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        container.innerHTML = '<g class="rmp-name-outline"><text>Interchange</text></g>';

        applyNodeRevealAnimation(container, 0.5, 0.25, undefined, true);

        expect(container.getAttribute('opacity')).toBe('0.5');
        expect(container.querySelector('text')?.textContent).toBe('Interchange');
        expect(container.querySelectorAll('tspan')).toHaveLength(0);
    });

    it('applies station fade opacity to the wrapper instead of individual elements', () => {
        const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        container.innerHTML =
            '<circle id="station-core" opacity="0.4"></circle><g class="rmp-name-outline"><text>Station</text></g>';

        applyNodeRevealAnimation(container, 0.5, 0.5, undefined, true);

        expect(container.getAttribute('opacity')).toBe('0.5');
        expect(container.querySelector('#station-core')?.getAttribute('opacity')).toBe('0.4');
        expect(container.querySelector('.rmp-name-outline')?.getAttribute('opacity')).toBeNull();
    });

    it('renders the visible line color when a Suzhou interchange is temporarily a basic station', () => {
        const graph = makeGraph();
        const stationType = StationType.SuzhouRTInt;
        const lineColor: Theme = [CityCode.Suzhou, 'sz2', '#ED3240', MonoColour.white];

        graph.addNode('stn_suzhou', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: stationType,
            [stationType]: structuredClone(stations[stationType].defaultAttrs),
        });
        addNode(graph, 'misc_node_1', 100, 0);
        addEdge(graph, 'line_1', 'stn_suzhou', 'misc_node_1', 'from', lineColor);

        const frameGraph = createFrameStationGraph(graph, new Set(['line_1']));
        const frameAttrs = frameGraph.getNodeAttribute('stn_suzhou', StationType.SuzhouRTBasic);

        expect(frameGraph.getNodeAttribute('stn_suzhou', 'type')).toBe(StationType.SuzhouRTBasic);
        expect(frameAttrs?.color).toEqual(lineColor);
    });

    it('preserves the current map station state when automatic station type changes are disabled', () => {
        const graph = makeGraph();
        const stationType = StationType.SuzhouRTInt;
        graph.addNode('stn_suzhou', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: stationType,
            [stationType]: structuredClone(stations[stationType].defaultAttrs),
        });

        const frameGraph = createFrameStationGraph(graph, new Set(), false);

        expect(frameGraph).not.toBe(graph);
        expect(frameGraph.export()).toEqual(graph.export());
        expect(frameGraph.getNodeAttribute('stn_suzhou', 'type')).toBe(StationType.SuzhouRTInt);
    });
});

describe('embedVideoExportStyles', () => {
    it('embeds the station name outline CSS used by dynamically replaced stations', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.innerHTML = '<g class="rmp-name-outline" stroke-width="2.5"><text>Station</text></g>';

        embedVideoExportStyles(svg);

        const style = svg.querySelector('style#rmp_video_export_styles');
        expect(style?.textContent).toContain('.rmp-name-outline');
        expect(style?.textContent).toContain('paint-order: stroke');
        expect(style?.textContent).toContain('stroke: #ffffff');
        expect(svg.outerHTML).toContain('class="rmp-name-outline"');
    });

    it('does not duplicate the embedded stylesheet', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        embedVideoExportStyles(svg);
        embedVideoExportStyles(svg);

        expect(svg.querySelectorAll('style#rmp_video_export_styles')).toHaveLength(1);
    });
});

describe('interpolateCameraZoom', () => {
    it('treats fit-to-elements as 100%', () => {
        expect(applyZoomScale(8, 100)).toBe(8);
        expect(applyZoomScale(8, 200)).toBe(16);
        expect(applyZoomScale(8, 50)).toBe(4);
    });

    it('uses the configured current and fullscreen scales at the transition endpoints', () => {
        expect(interpolateCameraZoom(200, 25, 0)).toBe(200);
        expect(interpolateCameraZoom(200, 25, 1)).toBe(25);
    });

    it('smoothly interpolates between independently configured scales', () => {
        expect(interpolateCameraZoom(300, 40, 0.5)).toBe(170);
    });

    it('changes the rendered camera viewBox size', () => {
        const zoomedOutViewBox = getCameraViewBox({ x: 100, y: 200 }, 100);
        const zoomedInViewBox = getCameraViewBox({ x: 100, y: 200 }, 400);

        expect(zoomedInViewBox.width).toBe(zoomedOutViewBox.width / 4);
        expect(zoomedInViewBox.height).toBe(zoomedOutViewBox.height / 4);
    });
});

describe('getStationActivationProgress', () => {
    it('reveals an approaching station earlier when the viewport is zoomed out', () => {
        const zoomedOutProgress = getStationActivationProgress(1000, 50);
        const zoomedInProgress = getStationActivationProgress(1000, 200);

        expect(zoomedOutProgress).toBeLessThan(zoomedInProgress);
        expect(zoomedOutProgress).toBeGreaterThanOrEqual(0);
        expect(zoomedInProgress).toBeLessThanOrEqual(1);
    });

    it('uses an expanded viewport lookahead to reduce the station appearance delay', () => {
        expect(getStationActivationProgress(1000, 100)).toBeCloseTo(0.892);
    });

    it('reveals the station immediately when the whole line fits inside the viewport radius', () => {
        expect(getStationActivationProgress(50, 100)).toBe(0);
    });

    it('waits for the line endpoint when its rendered length is unavailable', () => {
        expect(getStationActivationProgress(0, 100)).toBe(1);
        expect(getStationActivationProgress(Number.NaN, 100)).toBe(1);
    });
});

describe('getNodeRevealProgressForFrame', () => {
    it('fades stations and their names in together over 0.2 seconds', () => {
        expect(getNodeRevealProgressForFrame('stn_station', 10, 10, 30)).toEqual({
            nodeProgress: 0,
            textProgress: 0,
        });
        expect(getNodeRevealProgressForFrame('stn_station', 13, 10, 30)).toEqual({
            nodeProgress: 0.5,
            textProgress: 0.5,
        });
        expect(getNodeRevealProgressForFrame('stn_station', 16, 10, 30)).toEqual({
            nodeProgress: 1,
            textProgress: 1,
        });
    });

    it('keeps the existing reveal animation for non-station nodes', () => {
        expect(getNodeRevealProgressForFrame('misc_node_label', 10, 10, 30)).toEqual({
            nodeProgress: 0,
            textProgress: 0,
        });
    });
});

describe('getOverviewZoomProgress', () => {
    it('reaches the fullscreen scale halfway through the overview and holds it', () => {
        expect(getOverviewZoomProgress(0, 30)).toBe(0);
        expect(getOverviewZoomProgress(14, 30)).toBe(1);
        expect(getOverviewZoomProgress(29, 30)).toBe(1);
    });
});
