import { RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { DiagonalLineAttributes } from '../components/line/diagonal-line';
import { PerpendicularLineAttributes } from '../components/line/perpendicular-line';
import { ShmetroIntStationAttributes } from '../components/station/shmetro-int';

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

export enum StationType {
    // ShmetroBasic = 'shmetro-basic',
    ShmetroInt = 'shmetro-int',
}

export type NodeAttributes = {
    x: number;
    y: number;
    type: StationType;
    names: string[];
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
};

export enum LineType {
    Diagonal = 'diagonal',
    Perpendicular = 'perpendicular',
}

export type EdgeAttributes = {
    color: Theme;
    type: LineType;
    [LineType.Diagonal]?: DiagonalLineAttributes;
    [LineType.Perpendicular]?: PerpendicularLineAttributes;
};

export type GraphAttributes = {
    name?: string;
};

export type RuntimeMode = 'free' | `line-${LineType}` | `station-${StationType}`;

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
export type LineId = `line_${string}`;
export type ActiveType = StnId | LineId | 'background';

export interface StationAttributes {}
export interface StationComponentProps {
    id: StnId;
    attrs: Omit<NodeAttributes, 'x' | 'y' | 'type' | 'names'>;
    x: number;
    y: number;
    names: string[];
    handlePointerDown: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
}
export interface Station<T extends StationAttributes> {
    component: (props: StationComponentProps) => JSX.Element;
    icon: JSX.Element;
    defaultAttrs: T;
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
    })[];
}

export interface LineAttributes {}
export interface LineComponentProps {
    id: LineId;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    handleClick: (edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
    attrs: EdgeAttributes;
}
export interface Line<T extends LineAttributes> {
    component: (props: LineComponentProps) => JSX.Element;
    icon: JSX.Element;
    defaultAttrs: T;
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
    })[];
}
