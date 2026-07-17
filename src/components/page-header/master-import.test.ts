import { describe, expect, it } from 'vitest';
import { isSupportedMasterVersion } from './master-import';

describe('isSupportedMasterVersion', () => {
    it('accepts v2, v3 and v4 masters only', () => {
        expect(isSupportedMasterVersion(2)).toBe(true);
        expect(isSupportedMasterVersion(3)).toBe(true);
        expect(isSupportedMasterVersion(4)).toBe(true);
        expect(isSupportedMasterVersion(undefined)).toBe(false);
        expect(isSupportedMasterVersion(1)).toBe(false);
        expect(isSupportedMasterVersion(5)).toBe(false);
    });
});
