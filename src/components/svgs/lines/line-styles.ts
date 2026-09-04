import { LineStyleType } from '../../../constants/lines';
import bjsubwayDotted from './styles/bjsubway-dotted';
import bjsubwaySingleColor from './styles/bjsubway-single-color';
import bjsubwayTram from './styles/bjsubway-tram';
import chengduRTOutsideFareGates from './styles/chengdurt-outside-fare-gates';
import chinaRailway from './styles/china-railway';
import chongqingRTLineBadge from './styles/chongqingrt-line-badge';
import chongqingRTLoop from './styles/chongqingrt-loop';
import dualColor from './styles/dual-color';
import generic from './styles/generic';
import guangdongIntercityRailway from './styles/guangdong-intercity-railway';
import gzmtrLoop from './styles/gzmtr-loop';
import gzmtrVirtualInt from './styles/gzmtr-virtual-int';
import jrEastSingleColorPattern from './styles/jr-east-single-color-pattern';
import jrEastSingleColor from './styles/jr-east-single-color';
import londonLutonAirportDART from './styles/london-DART';
import londonIFSCloudCableCar from './styles/london-ifs-cloud-cable-car';
import londonRail from './styles/london-rail';
import londonSandwich from './styles/london-sandwich';
import londonTube10MinWalk from './styles/london-tube-10-min-walk';
import londonTubeInternalInt from './styles/london-tube-internal-int';
import londonTubeTerminal from './styles/london-tube-terminal';
import lrtSingleColor from './styles/lrt-single-color';
import mrtSentosaExpress from './styles/mrt-sentosa-express';
import mrtTapeOut from './styles/mrt-tape-out';
import mrtUnderConstruction from './styles/mrt-under-construction';
import mtrLightRail from './styles/mtr-light-rail';
import mtrPaidArea from './styles/mtr-paid-area';
import mtrRaceDays from './styles/mtr-race-day';
import mtrUnpaidArea from './styles/mtr-unpaid-area';
import river from './styles/river';
import shanghaiSuburbanRailway from './styles/shanghai-suburban-railway';
import shinkansen from './styles/shinkansen';
import shmetroVirtualInt from './styles/shmetro-virtual-int';
import singleColor from './styles/single-color';
import unknownLineStyle from './styles/unknown';

/**
 * Line-style registry kept separate from line paths so style comparison does not create a path-registry cycle.
 */
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
