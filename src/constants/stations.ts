/* eslint-disable import/order */
import React from 'react';
import { AttrsProps, CanvasType, CategoriesType, CityCode, StnId } from './constants';
import { ShmetroBasicStationAttributes } from '../components/svgs/stations/shmetro-basic';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import { ShmetroIntStationAttributes } from '../components/svgs/stations/shmetro-int';
import { ShmetroOsysiStationAttributes } from '../components/svgs/stations/shmetro-osysi';
import { ShanghaiSuburbanRailwayStationAttributes } from '../components/svgs/stations/shanghai-suburban-railway';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
import { GzmtrInt2024StationAttributes } from '../components/svgs/stations/gzmtr-int-2024';
import { BjsubwayBasicStationAttributes } from '../components/svgs/stations/bjsubway-basic';
import { BjsubwayIntStationAttributes } from '../components/svgs/stations/bjsubway-int';
import { MTRStationAttributes } from '../components/svgs/stations/mtr';
import { SuzhouRTBasicStationAttributes } from '../components/svgs/stations/suzhourt-basic';
import { SuzhouRTIntStationAttributes } from '../components/svgs/stations/suzhourt-int';
import { KunmingRTBasicStationAttributes } from '../components/svgs/stations/kunmingrt-basic';
import { KunmingRTIntStationAttributes } from '../components/svgs/stations/kunmingrt-int';
import { MRTBasicStationAttributes } from '../components/svgs/stations/mrt-basic';
import { MRTIntStationAttributes } from '../components/svgs/stations/mrt-int';
import { JREastBasicStationAttributes } from '../components/svgs/stations/jr-east-basic';
import { JREastImportantStationAttributes } from '../components/svgs/stations/jr-east-important';
import { FoshanMetroBasicStationAttributes } from '../components/svgs/stations/foshan-metro-basic';
import { QingdaoMetroStationAttributes } from '../components/svgs/stations/qingdao-metro-station';
import { TokyoMetroBasicStationAttributes } from '../components/svgs/stations/tokyo-metro-basic';
import { TokyoMetroIntStationAttributes } from '../components/svgs/stations/tokyo-metro-int';
import { LondonTubeBasicStationAttributes } from '../components/svgs/stations/london-tube-basic';
import { LondonTubeIntStationAttributes } from '../components/svgs/stations/london-tube-int';
import { LondonRiverServicesIntStationAttributes } from '../components/svgs/stations/london-river-services-interchange';
import { GuangdongIntercityRailwayStationAttributes } from '../components/svgs/stations/guangdong-intercity-railway';
import { ChongqingRTBasicStationAttributes } from '../components/svgs/stations/chongqingrt-basic';
import { ChongqingRTIntStationAttributes } from '../components/svgs/stations/chongqingrt-int';
import { ChongqingRTBasicStation2021Attributes } from '../components/svgs/stations/chongqingrt-basic-2021';
import { ChongqingRTIntStation2021Attributes } from '../components/svgs/stations/chongqingrt-int-2021';
import { ChengduRTBasicStationAttributes } from '../components/svgs/stations/chengdurt-basic';
import { ChengduRTIntStationAttributes } from '../components/svgs/stations/chengdurt-int';
import { OsakaMetroStationAttributes } from '../components/svgs/stations/osaka-metro';
import { WuhanRTBasicStationAttributes } from '../components/svgs/stations/wuhanrt-basic';
import { WuhanRTIntStationAttributes } from '../components/svgs/stations/wuhanrt-int';
import { CsmetroBasicStationAttributes } from '../components/svgs/stations/csmetro-basic';
import { CsmetroIntStationAttributes } from '../components/svgs/stations/csmetro-int';
import { HzmetroBasicStationAttributes } from '../components/svgs/stations/hzmetro-basic';
import { HzmetroIntStationAttributes } from '../components/svgs/stations/hzmetro-int';

export enum StationType {
    ShmetroBasic = 'shmetro-basic',
    ShmetroBasic2020 = 'shmetro-basic-2020',
    ShmetroInt = 'shmetro-int',
    ShmetroOutOfSystemInt = 'shmetro-osysi',
    ShanghaiSuburbanRailway = 'shanghai-sub-rwy',
    GzmtrBasic = 'gzmtr-basic',
    GzmtrInt = 'gzmtr-int',
    GzmtrInt2024 = 'gzmtr-int-2024',
    BjsubwayBasic = 'bjsubway-basic',
    BjsubwayInt = 'bjsubway-int',
    MTR = 'mtr',
    SuzhouRTBasic = 'suzhourt-basic',
    SuzhouRTInt = 'suzhourt-int',
    KunmingRTBasic = 'kunmingrt-basic',
    KunmingRTInt = 'kunmingrt-int',
    MRTBasic = 'mrt-basic',
    MRTInt = 'mrt-int',
    JREastBasic = 'jr-east-basic',
    JREastImportant = 'jr-east-imp',
    FoshanMetroBasic = 'foshan-metro-basic',
    QingdaoMetroStation = 'qingdao-metro-basic',
    TokyoMetroBasic = 'tokyo-metro-basic',
    TokyoMetroInt = 'tokyo-metro-int',
    LondonTubeBasic = 'london-tube-basic',
    LondonTubeInt = 'london-tube-int',
    LondonRiverServicesInt = 'london-river-int',
    GuangdongIntercityRailway = 'guangdong-intercity-rwy',
    ChongqingRTBasic = 'chongqingrt-basic',
    ChongqingRTInt = 'chongqingrt-int',
    ChongqingRTBasic2021 = 'chongqingrt-basic-2021',
    ChongqingRTInt2021 = 'chongqingrt-int-2021',
    ChengduRTBasic = 'chengdurt-basic',
    ChengduRTInt = 'chengdurt-int',
    OsakaMetro = 'osaka-metro',
    WuhanRTBasic = 'wuhanrt-basic',
    WuhanRTInt = 'wuhanrt-int',
    CsmetroBasic = 'csmetro-basic',
    CsmetroInt = 'csmetro-int',
    HzmetroBasic = 'hzmetro-basic',
    HzmetroInt = 'hzmetro-int',
}

export interface ExternalStationAttributes {
    [StationType.ShmetroBasic]?: ShmetroBasicStationAttributes;
    [StationType.ShmetroBasic2020]?: ShmetroBasic2020StationAttributes;
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
    [StationType.ShmetroOutOfSystemInt]?: ShmetroOsysiStationAttributes;
    [StationType.ShanghaiSuburbanRailway]?: ShanghaiSuburbanRailwayStationAttributes;
    [StationType.GzmtrBasic]?: GzmtrBasicStationAttributes;
    [StationType.GzmtrInt]?: GzmtrIntStationAttributes;
    [StationType.GzmtrInt2024]?: GzmtrInt2024StationAttributes;
    [StationType.BjsubwayBasic]?: BjsubwayBasicStationAttributes;
    [StationType.BjsubwayInt]?: BjsubwayIntStationAttributes;
    [StationType.MTR]?: MTRStationAttributes;
    [StationType.SuzhouRTBasic]?: SuzhouRTBasicStationAttributes;
    [StationType.SuzhouRTInt]?: SuzhouRTIntStationAttributes;
    [StationType.KunmingRTBasic]?: KunmingRTBasicStationAttributes;
    [StationType.KunmingRTInt]?: KunmingRTIntStationAttributes;
    [StationType.MRTBasic]?: MRTBasicStationAttributes;
    [StationType.MRTInt]?: MRTIntStationAttributes;
    [StationType.JREastBasic]?: JREastBasicStationAttributes;
    [StationType.JREastImportant]?: JREastImportantStationAttributes;
    [StationType.FoshanMetroBasic]?: FoshanMetroBasicStationAttributes;
    [StationType.QingdaoMetroStation]?: QingdaoMetroStationAttributes;
    [StationType.TokyoMetroBasic]?: TokyoMetroBasicStationAttributes;
    [StationType.TokyoMetroInt]?: TokyoMetroIntStationAttributes;
    [StationType.LondonTubeBasic]?: LondonTubeBasicStationAttributes;
    [StationType.LondonTubeInt]?: LondonTubeIntStationAttributes;
    [StationType.LondonRiverServicesInt]?: LondonRiverServicesIntStationAttributes;
    [StationType.GuangdongIntercityRailway]?: GuangdongIntercityRailwayStationAttributes;
    [StationType.ChongqingRTBasic]?: ChongqingRTBasicStationAttributes;
    [StationType.ChongqingRTInt]?: ChongqingRTIntStationAttributes;
    [StationType.ChongqingRTBasic2021]?: ChongqingRTBasicStation2021Attributes;
    [StationType.ChongqingRTInt2021]?: ChongqingRTIntStation2021Attributes;
    [StationType.ChengduRTBasic]?: ChengduRTBasicStationAttributes;
    [StationType.ChengduRTInt]?: ChengduRTIntStationAttributes;
    [StationType.OsakaMetro]?: OsakaMetroStationAttributes;
    [StationType.WuhanRTBasic]?: WuhanRTBasicStationAttributes;
    [StationType.WuhanRTInt]?: WuhanRTIntStationAttributes;
    [StationType.CsmetroBasic]?: CsmetroBasicStationAttributes;
    [StationType.CsmetroInt]?: CsmetroIntStationAttributes;
    [StationType.HzmetroBasic]?: HzmetroBasicStationAttributes;
    [StationType.HzmetroInt]?: HzmetroIntStationAttributes;
}

/* ----- Below are core types for all stations, DO NOT TOUCH. ----- */

export const STATION_TYPE_VALUES = new Set(Object.values(StationType));

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
     * If you need to break the line, use `\n` and display it with component MultilineText.
     */
    names: [string, ...string[]];
}
// handy types for nameOffset
export type NameOffsetX = 'left' | 'middle' | 'right';
export type NameOffsetY = 'top' | 'middle' | 'bottom';
// handy types for rotate
export type Rotate = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
/**
 * The interface a customized Station should export.
 */
export interface Station<T extends StationAttributes> {
    /**
     * The core station component.
     */
    component: React.FC<StationComponentProps>;
    /**
     * This pre component will always be under the main component and other
     * elements with the same zIndex.
     * This is not mandatory but helpful if some of the elements need to be
     * put before other stations/misc-nodes/lines.
     * Note it will be above other elements that have a smaller zIndex.
     */
    preComponent?: React.FC<StationComponentProps>;
    /**
     * This post component will always be above the main component and other
     * elements with the same zIndex.
     * This is not mandatory but helpful if some of the elements need to be
     * put after other stations/misc-nodes/lines.
     * Note it will be under other elements that have a bigger zIndex.
     */
    postComponent?: React.FC<StationComponentProps>;
    /**
     * The icon displayed in the tools panel.
     */
    icon: React.JSX.Element;
    /**
     * Default attributes for this component.
     */
    defaultAttrs: T;
    /**
     * A React component that allows user to change the attributes.
     * Will be displayed in the details panel.
     */
    attrsComponent: React.FC<AttrsProps<T>>;
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
