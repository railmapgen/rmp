import { LineStyleType, LinePathType } from '../../../constants/lines';
import simplePath from './paths/simple';
import diagonalPath from './paths/diagonal';
import perpendicularPath from './paths/perpendicular';
import singleColor from './styles/single-color';
import shmetroVirtualInt from './styles/shmetro-virtual-int';
import gzmtrVirtualInt from './styles/gzmtr-virtual-int';
import chinaRailway from './styles/china-railway';
import bjsubwayTram from './styles/bjsubway-tram';

export const linePaths = {
    [LinePathType.Simple]: simplePath,
    [LinePathType.Diagonal]: diagonalPath,
    [LinePathType.Perpendicular]: perpendicularPath,
};

export const lineStyles = {
    [LineStyleType.SingleColor]: singleColor,
    [LineStyleType.ShmetroVirtualInt]: shmetroVirtualInt,
    [LineStyleType.GzmtrVirtualInt]: gzmtrVirtualInt,
    [LineStyleType.ChinaRailway]: chinaRailway,
    [LineStyleType.BjsubwayTram]: bjsubwayTram,
    // [LineStyleType.Maglev]: singleColor,
};
