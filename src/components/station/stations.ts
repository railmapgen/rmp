import { StationType } from '../../constants/stations';
import shmetroIntStation from './shmetro-int';
import shmetroBasicStation from './shmetro-basic';

const stations = {
    [StationType.ShmetroInt]: shmetroIntStation,
    [StationType.ShmetroBasic]: shmetroBasicStation,
};

export default stations;
