import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { linePaths } from '../components/svgs/lines/lines';
import miscNodes from '../components/svgs/nodes/misc-nodes';
import stations from '../components/svgs/stations/stations';
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
import { ExternalLinePathAttributes, LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeAttributes, MiscNodeType } from '../constants/nodes';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { autoPopulateTransfer, autoUpdateStationType, changeNodesColorInBatch } from './change-types';
import { TextLanguage } from './fonts';

const ScalingFactor = 0.3125;
const InterchangeOffset = ScalingFactor * 25;

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
    config: {
        // bgRefImage;
        textTagPlain?: {
            fontSize?: number;
            subFontSize?: number;
        };
        textTagForLine?: {
            fontSize?: number;
            subFontSize?: number;
        };
        textTagForTerrain?: {
            fontSize?: number;
            subFontSize?: number;
        };
    };
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

const defaultTextOp = {
    size: 10,
    color: '#000000',
};

export enum StationTypeOption {
    Beijing = 'beijing',
    Changsha = 'changsha',
    Chengdu = 'chengdu',
    Hangzhou = 'hangzhou',
    Kunming = 'kunming',
    Shanghai = 'shanghai',
    Suzhou = 'suzhou',
    Wuhan = 'wuhan',
}

export const stationTypeOptions: Record<StationTypeOption, { basic: StationType; int: StationType }> = {
    [StationTypeOption.Suzhou]: {
        basic: StationType.SuzhouRTBasic,
        int: StationType.SuzhouRTInt,
    },
    [StationTypeOption.Beijing]: {
        basic: StationType.BjsubwayBasic,
        int: StationType.BjsubwayInt,
    },
    [StationTypeOption.Shanghai]: {
        basic: StationType.ShmetroBasic,
        int: StationType.ShmetroInt,
    },
    [StationTypeOption.Kunming]: {
        basic: StationType.KunmingRTBasic,
        int: StationType.KunmingRTInt,
    },
    [StationTypeOption.Changsha]: {
        basic: StationType.CsmetroBasic,
        int: StationType.CsmetroInt,
    },
    [StationTypeOption.Chengdu]: {
        basic: StationType.ChengduRTBasic,
        int: StationType.ChengduRTInt,
    },
    [StationTypeOption.Wuhan]: {
        basic: StationType.WuhanRTBasic,
        int: StationType.WuhanRTInt,
    },
    [StationTypeOption.Hangzhou]: {
        basic: StationType.HzmetroBasic,
        int: StationType.HzmetroInt,
    },
};

const stationIds = new Map<number, StnId | MiscNodeId>();
const stationPoints = new Map<number, Point>();
const interchangeGroups = new Map<StnId, StnId[]>();

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
        x: point.pos[0] * ScalingFactor,
        y: point.pos[1] * ScalingFactor,
        type,
        [type]: attr,
    });
};

interface CreateMiscNodeCommonAttrs {
    id: number;
    pos: [number, number];
}

const createMiscNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    point: CreateMiscNodeCommonAttrs,
    type: MiscNodeType,
    config: Partial<MiscNodeAttributes[MiscNodeType]> = {},
    zIndex: number = 0
) => {
    const id: MiscNodeId = `misc_node_${nanoid(10)}`;
    stationIds.set(point.id, id);
    const attr = {
        ...structuredClone(miscNodes[type].defaultAttrs),
        ...config,
    };
    graph.addNode(id, {
        visible: true,
        zIndex,
        x: point.pos[0] * ScalingFactor,
        y: point.pos[1] * ScalingFactor,
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
        } else if (pre === 1) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', '#cccccc', MonoColour.white],
            };
        } else if (pre === 2) {
            return {
                style: LineStyleType.River,
                theme: [CityCode.Other, 'other', '#c3e5eb', MonoColour.white],
            };
        } else if (pre === 3) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', '#ceeda4', MonoColour.white],
            };
        } else if (pre === 4) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', '#ffffff', MonoColour.white],
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
        createMiscNode(graph, stationPoints.get(line.pts[0])!, MiscNodeType.Fill, { color: theme, opacity: 1 }, -1);
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

const replaceLine = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    line: LineId,
    repFrom: StnId,
    repTo: StnId,
    offset: number
) => {
    const type = graph.getEdgeAttribute(line, 'type');
    const [s, t] = graph.extremities(line);
    const attr = graph.getEdgeAttributes(line);
    if (s === repFrom)
        (attr[type] as ExternalLinePathAttributes[LinePathType.Diagonal | LinePathType.Perpendicular])!.offsetFrom =
            offset;
    else
        (attr[type] as ExternalLinePathAttributes[LinePathType.Diagonal | LinePathType.Perpendicular])!.offsetTo =
            offset;
    graph.dropEdge(line);
    graph.addDirectedEdgeWithKey(line, s === repFrom ? repTo : s, t === repFrom ? repTo : t, {
        ...attr,
        type,
    });
};

const createInterchange = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    index: number,
    ids: StnId[],
    stationTypeOption: StationTypeOption
) => {
    let sumX = 0;
    let sumY = 0;
    let name = '';
    let nameS = '';
    ids.forEach(id => {
        sumX += graph.getNodeAttribute(id, 'x');
        sumY += graph.getNodeAttribute(id, 'y');
        const type = graph.getNodeAttribute(id, 'type') as StationType;
        const names = graph.getNodeAttributes(id)[type]!.names;
        const gr = names[0] ? (name !== '' ? `/${names[0]}` : names[0]) : '';
        const grS = names[1] ? (nameS !== '' ? `/${names[1]}` : names[1]) : '';
        name += gr;
        nameS += grS;
    });
    const centerX = sumX / ids.length;
    const centerY = sumY / ids.length;
    createStation(
        graph,
        { id: 1e8 + index, name, nameS, pos: [centerX / ScalingFactor, centerY / ScalingFactor], dir: 0, sta: 1 },
        stationTypeOptions[stationTypeOption].int
    );
    const intId = stationIds.get(1e8 + index)!;
    ids.forEach(id => {
        const x = graph.getNodeAttribute(id, 'x');
        const y = graph.getNodeAttribute(id, 'y');
        const offset = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        graph.edges(id).forEach(line => {
            replaceLine(graph, line as LineId, id as StnId, intId as StnId, offset);
        });
        graph.dropNode(id);
    });
};

const findInterchangeGroups = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const groups = new Map<StnId, StnId[]>();
    const stnNodes = Array.from(stationIds.values()).filter(id => id.startsWith('stn')) as StnId[];
    const visited = new Set<StnId>();
    const adj = new Map<StnId, StnId[]>();

    for (let i = 0; i < stnNodes.length; i++) {
        const u = stnNodes[i];
        const ux = graph.getNodeAttribute(u, 'x');
        const uy = graph.getNodeAttribute(u, 'y');

        for (let j = i + 1; j < stnNodes.length; j++) {
            const v = stnNodes[j];
            const vx = graph.getNodeAttribute(v, 'x');
            const vy = graph.getNodeAttribute(v, 'y');

            if (
                (Math.abs(ux - vx) === InterchangeOffset && uy === vy) ||
                (Math.abs(uy - vy) === InterchangeOffset && vx === ux)
            ) {
                if (!adj.has(u)) adj.set(u, []);
                if (!adj.has(v)) adj.set(v, []);
                adj.get(u)!.push(v);
                adj.get(v)!.push(u);
            }
        }
    }

    stnNodes.forEach(u => {
        if (!visited.has(u) && adj.has(u)) {
            const group: StnId[] = [];
            const queue = [u];
            visited.add(u);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                group.push(curr);
                adj.get(curr)!.forEach(v => {
                    if (!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                });
            }
            groups.set(u, group);
        }
    });

    return groups;
};

const createTextTag = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    p: CreateMiscNodeCommonAttrs,
    text: string,
    textOp: Exclude<TextTag['textOp'], undefined>,
    anchorX: number,
    anchorY: number,
    globalFontBase: number,
    theme?: Theme
) => {
    const attr: MiscNodeAttributes[MiscNodeType.Text] = {
        content: text,
        color: theme ?? [CityCode.Other, 'other', (textOp.color as `#${string}`) || '#000000', MonoColour.white],
        fontSize: 30 * (textOp.size || 1) * globalFontBase * 1.2 * ScalingFactor,
        lineHeight: 30 * (textOp.size || 1) * globalFontBase * 1.2 * ScalingFactor,
        textAnchor: anchorX === 0 ? 'middle' : anchorX === 1 ? 'start' : 'end',
        dominantBaseline: anchorY === 0 ? 'central' : anchorY === 1 ? 'hanging' : 'text-before-edge',
        language: TextLanguage.en,
        rotate: 0,
        italic: textOp.i ? 'italic' : 'normal',
        bold: textOp.b ? 'bold' : 'normal',
        outline: 0,
    };
    createMiscNode(graph, p, MiscNodeType.Text, attr);
};

const handleTextTag = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    tag: TextTag,
    config: AarcSave['config'],
    theme?: Theme
) => {
    const p1: CreateMiscNodeCommonAttrs = { id: tag.id, pos: tag.pos };
    const p2: CreateMiscNodeCommonAttrs = { id: tag.id + 1e9, pos: tag.pos };
    const t1 = tag.text?.trim();
    const t2 = tag.textS?.trim();
    if (t1) {
        createTextTag(
            graph,
            p1,
            tag.text ?? '',
            tag.textOp ?? defaultTextOp,
            tag.anchorX ?? 0,
            tag.anchorY ?? 0,
            config.textTagPlain && config.textTagPlain.fontSize ? config.textTagPlain.fontSize : 1,
            theme
        );
    }
    if (t2) {
        createTextTag(
            graph,
            p2,
            tag.textS ?? '',
            tag.textSOp ?? defaultTextOp,
            tag.anchorX ?? 0,
            tag.anchorY ?? 0,
            config.textTagPlain && config.textTagPlain.subFontSize ? config.textTagPlain.subFontSize : 1,
            theme
        );
    }
};

const isAarcSave = (data: any): data is AarcSave => {
    return (
        data &&
        typeof data === 'object' &&
        typeof data.idIncre === 'number' &&
        Array.isArray(data.points) &&
        Array.isArray(data.lines) &&
        Array.isArray(data.textTags) &&
        Array.isArray(data.cvsSize) &&
        data.config &&
        typeof data.config === 'object'
    );
};

export const convertAARCToRmp = (
    aarc: string,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stationTypeOption: StationTypeOption = StationTypeOption.Suzhou
) => {
    stationIds.clear();
    stationPoints.clear();
    interchangeGroups.clear();
    const aarcSave = JSON.parse(aarc);

    if (!isAarcSave(aarcSave)) {
        throw new Error('Invalid AARC save data');
    }

    // Create stations and virtual nodes.
    aarcSave.points.forEach(point => {
        stationPoints.set(point.id, point);
        if (point.sta === 1) {
            createStation(graph, point, stationTypeOptions[stationTypeOption].basic);
        } else {
            createMiscNode(graph, point, MiscNodeType.Virtual);
        }
    });

    // Create lines.
    aarcSave.lines.forEach(line => {
        createLine(graph, line);
    });

    // Update interchanges.
    const groups = findInterchangeGroups(graph);
    const nodesToRemove = new Set<StnId>();

    let index = 0;
    groups.forEach(ids => {
        createInterchange(graph, index, ids, stationTypeOption);
        ids.forEach(id => nodesToRemove.add(id));
        index++;
    });

    for (const [key, val] of stationIds) {
        if (nodesToRemove.has(val as StnId)) {
            stationIds.delete(key);
        }
    }

    // Create text tags.
    aarcSave.textTags.forEach(tag => {
        if (tag.forId === undefined) {
            handleTextTag(graph, tag, aarcSave.config);
        } else {
            const forId = tag.forId!;
            const line = aarcSave.lines.find(l => l.id === forId);
            if (line) {
                const { theme } = generateLineStyleType(line.type, line.colorPre ?? 0, line.color);
                if (line.type === 1) {
                    handleTextTag(graph, tag, aarcSave.config, theme);
                } else {
                    createMiscNode(graph, { id: tag.id, pos: tag.pos }, MiscNodeType.GzmtrLineBadge, {
                        names: [tag.text ?? (line.name || ''), tag.textS ?? (line.nameSub || '')],
                        color: theme,
                    });
                }
            }
        }
    });

    // Update station types and populate transfers.
    stationIds.forEach(id => {
        if (graph.hasNode(id) && id.startsWith('stn')) {
            autoUpdateStationType(graph, id as StnId);
            autoPopulateTransfer(graph, id as StnId);
        }
    });
};
