import { RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, StnId, Theme, CategoriesType } from './constants';
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
/**
 * The default interface a customized Station should export.
 */
export interface Station<T extends StationAttributes> {
    /**
     * The core station component.
     */
    component: (props: StationComponentProps) => JSX.Element;
    /**
     * The icon displayed in the tools panel.
     */
    icon: JSX.Element;
    /**
     * Default attributes for this component.
     */
    defaultAttrs: T;
    /**
     * Changeable actions in the details panel.
     * In a slightly different RmgFieldsField format.
     */
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
    })[];
    /**
     * Metadata for this station.
     */
    metadata: {
        /**
         * The name displayed in the tools panel. In react-i18next index format.
         */
        displayName: string;
        /**
         * Cities that can use this station implementation.
         */
        cities: CityCode[];
        /**
         * This station is suitable to which canvas.
         */
        canvas: CanvasType[];
        /**
         * The categories which this line suits for.
         */
        categories: CategoriesType[];
        /**
         * Tags of this station.
         */
        tags: string[];
    };
}

export const defaultStationAttributes: StationAttributes = { names: ['车站', 'Stn'], transfer: [] };
