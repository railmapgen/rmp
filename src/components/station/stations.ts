import { StationType } from '../../constants/stations';
import shmetroIntStation from './shmetro-int';
import shmetroBasicStation from './shmetro-basic';
import shmetroBasic2020Station from './shmetro-basic-2020';

const stations = {
    [StationType.ShmetroInt]: shmetroIntStation,
    [StationType.ShmetroBasic]: shmetroBasicStation,
    [StationType.ShmetroBasic2020]: shmetroBasic2020Station,
};

export default stations;
