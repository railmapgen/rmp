import { RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, StnId, CategoriesType } from './constants';
import { ShmetroBasicStationAttributes } from '../components/svgs/stations/shmetro-basic';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import { ShmetroIntStationAttributes } from '../components/svgs/stations/shmetro-int';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
import { BjsubwayBasicStationAttributes } from '../components/svgs/stations/bjsubway-basic';
import { BjsubwayIntStationAttributes } from '../components/svgs/stations/bjsubway-int';
import { MTRStationAttributes } from '../components/svgs/stations/mtr';

export enum StationType {
    ShmetroBasic = 'shmetro-basic',
    ShmetroBasic2020 = 'shmetro-basic-2020',
    ShmetroInt = 'shmetro-int',
    GzmtrBasic = 'gzmtr-basic',
    GzmtrInt = 'gzmtr-int',
    BjsubwayBasic = 'bjsubway-basic',
    BjsubwayInt = 'bjsubway-int',
    MTR = 'mtr',
}

export interface ExternalStationAttributes {
    [StationType.ShmetroBasic]?: ShmetroBasicStationAttributes;
    [StationType.ShmetroBasic2020]?: ShmetroBasic2020StationAttributes;
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
    [StationType.GzmtrBasic]?: GzmtrBasicStationAttributes;
    [StationType.GzmtrInt]?: GzmtrIntStationAttributes;
    [StationType.BjsubwayBasic]?: BjsubwayBasicStationAttributes;
    [StationType.BjsubwayInt]?: BjsubwayIntStationAttributes;
    [StationType.MTR]?: MTRStationAttributes;
}

/* ----- Below are core types for all stations, DO NOT TOUCH. ----- */

export interface StationComponentProps {
    id: StnId;
    attrs: ExternalStationAttributes;
    x: number;
    y: number;
    handlePointerDown: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
}

export interface StationAttributes {
    /**
     * The names (in different languages) of this station.
     * If you need to break the line, use `\\` and <MultilineText /> instead.
     * NEVER ASSUME ANY INDEX WOULD HAVE A VALUE. EVERY INDEX COULD BE UNDEFINED.
     */
    names: string[];
}
// handy types for nameOffset
export type NameOffsetX = 'left' | 'middle' | 'right';
export type NameOffsetY = 'top' | 'middle' | 'bottom';
// handy types for rotate
export type ROTATE = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
/**
 * The interface a customized Station should export.
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
     * In a slightly different RmgFieldsField format that hides some internal implementation.
     * Attrs should be obtained via this wrapper instead of window.graph or redux.
     */
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        disabledOptions: (attrs?: T) => (string | number)[];
        onChange: (val: string | number, attrs_?: T) => T;
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

export const defaultStationAttributes: StationAttributes = { names: ['车站', 'Stn'] };
