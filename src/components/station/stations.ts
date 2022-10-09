import { StationType } from '../../constants/stations';
import shmetroIntStation from './shmetro-int';
import shmetroBasicStation from './shmetro-basic';
import shmetroBasic2020Station from './shmetro-basic-2020';
import gzmtrBasicStation from './gzmtr-basic';

const stations = {
    [StationType.ShmetroInt]: shmetroIntStation,
    [StationType.ShmetroBasic]: shmetroBasicStation,
    [StationType.ShmetroBasic2020]: shmetroBasic2020Station,
    [StationType.GzmtrBasic]: gzmtrBasicStation,
};

export default stations;
