import { BerlinUBahnLineBadgeAttributes } from '../components/svgs/nodes/berlin-u-bahn-line-badge';
import { BerlinSBahnLineBadgeAttributes } from '../components/svgs/nodes/berlin-s-bahn-line-badge';
import { BjsubwayNumLineBadgeAttributes } from '../components/svgs/nodes/bjsubway-num-line-badge';
import { BjsubwayTextLineBadgeAttributes } from '../components/svgs/nodes/bjsubway-text-line-badge';
import { FacilitiesAttributes } from '../components/svgs/nodes/facilities';
import { GzmtrLineBadgeAttributes } from '../components/svgs/nodes/gzmtr-line-badge/gzmtr-line-badge';
import { ShmetroNumLineBadgeAttributes } from '../components/svgs/nodes/shmetro-num-line-badge';
import { ShmetroTextLineBadgeAttributes } from '../components/svgs/nodes/shmetro-text-line-badge';
import { TextAttributes } from '../components/svgs/nodes/text';
import { VirtualAttributes } from '../components/svgs/nodes/virtual';
import { AttrsProps, MiscNodeId } from './constants';
import { SuzhouRTNumLineBadgeAttributes } from '../components/svgs/nodes/suzhourt-num-line-badge';
import { ChongqingRTNumLineBadgeAttributes } from '../components/svgs/nodes/chongqingrt-num-line-badge';
import { ChongqingRTTextLineBadgeAttributes } from '../components/svgs/nodes/chongqingrt-text-line-badge';
import { ShenzhenMetroNumLineBadgeAttributes } from '../components/svgs/nodes/shenzhenmetro-num-line-badge';

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
    Facilities = 'facilities',
    Text = 'text',
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
    [MiscNodeType.Facilities]?: FacilitiesAttributes;
    [MiscNodeType.Text]?: TextAttributes;
}

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
