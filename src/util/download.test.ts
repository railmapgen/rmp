import { describe, expect, it } from 'vitest';
import type { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { rmpInfoSpecificNodeExists, shouldForceRmpInfo } from './download';

describe('download RMP info rules', () => {
    it('detects image and fill nodes as requiring RMP info handling', () => {
        expect(rmpInfoSpecificNodeExists(new Set<NodeType>([MiscNodeType.Image]))).toBe(true);
        expect(rmpInfoSpecificNodeExists(new Set<NodeType>([MiscNodeType.Fill]))).toBe(true);
        expect(rmpInfoSpecificNodeExists(new Set<NodeType>([StationType.ShmetroBasic]))).toBe(false);
    });

    it('only forces embedded RMP info for non-subscribers with image or fill nodes', () => {
        expect(shouldForceRmpInfo(new Set<NodeType>([MiscNodeType.Image]), false)).toBe(true);
        expect(shouldForceRmpInfo(new Set<NodeType>([MiscNodeType.Fill]), false)).toBe(true);
        expect(shouldForceRmpInfo(new Set<NodeType>([MiscNodeType.Image]), true)).toBe(false);
        expect(shouldForceRmpInfo(new Set<NodeType>([StationType.ShmetroBasic]), false)).toBe(false);
    });
});
