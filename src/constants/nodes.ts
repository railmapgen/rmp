import { AttrsProps, MiscNodeId } from './constants';
import { VirtualAttributes } from '../components/svgs/nodes/virtual';
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
import { ShenzhenMetroNumLineBadgeAttributes } from '../components/svgs/nodes/shenzhenmetro-num-line-badge';
import { MRTDestinationNumbersAttributes } from '../components/svgs/nodes/mrt-dest-num';
import { MRTLineBadgeAttributes } from '../components/svgs/nodes/mrt-line-badge';
import { JREastLineBadgeAttributes } from '../components/svgs/nodes/jr-east-line-badge';
import { QingdaoMetroNumLineBadgeAttributes } from '../components/svgs/nodes/qingdao-metro-num-line-badge';
import { FacilitiesAttributes } from '../components/svgs/nodes/facilities';
import { TextAttributes } from '../components/svgs/nodes/text';
import { I18nTextAttributes } from '../components/svgs/nodes/i18n-text';

export enum MiscNodeType {
    Virtual = 'virtual',
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
    ShenzhenMetroNumLineBadge = 'shenzhen-metro-num-line-badge',
    MRTDestinationNumbers = 'mrt-num-line-badge',
    JREastLineBadge = 'jr-east-line-badge',
    QingdaoMetroNumLineBadge = 'qingdao-metro-num-line-badge',
    MRTLineBadge = 'mrt-line-badge',
    Facilities = 'facilities',
    Text = 'text',
    I18nText = 'i18n-text',
}

export interface MiscNodeAttributes {
    [MiscNodeType.Virtual]?: VirtualAttributes;
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
    [MiscNodeType.ShenzhenMetroNumLineBadge]?: ShenzhenMetroNumLineBadgeAttributes;
    [MiscNodeType.MRTDestinationNumbers]?: MRTDestinationNumbersAttributes;
    [MiscNodeType.JREastLineBadge]?: JREastLineBadgeAttributes;
    [MiscNodeType.QingdaoMetroNumLineBadge]?: QingdaoMetroNumLineBadgeAttributes;
    [MiscNodeType.MRTLineBadge]?: MRTLineBadgeAttributes;
    [MiscNodeType.Facilities]?: FacilitiesAttributes;
    [MiscNodeType.Text]?: TextAttributes;
    [MiscNodeType.I18nText]?: I18nTextAttributes;
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
