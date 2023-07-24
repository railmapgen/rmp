import { RmgFieldsField } from '@railmapgen/rmg-components';
import { BerlinUBahnBadgeAttributes } from '../components/svgs/nodes/berlin-u-bahn-badge';
import { BerlinSBahnBadgeAttributes } from '../components/svgs/nodes/berlin-s-bahn-badge';
import { BjsubwayNumLineBadgeAttributes } from '../components/svgs/nodes/bjsubway-num-line-badge';
import { BjsubwayTextLineBadgeAttributes } from '../components/svgs/nodes/bjsubway-text-line-badge';
import { FacilitiesAttributes } from '../components/svgs/nodes/facilities';
import { GzmtrLineBadgeAttributes } from '../components/svgs/nodes/gzmtr-line-badge/gzmtr-line-badge';
import { ShmetroNumLineBadgeAttributes } from '../components/svgs/nodes/shmetro-num-line-badge';
import { ShmetroTextLineBadgeAttributes } from '../components/svgs/nodes/shmetro-text-line-badge';
import { TextAttributes } from '../components/svgs/nodes/text';
import { VirtualAttributes } from '../components/svgs/nodes/virtual';
import { MiscNodeId } from './constants';

export enum MiscNodeType {
    Virtual = 'virtual',
    ShmetroNumLineBadge = 'shmetro-num-line-badge',
    ShmetroTextLineBadge = 'shmetro-text-line-badge',
    GzmtrLineBadge = 'gzmtr-line-badge',
    BjsubwayNumLineBadge = 'bjsubway-num-line-badge',
    BjsubwayTextLineBadge = 'bjsubway-text-line-badge',
    BerlinUBahnBadge = 'berlin-u-bahn-badge',
    BerlinSBahnBadge = 'berlin-s-bahn-badge',
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
    [MiscNodeType.BerlinUBahnBadge]?: BerlinUBahnBadgeAttributes;
    [MiscNodeType.BerlinSBahnBadge]?: BerlinSBahnBadgeAttributes;
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
    component: (props: NodeComponentProps<T>) => JSX.Element;
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
