import { describe, expect, it } from 'vitest';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { isConnectableNodeType } from './connectable-node';

describe('connectable node policy', () => {
    it('treats every station type as connectable', () => {
        expect(Object.values(StationType).filter(type => !isConnectableNodeType(type))).toEqual([]);
    });

    it('keeps the existing miscellaneous-node allowlist explicit', () => {
        expect(Object.values(MiscNodeType).filter(isConnectableNodeType).sort()).toEqual(
            [
                MiscNodeType.Virtual,
                MiscNodeType.Master,
                MiscNodeType.Fill,
                MiscNodeType.LondonArrow,
                MiscNodeType.ChongqingRTNumLineBadge2021,
                MiscNodeType.ChongqingRTTextLineBadge2021,
                MiscNodeType.ChengduRTLineBadge,
                MiscNodeType.GzmtrLineBadge,
            ].sort()
        );
    });
});
