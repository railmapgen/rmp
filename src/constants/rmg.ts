import { Translation } from '@railmapgen/rmg-translate';
import { Theme } from './constants';

/**
 * @property {string} 0 - Chinese characters
 * @property {string} 1 - Latin characters
 */
export type Name = [string, string];

export enum Direction {
    left = 'left',
    right = 'right',
}

export enum ShortDirection {
    left = 'l',
    right = 'r',
}

export enum BranchStyle {
    through = 'through',
    nonThrough = 'nonthrough',
}

/**
 * Information of branch on both side.
 * @property 0 - branch type
 * @property 1 - ID of the first station of the branch (should also be one of the station's parents/children) or empty
 */
export type BranchInfo = Partial<Record<Direction, [BranchStyle, string]>>;

export enum Services {
    local = 'local',
    express = 'express',
    direct = 'direct',
}

export interface ExtendedInterchangeInfo {
    theme?: Theme;
    name: Name;
    facility?: Facilities;
}

export interface InterchangeGroup {
    name?: Name;
    lines?: ExtendedInterchangeInfo[];
}

export interface StationTransfer {
    /**
     * Direction of text/tick of interchanges.
     */
    tick_direc: ShortDirection;
    /**
     * Flag of paid area within out-of-station interchange.
     */
    paid_area: boolean;
    groups: [InterchangeGroup, ...InterchangeGroup[]];
}

export const FACILITIES = {
    airport: 'Airport',
    hsr: 'High speed rail',
    railway: 'National rail',
    disney: 'Disneyland resort',
    np360: 'Ngong Ping 360',
};
export type Facilities = keyof typeof FACILITIES;

export type TEMP = 'temp';
export interface StationInfo {
    title?: string;
    /**
     * Station name in two languages.
     */
    localisedName: Translation;
    localisedSecondaryName?: Translation;
    /**
     * Station number. (GZMTR specific)
     */
    num: string;
    /**
     * Dictionary of the information of branch on the station's both side.
     */
    branch?: BranchInfo;
    /**
     * Array of parents' IDs.
     */
    parents: string[];
    /**
     * Array of children's IDs.
     */
    children: string[];
    /**
     * Detail of interchanges.
     */
    transfer: StationTransfer;
    /**
     * Array of services at this station.
     */
    services: Services[];
    /**
     * Facility near the station.
     */
    facility?: Facilities;
    /**
     * Is a pivot station in the loop.
     */
    loop_pivot: boolean;
    /**
     * Whether display Chinese and English in the same line.
     */
    one_line: boolean;
    /**
     * Padding between int box and station name in shmetro/station.
     * Default to 355 in updateParam.
     * This is calculated from (svg_height - 200) * 1.414 where typical svg_height
     * is 450 and station element is tilted at a 45-degree angle.
     */
    int_padding: number;
    /**
     * Controls spacing between text characters in station names.
     * Default to 20 in updateParam.
     */
    character_spacing: number;
    underConstruction?: boolean | TEMP;
}

export enum CanvasType {
    Destination = 'destination',
    RunIn = 'runin',
    RailMap = 'railmap',
    Indoor = 'indoor',
}

export enum RmgStyle {
    MTR = 'mtr',
    GZMTR = 'gzmtr',
    SHMetro = 'shmetro',
}

export type StationDict = Record<string, StationInfo>;

export enum PanelTypeGZMTR {
    gz1 = 'gz1',
    gz28 = 'gz28',
    gz2otis = 'gz2otis',
    gz3 = 'gz3',
    gz4 = 'gz4',
    gz5 = 'gz5',
    gz1421 = 'gz1421',
    gz6 = 'gz6',
    gzgf = 'gzgf',
}

export enum PanelTypeShmetro {
    sh = 'sh',
    sh2020 = 'sh2020',
}

/**
 * Array of a single note entry for Guangzhou Metro style.
 * @property 0 - text in Chinese characters
 * @property 1 - text in Latin characters
 * @property 2 - percentage of horizontal position
 * @property 3 - percentage of vertical position
 * @property 4 - flag of showing border
 */
export type Note = [...Name, number, number, boolean];

export interface ColineInfo {
    from: string;
    to: string;
    colors: ColineColours[];
    display: boolean;
}

export type ColineColours = [...Theme, ...Name];

/**
 * Dictionary of configuration parameters for RMG, stored in `localStorage` as string.
 */
export interface RMGParam {
    svgWidth: Record<CanvasType, number>;
    svg_height: number;
    style: RmgStyle;
    /**
     * Vertical position (in percentage) of line.
     */
    y_pc: number;
    /**
     * Left and right margin of line (in percentage).
     */
    padding: number;
    /** Branch spacing percentage (space between upper and lower branch).
     *  In SHMetro loop line, this is also used in determining vertical padding.
     */
    branchSpacingPct: number;
    direction: ShortDirection;
    /**
     * Platform number of the destination canvas. Set to '' will hide the element.
     */
    platform_num: string;
    theme: Theme;
    line_name: Name;
    current_stn_idx: keyof StationDict;
    /**
     * Key-value pairs of the information of each station.
     */
    stn_list: StationDict;
    namePosMTR: {
        /**
         * Flag of whether station names staggered. If false, place name above line.
         */
        isStagger: boolean;
        /**
         * Flag of flipping station names.
         * When `isStagger === false`, names are above line if `isFlip === false`.
         */
        isFlip: boolean;
    };
    /**
     * Customise destination sign of MTR style.
     */
    customiseMTRDest: {
        /**
         * Flag of legacy style. (Show line name before 'to').
         */
        isLegacy: boolean;
        /**
         * Customise terminal stations.
         */
        terminal: false | Name;
    };
    line_num: string;
    spanLineNum?: boolean;
    psd_num: string;
    coachNum: string;
    info_panel_type: PanelTypeGZMTR | PanelTypeShmetro;
    notesGZMTR?: Note[];
    direction_gz_x: number;
    direction_gz_y: number;
    coline: Record<string, ColineInfo>;
    loop: boolean;
    loop_info: {
        /**
         * Bank the closed rectangular path (railmap) or not.
         */
        bank: boolean;
        /**
         * Station size on the left and right side. Integer only, will be `Math.floor`ed.
         * Also, this factor is subject to several rules, see shmetro-loop for more info.
         */
        left_and_right_factor: number;
        /**
         * Station size on the bottom side. Integer only, will be `Math.floor`ed.
         * Also, this factor is subject to several rules, see shmetro-loop for more info.
         */
        bottom_factor: number;
        midpoint_station?: string;
        clockwise?: boolean;
    };
    version?: string; // RMG version
}
