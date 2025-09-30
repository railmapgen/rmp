/* eslint-disable import/order */
import React from 'react';
import { AttrsProps, MiscNodeId } from './constants';
import { VirtualAttributes } from '../components/svgs/nodes/virtual';
import { FacilitiesAttributes } from '../components/svgs/nodes/facilities';
import { TextAttributes } from '../components/svgs/nodes/text';
import { I18nTextAttributes } from '../components/svgs/nodes/i18n-text';
import { MasterAttributes } from '../components/svgs/nodes/master';
import { ImageAttributes } from '../components/svgs/nodes/image';
import { ShmetroNumLineBadgeAttributes } from '../components/svgs/nodes/shmetro-num-line-badge';
import { ShmetroTextLineBadgeAttributes } from '../components/svgs/nodes/shmetro-text-line-badge';
import { GzmtrLineBadgeAttributes } from '../components/svgs/nodes/gzmtr-line-badge';
import { BjsubwayNumLineBadgeAttributes } from '../components/svgs/nodes/bjsubway-num-line-badge';
import { BjsubwayTextLineBadgeAttributes } from '../components/svgs/nodes/bjsubway-text-line-badge';
import { SuzhouRTNumLineBadgeAttributes } from '../components/svgs/nodes/suzhourt-num-line-badge';
import { BerlinUBahnLineBadgeAttributes } from '../components/svgs/nodes/berlin-u-bahn-line-badge';
import { BerlinSBahnLineBadgeAttributes } from '../components/svgs/nodes/berlin-s-bahn-line-badge';
import { ChongqingRTNumLineBadgeAttributes } from '../components/svgs/nodes/chongqingrt-num-line-badge';
import { ChongqingRTTextLineBadgeAttributes } from '../components/svgs/nodes/chongqingrt-text-line-badge';
import { ChongqingRTNumLineBadge2021Attributes } from '../components/svgs/nodes/chongqingrt-num-line-badge-2021';
import { ChongqingRTTextLineBadge2021Attributes } from '../components/svgs/nodes/chongqingrt-text-line-badge-2021';
import { ShenzhenMetroNumLineBadgeAttributes } from '../components/svgs/nodes/shenzhenmetro-num-line-badge';
import { MRTDestinationNumbersAttributes } from '../components/svgs/nodes/mrt-dest-num';
import { MRTLineBadgeAttributes } from '../components/svgs/nodes/mrt-line-badge';
import { JREastLineBadgeAttributes } from '../components/svgs/nodes/jr-east-line-badge';
import { QingdaoMetroNumLineBadgeAttributes } from '../components/svgs/nodes/qingdao-metro-num-line-badge';
import { GuangdongIntercityRailwayLineBadgeAttributes } from '../components/svgs/nodes/guangdong-intercity-railway-line-badge';
import { LondonArrowAttributes } from '../components/svgs/nodes/london-arrow';
import { ChengduRTLineBadgeAttributes } from '../components/svgs/nodes/chengdurt-line-badge';
import { TaipeiMetroLineBadgeAttributes } from '../components/svgs/nodes/taipei-metro-line-badge';
import { FillAttributes } from '../components/svgs/nodes/fill';

export enum MiscNodeType {
    Virtual = 'virtual',
    Facilities = 'facilities',
    Text = 'text',
    I18nText = 'i18n-text',
    Master = 'master',
    Image = 'image',
    Fill = 'fill',
    ShmetroNumLineBadge = 'shmetro-num-line-badge',
    ShmetroTextLineBadge = 'shmetro-text-line-badge',
    GzmtrLineBadge = 'gzmtr-line-badge',
    BjsubwayNumLineBadge = 'bjsubway-num-line-badge',
    BjsubwayTextLineBadge = 'bjsubway-text-line-badge',
    SuzhouRTNumLineBadge = 'suzhourt-num-line-badge',
    BerlinSBahnLineBadge = 'berlin-s-bahn-line-badge',
    BerlinUBahnLineBadge = 'berlin-u-bahn-line-badge',
    ChongqingRTNumLineBadge = 'chongqingrt-num-line-badge',
    ChongqingRTTextLineBadge = 'chongqingrt-text-line-badge',
    ChongqingRTNumLineBadge2021 = 'chongqingrt-num-line-badge-2021',
    ChongqingRTTextLineBadge2021 = 'chongqingrt-text-line-badge-2021',
    ShenzhenMetroNumLineBadge = 'shenzhen-metro-num-line-badge',
    MRTDestinationNumbers = 'mrt-num-line-badge',
    MRTLineBadge = 'mrt-line-badge',
    JREastLineBadge = 'jr-east-line-badge',
    QingdaoMetroNumLineBadge = 'qingdao-metro-num-line-badge',
    GuangdongIntercityRailwayLineBadge = 'gd-intercity-rwy-line-badge',
    LondonArrow = 'london-arrow',
    ChengduRTLineBadge = 'chengdurt-line-badge',
    TaiPeiMetroLineBadege = 'taipei-metro-line-badge',
}

export interface MiscNodeAttributes {
    [MiscNodeType.Virtual]?: VirtualAttributes;
    [MiscNodeType.Facilities]?: FacilitiesAttributes;
    [MiscNodeType.Text]?: TextAttributes;
    [MiscNodeType.I18nText]?: I18nTextAttributes;
    [MiscNodeType.Master]?: MasterAttributes;
    [MiscNodeType.Image]?: ImageAttributes;
    [MiscNodeType.Fill]?: FillAttributes;
    [MiscNodeType.ShmetroNumLineBadge]?: ShmetroNumLineBadgeAttributes;
    [MiscNodeType.ShmetroTextLineBadge]?: ShmetroTextLineBadgeAttributes;
    [MiscNodeType.GzmtrLineBadge]?: GzmtrLineBadgeAttributes;
    [MiscNodeType.BjsubwayNumLineBadge]?: BjsubwayNumLineBadgeAttributes;
    [MiscNodeType.BjsubwayTextLineBadge]?: BjsubwayTextLineBadgeAttributes;
    [MiscNodeType.SuzhouRTNumLineBadge]?: SuzhouRTNumLineBadgeAttributes;
    [MiscNodeType.BerlinSBahnLineBadge]?: BerlinSBahnLineBadgeAttributes;
    [MiscNodeType.BerlinUBahnLineBadge]?: BerlinUBahnLineBadgeAttributes;
    [MiscNodeType.ChongqingRTNumLineBadge]?: ChongqingRTNumLineBadgeAttributes;
    [MiscNodeType.ChongqingRTTextLineBadge]?: ChongqingRTTextLineBadgeAttributes;
    [MiscNodeType.ChongqingRTNumLineBadge2021]?: ChongqingRTNumLineBadge2021Attributes;
    [MiscNodeType.ChongqingRTTextLineBadge2021]?: ChongqingRTTextLineBadge2021Attributes;
    [MiscNodeType.ShenzhenMetroNumLineBadge]?: ShenzhenMetroNumLineBadgeAttributes;
    [MiscNodeType.MRTDestinationNumbers]?: MRTDestinationNumbersAttributes;
    [MiscNodeType.MRTLineBadge]?: MRTLineBadgeAttributes;
    [MiscNodeType.JREastLineBadge]?: JREastLineBadgeAttributes;
    [MiscNodeType.QingdaoMetroNumLineBadge]?: QingdaoMetroNumLineBadgeAttributes;
    [MiscNodeType.GuangdongIntercityRailwayLineBadge]?: GuangdongIntercityRailwayLineBadgeAttributes;
    [MiscNodeType.LondonArrow]?: LondonArrowAttributes;
    [MiscNodeType.ChengduRTLineBadge]?: ChengduRTLineBadgeAttributes;
    [MiscNodeType.TaiPeiMetroLineBadege]?: TaipeiMetroLineBadgeAttributes;
}

/* ----- Below are core types for all miscellaneous nodes, DO NOT TOUCH. ----- */

export interface NodeComponentProps<T> {
    id: MiscNodeId;
    attrs: T;
    x: number;
    y: number;
    handlePointerDown: (node: MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
}

export interface Node<T> {
    /**
     * The core node component.
     */
    component: React.FC<NodeComponentProps<T>>;
    /**
     * This pre component will always be under the main component and other
     * elements with the same zIndex.
     * This is not mandatory but helpful if some of the elements need to be
     * put before other stations/misc-nodes/lines.
     * Note it will be above other elements that have a smaller zIndex.
     */
    preComponent?: React.FC<NodeComponentProps<T>>;
    /**
     * This post component will always be above the main component and other
     * elements with the same zIndex.
     * This is not mandatory but helpful if some of the elements need to be
     * put after other stations/misc-nodes/lines.
     * Note it will be under other elements that have a bigger zIndex.
     */
    postComponent?: React.FC<NodeComponentProps<T>>;
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
     * Metadata for this node.
     */
    metadata: {
        /**
         * The name displayed in the tools panel. In react-i18next index format.
         */
        displayName: string;
        /**
         * Tags of this station.
         */
        tags: string[];
    };
}
