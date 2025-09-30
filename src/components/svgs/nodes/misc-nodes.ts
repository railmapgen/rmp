import { MiscNodeType } from '../../../constants/nodes';
import virtual from './virtual';
import facilities from './facilities';
import text from './text';
import i18nText from './i18n-text';
import Master from './master';
import Image from './image';
import fill from './fill';
import shmetroNumLineBadge from './shmetro-num-line-badge';
import shmetroTextLineBadge from './shmetro-text-line-badge';
import gzmtrLineBadge from './gzmtr-line-badge';
import bjsubwayNumLineBadge from './bjsubway-num-line-badge';
import bjsubwayTextLineBadge from './bjsubway-text-line-badge';
import suzhouRTNumLineBadge from './suzhourt-num-line-badge';
import berlinUBahnLineBadge from './berlin-u-bahn-line-badge';
import berlinSBahnLineBadge from './berlin-s-bahn-line-badge';
import chongqingRTNumLineBadge from './chongqingrt-num-line-badge';
import chongqingRTTextLineBadge from './chongqingrt-text-line-badge';
import chongqingRTNumLineBadge2021 from './chongqingrt-num-line-badge-2021';
import chongqingRTTextLineBadge2021 from './chongqingrt-text-line-badge-2021';
import shenzhenMetroNumLineBadge from './shenzhenmetro-num-line-badge';
import mrtDestinationNumbers from './mrt-dest-num';
import mrtLineBadge from './mrt-line-badge';
import jrEastLineBadge from './jr-east-line-badge';
import qingdaoMetroNumLineBadge from './qingdao-metro-num-line-badge';
import guangdongIntercityRailwayLineBadge from './guangdong-intercity-railway-line-badge';
import londonArrow from './london-arrow';
import chengduRTLineBadge from './chengdurt-line-badge';
import taipeiMetroLineBadge from './taipei-metro-line-badge';

const miscNodes = {
    [MiscNodeType.Virtual]: virtual,
    [MiscNodeType.Master]: Master,
    [MiscNodeType.Image]: Image,
    [MiscNodeType.Facilities]: facilities,
    [MiscNodeType.Text]: text,
    [MiscNodeType.I18nText]: i18nText,
    [MiscNodeType.Fill]: fill,
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
    [MiscNodeType.ChongqingRTNumLineBadge2021]: chongqingRTNumLineBadge2021,
    [MiscNodeType.ChongqingRTTextLineBadge2021]: chongqingRTTextLineBadge2021,
    [MiscNodeType.ShenzhenMetroNumLineBadge]: shenzhenMetroNumLineBadge,
    [MiscNodeType.MRTDestinationNumbers]: mrtDestinationNumbers,
    [MiscNodeType.MRTLineBadge]: mrtLineBadge,
    [MiscNodeType.JREastLineBadge]: jrEastLineBadge,
    [MiscNodeType.QingdaoMetroNumLineBadge]: qingdaoMetroNumLineBadge,
    [MiscNodeType.GuangdongIntercityRailwayLineBadge]: guangdongIntercityRailwayLineBadge,
    [MiscNodeType.LondonArrow]: londonArrow,
    [MiscNodeType.ChengduRTLineBadge]: chengduRTLineBadge,
    [MiscNodeType.TaiPeiMetroLineBadege]: taipeiMetroLineBadge,
};

export default miscNodes;
