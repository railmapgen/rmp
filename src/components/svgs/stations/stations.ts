import { StationType } from '../../../constants/stations';
import shmetroBasicStation from './shmetro-basic';
import shmetroBasic2020Station from './shmetro-basic-2020';
import shmetroIntStation from './shmetro-int';
import shmetroOsysiStation from './shmetro-osysi';
import shanghaiSuburbanRailwayStation from './shanghai-suburban-railway';
import gzmtrBasicStation from './gzmtr-basic';
import gzmtrIntStation from './gzmtr-int';
import gzmtrInt2024Station from './gzmtr-int-2024';
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
import qingdaoMetroStation from './qingdao-metro-station';
import tokyoMetroBasicStation from './tokyo-metro-basic';
import tokyoMetroIntStation from './tokyo-metro-int';
import londonTubeBasicStation from './london-tube-basic';
import londonTubeIntStation from './london-tube-int';
import londonRiverServicesIntStation from './london-river-services-interchange';
import guangdongIntercityRailwayStation from './guangdong-intercity-railway';
import chongqingRTBasicStation from './chongqingrt-basic';
import chongqingRTIntStation from './chongqingrt-int';
import chongqingRTBasicStation2021 from './chongqingrt-basic-2021';
import chongqingRTIntStation2021 from './chongqingrt-int-2021';
import chengduRTBasicStation from './chengdurt-basic';
import chengduRTIntStation from './chengdurt-int';
import osakaMetroStation from './osaka-metro';
import wuhanRTBasicStation from './wuhanrt-basic';
import wuhanRTIntStation from './wuhanrt-int';
import csmetroBasicStation from './csmetro-basic';
import csmetroIntStation from './csmetro-int';
import hzmetroBasicStation from './hzmetro-basic';
import hzmetroIntStation from './hzmetro-int';

const stations = {
    [StationType.ShmetroBasic]: shmetroBasicStation,
    [StationType.ShmetroBasic2020]: shmetroBasic2020Station,
    [StationType.ShmetroInt]: shmetroIntStation,
    [StationType.ShmetroOutOfSystemInt]: shmetroOsysiStation,
    [StationType.ShanghaiSuburbanRailway]: shanghaiSuburbanRailwayStation,
    [StationType.GzmtrBasic]: gzmtrBasicStation,
    [StationType.GzmtrInt]: gzmtrIntStation,
    [StationType.GzmtrInt2024]: gzmtrInt2024Station,
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
    [StationType.QingdaoMetroStation]: qingdaoMetroStation,
    [StationType.TokyoMetroBasic]: tokyoMetroBasicStation,
    [StationType.TokyoMetroInt]: tokyoMetroIntStation,
    [StationType.LondonTubeBasic]: londonTubeBasicStation,
    [StationType.LondonTubeInt]: londonTubeIntStation,
    [StationType.LondonRiverServicesInt]: londonRiverServicesIntStation,
    [StationType.GuangdongIntercityRailway]: guangdongIntercityRailwayStation,
    [StationType.ChongqingRTBasic]: chongqingRTBasicStation,
    [StationType.ChongqingRTInt]: chongqingRTIntStation,
    [StationType.ChongqingRTBasic2021]: chongqingRTBasicStation2021,
    [StationType.ChongqingRTInt2021]: chongqingRTIntStation2021,
    [StationType.ChengduRTBasic]: chengduRTBasicStation,
    [StationType.ChengduRTInt]: chengduRTIntStation,
    [StationType.OsakaMetro]: osakaMetroStation,
    [StationType.WuhanRTBasic]: wuhanRTBasicStation,
    [StationType.WuhanRTInt]: wuhanRTIntStation,
    [StationType.CsmetroBasic]: csmetroBasicStation,
    [StationType.CsmetroInt]: csmetroIntStation,
    [StationType.HzmetroBasic]: hzmetroBasicStation,
    [StationType.HzmetroInt]: hzmetroIntStation,
};

export default stations;
