import type { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../../../constants/constants';
import {
    LinePathEdgeAttrsNormalizationMode,
    LinePathEdgeAttrsNormalizer,
    LinePathType,
    LineStyleType,
} from '../../../constants/lines';
import simplePath from './paths/simple';
import diagonalPath from './paths/diagonal';
import perpendicularPath from './paths/perpendicular';
import rotatePerpendicularPath from './paths/rotate-perpendicular';
import rayGuidedPath from './paths/ray-guided';
import bezierPath from './paths/bezier';
import freeformPath from './paths/freeform';
import singleColor from './styles/single-color';
import generic from './styles/generic';
import unknownLineStyle from './styles/unknown';
import shmetroVirtualInt from './styles/shmetro-virtual-int';
import shanghaiSuburbanRailway from './styles/shanghai-suburban-railway';
import gzmtrVirtualInt from './styles/gzmtr-virtual-int';
import gzmtrLoop from './styles/gzmtr-loop';
import chinaRailway from './styles/china-railway';
import bjsubwaySingleColor from './styles/bjsubway-single-color';
import bjsubwayTram from './styles/bjsubway-tram';
import dualColor from './styles/dual-color';
import river from './styles/river';
import mtrRaceDays from './styles/mtr-race-day';
import mtrLightRail from './styles/mtr-light-rail';
import mtrUnpaidArea from './styles/mtr-unpaid-area';
import mtrPaidArea from './styles/mtr-paid-area';
import bjsubwayDotted from './styles/bjsubway-dotted';
import mrtUnderConstruction from './styles/mrt-under-construction';
import mrtSentosaExpress from './styles/mrt-sentosa-express';
import mrtTapeOut from './styles/mrt-tape-out';
import jrEastSingleColor from './styles/jr-east-single-color';
import jrEastSingleColorPattern from './styles/jr-east-single-color-pattern';
import lrtSingleColor from './styles/lrt-single-color';
import londonTubeInternalInt from './styles/london-tube-internal-int';
import londonTube10MinWalk from './styles/london-tube-10-min-walk';
import londonTubeTerminal from './styles/london-tube-terminal';
import londonRail from './styles/london-rail';
import londonSandwich from './styles/london-sandwich';
import londonLutonAirportDART from './styles/london-DART';
import londonIFSCloudCableCar from './styles/london-ifs-cloud-cable-car';
import guangdongIntercityRailway from './styles/guangdong-intercity-railway';
import chongqingRTLoop from './styles/chongqingrt-loop';
import chongqingRTLineBadge from './styles/chongqingrt-line-badge';
import chengduRTOutsideFareGates from './styles/chengdurt-outside-fare-gates';
import shinkansen from './styles/shinkansen';

export const linePaths = {
    [LinePathType.Diagonal]: diagonalPath,
    [LinePathType.Perpendicular]: perpendicularPath,
    [LinePathType.RotatePerpendicular]: rotatePerpendicularPath,
    [LinePathType.RayGuided]: rayGuidedPath,
    [LinePathType.Simple]: simplePath,
    [LinePathType.Bezier]: bezierPath,
    [LinePathType.Freeform]: freeformPath,
};

/**
 * Runs the registered LinePath normalizer for a complete semantic edge change set.
 *
 * Call this after all listed edges exist with their new attributes and before saving the graph. Supply only edges
 * changed by the current transaction, in deterministic priority order. Missing/deleted edges and path types without
 * a normalizer are ignored. Importing or copying serialized edges should bypass this function so saved path
 * attributes are not rewritten.
 *
 * The pending set is also passed to each hook as `ignoredEdgeIds`: the current and later edges cannot act as anchors.
 * Once an edge is normalized it becomes eligible to anchor later edges, making a batch converge without depending on
 * partially updated values. The function mutates `graph` in place and does not save or refresh it.
 */
// TODO: Move this coordinator out of the React `linePaths` registry when implementing the unified graph-operation
// pipeline in `docs/graph-mutation-pipeline-design.md`. LinePaths should register their optional normalizers in a
// dependency-light registry, and the graph thunk should call that registry without importing component definitions.
export const normalizeEdgeAttributes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeIds: Iterable<LineId>,
    mode: LinePathEdgeAttrsNormalizationMode = 'updated'
) => {
    const pending = new Set<LineId>();
    for (const edgeId of edgeIds) {
        if (graph.hasEdge(edgeId)) pending.add(edgeId);
    }

    for (const edgeId of pending) {
        const type = graph.getEdgeAttribute(edgeId, 'type');
        const normalize = linePaths[type].normalizeEdgeAttrs as LinePathEdgeAttrsNormalizer | undefined;
        normalize?.(graph, edgeId, { mode, ignoredEdgeIds: pending });
        pending.delete(edgeId);
    }
};

export const lineStyles = {
    [LineStyleType.SingleColor]: singleColor,
    [LineStyleType.Generic]: generic,
    [LineStyleType.Unknown]: unknownLineStyle,
    [LineStyleType.ShmetroVirtualInt]: shmetroVirtualInt,
    [LineStyleType.ShanghaiSuburbanRailway]: shanghaiSuburbanRailway,
    [LineStyleType.GzmtrVirtualInt]: gzmtrVirtualInt,
    [LineStyleType.GZMTRLoop]: gzmtrLoop,
    [LineStyleType.ChinaRailway]: chinaRailway,
    [LineStyleType.BjsubwaySingleColor]: bjsubwaySingleColor,
    [LineStyleType.BjsubwayTram]: bjsubwayTram,
    [LineStyleType.BjsubwayDotted]: bjsubwayDotted,
    [LineStyleType.DualColor]: dualColor,
    [LineStyleType.River]: river,
    [LineStyleType.MTRRaceDays]: mtrRaceDays,
    [LineStyleType.MTRLightRail]: mtrLightRail,
    [LineStyleType.MTRUnpaidArea]: mtrUnpaidArea,
    [LineStyleType.MTRPaidArea]: mtrPaidArea,
    [LineStyleType.MRTUnderConstruction]: mrtUnderConstruction,
    [LineStyleType.MRTSentosaExpress]: mrtSentosaExpress,
    [LineStyleType.MRTTapeOut]: mrtTapeOut,
    [LineStyleType.JREastSingleColor]: jrEastSingleColor,
    [LineStyleType.JREastSingleColorPattern]: jrEastSingleColorPattern,
    [LineStyleType.LRTSingleColor]: lrtSingleColor,
    [LineStyleType.LondonTubeTerminal]: londonTubeTerminal,
    [LineStyleType.LondonTubeInternalInt]: londonTubeInternalInt,
    [LineStyleType.LondonTube10MinWalk]: londonTube10MinWalk,
    [LineStyleType.LondonRail]: londonRail,
    [LineStyleType.LondonSandwich]: londonSandwich,
    [LineStyleType.LondonLutonAirportDART]: londonLutonAirportDART,
    [LineStyleType.LondonIFSCloudCableCar]: londonIFSCloudCableCar,
    [LineStyleType.GuangdongIntercityRailway]: guangdongIntercityRailway,
    [LineStyleType.ChongqingRTLoop]: chongqingRTLoop,
    [LineStyleType.ChongqingRTLineBadge]: chongqingRTLineBadge,
    [LineStyleType.ChengduRTOutsideFareGates]: chengduRTOutsideFareGates,
    [LineStyleType.Shinkansen]: shinkansen,
};
