import { StationCity } from '../constants/constants';
import type { RandomStationsNamesValue, StationNameTranslationMode } from './app/app-slice';

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

export const normalizeStationNameTranslationMode = (value: unknown): StationNameTranslationMode => {
    switch (value) {
        case 'pinyin':
        case 'pinyin-spaced':
            return 'pinyin-spaced';
        case 'pinyin-compact':
        case 'pinyin-uppercase':
        case 'semantic':
            return value;
        default:
            return 'pinyin-spaced';
    }
};
