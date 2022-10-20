import { MiscEdgeType } from '../../constants/edges';
import shmetroVirtualInt from './shmetro-virtual-int';
import gzmtrVirtualInt from './gzmtr-virtual-int';

const miscEdges = {
    [MiscEdgeType.ShmetroVirtualInt]: shmetroVirtualInt,
    [MiscEdgeType.GzmtrVirtualInt]: gzmtrVirtualInt,
};

export default miscEdges;
