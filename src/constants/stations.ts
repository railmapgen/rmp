import { RmgFieldsField } from '@railmapgen/rmg-components';
import { StnId, Theme } from './constants';
import { ShmetroIntStationAttributes } from '../components/station/shmetro-int';
import { ShmetroBasicStationAttributes } from '../components/station/shmetro-basic';
import { ShmetroBasic2020StationAttributes } from '../components/station/shmetro-basic-2020';

export enum StationType {
    ShmetroBasic = 'shmetro-basic',
    ShmetroInt = 'shmetro-int',
    ShmetroBasic2020 = 'shmetro-basic-2020',
}

export interface ExternalStationAttributes {
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
    [StationType.ShmetroBasic]?: ShmetroBasicStationAttributes;
    [StationType.ShmetroBasic2020]?: ShmetroBasic2020StationAttributes;
}

export type InterchangeInfo = [...Theme, ...string[]];
export interface StationAttributes {
    names: string[];
    transfer: InterchangeInfo[][];
}
export interface StationComponentProps {
    id: StnId;
    attrs: ExternalStationAttributes;
    x: number;
    y: number;
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

export const defaultStationAttributes: StationAttributes = { names: ['车站', 'Stn'], transfer: [] };
