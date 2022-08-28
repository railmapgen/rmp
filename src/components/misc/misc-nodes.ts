import { MiscNodeType } from '../../constants/node';
import virtual from './virtual';
import shmetroNumLineBadge from './shmetro-num-line-badge';

const miscNodes = {
    [MiscNodeType.Virtual]: virtual,
    [MiscNodeType.ShmetroNumLineBadge]: shmetroNumLineBadge,
};

export default miscNodes;
