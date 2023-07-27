import { MiscNodeType } from '../../../constants/nodes';
import virtual from './virtual';
import shmetroNumLineBadge from './shmetro-num-line-badge';
import shmetroTextLineBadge from './shmetro-text-line-badge';
import gzmtrLineBadge from './gzmtr-line-badge/gzmtr-line-badge';
import bjsubwayNumLineBadge from './bjsubway-num-line-badge';
import bjsubwayTextLineBadge from './bjsubway-text-line-badge';
import facilities from './facilities';
import text from './text';
import berlinUBahnLineBadge from './berlin-u-bahn-line-badge';
import berlinSBahnLineBadge from './berlin-s-bahn-line-badge';

const miscNodes = {
    [MiscNodeType.Virtual]: virtual,
    [MiscNodeType.ShmetroNumLineBadge]: shmetroNumLineBadge,
    [MiscNodeType.ShmetroTextLineBadge]: shmetroTextLineBadge,
    [MiscNodeType.GzmtrLineBadge]: gzmtrLineBadge,
    [MiscNodeType.BjsubwayNumLineBadge]: bjsubwayNumLineBadge,
    [MiscNodeType.BjsubwayTextLineBadge]: bjsubwayTextLineBadge,
    [MiscNodeType.BerlinSBahnLineBadge]: berlinSBahnLineBadge,
    [MiscNodeType.BerlinUBahnLineBadge]: berlinUBahnLineBadge,
    [MiscNodeType.Facilities]: facilities,
    [MiscNodeType.Text]: text,
};

export default miscNodes;
