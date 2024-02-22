import { StationType } from '../../../constants/stations';
import shmetroBasicStation from './shmetro-basic';
import shmetroBasic2020Station from './shmetro-basic-2020';
import shmetroIntStation from './shmetro-int';
import shmetroOsysiStation from './shmetro-osysi';
import gzmtrBasicStation from './gzmtr-basic';
import gzmtrIntStation from './gzmtr-int';
import bjsubwayBasicStation from './bjsubway-basic';
import bjsubwayIntStation from './bjsubway-int';
import mtrStation from './mtr';
import suzhouRTBasicStation from './suzhourt-basic';
import suzhouRTIntStation from './suzhourt-int';
import kunmingRTBasicStation from './kunmingrt-basic';
import kunmingRTIntStation from './kunmingrt-int';
import mrtBasicStation from './mrt-basic';
import mrtIntStation from './mrt-int';
import jrEastBasicStation from './jr-east-basic';
import jrEastImportantStation from './jr-east-important';
import foshanMetroBasicStation from './foshan-metro-basic';
import qingdaoMetroBasicStation from './qingdao-metro-basic';
import qingdaoMetroIntStation from './qingdao-metro-int';

const stations = {
    [StationType.ShmetroBasic]: shmetroBasicStation,
    [StationType.ShmetroBasic2020]: shmetroBasic2020Station,
    [StationType.ShmetroInt]: shmetroIntStation,
    [StationType.ShmetroOutOfSystemInt]: shmetroOsysiStation,
    [StationType.GzmtrBasic]: gzmtrBasicStation,
    [StationType.GzmtrInt]: gzmtrIntStation,
    [StationType.BjsubwayBasic]: bjsubwayBasicStation,
    [StationType.BjsubwayInt]: bjsubwayIntStation,
    [StationType.MTR]: mtrStation,
    [StationType.SuzhouRTBasic]: suzhouRTBasicStation,
    [StationType.SuzhouRTInt]: suzhouRTIntStation,
    [StationType.KunmingRTBasic]: kunmingRTBasicStation,
    [StationType.KunmingRTInt]: kunmingRTIntStation,
    [StationType.MRTBasic]: mrtBasicStation,
    [StationType.MRTInt]: mrtIntStation,
    [StationType.JREastBasic]: jrEastBasicStation,
    [StationType.JREastImportant]: jrEastImportantStation,
    [StationType.FoshanMetroBasic]: foshanMetroBasicStation,
    [StationType.QingdaoMetroBasic]: qingdaoMetroBasicStation,
    [StationType.QingdaoMetroInt]: qingdaoMetroIntStation,
};

export default stations;
