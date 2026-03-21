import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { describe, expect, it } from 'vitest';
import { CityCode, Theme } from '../../../../constants/constants';
import {
    duplicateLondonTubeLineBadgeItem,
    getLondonTubeLineBadgeHeight,
    getLondonTubeLineBadgeSubtitle,
    normalizeFilledLineName,
    normalizeFilledWalkingLineName,
    normalizeLondonTubeLineBadgeItem,
    toFilledItem,
    toFilledWalkingItem,
} from './london-tube-line-badge-utils';

describe('london tube line badge utils', () => {
    const color = [CityCode.Other, 'generic', '#00782A', MonoColour.white] as const;
    const cloneColor = (): Theme => [...color];

    it('keeps only the first two non-empty lines for filled badge names', () => {
        expect(normalizeFilledLineName('District\n\nCircle\nHammersmith & City')).toBe('District\nCircle');
    });

    it('keeps only the first two non-empty lines for filled walking badge names', () => {
        expect(normalizeFilledWalkingLineName('Elizabeth line\nReading\nHeathrow')).toBe('Elizabeth line\nReading');
    });

    it('normalizes filled items and trims extra lines', () => {
        expect(
            normalizeLondonTubeLineBadgeItem({
                kind: 'filled',
                color: cloneColor(),
                lineName: 'District\nCircle\nMetropolitan',
            })
        ).toEqual({
            kind: 'filled',
            color: cloneColor(),
            lineName: 'District\nCircle',
        });
    });

    it('converts a filled item into a filled walking item', () => {
        expect(
            toFilledWalkingItem({
                kind: 'filled',
                color: cloneColor(),
                lineName: 'District\nCircle',
            })
        ).toEqual({
            kind: 'filled-walking',
            color: cloneColor(),
            lineName: 'District\nCircle',
            walkingTarget: 'Target',
            distance: '300m',
        });
    });

    it('duplicates an item without sharing the original reference', () => {
        const original = {
            kind: 'filled-walking' as const,
            color: cloneColor(),
            lineName: 'District\nCircle',
            walkingTarget: 'Paddington',
            distance: '300m',
        };
        const duplicated = duplicateLondonTubeLineBadgeItem(original);

        expect(duplicated).toEqual(original);
        expect(duplicated).not.toBe(original);
    });

    it('converts a filled walking item back into a filled item', () => {
        expect(
            toFilledItem({
                kind: 'filled-walking',
                color: cloneColor(),
                lineName: 'District',
                walkingTarget: 'Paddington',
                distance: '300m',
            })
        ).toEqual({
            kind: 'filled',
            color: cloneColor(),
            lineName: 'District',
        });
    });

    it('formats the walking subtitle with the target, distance and arrow', () => {
        expect(
            getLondonTubeLineBadgeSubtitle({
                kind: 'filled-walking',
                color: cloneColor(),
                lineName: 'District',
                walkingTarget: 'Paddington',
                distance: '300m',
            })
        ).toBe('Paddington 300m↑');
    });

    it('returns the expected heights for filled and filled walking badges', () => {
        expect(
            getLondonTubeLineBadgeHeight(
                {
                    kind: 'filled',
                    color: cloneColor(),
                    lineName: 'District',
                },
                5
            )
        ).toBe(5);

        expect(
            getLondonTubeLineBadgeHeight(
                {
                    kind: 'filled',
                    color: cloneColor(),
                    lineName: 'District\nCircle',
                },
                5
            )
        ).toBe(8.75);

        expect(
            getLondonTubeLineBadgeHeight(
                {
                    kind: 'filled-walking',
                    color: cloneColor(),
                    lineName: 'District',
                    walkingTarget: 'Paddington',
                    distance: '300m',
                },
                5
            )
        ).toBe(7.275);

        expect(
            getLondonTubeLineBadgeHeight(
                {
                    kind: 'filled-walking',
                    color: cloneColor(),
                    lineName: 'District\nCircle',
                    walkingTarget: 'Paddington',
                    distance: '300m',
                },
                5
            )
        ).toBe(11.025);
    });
});
