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
};

export default stations;
