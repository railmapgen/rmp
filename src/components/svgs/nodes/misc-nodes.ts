import { MiscNodeType } from '../../../constants/nodes';
import virtual from './virtual';
import shmetroNumLineBadge from './shmetro-num-line-badge';
import shmetroTextLineBadge from './shmetro-text-line-badge';
import facilities from './facilities';
import gzmtrLineBadge from './gzmtr-line-badge/gzmtr-line-badge';

const miscNodes = {
    [MiscNodeType.Virtual]: virtual,
    [MiscNodeType.ShmetroNumLineBadge]: shmetroNumLineBadge,
    [MiscNodeType.ShmetroTextLineBadge]: shmetroTextLineBadge,
    [MiscNodeType.Facilities]: facilities,
    [MiscNodeType.GzmtrLineBadge]: gzmtrLineBadge,
};

export default miscNodes;
