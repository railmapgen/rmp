import { describe, expect, it } from 'vitest';
import { StationCity } from '../constants/constants';
import { normalizeRandomStationsNames } from './state-migration';

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
