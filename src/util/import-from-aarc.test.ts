import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LineDefinition } from '../constants/line-definitions';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { PathPoint } from '../constants/path';
import { StationType } from '../constants/stations';
import { convertAARCToRmp } from './import-from-aarc';
import {
    getLineTheme,
    getLineTopology,
    getStationLabel,
    isOpeningDateValid,
    reconcileLineDefinitions,
} from './line-definitions';
import { isLinePolicyVisible } from './line-path-availability';
import { getEndPoint, getStartPoint } from './path';
import { getLines } from './process-elements';
import { getTimelineImportLines, populateTimelineFromLineInformation } from './timeline-line-import';

interface TestTime {
    propose?: number;
    construct?: number;
    open?: number;
    suspend?: [number, number][];
    abandon?: number;
}

interface TestPoint {
    id: number;
    pos: [number, number];
    dir: number;
    sta: number;
    name?: string;
    nameS?: string;
    free?: boolean;
}

interface TestLine {
    id: number;
    pts: number[];
    name: string;
    nameSub: string;
    color: string;
    type: number;
    time?: TestTime;
    parent?: number;
    isFake?: boolean;
    isFilled?: boolean;
    colorPre?: number;
    width?: number;
    ptSnapSize?: number;
    ptSize?: number;
}

interface TestSave {
    idIncre: number;
    points: TestPoint[];
    lines: TestLine[];
    pointLinks?: { pts: [number, number]; type: number }[];
    timeSlices?: { id: number; line: number; fromPt: number; toPt: number; time: TestTime }[];
    textTags: [];
    cvsSize: [number, number];
    config: object;
}

const date = (year: number, month: number, day: number) => new Date(year, month - 1, day, 0, 5).getTime();
const point = (id: number, pos: [number, number] = [(id - 1) * 100, 0]): TestPoint => ({
    id,
    pos,
    dir: 0,
    sta: 1,
    name: `站 ${id}`,
    nameS: `Station ${id}`,
});
const line = (id: number, pts: number[], overrides: Partial<TestLine> = {}): TestLine => ({
    id,
    pts,
    name: `线路 ${id}`,
    nameSub: `Line ${id}`,
    color: '#123456',
    type: 0,
    ...overrides,
});
const save = (points: TestPoint[], lines: TestLine[], overrides: Partial<TestSave> = {}): TestSave => ({
    idIncre: 100,
    points,
    lines,
    textTags: [],
    cvsSize: [1000, 1000],
    config: {},
    ...overrides,
});
const convert = (source: TestSave) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    convertAARCToRmp(JSON.stringify(source), graph);
    return graph;
};
const definitions = (graph: ReturnType<typeof convert>) => graph.getAttribute('lineDefinitions')!;
const edgeDates = (graph: ReturnType<typeof convert>) => {
    const dates = new Map(definitions(graph).flatMap(item => item.edgeIds.map(id => [id, item.openingDate] as const)));
    return graph.edges().map(id => dates.get(id));
};
const assertValidOrigin = (graph: ReturnType<typeof convert>, definition: LineDefinition) => {
    expect(graph.hasNode(definition.exportStartStationId)).toBe(true);
    expect(getLineTopology(graph.export(), definition).startCandidates).toContain(definition.exportStartStationId);
};
const generatedPath = (graph: ReturnType<typeof convert>, edgeId = graph.edges()[0]) => {
    const attributes = graph.getEdgeAttributes(edgeId);
    const source = graph.getNodeAttributes(graph.source(edgeId));
    const target = graph.getNodeAttributes(graph.target(edgeId));
    return linePaths[attributes.type].generatePath(
        source.x,
        target.x,
        source.y,
        target.y,
        attributes[attributes.type] as never
    );
};
const renderedPath = (graph: ReturnType<typeof convert>, edgeId: string) => {
    const path = getLines(graph).find(element => element.id === edgeId)?.line?.path;
    if (!path) throw new Error(`Imported edge ${edgeId} has no rendered path.`);
    return path;
};
const edgeConnectingStations = (graph: ReturnType<typeof convert>, fromName: string, toName: string) => {
    const exported = graph.export();
    const edge = graph.findEdge((_id, _attributes, source, target) => {
        const names = [source, target].map(id => getStationLabel(exported, id).split('/'));
        return names.some(endpoint => endpoint.includes(fromName)) && names.some(endpoint => endpoint.includes(toName));
    });
    if (!edge) throw new Error(`Missing imported edge connecting ${fromName} and ${toName}.`);
    return edge;
};
const scaledPoint = ([x, y]: [number, number]): PathPoint => ({ x: x * 0.3125, y: y * 0.3125 });
const expectPoint = (actual: PathPoint, expected: PathPoint) => {
    expect(actual.x).toBeCloseTo(expected.x, 8);
    expect(actual.y).toBeCloseTo(expected.y, 8);
};
const expectSameDirection = (start: PathPoint, end: PathPoint, expectedStart: PathPoint, expectedEnd: PathPoint) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const expectedDx = expectedEnd.x - expectedStart.x;
    const expectedDy = expectedEnd.y - expectedStart.y;
    expect(dx * expectedDy - dy * expectedDx).toBeCloseTo(0, 6);
    expect(dx * expectedDx + dy * expectedDy).toBeGreaterThan(0);
};
const expectRoundedTurn = (
    graph: ReturnType<typeof convert>,
    edgeId: string,
    originalStart: [number, number],
    originalCorner: [number, number],
    originalEnd: [number, number]
) => {
    expect(isLinePolicyVisible(graph.getEdgeAttributes(edgeId), false, false)).toBe(true);
    const path = renderedPath(graph, edgeId);
    expect(path).toEqual(generatedPath(graph, edgeId));
    expect(path.kind).toBe('mlcl');
    if (path.kind !== 'mlcl') throw new Error('Expected one rounded native RMP turn.');
    const [move, incoming, curve, outgoing] = path.commands;
    const start = scaledPoint(originalStart);
    const corner = scaledPoint(originalCorner);
    const end = scaledPoint(originalEnd);
    expectPoint(move.to, start);
    expectPoint(outgoing.to, end);
    expectSameDirection(start, incoming.to, start, corner);
    expectSameDirection(curve.to, end, corner, end);
    expectSameDirection(incoming.to, curve.c1, start, corner);
    expectSameDirection(curve.c2, curve.to, corner, end);
};

describe('convertAARCToRmp geometry', () => {
    const quadrants = [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
    ];

    it.each([
        {
            type: LinePathType.Perpendicular,
            corner: [200, 0] as [number, number],
            end: [200, 200] as [number, number],
            directions: [0, 0, 0],
        },
        {
            type: LinePathType.RotatePerpendicular,
            corner: [100, 100] as [number, number],
            end: [200, 0] as [number, number],
            directions: [1, 1, 1],
        },
    ])(
        'replaces an unnamed plain control-point corner with one rounded $type edge',
        ({ type, corner, end, directions }) => {
            const graph = convert(
                save(
                    [
                        point(1, [0, 0]),
                        { ...point(2, corner), sta: 0, name: undefined, nameS: undefined },
                        point(3, end),
                    ].map((item, index) => ({ ...item, dir: directions[index] })),
                    [line(10, [1, 2, 3])]
                )
            );
            const edge = graph.edges()[0];

            expect(graph.order).toBe(2);
            expect(graph.size).toBe(1);
            expect(graph.getEdgeAttribute(edge, 'type')).toBe(type);
            expect(definitions(graph)[0].edgeIds).toEqual([edge]);
            expectRoundedTurn(graph, edge, [0, 0], corner, end);
        }
    );

    it.each([
        { reason: 'station', overrides: { sta: 1 } },
        { reason: 'named control point', overrides: { name: 'Named corner' } },
        { reason: 'free control point', overrides: { free: true } },
    ])('retains a corner that represents a $reason', ({ overrides }) => {
        const graph = convert(
            save(
                [
                    point(1, [0, 0]),
                    { ...point(2, [200, 0]), sta: 0, name: undefined, nameS: undefined, ...overrides },
                    point(3, [200, 200]),
                ],
                [line(10, [1, 2, 3])]
            )
        );

        expect(graph.order).toBe(3);
        expect(graph.size).toBe(2);
        expect(graph.findNode((_id, attrs) => attrs.x === 200 * 0.3125 && attrs.y === 0)).toBeDefined();
    });

    it('retains a shared control point where another line connects', () => {
        const graph = convert(
            save(
                [
                    point(1, [0, 0]),
                    { ...point(2, [200, 0]), sta: 0, name: undefined, nameS: undefined },
                    point(3, [200, 200]),
                    point(4, [400, 0]),
                ],
                [line(10, [1, 2, 3]), line(20, [2, 4])]
            )
        );
        const shared = graph.findNode((_id, attrs) => attrs.x === 200 * 0.3125 && attrs.y === 0)!;

        expect(graph.order).toBe(4);
        expect(graph.size).toBe(3);
        expect(graph.degree(shared)).toBe(3);
        expect(definitions(graph).map(item => item.edgeIds.length)).toEqual([2, 1]);
    });

    it('retains a plain corner at a time-slice boundary so both dates remain separate', () => {
        const graph = convert(
            save(
                [
                    point(1, [0, 0]),
                    { ...point(2, [200, 0]), sta: 0, name: undefined, nameS: undefined },
                    point(3, [200, 200]),
                ],
                [line(10, [1, 2, 3], { time: { open: date(2000, 1, 1) } })],
                { timeSlices: [{ id: 30, line: 10, fromPt: 2, toPt: 3, time: { open: date(2023, 6, 8) } }] }
            )
        );

        expect(graph.order).toBe(3);
        expect(graph.size).toBe(2);
        expect(edgeDates(graph)).toEqual(['2000-01-01', '2023-06-08']);
        expect(definitions(graph).map(item => item.edgeIds.length)).toEqual([1, 1]);
    });

    it('retains a non-corner midpoint for a genuine two-turn interval and keeps both edges in its dated span', () => {
        const graph = convert(
            save([point(1, [0, 0]), point(2, [200, 100])], [line(10, [1, 2], { time: { open: date(2023, 6, 8) } })])
        );
        const virtualNodes = graph.filterNodes((_id, attrs) => attrs.type === MiscNodeType.Virtual);

        expect(graph.order).toBe(3);
        expect(graph.size).toBe(2);
        expect(virtualNodes).toHaveLength(1);
        expectPoint(graph.getNodeAttributes(virtualNodes[0]), scaledPoint([100, 50]));
        expect(edgeDates(graph)).toEqual(['2023-06-08', '2023-06-08']);
        expect(new Set(definitions(graph)[0].edgeIds)).toEqual(new Set(graph.edges()));
        expectRoundedTurn(graph, graph.edges()[0], [0, 0], [50, 0], [100, 50]);
        expectRoundedTurn(graph, graph.edges()[1], [100, 50], [150, 100], [200, 100]);
    });

    it.each([false, true])(
        'rounds adjacent anonymous 90-degree corners with a join outside the corners, reversed=%s',
        reverse => {
            const points = [point(1, [0, 0]), point(2, [100, 0]), point(3, [100, 100]), point(4, [0, 100])];
            points[1].sta = points[2].sta = 0;
            points[1].name = points[1].nameS = points[2].name = points[2].nameS = undefined;
            const graph = convert(save(points, [line(10, reverse ? [4, 3, 2, 1] : [1, 2, 3, 4])]));
            const joins = graph.filterNodes((_id, attrs) => attrs.type === MiscNodeType.Virtual);

            expect(graph.order).toBe(3);
            expect(graph.size).toBe(2);
            expect(joins).toHaveLength(1);
            expectPoint(graph.getNodeAttributes(joins[0]), scaledPoint([100, 50]));
            if (reverse) {
                expectRoundedTurn(graph, graph.edges()[0], [0, 100], [100, 100], [100, 50]);
                expectRoundedTurn(graph, graph.edges()[1], [100, 50], [100, 0], [0, 0]);
            } else {
                expectRoundedTurn(graph, graph.edges()[0], [0, 0], [100, 0], [100, 50]);
                expectRoundedTurn(graph, graph.edges()[1], [100, 50], [100, 100], [0, 100]);
            }
            graph.edges().forEach(id => expect(graph.getEdgeAttribute(id, 'type')).toBe(LinePathType.Perpendicular));
        }
    );

    it('retains separate stations when an interchange centre would reverse a diagonal turn endpoint aspect ratio', () => {
        const graph = convert(
            save([point(1, [0, 0]), { ...point(2, [100, 99]), dir: 1 }, point(3, [25, 0])], [line(10, [1, 2])])
        );
        expect(definitions(graph)).toHaveLength(1);
        expect(definitions(graph)[0].edgeIds).toHaveLength(1);
        const edge = definitions(graph)[0].edgeIds[0];
        const attributes = graph.getEdgeAttributes(edge);
        const path = renderedPath(graph, edge);

        expect(graph.order).toBe(3);
        expect(graph.size).toBe(2);
        expect(attributes.type).toBe(LinePathType.Diagonal);
        expect(isLinePolicyVisible(attributes, false, false)).toBe(true);
        expect(path).toEqual(generatedPath(graph, edge));
        expect(path.kind).toBe('mlcl');
        if (path.kind !== 'mlcl')
            throw new Error('Expected a rounded diagonal turn with the preserved horizontal axis.');
        const [move, incoming, curve, outgoing] = path.commands;
        expectPoint(move.to, scaledPoint([0, 0]));
        expectPoint(outgoing.to, scaledPoint([100, 99]));
        expect(incoming.to.y).toBeCloseTo(0, 8);
        expect(incoming.to.x).toBeGreaterThanOrEqual(move.to.x);
        expect(curve.c1.y).toBeCloseTo(0, 8);
        expect(curve.to.x - curve.to.y).toBeCloseTo(0.3125, 8);
        expect(curve.c2.x - curve.c2.y).toBeCloseTo(0.3125, 8);
        expectSameDirection(curve.to, outgoing.to, scaledPoint([1, 0]), scaledPoint([100, 99]));
        expectSameDirection(curve.c2, curve.to, scaledPoint([1, 0]), scaledPoint([100, 99]));

        const assigned = new Set(definitions(graph).flatMap(definition => definition.edgeIds));
        const auxiliaryEdges = graph.edges().filter(id => !assigned.has(id));
        expect(auxiliaryEdges).toHaveLength(1);
        const auxiliary = graph.getEdgeAttributes(auxiliaryEdges[0]);
        expect(auxiliary).toMatchObject({ type: LinePathType.Simple, style: LineStyleType.ShmetroVirtualInt });
        expect(isLinePolicyVisible(auxiliary, false, false)).toBe(true);
        expect(
            graph
                .extremities(auxiliaryEdges[0])
                .map(id => getStationLabel(graph.export(), id))
                .sort()
        ).toEqual(['站 1', '站 3']);
        expect(reconcileLineDefinitions(graph.export()).attributes.lineDefinitions).toEqual(definitions(graph));
        graph.edges().forEach(id => {
            const attrs = graph.getEdgeAttributes(id);
            const pathAttributes = attrs[attrs.type];
            expect(pathAttributes).not.toHaveProperty('autoSimple');
            expect(pathAttributes).not.toHaveProperty('startDirection');
            expect(pathAttributes).not.toHaveProperty('straight');
        });
    });

    it('skips a two-turn interval inside one interchange before creating a synthetic midpoint', () => {
        const graph = convert(
            save([point(1, [0, 0]), point(2, [25, 50]), point(3, [0, 25]), point(4, [0, 50])], [line(10, [1, 2])])
        );

        expect(graph.order).toBe(1);
        expect(graph.size).toBe(0);
        expect(graph.filterNodes((_id, attrs) => attrs.type === MiscNodeType.Virtual)).toHaveLength(0);
        expect(getLines(graph)).toEqual([]);
    });

    it.each(quadrants.flatMap(([x, y]) => [false, true].map(reverse => ({ x, y, reverse }))))(
        'uses one rounded 90-degree path for an axis turn in quadrant ($x, $y), reversed=$reverse',
        ({ x, y, reverse }) => {
            const start: [number, number] = [0, 0];
            const corner: [number, number] = [0, y * 200];
            const end: [number, number] = [x * 100, y * 200];
            const graph = convert(
                save(
                    [point(1, start), point(2, end), point(3, [x * 300, y * 200])],
                    [line(10, reverse ? [3, 2, 1] : [1, 2, 3])]
                )
            );
            const edge = graph.edges()[reverse ? 1 : 0];

            expect(graph.order).toBe(3);
            expect(graph.size).toBe(2);
            expect(graph.getEdgeAttribute(edge, 'type')).toBe(LinePathType.Perpendicular);
            expectRoundedTurn(graph, edge, reverse ? end : start, corner, reverse ? start : end);
        }
    );

    it.each(quadrants.flatMap(([x, y]) => [false, true].map(reverse => ({ x, y, reverse }))))(
        'uses one rounded inclined 90-degree path in quadrant ($x, $y), reversed=$reverse',
        ({ x, y, reverse }) => {
            const start: [number, number] = [0, 0];
            const corner: [number, number] = [x * 150, y * 150];
            const end: [number, number] = [x * 200, y * 100];
            const graph = convert(
                save(
                    [point(1, start), point(2, end), point(3, [x * 400, -y * 100])].map(item => ({
                        ...item,
                        dir: 1,
                    })),
                    [line(10, reverse ? [3, 2, 1] : [1, 2, 3])]
                )
            );
            const edge = graph.edges()[reverse ? 1 : 0];

            expect(graph.order).toBe(3);
            expect(graph.size).toBe(2);
            expect(graph.getEdgeAttribute(edge, 'type')).toBe(LinePathType.RotatePerpendicular);
            expectRoundedTurn(graph, edge, reverse ? end : start, corner, reverse ? start : end);
        }
    );

    it.each(
        quadrants.flatMap(([x, y]) =>
            [false, true].flatMap(tall => [false, true].map(reverse => ({ x, y, tall, reverse })))
        )
    )(
        'keeps axis-to-diagonal tangents in quadrant ($x, $y), tall=$tall, reversed=$reverse',
        ({ x, y, tall, reverse }) => {
            const start: [number, number] = [0, 0];
            const end: [number, number] = [x * (tall ? 100 : 200), y * (tall ? 200 : 100)];
            const corner: [number, number] = tall ? [0, y * 100] : [x * 100, 0];
            const graph = convert(
                save([point(1, start), { ...point(2, end), dir: 1 }], [line(10, reverse ? [2, 1] : [1, 2])])
            );
            const edge = graph.edges()[0];

            expect(graph.order).toBe(2);
            expect(graph.size).toBe(1);
            expect(graph.getEdgeAttribute(edge, 'type')).toBe(LinePathType.Diagonal);
            expectRoundedTurn(graph, edge, reverse ? end : start, corner, reverse ? start : end);
        }
    );

    it.each([false, true].flatMap(vertical => [false, true].map(reverse => ({ vertical, reverse }))))(
        'preserves both sides of an interchange with signed offsets, vertical=$vertical, reversed=$reverse',
        ({ vertical, reverse }) => {
            const nearA: [number, number] = [0, 0];
            const nearB: [number, number] = vertical ? [25, 0] : [0, 25];
            const farA: [number, number] = vertical ? [0, 200] : [200, 0];
            const farB: [number, number] = vertical ? [25, 300] : [300, 25];
            const graph = convert(
                save(
                    [point(1, nearA), point(2, nearB), point(3, farA), point(4, farB)],
                    [line(10, reverse ? [3, 1] : [1, 3]), line(20, reverse ? [4, 2] : [2, 4])]
                )
            );

            expect(graph.order).toBe(3);
            expect(graph.size).toBe(2);
            const mergedA = reverse ? graph.target(graph.edges()[0]) : graph.source(graph.edges()[0]);
            const mergedB = reverse ? graph.target(graph.edges()[1]) : graph.source(graph.edges()[1]);
            expect(mergedA).toBe(mergedB);
            expectPoint(graph.getNodeAttributes(mergedA), scaledPoint(vertical ? [12.5, 0] : [0, 12.5]));
            graph.edges().forEach((edge, index) => {
                const near = index === 0 ? nearA : nearB;
                const far = index === 0 ? farA : farB;
                const path = renderedPath(graph, edge);
                expectPoint(getStartPoint(path), scaledPoint(reverse ? far : near));
                expectPoint(getEndPoint(path), scaledPoint(reverse ? near : far));
            });
        }
    );

    it('drops an interval inside one merged interchange without introducing a self-loop', () => {
        const graph = convert(save([point(1, [0, 0]), point(2, [0, 25]), point(3, [100, 25])], [line(10, [1, 2, 3])]));

        expect(graph.order).toBe(2);
        expect(graph.size).toBe(1);
        const edge = graph.edges()[0];
        expect(graph.source(edge)).not.toBe(graph.target(edge));
        const path = renderedPath(graph, edge);
        expectPoint(getStartPoint(path), scaledPoint([0, 25]));
        expectPoint(getEndPoint(path), scaledPoint([100, 25]));
        expect(definitions(graph)).toHaveLength(1);
        expect(definitions(graph)[0].edgeIds).toEqual([edge]);
        assertValidOrigin(graph, definitions(graph)[0]);
    });

    it.each([false, true])('preserves two parallel tracks when both endpoints merge, reversed=%s', reverse => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, [0, 25]), point(3, [200, 0]), point(4, [200, 25])],
                [line(10, reverse ? [3, 1] : [1, 3]), line(20, reverse ? [4, 2] : [2, 4])]
            )
        );

        expect(graph.order).toBe(2);
        expect(graph.size).toBe(2);
        expect(definitions(graph)).toHaveLength(2);
        definitions(graph).forEach((definition, index) => {
            expect(definition.edgeIds).toHaveLength(1);
            const edge = definition.edgeIds[0];
            const path = renderedPath(graph, edge);
            const near: [number, number] = [0, index * 25];
            const far: [number, number] = [200, index * 25];
            expectPoint(getStartPoint(path), scaledPoint(reverse ? far : near));
            expectPoint(getEndPoint(path), scaledPoint(reverse ? near : far));
        });
    });

    it('merges the real Caoqiao parallel interchange without creating an additional basic station', () => {
        const graph = convert(
            save(
                [
                    { ...point(273, [5950, 9550]), name: '角门西', nameS: undefined },
                    { ...point(266, [5709.08281, 9550]), name: '草桥', nameS: undefined },
                    { ...point(265, [5550, 9550]), name: '纪家庙', nameS: undefined },
                    { ...point(230, [5850, 9250]), name: '景凤门', nameS: undefined },
                    { ...point(290, [5725, 9550]), name: undefined, nameS: undefined },
                    { ...point(320, [5750, 9825]), dir: 1, name: '新发地', nameS: undefined },
                    { ...point(379, [6000, 11000]), name: '大兴新城', nameS: undefined },
                    { ...point(736, [5709.08281, 9300]), dir: 1, sta: 0, name: undefined, nameS: undefined },
                    { ...point(825, [5550, 9275]), name: undefined, nameS: undefined },
                ],
                [
                    line(176, [273, 266, 265], { name: '10号线', color: '#009BC0' }),
                    line(284, [230, 290, 320], { name: '19号线', color: '#D6ABC1' }),
                    line(381, [379, 266, 736, 825], { name: '35号线', color: '#004A9F' }),
                ]
            )
        );
        const caoQiao = graph.filterNodes(id => getStationLabel(graph.export(), id) === '草桥');
        expect(caoQiao).toHaveLength(1);
        const interchange = caoQiao[0];
        expect(graph.getNodeAttribute(interchange, 'type')).toBe(StationType.SuzhouRTInt);
        const centre: [number, number] = [(5709.08281 + 5725) / 2, 9550];
        expectPoint(graph.getNodeAttributes(interchange), scaledPoint(centre));
        const nearbyStations = graph.filterNodes(
            (id, attrs) =>
                id.startsWith('stn_') &&
                Math.abs(attrs.x - scaledPoint(centre).x) < 10 &&
                Math.abs(attrs.y - scaledPoint(centre).y) < 1
        );
        expect(nearbyStations).toEqual([interchange]);
        expect(definitions(graph).map(definition => definition.name[0])).toEqual(['10号线', '19号线', '35号线']);
        definitions(graph).forEach(definition => {
            const incident = definition.edgeIds.filter(edge => graph.extremities(edge).includes(interchange));
            expect(incident).toHaveLength(2);
            incident.forEach(edge => {
                const path = renderedPath(graph, edge);
                const endpoint = graph.source(edge) === interchange ? getStartPoint(path) : getEndPoint(path);
                const x =
                    definition.name[0] === '10号线' ? centre[0] : definition.name[0] === '19号线' ? 5725 : 5709.08281;
                expectPoint(endpoint, scaledPoint([x, 9550]));
            });
            assertValidOrigin(graph, definition);
        });
    });

    it('retains one native interchange for parallel railway lines with the same color', () => {
        const graph = convert(
            save(
                [
                    { ...point(1, [0, 0]), name: '换乘站', nameS: undefined },
                    { ...point(2, [0, 16]), name: undefined, nameS: undefined },
                    point(3, [200, 0]),
                    point(4, [300, 16]),
                ],
                [line(10, [1, 3]), line(20, [2, 4])]
            )
        );
        expect(graph.order).toBe(3);
        const interchange = graph.findNode(id => getStationLabel(graph.export(), id) === '换乘站')!;
        expect(graph.getNodeAttribute(interchange, 'type')).toBe(StationType.SuzhouRTInt);
        expect(definitions(graph)).toHaveLength(2);
        expect(
            definitions(graph).every(definition => graph.extremities(definition.edgeIds[0]).includes(interchange))
        ).toBe(true);
        definitions(graph).forEach((definition, index) => {
            const path = renderedPath(graph, definition.edgeIds[0]);
            expectPoint(getStartPoint(path), scaledPoint([0, index * 16]));
            expectPoint(getEndPoint(path), scaledPoint([index === 0 ? 200 : 300, index * 16]));
        });
    });

    it.each([
        { separation: [16, 0] as [number, number], merged: true },
        { separation: [12, 12] as [number, number], merged: true },
        { separation: [18, 18] as [number, number], merged: false },
    ])('uses AARC station-group distance for $separation, merged=$merged', ({ separation, merged }) => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, separation), point(3, [0, 200]), point(4, [separation[0], 300])],
                [line(10, [1, 3]), line(20, [2, 4])]
            )
        );
        expect(graph.order).toBe(merged ? 3 : 4);
        expect(graph.size).toBe(2);
        definitions(graph).forEach((definition, index) => {
            const path = renderedPath(graph, definition.edgeIds[0]);
            const near: [number, number] = index === 0 ? [0, 0] : separation;
            expectPoint(getStartPoint(path), scaledPoint([near[0], merged ? separation[1] / 2 : near[1]]));
            expectPoint(getEndPoint(path), scaledPoint(index === 0 ? [0, 200] : [separation[0], 300]));
        });
    });

    it.each([
        { distance: 16, merged: true },
        { distance: 20, merged: false },
    ])('averages station snap sizes for half-width and normal lines at distance $distance', ({ distance, merged }) => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, [distance, 0]), point(3, [0, 200]), point(4, [distance, 300])],
                [line(10, [1, 3], { width: 0.5 }), line(20, [2, 4])]
            )
        );
        expect(graph.order).toBe(merged ? 3 : 4);
        expect(graph.size).toBe(2);
    });

    it.each([
        { config: { snapOctaClingPtPtDist: 10 } },
        { config: { lineWidthMapped: { '1': { staSnapSize: 0 } } } },
        { config: { lineWidthMapped: { '1.00': { staSnapSize: 0, staSize: 2 } } } },
    ])('keeps nearby independent stations separate when station snapping is restricted by $config', ({ config }) => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, [16, 0]), point(3, [0, 200]), point(4, [16, 300])],
                [line(10, [1, 3]), line(20, [2, 4])],
                { config }
            )
        );
        expect(graph.order).toBe(4);
        expect(graph.size).toBe(2);
        const starts = definitions(graph).map(definition => definition.exportStartStationId);
        expect(new Set(starts).size).toBe(2);
        starts.forEach(id => expect(graph.getNodeAttribute(id, 'type')).toBe(StationType.SuzhouRTBasic));
    });

    it.each([
        {
            reason: 'positive per-line snap size overrides a zero mapped snap size',
            appearance: { ptSnapSize: 2 },
            config: { lineWidthMapped: { '1': { staSnapSize: 0 } } },
            merged: true,
        },
        {
            reason: 'zero per-line snap size falls back to an explicit zero mapped snap size',
            appearance: { ptSnapSize: 0, ptSize: 2 },
            config: { lineWidthMapped: { '1': { staSnapSize: 0 } } },
            merged: false,
        },
        {
            reason: 'zero per-line snap size falls back to positive per-line station size',
            appearance: { ptSnapSize: 0, ptSize: 2 },
            config: {},
            merged: true,
        },
        {
            reason: 'per-line station size overrides mapped station size',
            appearance: { ptSize: 2 },
            config: { lineWidthMapped: { '1': { staSize: 0.5 } } },
            merged: true,
        },
        {
            reason: 'positive mapped snap size overrides per-line station size',
            appearance: { ptSize: 2 },
            config: { lineWidthMapped: { '1': { staSnapSize: 0.5 } } },
            merged: false,
        },
        {
            reason: 'mapped width keys use numeric equality',
            appearance: { width: 0.5 },
            config: { lineWidthMapped: { '0.50': { staSize: 2 } } },
            merged: true,
        },
    ])('respects AARC station-size priority: $reason', ({ appearance, config, merged }) => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, [30, 0]), point(3, [0, 200]), point(4, [30, 300])],
                [line(10, [1, 3], appearance), line(20, [2, 4], appearance)],
                { config }
            )
        );
        expect(graph.order).toBe(merged ? 3 : 4);
        expect(graph.size).toBe(2);
    });

    it.each([false, true])(
        'keeps a purely tangential interchange displacement at zero offset, reversed=%s',
        reverse => {
            const graph = convert(
                save(
                    [point(1, [0, 0]), point(2, [25, 0]), point(3, [200, 0]), point(4, [25, 200])],
                    [line(10, reverse ? [3, 1] : [1, 3]), line(20, [2, 4])]
                )
            );
            const edge = edgeConnectingStations(graph, '站 1', '站 3');
            const attributes = graph.getEdgeAttributes(edge);
            const path = renderedPath(graph, edge);

            expect(graph.order).toBe(3);
            expect(graph.size).toBe(2);
            expect(attributes[attributes.type]).toMatchObject({ offsetFrom: 0, offsetTo: 0 });
            expectPoint(getStartPoint(path), scaledPoint(reverse ? [200, 0] : [12.5, 0]));
            expectPoint(getEndPoint(path), scaledPoint(reverse ? [12.5, 0] : [200, 0]));
        }
    );

    it.each([false, true].flatMap(mergeTarget => [false, true].map(reverse => ({ mergeTarget, reverse }))))(
        'keeps perpendicular endpoint offsets on the correct side, mergeTarget=$mergeTarget, reversed=$reverse',
        ({ mergeTarget, reverse }) => {
            const graph = convert(
                save(
                    [
                        point(1, [0, 0]),
                        point(2, [100, 200]),
                        point(3, [300, 200]),
                        point(4, mergeTarget ? [100, 225] : [25, 0]),
                        point(5, mergeTarget ? [400, 225] : [25, -200]),
                    ],
                    [line(10, reverse ? [3, 2, 1] : [1, 2, 3]), line(20, [4, 5])]
                )
            );
            const edge = edgeConnectingStations(graph, '站 1', '站 2');

            expect(graph.order).toBe(4);
            expect(graph.size).toBe(3);
            expect(graph.getEdgeAttribute(edge, 'type')).toBe(LinePathType.Perpendicular);
            expectRoundedTurn(graph, edge, reverse ? [100, 200] : [0, 0], [0, 200], reverse ? [0, 0] : [100, 200]);
        }
    );

    it.each([false, true].flatMap(mergeTarget => [false, true].map(reverse => ({ mergeTarget, reverse }))))(
        'keeps rotated perpendicular offsets on the correct normal, mergeTarget=$mergeTarget, reversed=$reverse',
        ({ mergeTarget, reverse }) => {
            const graph = convert(
                save(
                    [
                        point(1, [0, 0]),
                        point(2, [200, 100]),
                        point(3, [400, -100]),
                        point(4, mergeTarget ? [200, 125] : [0, 25]),
                        point(5, mergeTarget ? [500, -175] : [-200, -175]),
                    ].map(item => ({ ...item, dir: 1 })),
                    [line(10, reverse ? [3, 2, 1] : [1, 2, 3]), line(20, [4, 5])]
                )
            );
            const edge = edgeConnectingStations(graph, '站 1', '站 2');
            const start: [number, number] = mergeTarget ? [0, 0] : [6.25, 6.25];
            const end: [number, number] = mergeTarget ? [193.75, 106.25] : [200, 100];

            expect(graph.order).toBe(4);
            expect(graph.size).toBe(3);
            expect(graph.getEdgeAttribute(edge, 'type')).toBe(LinePathType.RotatePerpendicular);
            expectRoundedTurn(graph, edge, reverse ? end : start, [150, 150], reverse ? start : end);
        }
    );

    it.each([1, -1].flatMap(slope => [false, true].map(reverse => ({ slope, reverse }))))(
        'projects interchange offsets onto a diagonal normal, slope=$slope, reversed=$reverse',
        ({ slope, reverse }) => {
            const nearA: [number, number] = [0, 0];
            const nearB: [number, number] = [0, 25];
            const farA: [number, number] = [200, slope * 200];
            const farB: [number, number] = [300, slope * 300 + 25];
            const graph = convert(
                save(
                    [point(1, nearA), point(2, nearB), point(3, farA), point(4, farB)].map(item => ({
                        ...item,
                        dir: 1,
                    })),
                    [line(10, reverse ? [3, 1] : [1, 3]), line(20, reverse ? [4, 2] : [2, 4])]
                )
            );

            expect(graph.order).toBe(3);
            expect(graph.size).toBe(2);
            graph.edges().forEach((edge, index) => {
                const expectedNear: [number, number] = index === 0 ? [slope * 6.25, 6.25] : [-slope * 6.25, 18.75];
                const far = index === 0 ? farA : farB;
                const near = index === 0 ? nearA : nearB;
                const path = renderedPath(graph, edge);
                expectPoint(getStartPoint(path), scaledPoint(reverse ? far : expectedNear));
                expectPoint(getEndPoint(path), scaledPoint(reverse ? expectedNear : far));
                expectSameDirection(
                    getStartPoint(path),
                    getEndPoint(path),
                    scaledPoint(reverse ? far : near),
                    scaledPoint(reverse ? near : far)
                );
            });
        }
    );
});

describe('convertAARCToRmp line information', () => {
    it('imports bilingual line names and opening timestamps as local calendar dates', () => {
        const graph = convert(save([point(1), point(2)], [line(10, [1, 2], { time: { open: date(2024, 2, 29) } })]));

        expect(definitions(graph)).toHaveLength(1);
        expect(definitions(graph)[0]).toMatchObject({
            name: ['线路 10', 'Line 10'],
            openingDate: '2024-02-29',
            status: 'operating',
        });
        expect(definitions(graph)[0].edgeIds).toEqual(graph.edges());
        expect(getStationLabel(graph.export(), definitions(graph)[0].exportStartStationId)).toBe('站 1');
        assertValidOrigin(graph, definitions(graph)[0]);
    });

    it('retains an epoch-zero opening timestamp as a valid local calendar date', () => {
        const graph = convert(save([point(1), point(2)], [line(10, [1, 2], { time: { open: 0 } })]));

        expect(definitions(graph)[0].openingDate).not.toBe('');
        expect(isOpeningDateValid(definitions(graph)[0].openingDate)).toBe(true);
    });

    it('leaves an out-of-range opening timestamp blank', () => {
        const graph = convert(save([point(1), point(2)], [line(10, [1, 2], { time: { open: 1e100 } })]));

        expect(definitions(graph)[0].openingDate).toBe('');
    });

    it('retains names and separate identities for connected same-color lines in older saves', () => {
        const graph = convert(save([point(1), point(2), point(3)], [line(10, [1, 2]), line(20, [2, 3])]));

        expect(definitions(graph).map(item => item.name)).toEqual([
            ['线路 10', 'Line 10'],
            ['线路 20', 'Line 20'],
        ]);
        expect(definitions(graph).every(item => item.openingDate === '')).toBe(true);
        expect(definitions(graph).map(item => item.edgeIds.length)).toEqual([1, 1]);
        expect(new Set(definitions(graph).map(item => item.id)).size).toBe(2);
        expect(reconcileLineDefinitions(graph.export()).attributes.lineDefinitions).toHaveLength(2);
    });

    it('takes branch appearance from a later parent while keeping its empty name and missing time', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4].map(id => point(id)),
                [
                    line(10, [3, 4], { parent: 20, name: '', nameSub: '', color: '#abcdef' }),
                    line(20, [1, 2], { color: '#654321', time: { open: date(2000, 1, 1) } }),
                ]
            )
        );

        expect(definitions(graph).map(item => item.name)).toEqual([
            ['', ''],
            ['线路 20', 'Line 20'],
        ]);
        expect(definitions(graph).map(item => item.openingDate)).toEqual(['', '2000-01-01']);
        expect(graph.export().edges.map(edge => getLineTheme(edge)?.[2])).toEqual(['#654321', '#654321']);
    });

    it('preserves a branch name and opening date independently from its parent', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4].map(id => point(id)),
                [
                    line(20, [1, 2], { time: { open: date(2000, 1, 1) } }),
                    line(10, [3, 4], { parent: 20, time: { open: date(2005, 1, 1) } }),
                ]
            )
        );

        expect(definitions(graph).map(item => item.name)).toEqual([
            ['线路 20', 'Line 20'],
            ['线路 10', 'Line 10'],
        ]);
        expect(definitions(graph).map(item => item.openingDate)).toEqual(['2000-01-01', '2005-01-01']);
        expect(definitions(graph)[1].notes).toContain('AARC parent: 线路 20');
    });

    it('creates separate definitions for a time slice and both remaining intervals', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4, 5].map(id => point(id)),
                [line(10, [1, 2, 3, 4, 5], { time: { open: date(2000, 1, 1) } })],
                { timeSlices: [{ id: 30, line: 10, fromPt: 4, toPt: 2, time: { open: date(2023, 6, 8) } }] }
            )
        );

        expect(definitions(graph).map(item => item.openingDate)).toEqual(['2000-01-01', '2023-06-08', '2000-01-01']);
        expect(definitions(graph).map(item => item.edgeIds.length)).toEqual([1, 2, 1]);
        expect(definitions(graph).every(item => item.name[0] === '线路 10')).toBe(true);
        expect(edgeDates(graph)).toEqual(['2000-01-01', '2023-06-08', '2023-06-08', '2000-01-01']);
        definitions(graph).forEach(item => assertValidOrigin(graph, item));
    });

    it('uses the first covering time slice and replaces the complete line time object', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4, 5].map(id => point(id)),
                [line(10, [1, 2, 3, 4, 5], { time: { open: date(2000, 1, 1) } })],
                {
                    timeSlices: [
                        { id: 30, line: 10, fromPt: 1, toPt: 2, time: { construct: date(1999, 1, 1) } },
                        { id: 31, line: 10, fromPt: 2, toPt: 4, time: { open: date(2023, 6, 8) } },
                        { id: 32, line: 10, fromPt: 3, toPt: 5, time: { open: date(2030, 1, 1) } },
                    ],
                }
            )
        );

        expect(edgeDates(graph)).toEqual(['', '2023-06-08', '2023-06-08', '2030-01-01']);
        expect(definitions(graph).map(item => item.edgeIds.length)).toEqual([1, 2, 1]);
        expect(definitions(graph)[0].notes).toBe('AARC construct: 1999-01-01');
    });

    it('keeps different lifecycle information for adjacent slices with the same opening date', () => {
        const graph = convert(
            save([point(1), point(2), point(3)], [line(10, [1, 2, 3])], {
                timeSlices: [
                    {
                        id: 30,
                        line: 10,
                        fromPt: 1,
                        toPt: 2,
                        time: { open: date(2023, 6, 8), propose: date(2000, 1, 1) },
                    },
                    {
                        id: 31,
                        line: 10,
                        fromPt: 2,
                        toPt: 3,
                        time: { open: date(2023, 6, 8), construct: date(2020, 1, 1) },
                    },
                ],
            })
        );

        expect(definitions(graph).map(item => item.openingDate)).toEqual(['2023-06-08', '2023-06-08']);
        expect(definitions(graph).map(item => item.notes)).toEqual([
            'AARC propose: 2000-01-01',
            'AARC construct: 2020-01-01',
        ]);
        expect(reconcileLineDefinitions(graph.export()).attributes.lineDefinitions).toEqual(definitions(graph));
    });

    it('preserves proposal, construction, suspension and abandonment dates in saved notes', () => {
        const graph = convert(
            save(
                [point(1), point(2)],
                [
                    line(10, [1, 2], {
                        time: {
                            propose: date(2000, 1, 1),
                            construct: date(2005, 2, 3),
                            open: date(2010, 4, 5),
                            suspend: [[date(2020, 6, 7), date(2021, 8, 9)]],
                            abandon: date(2022, 10, 11),
                        },
                    }),
                ]
            )
        );

        expect(definitions(graph)[0]).toMatchObject({
            openingDate: '2010-04-05',
            notes: [
                'AARC propose: 2000-01-01',
                'AARC construct: 2005-02-03',
                'AARC abandon: 2022-10-11',
                'AARC suspend: 2020-06-07 — 2021-08-09',
            ].join('\n'),
        });
        expect(reconcileLineDefinitions(JSON.parse(JSON.stringify(graph.export()))).attributes.lineDefinitions).toEqual(
            definitions(graph)
        );
    });

    it.each([
        { time: undefined, status: 'operating' },
        { time: { propose: date(2027, 1, 1) }, status: 'planned' },
        { time: { construct: date(2024, 1, 1), open: date(2027, 1, 1) }, status: 'construction' },
        { time: { open: date(2024, 1, 1) }, status: 'operating' },
        { time: { open: date(2024, 1, 1), suspend: [[date(2025, 1, 1), date(2027, 1, 1)]] }, status: 'closed' },
        { time: { open: date(2024, 1, 1), suspend: [[date(2020, 1, 1), date(2021, 1, 1)]] }, status: 'operating' },
        { time: { open: date(2024, 1, 1), suspend: [[date(2025, 1, 1), date(2026, 1, 1)]] }, status: 'operating' },
        { time: { open: date(2024, 1, 1), abandon: date(2025, 1, 1) }, status: 'closed' },
    ])('imports the current $status status from lifecycle dates $time', ({ time, status }) => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(date(2026, 1, 1));
        try {
            const graph = convert(
                save([point(1), point(2)], [line(10, [1, 2], { time: time as TestTime | undefined })])
            );
            expect(definitions(graph)[0].status).toBe(status);
        } finally {
            now.mockRestore();
        }
    });

    it.each([
        { pts: [1, 2, 3, 1, 4], fromPt: 2, toPt: 1, changed: [1, 2] },
        { pts: [1, 2, 3, 1, 4], fromPt: 1, toPt: 4, changed: [3] },
        { pts: [1, 2, 3, 1, 4], fromPt: 4, toPt: 1, changed: [3] },
        { pts: [2, 1, 3, 1, 4], fromPt: 1, toPt: 2, changed: [0] },
        { pts: [1, 2, 3, 1, 4], fromPt: 1, toPt: 2, changed: [0] },
        { pts: [1, 2, 1, 2], fromPt: 1, toPt: 2, changed: [] },
        { pts: [1, 2, 3, 4], fromPt: 4, toPt: 2, changed: [1, 2] },
        { pts: [1, 2, 3], fromPt: 2, toPt: 2, changed: [] },
        { pts: [1, 2, 3], fromPt: 99, toPt: 2, changed: [] },
    ])('follows AARC loaded endpoint resolution for $pts from $fromPt to $toPt', ({ pts, fromPt, toPt, changed }) => {
        const graph = convert(
            save(
                [...new Set(pts)].map(id => point(id)),
                [line(10, pts, { time: { open: date(2000, 1, 1) } })],
                { timeSlices: [{ id: 30, line: 10, fromPt, toPt, time: { open: date(2023, 6, 8) } }] }
            )
        );

        expect(edgeDates(graph)).toEqual(
            pts.slice(1).map((_id, index) => (changed.includes(index) ? '2023-06-08' : '2000-01-01'))
        );
    });

    it('assigns a rounded native turn to its original time interval without inserting a midpoint', () => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, [100, 200]), point(3, [300, 200])],
                [line(10, [1, 2, 3], { time: { open: date(2000, 1, 1) } })],
                { timeSlices: [{ id: 30, line: 10, fromPt: 1, toPt: 2, time: { open: date(2023, 6, 8) } }] }
            )
        );

        expect(graph.filterNodes((_id, attrs) => attrs.type === MiscNodeType.Virtual)).toHaveLength(0);
        expect(graph.size).toBe(2);
        expect(edgeDates(graph)).toEqual(['2023-06-08', '2000-01-01']);
        expect(definitions(graph).map(item => item.edgeIds.length)).toEqual([1, 1]);
        const edge = graph.edges()[0];
        expect(graph.getEdgeAttribute(edge, 'type')).toBe(LinePathType.Perpendicular);
        expectRoundedTurn(graph, edge, [0, 0], [0, 200], [100, 200]);
    });

    it('keeps line origins valid after nearby station nodes merge into an interchange', () => {
        const graph = convert(
            save(
                [point(1, [0, 0]), point(2, [100, 0]), point(3, [0, 25]), point(4, [0, 200])],
                [line(10, [1, 2]), line(20, [3, 4], { color: '#654321' })]
            )
        );

        expect(graph.order).toBe(3);
        expect(definitions(graph)).toHaveLength(2);
        definitions(graph).forEach(item => assertValidOrigin(graph, item));
        expect(definitions(graph)[0].exportStartStationId).toBe(definitions(graph)[1].exportStartStationId);
        expect(getStationLabel(graph.export(), definitions(graph)[0].exportStartStationId)).toBe('站 1/站 3');
    });

    it('preserves a distant point link as auxiliary geometry without merging stations or railway memberships', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4].map(id => point(id)),
                [line(10, [1, 2]), line(20, [3, 4])],
                {
                    pointLinks: [{ pts: [2, 3], type: 0 }],
                }
            )
        );

        expect(graph.order).toBe(4);
        expect(graph.size).toBe(3);
        expect(definitions(graph)).toHaveLength(2);
        const assigned = new Set(definitions(graph).flatMap(item => item.edgeIds));
        const links = graph.edges().filter(id => !assigned.has(id));
        expect(links).toHaveLength(1);
        expect(graph.extremities(links[0]).map(id => getStationLabel(graph.export(), id))).toEqual(['站 2', '站 3']);
        expect(reconcileLineDefinitions(graph.export()).attributes.lineDefinitions).toEqual(definitions(graph));
    });

    it.each([
        { type: 0, appearance: 'thick solid', style: LineStyleType.ShmetroVirtualInt },
        { type: 1, appearance: 'thin solid', style: LineStyleType.MTRPaidArea },
        { type: 2, appearance: 'dashed', style: LineStyleType.GzmtrVirtualInt },
        { type: 3, appearance: 'covered dashed', style: LineStyleType.GzmtrVirtualInt },
        { type: 4, appearance: 'cluster solid', style: LineStyleType.MTRPaidArea },
    ])('imports type $type links with a free $appearance style in both map contexts', ({ type, style }) => {
        const graph = convert(save([point(1), point(2)], [], { pointLinks: [{ pts: [1, 2], type }] }));
        const edge = graph.export().edges[0];

        expect(graph.size).toBe(1);
        expect(edge.attributes).toMatchObject({ type: LinePathType.Simple, style });
        for (const mapEnabled of [false, true]) {
            expect(isLinePolicyVisible(edge.attributes!, mapEnabled, false)).toBe(true);
        }
        expect(getLineTheme(edge)).toBeUndefined();
        expect(reconcileLineDefinitions(graph.export()).attributes.lineDefinitions).toEqual([]);
    });

    it('fills missing bilingual station names across transitive point links', () => {
        const unnamed = (id: number) => ({ ...point(id), name: undefined, nameS: undefined });
        const graph = convert(
            save(
                [unnamed(1), unnamed(2), point(3), point(4), point(5), point(6)],
                [line(10, [1, 4]), line(20, [2, 5]), line(30, [3, 6])],
                {
                    pointLinks: [
                        { pts: [1, 2], type: 0 },
                        { pts: [2, 3], type: 1 },
                    ],
                }
            )
        );

        const linked = graph.filterNodes((_id, attrs) => attrs.x < 3 * 100 * 0.3125);
        expect(linked).toHaveLength(3);
        linked.forEach(id => {
            const attrs = graph.getNodeAttributes(id);
            expect((attrs[attrs.type] as { names: string[] }).names).toEqual(['站 3', 'Station 3']);
        });
        expect(graph.order).toBe(6);
        expect(definitions(graph)).toHaveLength(3);
    });

    it('finds the merged interchange name through a link attached to an unnamed member', () => {
        const graph = convert(
            save(
                [
                    { ...point(1, [0, 0]), name: undefined, nameS: undefined },
                    point(2, [0, 25]),
                    { ...point(3, [200, 0]), name: undefined, nameS: undefined },
                    point(4, [300, 100]),
                ],
                [line(10, [1, 4]), line(20, [2, 3])],
                { pointLinks: [{ pts: [1, 3], type: 0 }] }
            )
        );
        const remote = graph.findNode((_id, attrs) => attrs.x === 200 * 0.3125 && attrs.y === 0)!;
        const attrs = graph.getNodeAttributes(remote);

        expect(graph.filterNodes(id => id.startsWith('stn_'))).toHaveLength(3);
        expect((attrs[attrs.type] as { names: string[] }).names).toEqual(['站 2', 'Station 2']);
    });

    it('fills a missing primary name through a point link while retaining the station own secondary name', () => {
        const graph = convert(
            save(
                [{ ...point(1), name: undefined, nameS: 'Own secondary name' }, point(2), point(3), point(4)],
                [line(10, [1, 3]), line(20, [2, 4])],
                { pointLinks: [{ pts: [1, 2], type: 1 }] }
            )
        );
        const target = graph.findNode((_id, attrs) => attrs.x === 0 && attrs.y === 0)!;
        const attrs = graph.getNodeAttributes(target);

        expect((attrs[attrs.type] as { names: string[] }).names).toEqual(['站 2', 'Own secondary name']);
    });

    it('preserves terrain, fake and filled geometry without discovering railway definitions for it', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4, 5, 6, 7, 8].map(id => point(id)),
                [
                    line(10, [1, 2]),
                    line(20, [3, 4], { type: 1, colorPre: 2 }),
                    line(30, [5, 6], { isFake: true }),
                    line(40, [7, 8], { type: 1, isFilled: true }),
                ]
            )
        );

        expect(graph.size).toBe(5);
        expect(definitions(graph).map(item => item.name)).toEqual([['线路 10', 'Line 10']]);
        const assigned = new Set(definitions(graph).flatMap(item => item.edgeIds));
        expect(graph.getAttribute('unassignedLineEdgeIds')?.sort()).toEqual(
            graph
                .edges()
                .filter(id => !assigned.has(id))
                .sort()
        );
        expect(reconcileLineDefinitions(graph.export()).attributes.lineDefinitions).toHaveLength(1);
    });

    it('retains imported metadata after JSON reconciliation and populates the timeline in opening order', () => {
        const graph = convert(
            save(
                [1, 2, 3, 4, 5, 6].map(id => point(id)),
                [
                    line(10, [1, 2], { time: { open: date(2024, 2, 29) } }),
                    line(20, [3, 4], { time: { open: date(2000, 1, 1) } }),
                    line(30, [5, 6]),
                ]
            )
        );
        const restored = reconcileLineDefinitions(JSON.parse(JSON.stringify(graph.export())));

        expect(restored.attributes.lineDefinitions).toEqual(definitions(graph));
        expect(getTimelineImportLines(restored).map(item => item.name[0])).toEqual(['线路 20', '线路 10', '线路 30']);
        const track = populateTimelineFromLineInformation(restored).track;
        expect(track.filter(entry => entry.kind === 'edge').map(entry => entry.refId)).toEqual([
            definitions(graph)[1].edgeIds[0],
            definitions(graph)[0].edgeIds[0],
            definitions(graph)[2].edgeIds[0],
        ]);
        expect(new Set(track.map(entry => entry.refId)).size).toBe(graph.order + graph.size);
    });

    it('leaves the target graph intact when conversion fails after JSON parsing', () => {
        const graph = convert(save([point(1), point(2)], [line(10, [1, 2])]));
        const before = graph.export();
        const invalid = save([point(1), null as unknown as TestPoint], [line(20, [1, 2])]);

        expect(() => convertAARCToRmp(JSON.stringify(invalid), graph)).toThrow();
        expect(graph.export()).toEqual(before);
    });
});
