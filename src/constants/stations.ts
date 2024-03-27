import { AttrsProps, CanvasType, CategoriesType, CityCode, StnId } from './constants';
import { ShmetroBasicStationAttributes } from '../components/svgs/stations/shmetro-basic';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import { ShmetroIntStationAttributes } from '../components/svgs/stations/shmetro-int';
import { ShmetroOsysiStationAttributes } from '../components/svgs/stations/shmetro-osysi';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
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
import { LondonTubeBasicStationAttributes } from '../components/svgs/stations/london-tube-basic';
import { LondonTubeIntStationAttributes } from '../components/svgs/stations/london-tube-int';

export enum StationType {
    ShmetroBasic = 'shmetro-basic',
    ShmetroBasic2020 = 'shmetro-basic-2020',
    ShmetroInt = 'shmetro-int',
    ShmetroOutOfSystemInt = 'shmetro-osysi',
    GzmtrBasic = 'gzmtr-basic',
    GzmtrInt = 'gzmtr-int',
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
    LondonTubeBasic = 'london-tube-basic',
    LondonTubeInt = 'london-tube-int',
}

export interface ExternalStationAttributes {
    [StationType.ShmetroBasic]?: ShmetroBasicStationAttributes;
    [StationType.ShmetroBasic2020]?: ShmetroBasic2020StationAttributes;
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
    [StationType.ShmetroOutOfSystemInt]?: ShmetroOsysiStationAttributes;
    [StationType.GzmtrBasic]?: GzmtrBasicStationAttributes;
    [StationType.GzmtrInt]?: GzmtrIntStationAttributes;
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
    [StationType.LondonTubeBasic]?: LondonTubeBasicStationAttributes;
    [StationType.LondonTubeInt]?: LondonTubeIntStationAttributes;
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
     * If you need to break the line, use `\\` and display it with component MultilineText.
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
     * The icon displayed in the tools panel.
     */
    icon: JSX.Element;
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
