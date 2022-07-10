import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { DiagonalLineAttributes } from '../components/line/diagonal-line';

export enum LanguageCode {
    Azerbaijani = 'az',
    Arabic = 'ar',
    Catalan = 'ca',
    Chinese = 'zh',
    ChineseCN = 'zh-CN',
    ChineseSimp = 'zh-Hans',
    ChineseTrad = 'zh-Hant',
    ChineseHK = 'zh-HK',
    ChineseTW = 'zh-TW',
    English = 'en',
    French = 'fr',
    Gaelic = 'ga',
    German = 'de',
    Hindi = 'hi',
    Japanese = 'ja',
    Korean = 'ko',
    Malay = 'ms',
    Norwegian = 'no',
    Spanish = 'es',
    Persian = 'fa',
    Portuguese = 'pt',
    Russian = 'ru',
    Swedish = 'sv',
    Turkish = 'tr',
}

export type Translation = { [l in LanguageCode]?: string };

export type NodeAttributes = {
    x: number;
    y: number;
    names: string[];
};

export type EdgeAttributes = {
    color: Theme;
    type: string;
    // offset: { x1: number; x2: number; y1: number; y2: number };
    diagonal?: DiagonalLineAttributes;
};

export type GraphAttributes = {
    name?: string;
};

export type RuntimeMode = 'free' | 'line' | 'station';

export type ColourHex = `#${string}`;

/**
 * Colour theme of line, derived from `LineEntry`.
 * @property 0 - city id
 * @property 1 - line id
 * @property 2 - background colour
 * @property 3 - foreground colour
 */
export type Theme = [CityCode, string, ColourHex, MonoColour];

export type StnId = `stn_${string}`;
export type LineId = `stn_${string}`;
export type ActiveType = StnId | LineId | 'background';
