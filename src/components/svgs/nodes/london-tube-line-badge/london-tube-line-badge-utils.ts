import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { CityCode, Theme } from '../../../../constants/constants';

export type LondonTubeLineBadgeItem =
    | {
          kind: 'filled';
          color: Theme;
          lineName: string;
      }
    | {
          kind: 'filled-walking';
          color: Theme;
          lineName: string;
          walkingTarget: string;
          distance: string;
      };

export interface LondonTubeLineBadgeAttributes {
    items: LondonTubeLineBadgeItem[];
}

export const DEFAULT_LONDON_TUBE_LINE_BADGE_THEME: Theme = [CityCode.Other, 'generic', '#00782A', MonoColour.white];

export const createDefaultLondonTubeLineBadgeItem = (): LondonTubeLineBadgeItem => ({
    kind: 'filled',
    color: DEFAULT_LONDON_TUBE_LINE_BADGE_THEME,
    lineName: 'Line',
});

export const createDefaultLondonTubeLineBadgeWalkingItem = (): LondonTubeLineBadgeItem => ({
    kind: 'filled-walking',
    color: DEFAULT_LONDON_TUBE_LINE_BADGE_THEME,
    lineName: 'Line',
    walkingTarget: 'Target',
    distance: '300m',
});

const splitNormalizedLines = (raw: string) =>
    raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

export const normalizeFilledLineName = (raw: string) => splitNormalizedLines(raw).slice(0, 2).join('\n');

export const normalizeFilledWalkingLineName = (raw: string) => splitNormalizedLines(raw).slice(0, 2).join('\n');

export const toFilledItem = (item: LondonTubeLineBadgeItem): LondonTubeLineBadgeItem => ({
    kind: 'filled',
    color: item.color,
    lineName: normalizeFilledLineName(item.lineName),
});

export const toFilledWalkingItem = (item: LondonTubeLineBadgeItem): LondonTubeLineBadgeItem => ({
    kind: 'filled-walking',
    color: item.color,
    lineName: normalizeFilledWalkingLineName(item.lineName),
    walkingTarget: item.kind === 'filled-walking' ? item.walkingTarget : 'Target',
    distance: item.kind === 'filled-walking' ? item.distance : '300m',
});

export const duplicateLondonTubeLineBadgeItem = (item: LondonTubeLineBadgeItem): LondonTubeLineBadgeItem =>
    normalizeLondonTubeLineBadgeItem(structuredClone(item));

export const normalizeLondonTubeLineBadgeItem = (item: LondonTubeLineBadgeItem): LondonTubeLineBadgeItem =>
    item.kind === 'filled'
        ? {
              ...item,
              lineName: normalizeFilledLineName(item.lineName),
          }
        : {
              ...item,
              lineName: normalizeFilledWalkingLineName(item.lineName),
              walkingTarget: item.walkingTarget ?? '',
              distance: item.distance ?? '',
          };

export const getLondonTubeLineBadgeDisplayLines = (item: LondonTubeLineBadgeItem): string[] => {
    const normalized = normalizeLondonTubeLineBadgeItem(item);
    return normalized.lineName ? normalized.lineName.split('\n') : [];
};

export const getLondonTubeLineBadgeSubtitle = (item: Extract<LondonTubeLineBadgeItem, { kind: 'filled-walking' }>) => {
    const text = [item.walkingTarget.trim(), item.distance.trim()].filter(Boolean).join(' ');
    return text ? `${text}↑` : '';
};

export const getLondonTubeLineBadgeHeight = (item: LondonTubeLineBadgeItem, lineWidth: number) => {
    if (item.kind === 'filled-walking') {
        return (1.5 + Math.max(0, getLondonTubeLineBadgeDisplayLines(item).length - 1) * 0.75) * lineWidth;
    }

    return getLondonTubeLineBadgeDisplayLines(item).length > 1 ? 1.75 * lineWidth : lineWidth;
};
