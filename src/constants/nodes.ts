import { RmgFieldsField } from '@railmapgen/rmg-components';
import { FacilitiesAttributes } from '../components/nodes/facilities';
import { GzmtrLineBadgeAttributes } from '../components/nodes/gzmtr-line-badge/gzmtr-line-badge';
import { ShmetroNumLineBadgeAttributes } from '../components/nodes/shmetro-num-line-badge';
import { ShmetroTextLineBadgeAttributes } from '../components/nodes/shmetro-text-line-badge';
import { VirtualAttributes } from '../components/nodes/virtual';
import { MiscNodeId } from './constants';

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
     * In a slightly different RmgFieldsField format.
     */
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
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

export enum MiscNodeType {
    Virtual = 'virtual',
    ShmetroNumLineBadge = 'shmetro-num-line-badge',
    ShmetroTextLineBadge = 'shmetro-text-line-badge',
    Facilities = 'facilities',
    GzmtrLineBadge = 'gzmtr-line-badge',
}
export interface MiscNodeAttributes {
    [MiscNodeType.Virtual]?: VirtualAttributes;
    [MiscNodeType.ShmetroNumLineBadge]?: ShmetroNumLineBadgeAttributes;
    [MiscNodeType.ShmetroTextLineBadge]?: ShmetroTextLineBadgeAttributes;
    [MiscNodeType.Facilities]?: FacilitiesAttributes;
    [MiscNodeType.GzmtrLineBadge]?: GzmtrLineBadgeAttributes;
}
