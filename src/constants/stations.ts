import { RmgFieldsField } from '@railmapgen/rmg-components';
import { StnId } from './constants';
import { ShmetroIntStationAttributes } from '../components/station/shmetro-int';
import { ShmetroBasicStationAttributes } from '../components/station/shmetro-basic';

export enum StationType {
    ShmetroBasic = 'shmetro-basic',
    ShmetroInt = 'shmetro-int',
}

export interface ExternalStationAttributes {
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
    [StationType.ShmetroBasic]?: ShmetroBasicStationAttributes;
}

export type InterchangeInfo = [number, ...string[]];
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
