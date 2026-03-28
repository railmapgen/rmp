import { StationCity } from '../constants/constants';
import type { RandomStationsNamesValue } from './app/app-slice';

export const normalizeRandomStationsNames = (value: unknown): RandomStationsNamesValue => {
    switch (value) {
        case 'none':
        case 'default':
            return 'default';
        case 'empty':
            return 'empty';
        case StationCity.Shmetro:
        case StationCity.Bjsubway:
            return value;
        default:
            return 'default';
    }
};
