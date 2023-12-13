import { MiscNodeType } from '../../../constants/nodes';
import virtual from './virtual';
import shmetroNumLineBadge from './shmetro-num-line-badge';
import shmetroTextLineBadge from './shmetro-text-line-badge';
import gzmtrLineBadge from './gzmtr-line-badge';
import bjsubwayNumLineBadge from './bjsubway-num-line-badge';
import bjsubwayTextLineBadge from './bjsubway-text-line-badge';
import suzhouRTNumLineBadge from './suzhourt-num-line-badge';
import facilities from './facilities';
import text from './text';
import berlinUBahnLineBadge from './berlin-u-bahn-line-badge';
import berlinSBahnLineBadge from './berlin-s-bahn-line-badge';
import chongqingRTNumLineBadge from './chongqingrt-num-line-badge';
import chongqingRTTextLineBadge from './chongqingrt-text-line-badge';
import shenzhenMetroNumLineBadge from './shenzhenmetro-num-line-badge';
import mrtNumLineBadge from './mrt-num-line-badge';

const miscNodes = {
    [MiscNodeType.Virtual]: virtual,
    [MiscNodeType.ShmetroNumLineBadge]: shmetroNumLineBadge,
    [MiscNodeType.ShmetroTextLineBadge]: shmetroTextLineBadge,
    [MiscNodeType.GzmtrLineBadge]: gzmtrLineBadge,
    [MiscNodeType.BjsubwayNumLineBadge]: bjsubwayNumLineBadge,
    [MiscNodeType.BjsubwayTextLineBadge]: bjsubwayTextLineBadge,
    [MiscNodeType.SuzhouRTNumLineBadge]: suzhouRTNumLineBadge,
    [MiscNodeType.BerlinSBahnLineBadge]: berlinSBahnLineBadge,
    [MiscNodeType.BerlinUBahnLineBadge]: berlinUBahnLineBadge,
    [MiscNodeType.ChongqingRTNumLineBadge]: chongqingRTNumLineBadge,
    [MiscNodeType.ChongqingRTTextLineBadge]: chongqingRTTextLineBadge,
    [MiscNodeType.ShenzhenMetroNumLineBadge]: shenzhenMetroNumLineBadge,
    [MiscNodeType.MRTNumLineBadge]: mrtNumLineBadge,
    [MiscNodeType.Facilities]: facilities,
    [MiscNodeType.Text]: text,
};

export default miscNodes;
