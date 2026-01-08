import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    StnId,
    Theme,
} from '../constants/constants';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import stations from '../components/svgs/stations/stations';
import { MiscNodeAttributes, MiscNodeType } from '../constants/nodes';
import miscNodes from '../components/svgs/nodes/misc-nodes';
import { LinePathType, LineStyleType } from '../constants/lines';
import { linePaths } from '../components/svgs/lines/lines';
import { autoPopulateTransfer, autoUpdateStationType, changeNodesColorInBatch } from './change-types';

interface AarcSave {
    idIncre: number;
    points: Point[];
    pointLinks?: {
        pts: [number, number];
        type: number;
    }[];
    lines: Line[];
    // lineStyles;
    lineGroups?: {
        id: number;
        name?: string;
        lineType: number;
    }[];
    textTags: TextTag[];
    textTagIcons?: {
        id: number;
        name?: string;
        url?: string;
        width?: number;
    }[];
    cvsSize: [number, number];
    // config;
    // meta;
}

interface Point {
    id: number;
    pos: [number, number];
    dir: number;
    sta: number;
    name?: string;
    nameS?: string;
    nameP?: [number, number];
    nameSize?: number;
    anchorX?: 0 | 1 | -1;
    anchorY?: 0 | 1 | -1;
    noLeader?: boolean;
}

interface Line {
    id: number;
    pts: number[];
    name: string;
    nameSub: string;
    color: string;
    colorPre?: number;
    group?: number;
    width?: number;
    ptNameSize?: number;
    ptSize?: number;
    type: number;
    isFilled?: boolean;
    style?: number;
    tagTextColor?: string;
    zIndex?: number;
    parent?: number;
    isFake?: boolean;
    removeCarpet?: boolean;
}

interface TextTag {
    id: number;
    pos: [number, number];
    forId?: number;
    text?: string;
    textS?: string;
    textOp?: {
        size: number;
        color: string;
        i?: boolean;
        b?: boolean;
        u?: boolean;
    };
    textSOp?: {
        size: number;
        color: string;
        i?: boolean;
        b?: boolean;
        u?: boolean;
    };
    padding?: number;
    textAlign?: 0 | 1 | -1;
    width?: number;
    anchorX?: 0 | 1 | -1;
    anchorY?: 0 | 1 | -1;
    dropCap?: boolean;
    icon?: number;
    opacity?: number;
}

const stationIds = new Map<number, StnId | MiscNodeId>();
const stationPoints = new Map<number, Point>();

const createStation = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    point: Point,
    type: StationType
) => {
    const id: StnId = `stn_${nanoid(10)}`;
    stationIds.set(point.id, id);
    const attr = {
        ...structuredClone(stations[type].defaultAttrs),
        names: [point.name ?? '', point.nameS ?? ''],
        nameOffsetX: point.nameP ? (point.nameP[0] > 0 ? 'right' : point.nameP[0] === 0 ? 'middle' : 'left') : 'right',
        nameOffsetY: point.nameP ? (point.nameP[1] > 0 ? 'bottom' : point.nameP[1] === 0 ? 'middle' : 'top') : 'top',
    } as ExternalStationAttributes[StationType];
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x: point.pos[0] / 2,
        y: point.pos[1] / 2,
        type,
        [type]: attr,
    });
};

const createMiscNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    point: Point,
    type: MiscNodeType,
    config: Partial<MiscNodeAttributes[MiscNodeType]> = {}
) => {
    const id: MiscNodeId = `misc_node_${nanoid(10)}`;
    console.log(point, id, point);
    stationIds.set(point.id, id);
    const attr = {
        ...structuredClone(miscNodes[type].defaultAttrs),
        ...config,
    };
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x: point.pos[0] / 2,
        y: point.pos[1] / 2,
        type,
        [type]: attr,
    });
};

const generateLineStyleType = (type: number, pre: number, color: string): { style: LineStyleType; theme: Theme } => {
    if (type === 0) {
        return {
            style: LineStyleType.SingleColor,
            theme: [CityCode.Other, 'other', (color as `#${string}`) || '#000000', MonoColour.white],
        };
    } else {
        if (pre === 0) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', (color as `#${string}`) || '#000000', MonoColour.white],
            };
        } else if (pre === 1 || pre === 3 || pre === 4) {
            // fill node.
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', (color as `#${string}`) || '#000000', MonoColour.white],
            };
        } else if (pre === 2) {
            return {
                style: LineStyleType.River,
                theme: [CityCode.Shanghai, 'river', '#B9E3F9', MonoColour.white],
            };
        }
    }
    return { style: LineStyleType.SingleColor, theme: [CityCode.Other, 'other', '#000000', MonoColour.white] };
};

const createLine = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, line: Line) => {
    const { style, theme } = generateLineStyleType(line.type, line.colorPre ?? 0, line.color);

    if (line.isFilled) {
        graph.dropNode(stationIds.get(line.pts[0]));
        stationIds.delete(line.pts[0]);
        createMiscNode(graph, stationPoints.get(line.pts[0])!, MiscNodeType.Fill, { color: theme, opacity: 1 });
    }

    let lastpoint = line.pts[0];
    for (let i = 1; i < line.pts.length; i++) {
        const currentpoint = line.pts[i];
        const lineId: LineId = `line_${nanoid(10)}`;
        const source = stationIds.get(lastpoint);
        const target = stationIds.get(currentpoint);
        const sourcePoint = stationPoints.get(lastpoint)!;
        const targetPoint = stationPoints.get(currentpoint)!;
        if (source !== target && source && target) {
            changeNodesColorInBatch(
                graph,
                'any',
                theme,
                [source, target].filter(s => s.startsWith('stn')) as StnId[],
                []
            );
            if (
                Math.abs(
                    Math.abs(sourcePoint.pos[0] - targetPoint.pos[0]) -
                        Math.abs(sourcePoint.pos[1] - targetPoint.pos[1])
                ) < 0.01
            ) {
                if (sourcePoint.dir === 0 && targetPoint.dir === 0) {
                    graph.addDirectedEdgeWithKey(lineId, source, target, {
                        visible: true,
                        zIndex: 0,
                        type: LinePathType.Perpendicular,
                        // deep copy to prevent mutual reference
                        [LinePathType.Perpendicular]: structuredClone(
                            linePaths[LinePathType.Perpendicular].defaultAttrs
                        ),
                        style,
                        [style]: { color: theme },
                        reconcileId: '',
                        parallelIndex: -1,
                    });
                    // start from is not determined
                } else {
                    graph.addDirectedEdgeWithKey(lineId, source, target, {
                        visible: true,
                        zIndex: 0,
                        type: LinePathType.Diagonal,
                        // deep copy to prevent mutual reference
                        [LinePathType.Diagonal]: structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
                        style,
                        [style]: { color: theme },
                        reconcileId: '',
                        parallelIndex: -1,
                    });
                }
            } else {
                if (
                    ((sourcePoint.dir === 0 && targetPoint.dir === 0) ||
                        (sourcePoint.dir === 1 && targetPoint.dir === 1)) &&
                    Math.abs(sourcePoint.pos[0] - targetPoint.pos[0]) > 0.01 &&
                    Math.abs(sourcePoint.pos[1] - targetPoint.pos[1]) > 0.01
                ) {
                    createMiscNode(
                        graph,
                        {
                            id: 1e9 + currentpoint,
                            pos: [
                                (sourcePoint.pos[0] + targetPoint.pos[0]) / 2,
                                (sourcePoint.pos[1] + targetPoint.pos[1]) / 2,
                            ],
                            sta: 0,
                            dir: 0,
                        },
                        MiscNodeType.Virtual
                    );
                    const midId = stationIds.get(1e9 + currentpoint)!;
                    const line2Id: LineId = `line_${nanoid(10)}`;
                    graph.addDirectedEdgeWithKey(lineId, source, midId, {
                        visible: true,
                        zIndex: 0,
                        type: LinePathType.Diagonal,
                        // deep copy to prevent mutual reference
                        [LinePathType.Diagonal]: {
                            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
                            startFrom: sourcePoint.dir === 0 ? 'from' : 'to',
                        },
                        style,
                        [style]: { color: theme },
                        reconcileId: '',
                        parallelIndex: -1,
                    });
                    graph.addDirectedEdgeWithKey(line2Id, midId, target, {
                        visible: true,
                        zIndex: 0,
                        type: LinePathType.Diagonal,
                        // deep copy to prevent mutual reference
                        [LinePathType.Diagonal]: {
                            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
                            startFrom: sourcePoint.dir === 0 ? 'to' : 'from',
                        },
                        style,
                        [style]: { color: theme },
                        reconcileId: '',
                        parallelIndex: -1,
                    });
                } else {
                    graph.addDirectedEdgeWithKey(lineId, source, target, {
                        visible: true,
                        zIndex: 0,
                        type: LinePathType.Diagonal,
                        // deep copy to prevent mutual reference
                        [LinePathType.Diagonal]: {
                            ...structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
                            startFrom: sourcePoint.dir === 0 ? 'from' : 'to',
                        },
                        style,
                        [style]: { color: theme },
                        reconcileId: '',
                        parallelIndex: -1,
                    });
                }
            }
        }
        lastpoint = currentpoint;
    }

    if (line.isFilled) {
        graph.addDirectedEdgeWithKey(`line_${nanoid(10)}`, stationIds.get(lastpoint), stationIds.get(line.pts[0]), {
            visible: true,
            zIndex: 0,
            type: LinePathType.Diagonal,
            // deep copy to prevent mutual reference
            [LinePathType.Diagonal]: structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
            style,
            [style]: { color: theme },
            reconcileId: '',
            parallelIndex: -1,
        });
    }
};

export const convertAarcToRmp = (
    aarc: string,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
) => {
    stationIds.clear();
    stationPoints.clear();
    const aarcSave: AarcSave = JSON.parse(aarc);
    aarcSave.points.forEach(point => {
        stationPoints.set(point.id, point);
        if (point.sta === 1) {
            createStation(graph, point, StationType.SuzhouRTBasic);
        } else {
            createMiscNode(graph, point, MiscNodeType.Virtual);
        }
    });
    aarcSave.lines.forEach(line => {
        createLine(graph, line);
    });
    stationIds.forEach(id => {
        if (id.startsWith('stn')) {
            console.log('Updating station type and transfers for', id);
            autoUpdateStationType(graph, id as StnId);
            autoPopulateTransfer(graph, id as StnId);
        }
    });
};
