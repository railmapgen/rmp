import { LineStyleType, LinePathType } from '../../../constants/lines';
import simplePath from './paths/simple';
import diagonalPath from './paths/diagonal';
import perpendicularPath from './paths/perpendicular';
import rotatePerpendicularPath from './paths/rotate-perpendicular';
import singleColor from './styles/single-color';
import shmetroVirtualInt from './styles/shmetro-virtual-int';
import gzmtrVirtualInt from './styles/gzmtr-virtual-int';
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

export const linePaths = {
    [LinePathType.Diagonal]: diagonalPath,
    [LinePathType.Perpendicular]: perpendicularPath,
    [LinePathType.RotatePerpendicular]: rotatePerpendicularPath,
    [LinePathType.Simple]: simplePath,
};

export const lineStyles = {
    [LineStyleType.SingleColor]: singleColor,
    [LineStyleType.ShmetroVirtualInt]: shmetroVirtualInt,
    [LineStyleType.GzmtrVirtualInt]: gzmtrVirtualInt,
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
};
