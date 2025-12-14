import { LineStyleType, LinePathType } from '../../../constants/lines';
import simplePath from './paths/simple';
import diagonalPath from './paths/diagonal';
import perpendicularPath from './paths/perpendicular';
import rotatePerpendicularPath from './paths/rotate-perpendicular';
import singleColor from './styles/single-color';
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

export const linePaths = {
    [LinePathType.Diagonal]: diagonalPath,
    [LinePathType.Perpendicular]: perpendicularPath,
    [LinePathType.RotatePerpendicular]: rotatePerpendicularPath,
    [LinePathType.Simple]: simplePath,
};

export const lineStyles = {
    [LineStyleType.SingleColor]: singleColor,
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
};
