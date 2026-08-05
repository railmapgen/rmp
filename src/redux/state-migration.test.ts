import { describe, expect, it } from 'vitest';
import { StationCity } from '../constants/constants';
import { normalizeRandomStationsNames, normalizeStationNameTranslationMode } from './state-migration';

describe('normalizeRandomStationsNames', () => {
    it('maps legacy none preference to default', () => {
        expect(normalizeRandomStationsNames('none')).toBe('default');
    });

    it('keeps supported values unchanged', () => {
        expect(normalizeRandomStationsNames('default')).toBe('default');
        expect(normalizeRandomStationsNames('empty')).toBe('empty');
        expect(normalizeRandomStationsNames(StationCity.Shmetro)).toBe(StationCity.Shmetro);
        expect(normalizeRandomStationsNames(StationCity.Bjsubway)).toBe(StationCity.Bjsubway);
    });

    it('falls back to default for unknown values', () => {
        expect(normalizeRandomStationsNames('unsupported')).toBe('default');
        expect(normalizeRandomStationsNames(undefined)).toBe('default');
    });
});

describe('normalizeStationNameTranslationMode', () => {
    it('maps legacy pinyin preference to spaced pinyin', () => {
        expect(normalizeStationNameTranslationMode('pinyin')).toBe('pinyin-spaced');
    });

    it('keeps supported values unchanged', () => {
        expect(normalizeStationNameTranslationMode('pinyin-spaced')).toBe('pinyin-spaced');
        expect(normalizeStationNameTranslationMode('pinyin-compact')).toBe('pinyin-compact');
        expect(normalizeStationNameTranslationMode('pinyin-uppercase')).toBe('pinyin-uppercase');
        expect(normalizeStationNameTranslationMode('semantic')).toBe('semantic');
    });

    it('falls back to spaced pinyin for unknown values', () => {
        expect(normalizeStationNameTranslationMode('unsupported')).toBe('pinyin-spaced');
        expect(normalizeStationNameTranslationMode(undefined)).toBe('pinyin-spaced');
    });
});
