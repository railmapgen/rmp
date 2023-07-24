import { MiscNodeType } from '../../../constants/nodes';
import virtual from './virtual';
import shmetroNumLineBadge from './shmetro-num-line-badge';
import shmetroTextLineBadge from './shmetro-text-line-badge';
import gzmtrLineBadge from './gzmtr-line-badge/gzmtr-line-badge';
import bjsubwayNumLineBadge from './bjsubway-num-line-badge';
import bjsubwayTextLineBadge from './bjsubway-text-line-badge';
import facilities from './facilities';
import text from './text';
import berlinUBahnBadge from './berlin-u-bahn-badge';

const miscNodes = {
    [MiscNodeType.Virtual]: virtual,
    [MiscNodeType.ShmetroNumLineBadge]: shmetroNumLineBadge,
    [MiscNodeType.ShmetroTextLineBadge]: shmetroTextLineBadge,
    [MiscNodeType.GzmtrLineBadge]: gzmtrLineBadge,
    [MiscNodeType.BjsubwayNumLineBadge]: bjsubwayNumLineBadge,
    [MiscNodeType.BjsubwayTextLineBadge]: bjsubwayTextLineBadge,
    [MiscNodeType.BerlinUBahnBadge]: berlinUBahnBadge,
    [MiscNodeType.Facilities]: facilities,
    [MiscNodeType.Text]: text,
};

export default miscNodes;
